#!/usr/bin/env bash
# Restore a backup into an EMPTY database (never over the live one), then switch the app over.
# Usage: TARGET_DATABASE_URL=postgres://.../mgt_restore bash scripts/restore.sh backups/db-XXXX.dump [backups/storage-XXXX.tar.gz] [restore-storage-dir]
set -euo pipefail
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL (an empty database) is required}"
DUMP="${1:?path to db-*.dump}"
pg_restore --no-owner --no-privileges --exit-on-error --dbname "$TARGET_DATABASE_URL" "$DUMP"
if [[ -n "${2:-}" ]]; then
  OUT="${3:-./storage-restored}"
  mkdir -p "$OUT" && tar -xzf "$2" -C "$OUT"
  echo "storage restored into $OUT — point STORAGE_DIR at it"
fi
psql "$TARGET_DATABASE_URL" -Atc "SELECT 'users=' || count(*) FROM users UNION ALL SELECT 'questions=' || count(*) FROM questions UNION ALL SELECT 'attempts=' || count(*) FROM exam_attempts"
echo "restore ok — verify, then repoint DATABASE_URL"
