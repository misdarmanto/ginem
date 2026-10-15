#!/usr/bin/env bash
# One command: creates the AWS server on first run, then builds and deploys. Re-run to redeploy.
set -euo pipefail

# shellcheck source=deploy/aws/lib.sh
source "$(dirname "$0")/lib.sh"

ROOT="$(cd "$AWS_DIR/../.." && pwd)"
REMOTE_DIR=/opt/ginem
WIB_TIMEZONE=Asia/Jakarta
WIB_OFFSET=+0700
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
export AWS_REGION="${AWS_REGION:-ap-southeast-1}"
export AWS_DEFAULT_REGION="$AWS_REGION"
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
timedatectl set-timezone Asia/Jakarta
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
load_state
HOST="${IP//./-}.sslip.io"
SSH=(ssh -i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "ubuntu@$IP")

log "Allowing SSH from your current IP only"
allow_my_ssh_ip

log "Waiting for the server to finish installing Docker"
until "${SSH[@]}" 'cloud-init status --wait >/dev/null 2>&1; docker info >/dev/null 2>&1'; do sleep 5; done

log "Setting server time zone to WIB (UTC+7)"
"${SSH[@]}" "sudo timedatectl set-timezone $WIB_TIMEZONE"

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
# Provider keys follow the local .env, so a rotated key reaches the server on the next deploy.
for key in OPENAI_API_KEY DEEPSEEK_API_KEY ANTHROPIC_API_KEY; do
  value=$(grep "^$key=" "$ROOT/packages/api/.env" | head -1 | cut -d= -f2- || true)
  [ -z "$value" ] || set_kv "$ENV_FILE" "$key" "$value"
done
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

log "Verifying every layer runs on WIB (UTC+7)"
host_offset=$("${SSH[@]}" 'date +%z')
mysql_offset=$("${SSH[@]}" 'docker exec ta-mysql date +%z')
app_offset=$("${SSH[@]}" "docker exec ta-backend node -e 'const m=-new Date().getTimezoneOffset();console.log((m<0?\"-\":\"+\")+String(Math.abs(m)/60|0).padStart(2,\"0\")+String(Math.abs(m)%60).padStart(2,\"0\"))'")
printf '  host %s | mysql %s | api %s\n' "$host_offset" "$mysql_offset" "$app_offset"
for offset in "$host_offset" "$mysql_offset" "$app_offset"; do
  [ "$offset" = "$WIB_OFFSET" ] || { echo "A layer is not on WIB ($WIB_OFFSET). Check the time zone settings."; exit 1; }
done

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
