#!/usr/bin/env bash
# Applies all migrations to a throwaway database and runs the SQL security tests.
# Uses PGHOST/PGUSER/PGPASSWORD when set (CI); otherwise the local Postgres 16
# cluster (started automatically when running as root, via the postgres user).
set -euo pipefail
cd "$(dirname "$0")/../.."

DB="olu_test_$$"

if [[ -n "${PGHOST:-}" ]]; then
  PSQL=(psql -X -v ON_ERROR_STOP=1 -q)
elif [[ "$(id -u)" -eq 0 ]]; then
  pg_ctlcluster 16 main start 2>/dev/null || true
  PSQL=(runuser -u postgres -- psql -X -v ON_ERROR_STOP=1 -q)
else
  PSQL=(psql -X -v ON_ERROR_STOP=1 -q)
fi

"${PSQL[@]}" -d postgres -c "create database $DB" >/dev/null
cleanup() { "${PSQL[@]}" -d postgres -c "drop database if exists $DB" >/dev/null 2>&1 || true; }
trap cleanup EXIT

run_file() { "${PSQL[@]}" -d "$DB" < "$1"; }

run_file supabase/tests/stub/supabase_stub.sql
for migration in supabase/migrations/*.sql; do
  echo "migrate  $(basename "$migration")"
  run_file "$migration"
done
# Test files share fixtures, so they run in a fixed order.
for test_file in supabase/tests/security.test.sql supabase/tests/partner_letters.test.sql supabase/tests/shared_story.test.sql supabase/tests/notifications.test.sql supabase/tests/nudges.test.sql supabase/tests/test_notifications.test.sql supabase/tests/activities.test.sql supabase/tests/questions_reasons.test.sql supabase/tests/memories_featured.test.sql; do
  echo "test     $(basename "$test_file")"
  run_file "$test_file" 2>&1 | grep -E "FAIL|pass:|passed|ERROR" | sed 's/^psql:<stdin>:[0-9]*: //'
done
echo "All database tests passed."
