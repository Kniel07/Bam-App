#!/usr/bin/env bash
# Weekly encrypted backup (TD-013, TD-020). Runs in GitHub Actions (backup.yml).
#
#   scripts/backup/backup.sh <output-dir>
#
# Needs: SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_AGE_RECIPIENT.
# Plaintext only ever exists in a private temp folder that is deleted on exit;
# the single output file is encrypted to the owner's public age key. The
# private key never touches CI, so a leaked artifact can't be read.
set -euo pipefail
umask 077
cd "$(dirname "$0")/../.."
source scripts/backup/lib.sh

out_dir="${1:?usage: backup.sh <output-dir>}"
for name in SUPABASE_DB_URL SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY BACKUP_AGE_RECIPIENT; do
  if [[ -z "${!name:-}" ]]; then
    echo "::error::Missing secret $name. Add it under GitHub → Settings → Secrets and variables → Actions (SETUP-GUIDE Part G)."
    exit 1
  fi
done
if [[ "$BACKUP_AGE_RECIPIENT" != age1* ]]; then
  echo "::error::BACKUP_AGE_RECIPIENT must be an age public key (starts with age1). Never the private key."
  exit 1
fi

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="$work/olu-backup-$stamp"
mkdir -p "$backup/storage" "$out_dir"

echo "Dumping database…"
dump_database "$SUPABASE_DB_URL" "$backup"
count_rows "$SUPABASE_DB_URL" > "$backup/row-counts.tsv"

echo "Downloading photos…"
npx tsx scripts/backup/storage.ts download "$backup/storage"

{
  echo "created_at=$stamp"
  echo "git_commit=${GITHUB_SHA:-unknown}"
  echo "migrations=$(ls supabase/migrations | tr '\n' ' ')"
  echo "files=$(find "$backup/storage" -type f | wc -l)"
} > "$backup/manifest.txt"

archive="$out_dir/olu-backup-$stamp.tar.age"
tar -C "$work" -cf - "olu-backup-$stamp" | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" --output "$archive"

# Counts only: logs of a public repository are public.
echo "Backup ready: $(basename "$archive") ($(du -h "$archive" | cut -f1)), $(wc -l < "$backup/row-counts.tsv") tables, $(find "$backup/storage" -type f | wc -l) files."
