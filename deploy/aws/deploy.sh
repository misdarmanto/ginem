#!/usr/bin/env bash
# One command: creates the AWS server on first run, then builds and deploys. Re-run to redeploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="$ROOT/deploy/aws/.state"
ENV_FILE="$ROOT/deploy/aws/.env.production"
REMOTE_DIR=/opt/ginem
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
export AWS_REGION="${AWS_REGION:-ap-southeast-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
KEY_NAME=ginem-key
KEY_FILE="$HOME/.ssh/$KEY_NAME.pem"

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null || { echo "Missing: $1"; exit 1; }; }
for cmd in aws ssh rsync curl npm openssl; do need "$cmd"; done
aws sts get-caller-identity >/dev/null || { echo "AWS CLI not authenticated. Run: aws configure"; exit 1; }

set_kv() { # file key value
  { grep -v "^$2=" "$1" 2>/dev/null || true; echo "$2=$3"; } > "$1.tmp" && mv "$1.tmp" "$1"
}

provision() {
  log "Creating AWS resources in $AWS_REGION ($INSTANCE_TYPE)"
  local vpc sg ami iid alloc ip
  vpc=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)
  [ "$vpc" != "None" ] || { echo "No default VPC in $AWS_REGION"; exit 1; }

  if [ ! -f "$KEY_FILE" ]; then
    aws ec2 delete-key-pair --key-name "$KEY_NAME" >/dev/null 2>&1 || true
    aws ec2 create-key-pair --key-name "$KEY_NAME" --query KeyMaterial --output text > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
  fi

  sg=$(aws ec2 create-security-group --group-name ginem-sg --description "ginem" --vpc-id "$vpc" \
    --query GroupId --output text 2>/dev/null || \
    aws ec2 describe-security-groups --filters Name=group-name,Values=ginem-sg Name=vpc-id,Values="$vpc" \
      --query 'SecurityGroups[0].GroupId' --output text)
  for port in 80 443; do
    aws ec2 authorize-security-group-ingress --group-id "$sg" --protocol tcp --port "$port" --cidr 0.0.0.0/0 >/dev/null 2>&1 || true
  done
  aws ec2 authorize-security-group-ingress --group-id "$sg" --protocol udp --port 443 --cidr 0.0.0.0/0 >/dev/null 2>&1 || true

  ami=$(aws ssm get-parameter --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
    --query Parameter.Value --output text)
  iid=$(aws ec2 run-instances --image-id "$ami" --instance-type "$INSTANCE_TYPE" --key-name "$KEY_NAME" \
    --security-group-ids "$sg" \
    --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=ginem}]' \
    --user-data '#!/bin/bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
mkdir -p /opt/ginem && chown ubuntu:ubuntu /opt/ginem
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo "/swapfile none swap sw 0 0" >> /etc/fstab' \
    --query 'Instances[0].InstanceId' --output text)
  aws ec2 wait instance-running --instance-ids "$iid"

  alloc=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
  aws ec2 associate-address --instance-id "$iid" --allocation-id "$alloc" >/dev/null
  ip=$(aws ec2 describe-addresses --allocation-ids "$alloc" --query 'Addresses[0].PublicIp' --output text)

  printf 'INSTANCE_ID=%s\nSG_ID=%s\nALLOC_ID=%s\nIP=%s\nAWS_REGION=%s\n' "$iid" "$sg" "$alloc" "$ip" "$AWS_REGION" > "$STATE"
}

[ -f "$STATE" ] || provision
# shellcheck disable=SC1090
source "$STATE"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"
HOST="${IP//./-}.sslip.io"
SSH=(ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "ubuntu@$IP")

log "Allowing SSH from your current IP only"
MY_IP=$(curl -fsS https://checkip.amazonaws.com)
OLD=$(aws ec2 describe-security-groups --group-ids "$SG_ID" \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`].IpRanges[].CidrIp' --output text)
for cidr in $OLD; do
  aws ec2 revoke-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr "$cidr" >/dev/null
done
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr "$MY_IP/32" >/dev/null

log "Waiting for the server to finish installing Docker"
until "${SSH[@]}" 'cloud-init status --wait >/dev/null 2>&1; docker info >/dev/null 2>&1'; do sleep 5; done

log "Preparing environment file (first run generates passwords)"
if [ ! -f "$ENV_FILE" ]; then
  [ -f "$ROOT/packages/api/.env" ] || { echo "packages/api/.env not found"; exit 1; }
  cp "$ROOT/packages/api/.env" "$ENV_FILE"
  base_client=$(grep '^MQTT_CLIENT_ID=' "$ENV_FILE" | cut -d= -f2- || true)
  set_kv "$ENV_FILE" APP_MODE production
  set_kv "$ENV_FILE" DB_USER_NAME root
  set_kv "$ENV_FILE" DB_DIALECT mysql
  set_kv "$ENV_FILE" DB_PASSWORD "$(openssl rand -hex 16)"
  set_kv "$ENV_FILE" RABBITMQ_USER ginem
  set_kv "$ENV_FILE" RABBITMQ_PASSWORD "$(openssl rand -hex 16)"
  set_kv "$ENV_FILE" MQTT_CLIENT_ID "${base_client:-ginem}-prod"
fi
set_kv "$ENV_FILE" SITE_HOST "$HOST"
set_kv "$ENV_FILE" CORS_ORIGIN "https://$HOST"

log "Building dashboard for https://$HOST"
(cd "$ROOT" && VITE_BASE_URL="https://$HOST/api/v1" VITE_APP_STAGE=production npm run build -w packages/dashboard)

log "Uploading project"
rsync -az -e "ssh -i $KEY_FILE -o StrictHostKeyChecking=accept-new" \
  --exclude .git --exclude .claude --exclude node_modules --exclude build --exclude logs \
  --exclude '.env*' --exclude deploy/aws/.state --exclude packages/dashboard/src --exclude packages/dashboard/public \
  "$ROOT/" "ubuntu@$IP:$REMOTE_DIR/"
rsync -az --delete -e "ssh -i $KEY_FILE" "$ROOT/packages/dashboard/build/" "ubuntu@$IP:$REMOTE_DIR/dashboard-dist/"
rsync -az -e "ssh -i $KEY_FILE" "$ENV_FILE" "ubuntu@$IP:$REMOTE_DIR/.env"

log "Starting containers (first build takes a few minutes)"
"${SSH[@]}" "cd $REMOTE_DIR && docker compose -f docker-compose.yml -f deploy/aws/docker-compose.prod.yml up -d --build"

log "Waiting for the app to become healthy"
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null "https://$HOST/api/v1/health"; then
    printf '\n\033[1;32mDone.\033[0m Dashboard: https://%s\n       API:       https://%s/api/v1\n' "$HOST" "$HOST"
    exit 0
  fi
  sleep 5
done
echo "App not healthy yet. Check logs:  ssh -i $KEY_FILE ubuntu@$IP 'cd $REMOTE_DIR && docker compose logs --tail 100 app caddy'"
exit 1
