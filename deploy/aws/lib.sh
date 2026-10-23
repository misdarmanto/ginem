#!/usr/bin/env bash
# Helpers shared by the deploy/aws scripts. Source this file; do not run it.

AWS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE="$AWS_DIR/.state"
ENV_FILE="$AWS_DIR/.env.production"
KEY_NAME=ginem-key
KEY_FILE="$HOME/.ssh/$KEY_NAME.pem"

log() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
need() { command -v "$1" >/dev/null || { echo "Missing: $1"; exit 1; }; }

# Loads the server created by deploy.sh (INSTANCE_ID, SG_ID, ALLOC_ID, IP, AWS_REGION).
load_state() {
  [ -f "$STATE" ] || { echo "No server yet. Run: bash deploy/aws/deploy.sh"; exit 1; }
  # shellcheck disable=SC1090
  source "$STATE"
  export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"
}

# Opens SSH (port 22) to this machine's current public IP only. Requires SG_ID.
allow_my_ssh_ip() {
  local my_ip old cidr
  my_ip=$(curl -fsS https://checkip.amazonaws.com)
  old=$(aws ec2 describe-security-groups --group-ids "$SG_ID" \
    --query 'SecurityGroups[0].IpPermissions[?FromPort==`22`].IpRanges[].CidrIp' --output text)
  for cidr in $old; do
    aws ec2 revoke-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr "$cidr" >/dev/null
  done
  aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr "$my_ip/32" >/dev/null
}
