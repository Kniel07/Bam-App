#!/usr/bin/env bash
# Restore drill / disaster recovery (TD-013). Run on your own computer or a
# codespace, never in CI (it needs your private age key).
#
#   scripts/backup/restore.sh <olu-backup-….tar.age> <age-key-file>
#
# Needs: TARGET_DB_URL, TARGET_SUPABASE_URL, TARGET_SERVICE_ROLE_KEY for an
# EMPTY Supabase project (no accounts, no relationship). Steps:
#   1. decrypt + unpack into a private temp folder (deleted on exit)
#   2. refuse if the target already has data
#   3. apply migrations (if the schema isn't there), load accounts + rows
#   4. upload photos
#   5. compare row counts with the backup's own counts
set -euo pipefail
umask 077
cd "$(dirname "$0")/../.."
source scripts/backup/lib.sh

archive="${1:?usage: restore.sh <backup.tar.age> <age-key-file>}"
identity="${2:?usage: restore.sh <backup.tar.age> <age-key-file>}"
for name in TARGET_DB_URL TARGET_SUPABASE_URL TARGET_SERVICE_ROLE_KEY; do
  [[ -n "${!name:-}" ]] || { echo "Missing $name (see SETUP-GUIDE Part G)." >&2; exit 1; }
done

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
age --decrypt --identity "$identity" "$archive" | tar -C "$work" -xf -
backup=$(find "$work" -mindepth 1 -maxdepth 1 -type d -name 'olu-backup-*' | head -1)
[[ -n "$backup" ]] || { echo "Archive doesn't contain a backup folder." >&2; exit 1; }
echo "Backup: $(basename "$backup")"

apply_migrations_if_missing "$TARGET_DB_URL" "$PWD"
if ! target_is_empty "$TARGET_DB_URL"; then
  echo "The target project already has accounts or a relationship. Restore only into an empty project." >&2
  exit 1
fi

echo "Loading accounts and rows…"
restore_database "$TARGET_DB_URL" "$backup"

echo "Uploading photos…"
SUPABASE_URL="$TARGET_SUPABASE_URL" SUPABASE_SERVICE_ROLE_KEY="$TARGET_SERVICE_ROLE_KEY" \
  npx tsx scripts/backup/storage.ts upload "$backup/storage"

echo "Checking row counts…"
count_rows "$TARGET_DB_URL" > "$work/restored-counts.tsv"
if diff "$backup/row-counts.tsv" "$work/restored-counts.tsv" > "$work/diff.txt"; then
  echo "Row counts match ($(wc -l < "$backup/row-counts.tsv") tables)."
else
  echo "Row counts differ (table, count):" >&2
  cat "$work/diff.txt" >&2
  exit 1
fi
expected_files=$(find "$backup/storage" -type f | wc -l)
echo "Restore finished: $expected_files photos uploaded. Now do the spot-check in SETUP-GUIDE Part G."
