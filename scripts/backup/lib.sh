#!/usr/bin/env bash
# Shared database steps for backup.sh, restore.sh and the local round-trip test
# (TD-013). Nothing here prints row data; logs show counts at most.
#
# Each function takes a libpq connection string. In CI that is the Supabase
# *session pooler* URI (GitHub runners have no IPv6, the direct host is IPv6-only).

# Dumps everything needed to rebuild the app's data:
#   schema.sql       public schema as it is live (reference / drift check; restore uses migrations)
#   public-data.sql  all rows of the app tables
#   auth-data.sql    the two sign-in accounts (auth.users + auth.identities)
dump_database() {
  local db_url="$1" dir="$2"
  local common=(--no-owner --no-privileges --quote-all-identifiers)
  pg_dump "$db_url" "${common[@]}" --schema-only --schema=public --file="$dir/schema.sql"
  # --column-inserts: named columns survive column-order differences between projects.
  pg_dump "$db_url" "${common[@]}" --data-only --column-inserts --schema=public --file="$dir/public-data.sql"
  pg_dump "$db_url" "${common[@]}" --data-only --column-inserts \
    --table=auth.users --table=auth.identities --file="$dir/auth-data.sql"
}

# Row count per app table as "table<TAB>count" lines, sorted (plus auth.users).
count_rows() {
  local db_url="$1"
  psql "$db_url" -X -A -t -q -F $'\t' -v ON_ERROR_STOP=1 <<'SQL'
select table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::bigint
  from information_schema.tables
 where table_schema = 'public' and table_type = 'BASE TABLE'
union all
select 'auth.users', count(*) from auth.users
 order by 1;
SQL
}

# True when the target has no accounts and no relationship yet (safe to restore into).
target_is_empty() {
  local db_url="$1" users relationships=0 has_table
  users=$(psql "$db_url" -X -A -t -q -v ON_ERROR_STOP=1 -c "select count(*) from auth.users")
  has_table=$(psql "$db_url" -X -A -t -q -v ON_ERROR_STOP=1 -c "select to_regclass('public.relationship') is not null")
  if [[ "$has_table" == "t" ]]; then
    relationships=$(psql "$db_url" -X -A -t -q -v ON_ERROR_STOP=1 -c "select count(*) from public.relationship")
  fi
  [[ "$users" == "0" && "$relationships" == "0" ]]
}

# Applies supabase/migrations/*.sql in order, if the app schema isn't there yet.
apply_migrations_if_missing() {
  local db_url="$1" repo_root="$2" exists
  exists=$(psql "$db_url" -X -A -t -q -v ON_ERROR_STOP=1 -c "select to_regclass('public.relationship') is not null")
  if [[ "$exists" == "t" ]]; then
    echo "App schema already present; skipping migrations."
    return
  fi
  local migration
  for migration in "$repo_root"/supabase/migrations/*.sql; do
    echo "migrate  $(basename "$migration")"
    psql "$db_url" -X -q -v ON_ERROR_STOP=1 --file="$migration" >/dev/null
  done
}

# Loads a dump into the target in one transaction. Triggers and FK checks are
# off while loading (session_replication_role = replica, as in Supabase's own
# restore guide) so rows load in any order and no notification fires. Rows the
# migrations seeded (e.g. the question bank) are replaced by the backup's rows.
restore_database() {
  local db_url="$1" dir="$2"
  psql "$db_url" -X -q -v ON_ERROR_STOP=1 --single-transaction \
    -c "set session_replication_role = replica" \
    -c "do \$\$ declare t text; begin
          select string_agg(format('public.%I', tablename), ', ') into t from pg_tables where schemaname = 'public';
          if t is not null then execute 'truncate table ' || t || ' restart identity cascade'; end if;
        end \$\$" \
    --file="$dir/auth-data.sql" \
    --file="$dir/public-data.sql" >/dev/null
}
