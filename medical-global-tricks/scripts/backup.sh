#!/usr/bin/env bash
# Nightly logical backup of the database + private storage, with retention.
# Usage: DATABASE_URL=... STORAGE_DIR=./storage BACKUP_DIR=./backups RETAIN_DAYS=14 bash scripts/backup.sh
# Encrypt and copy the result off-server (e.g. `age`/`gpg` + S3/R2 with object lock). See docs/OPERATIONS.md.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
STORAGE_DIR="${STORAGE_DIR:-./storage}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
pg_dump --format=custom --no-owner --no-privileges --file "$BACKUP_DIR/db-$STAMP.dump" "$DATABASE_URL"
tar -czf "$BACKUP_DIR/storage-$STAMP.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
# Verify the dump is readable before pruning older copies.
pg_restore --list "$BACKUP_DIR/db-$STAMP.dump" > /dev/null
find "$BACKUP_DIR" -name 'db-*.dump' -mtime +"$RETAIN_DAYS" -delete
find "$BACKUP_DIR" -name 'storage-*.tar.gz' -mtime +"$RETAIN_DAYS" -delete
echo "backup ok: $BACKUP_DIR/db-$STAMP.dump ($(du -h "$BACKUP_DIR/db-$STAMP.dump" | cut -f1))"
