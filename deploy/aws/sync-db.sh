#!/usr/bin/env bash
# Makes the server database identical to your local one. The server's current data is replaced.
# A backup of it is saved first in deploy/aws/backups/.
#
#   bash deploy/aws/sync-db.sh                 # asks once before replacing
#   bash deploy/aws/sync-db.sh --yes           # no question
#   bash deploy/aws/sync-db.sh --restore FILE  # put a saved backup back on the server
set -euo pipefail

# shellcheck source=deploy/aws/lib.sh
source "$(dirname "$0")/lib.sh"

ROOT="$(cd "$AWS_DIR/../.." && pwd)"
LOCAL_ENV="$ROOT/packages/api/.env"
BACKUP_DIR="$AWS_DIR/backups"
REMOTE_DIR=/opt/ginem
MYSQL_CONTAINER=ta-mysql
MAMP_BIN=/Applications/MAMP/Library/bin/mysql80/bin

ASSUME_YES=false
RESTORE_FILE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --yes) ASSUME_YES=true ;;
    --restore) RESTORE_FILE="${2:?Pakai: --restore FILE}"; shift ;;
    *) echo "Opsi tidak dikenal: $1"; exit 1 ;;
  esac
  shift
done

for cmd in aws ssh curl gzip; do need "$cmd"; done
load_state
[ -f "$LOCAL_ENV" ] || { echo "File $LOCAL_ENV tidak ditemukan."; exit 1; }

# The Homebrew mysql client cannot log in to MAMP's MySQL, so prefer MAMP's own tools.
if [ -x "$MAMP_BIN/mysqldump" ]; then
  LOCAL_DUMP="$MAMP_BIN/mysqldump"
  LOCAL_MYSQL="$MAMP_BIN/mysql"
else
  need mysqldump; need mysql
  LOCAL_DUMP=mysqldump
  LOCAL_MYSQL=mysql
fi

local_env() { grep "^$1=" "$LOCAL_ENV" | head -1 | cut -d= -f2-; }
DB_NAME=$(local_env DB_NAME)
LOCAL_HOST=$(local_env DB_HOST); LOCAL_HOST="${LOCAL_HOST/localhost/127.0.0.1}"
LOCAL_PORT=$(local_env DB_PORT)
LOCAL_USER=$(local_env DB_USER_NAME)
export MYSQL_PWD
MYSQL_PWD=$(local_env DB_PASSWORD)
LOCAL_CONN=(-h "$LOCAL_HOST" -P "$LOCAL_PORT" -u "$LOCAL_USER")

SSH_OPTS=(-i "$KEY_FILE" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)
remote() { ssh "${SSH_OPTS[@]}" "ubuntu@$IP" "$@"; }
remote_cmd() { ssh -n "${SSH_OPTS[@]}" "ubuntu@$IP" "$@"; } # for commands that must not read stdin

# Runs on the server with its .env loaded, so the database password never leaves the server.
REMOTE_PRELUDE="cd $REMOTE_DIR && set -a && . ./.env && set +a"
remote_mysql() { echo "$REMOTE_PRELUDE && docker exec -i -e MYSQL_PWD=\"\$DB_PASSWORD\" $MYSQL_CONTAINER mysql -uroot --default-character-set=utf8mb4 $*"; }

local_counts() {
  local table
  "$LOCAL_MYSQL" "${LOCAL_CONN[@]}" -N -e \
    "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY 1" |
    while read -r table; do
      echo "$table $("$LOCAL_MYSQL" "${LOCAL_CONN[@]}" -N -e "SELECT COUNT(*) FROM \`$DB_NAME\`.\`$table\`")"
    done
}

remote_counts() {
  remote 'bash -s' <<REMOTE
$REMOTE_PRELUDE
q() { docker exec -e MYSQL_PWD="\$DB_PASSWORD" $MYSQL_CONTAINER mysql -uroot -N "\$@"; }
for t in \$(q -e "SELECT table_name FROM information_schema.tables WHERE table_schema='$DB_NAME' ORDER BY 1"); do
  echo "\$t \$(q -e "SELECT COUNT(*) FROM \\\`$DB_NAME\\\`.\\\`\$t\\\`")"
done
REMOTE
}

dump_local() {
  "$LOCAL_DUMP" "${LOCAL_CONN[@]}" --single-transaction --no-tablespaces --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 --add-drop-table "$DB_NAME"
}

app_stopped=false
restart_app() {
  if $app_stopped; then
    remote_cmd "$REMOTE_PRELUDE && docker compose start app" >/dev/null || echo "Jalankan manual: docker compose start app"
  fi
}
trap restart_app EXIT

# MySQL orders table names by collation, which differs between MAMP and the server's container.
# Sorting both sides the same way keeps the comparison from reporting a false mismatch.
by_name() { LC_ALL=C sort; }

print_comparison() { # local_counts_file server_counts_file
  printf '\n%-24s %8s %8s\n' TABEL LOKAL SERVER
  LC_ALL=C join -a1 -a2 -e - -o 0,1.2,2.2 "$1" "$2" | while read -r t l s; do
    printf '%-24s %8s %8s\n' "$t" "$l" "$s"
  done
  echo
}

log "Memeriksa koneksi ke server"
allow_my_ssh_ip
remote_cmd true || { echo "Server tidak bisa dihubungi. Nyalakan instance 'ginem' di konsol EC2 lalu coba lagi."; exit 1; }
remote_cmd "docker ps --format '{{.Names}}' | grep -qx $MYSQL_CONTAINER" ||
  { echo "Container MySQL belum jalan di server. Jalankan dulu: bash deploy/aws/deploy.sh"; exit 1; }

mkdir -p "$BACKUP_DIR"
WORK=$(mktemp -d)
trap 'restart_app; rm -rf "$WORK"' EXIT

if [ -n "$RESTORE_FILE" ]; then
  [ -f "$RESTORE_FILE" ] || { echo "File backup tidak ada: $RESTORE_FILE"; exit 1; }
  SOURCE_LABEL="backup $RESTORE_FILE"
  source_stream() { gunzip -c "$RESTORE_FILE"; }
else
  SOURCE_LABEL="database lokal '$DB_NAME'"
  source_stream() { dump_local; }
  log "Membandingkan data lokal dan server"
  local_counts | by_name > "$WORK/local.txt"
  remote_counts | by_name > "$WORK/server.txt"
  print_comparison "$WORK/local.txt" "$WORK/server.txt"
fi

if ! $ASSUME_YES; then
  echo "SEMUA data di database server akan DIHAPUS dan diganti dengan $SOURCE_LABEL."
  echo "Backup data server saat ini disimpan dulu di $BACKUP_DIR."
  read -r -p "Ketik 'ya' untuk melanjutkan: " answer
  [ "$answer" = "ya" ] || { echo "Dibatalkan, tidak ada yang diubah."; exit 1; }
fi

BACKUP_FILE="$BACKUP_DIR/server-$(date +%Y%m%d-%H%M%S).sql.gz"
log "Backup data server -> $BACKUP_FILE"
remote_cmd "$REMOTE_PRELUDE && docker exec -e MYSQL_PWD=\"\$DB_PASSWORD\" $MYSQL_CONTAINER mysqldump -uroot --single-transaction --no-tablespaces --default-character-set=utf8mb4 --add-drop-table \"\$DB_NAME\"" |
  gzip > "$BACKUP_FILE"
[ "$(gzip -dc "$BACKUP_FILE" | wc -c)" -gt 1000 ] || { echo "Backup kosong atau gagal. Dibatalkan, server tidak diubah."; rm -f "$BACKUP_FILE"; exit 1; }

log "Menghentikan API sementara"
remote_cmd "$REMOTE_PRELUDE && docker compose stop app" >/dev/null
app_stopped=true

log "Mengganti data server dengan $SOURCE_LABEL"
source_stream | remote "$(remote_mysql '"$DB_NAME"')"

log "Memverifikasi jumlah data"
remote_counts | by_name > "$WORK/after.txt"
if [ -z "$RESTORE_FILE" ] && ! diff -q "$WORK/local.txt" "$WORK/after.txt" >/dev/null; then
  print_comparison "$WORK/local.txt" "$WORK/after.txt"
  echo "Jumlah data tidak sama. Kembalikan data lama dengan:"
  echo "  bash deploy/aws/sync-db.sh --restore $BACKUP_FILE"
  exit 1
fi

log "Menyalakan API"
remote_cmd "$REMOTE_PRELUDE && docker compose start app" >/dev/null
app_stopped=false

HOST="${IP//./-}.sslip.io"
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null "https://$HOST/api/v1/health"; then
    printf '\n\033[1;32mSelesai.\033[0m Data server sekarang sama dengan %s.\nBackup data lama: %s\n' "$SOURCE_LABEL" "$BACKUP_FILE"
    exit 0
  fi
  sleep 3
done
echo "Data sudah diganti, tapi API belum merespons. Cek: ssh -i $KEY_FILE ubuntu@$IP 'cd $REMOTE_DIR && docker compose logs --tail 50 app'"
exit 1
