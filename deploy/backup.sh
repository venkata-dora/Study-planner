#!/bin/sh
set -eu
# Run from the repository root; source data is never modified.
umask 077
mkdir -p backups
backup_path="backups/learning-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose --env-file deploy/.env exec -T db pg_dump -U learning -d learning -Fc > "$backup_path"
test -s "$backup_path"
printf 'Backup created: %s\n' "$backup_path"
