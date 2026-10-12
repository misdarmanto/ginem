#!/usr/bin/env bash
# Deletes the server, Elastic IP and security group. THIS DELETES THE DATABASE.
set -euo pipefail
STATE="$(cd "$(dirname "$0")" && pwd)/.state"
[ -f "$STATE" ] || { echo "Nothing to destroy."; exit 0; }
# shellcheck disable=SC1090
source "$STATE"
export AWS_DEFAULT_REGION="$AWS_REGION"
read -r -p "Type 'destroy' to delete $IP and ALL its data: " answer
[ "$answer" = "destroy" ] || exit 1
aws ec2 terminate-instances --instance-ids "$INSTANCE_ID" >/dev/null
aws ec2 wait instance-terminated --instance-ids "$INSTANCE_ID"
aws ec2 release-address --allocation-id "$ALLOC_ID"
aws ec2 delete-security-group --group-id "$SG_ID"
rm -f "$STATE"
echo "Destroyed."
