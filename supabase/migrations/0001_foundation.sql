-- 0001_foundation.sql
-- Enums and shared helper functions. See docs/database/DATABASE-DESIGN.md §2–3.

create type public.member_role as enum ('owner', 'partner');
create type public.content_status as enum ('draft', 'published');
create type public.unlock_type as enum ('on_demand', 'scheduled');

-- Maintains updated_at on every table that has it.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when tz is a timezone name known to Postgres (IANA database).
create function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.is_valid_timezone(text) from public, anon;
