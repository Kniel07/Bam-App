#!/usr/bin/env bash
# Local proof of the backup → encrypt → decrypt → restore path (TD-013), on
# synthetic data only. Database part only: photos use the Storage API, which
# has no local stand-in (covered by storageWalk tests + the real drill).
#
# Source DB: stub + migrations + every SQL test file (leaves fixtures behind).
# Target DB: stub only; restore applies the migrations itself, like a fresh project.
set -euo pipefail
cd "$(dirname "$0")/../.."
source scripts/backup/lib.sh

if [[ -n "${PGHOST:-}" ]]; then
  PSQL=(psql -X -v ON_ERROR_STOP=1 -q)
  url() { echo "postgresql:///$1"; }
elif [[ "$(id -u)" -eq 0 ]]; then
  # Re-run as the postgres user so plain libpq connection strings work.
  pg_ctlcluster 16 main start 2>/dev/null || true
  tmp_copy=$(mktemp -d); mkdir "$tmp_copy/repo"; cp -r scripts supabase "$tmp_copy/repo/"
  chown -R postgres "$tmp_copy"
  trap 'rm -rf "$tmp_copy"' EXIT
  exec runuser -u postgres -- env PGHOST=/var/run/postgresql bash "$tmp_copy/repo/supabase/tests/backup-roundtrip.sh"
else
  PSQL=(psql -X -v ON_ERROR_STOP=1 -q)
  url() { echo "postgresql:///$1"; }
fi

source_db="olu_backup_src_$$"
target_db="olu_backup_dst_$$"
work=$(mktemp -d)
cleanup() {
  "${PSQL[@]}" -d postgres -c "drop database if exists $source_db" >/dev/null 2>&1 || true
  "${PSQL[@]}" -d postgres -c "drop database if exists $target_db" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

for db in "$source_db" "$target_db"; do "${PSQL[@]}" -d postgres -c "create database $db" >/dev/null; done
"${PSQL[@]}" -d "$source_db" < supabase/tests/stub/supabase_stub.sql >/dev/null
"${PSQL[@]}" -d "$target_db" < supabase/tests/stub/supabase_stub.sql >/dev/null
for migration in supabase/migrations/*.sql; do "${PSQL[@]}" -d "$source_db" < "$migration" >/dev/null; done
for test_file in security partner_letters shared_story notifications nudges test_notifications activities questions_reasons memories_featured; do
  "${PSQL[@]}" -d "$source_db" < "supabase/tests/$test_file.test.sql" >/dev/null 2>&1
done

echo "dump     source"
mkdir -p "$work/olu-backup-test"
dump_database "$(url "$source_db")" "$work/olu-backup-test"
count_rows "$(url "$source_db")" > "$work/olu-backup-test/row-counts.tsv"
total=$(awk -F'\t' '{s+=$2} END {print s}' "$work/olu-backup-test/row-counts.tsv")
[[ "$total" -gt 50 ]] || { echo "FAIL: source has too little data ($total rows) to prove anything"; exit 1; }

echo "encrypt  + decrypt with a throwaway age key"
age-keygen -o "$work/key.txt" 2>/dev/null
recipient=$(age-keygen -y "$work/key.txt")
tar -C "$work" -cf - olu-backup-test | age -e -r "$recipient" -o "$work/backup.tar.age"
if tar -tf "$work/backup.tar.age" >/dev/null 2>&1 || grep -q "INSERT INTO" "$work/backup.tar.age"; then
  echo "FAIL: archive is readable without the key"; exit 1
fi
mkdir "$work/out"
age -d -i "$work/key.txt" "$work/backup.tar.age" | tar -C "$work/out" -xf -

echo "restore  into empty target"
apply_migrations_if_missing "$(url "$target_db")" "$PWD" >/dev/null
target_is_empty "$(url "$target_db")" || { echo "FAIL: fresh target reported as not empty"; exit 1; }
restore_database "$(url "$target_db")" "$work/out/olu-backup-test"
count_rows "$(url "$target_db")" > "$work/restored.tsv"

if diff "$work/olu-backup-test/row-counts.tsv" "$work/restored.tsv"; then
  echo "pass: row counts identical ($(wc -l < "$work/restored.tsv") tables, $total rows)"
else
  echo "FAIL: row counts differ"; exit 1
fi
# Content check: a full data re-dump of both sides must be identical.
pg_dump "$(url "$source_db")" --data-only --schema=public --column-inserts --no-owner | grep -vE '^(--|\\(un)?restrict )' | sort > "$work/a.sql"
pg_dump "$(url "$target_db")" --data-only --schema=public --column-inserts --no-owner | grep -vE '^(--|\\(un)?restrict )' | sort > "$work/b.sql"
if cmp -s "$work/a.sql" "$work/b.sql"; then echo "pass: restored rows are byte-identical to the source"; else echo "FAIL: row contents differ"; diff "$work/a.sql" "$work/b.sql" | head -20; exit 1; fi
if target_is_empty "$(url "$target_db")"; then echo "FAIL: safety check doesn't see restored data"; exit 1; fi
echo "pass: restoring again is refused (target no longer empty)"
echo "Backup round-trip passed."
