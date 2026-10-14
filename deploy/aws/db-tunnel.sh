#!/usr/bin/env bash
# Opens an SSH tunnel to the server's MySQL so any local database client (DBeaver, TablePlus,
# Adminer, mysql) can manage the data. Nothing is exposed to the internet. Ctrl+C closes it.
#
#   bash deploy/aws/db-tunnel.sh              # then connect to 127.0.0.1:13306
#   LOCAL_PORT=23306 bash deploy/aws/db-tunnel.sh
set -euo pipefail

# shellcheck source=deploy/aws/lib.sh
source "$(dirname "$0")/lib.sh"

LOCAL_PORT="${LOCAL_PORT:-13306}"
MYSQL_CONTAINER=ta-mysql
MYSQL_PORT=3306

for cmd in aws ssh curl nc; do need "$cmd"; done
load_state
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE. Run deploy.sh first."; exit 1; }

if nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null; then
  echo "Port $LOCAL_PORT is already in use. Pick another: LOCAL_PORT=23306 bash $0"
  exit 1
fi

log "Allowing SSH from your current IP only"
allow_my_ssh_ip

SSH_OPTS=(-i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10
  -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes)

# The container has no published port, so the tunnel targets its address on the Docker network.
MYSQL_IP=$(ssh "${SSH_OPTS[@]}" "ubuntu@$IP" \
  "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $MYSQL_CONTAINER")
[[ "$MYSQL_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "Could not find the MySQL container. Is the server running and deployed?"
  exit 1
}

env_value() { grep "^$1=" "$ENV_FILE" | cut -d= -f2-; }
DB_NAME=$(env_value DB_NAME)

if command -v pbcopy >/dev/null; then
  env_value DB_PASSWORD | tr -d '\n' | pbcopy
  PASSWORD_HINT="copied to your clipboard (paste it in your client)"
else
  PASSWORD_HINT="DB_PASSWORD in $ENV_FILE"
fi

cat <<INFO

Tunnel is open. Connect your database client to:

  Host      127.0.0.1
  Port      $LOCAL_PORT
  User      root
  Password  $PASSWORD_HINT
  Database  $DB_NAME

Press Ctrl+C to close the tunnel.
INFO

exec ssh "${SSH_OPTS[@]}" -N -L "127.0.0.1:$LOCAL_PORT:$MYSQL_IP:$MYSQL_PORT" "ubuntu@$IP"
