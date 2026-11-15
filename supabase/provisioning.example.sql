-- provisioning.example.sql — TEMPLATE. Run once per environment in the
-- Supabase SQL editor AFTER applying migrations and creating the two auth users
-- (Authentication → Users → Add user, "Auto confirm" on).
--
-- Copy into the SQL editor, replace every <PLACEHOLDER>, run, then discard.
-- NEVER save the filled-in version in this repository (public; see TD-016).

begin;

insert into public.relationship (start_at, timezone, counter_message)
values (
  '<YYYY-MM-DD HH:MM:SS>',      -- the anchor moment, local wall-clock time
  '<IANA_TIMEZONE>',           -- e.g. Region/City
  '<COUNTER_MESSAGE>'
);
-- start_at is interpreted in the session timezone; convert explicitly:
update public.relationship
   set start_at = ('<YYYY-MM-DD HH:MM:SS>'::timestamp at time zone '<IANA_TIMEZONE>');

insert into public.relationship_members (user_id, relationship_id, role)
select u.id, r.id, 'owner'
  from auth.users u, public.relationship r
 where u.email = '<OWNER_EMAIL>';

insert into public.relationship_members (user_id, relationship_id, role)
select u.id, r.id, 'partner'
  from auth.users u, public.relationship r
 where u.email = '<PARTNER_LOGIN_ADDRESS>';  -- synthetic address (TD-018)

-- Sanity check: expect exactly 2 rows (owner, partner).
select m.role, u.email from public.relationship_members m join auth.users u on u.id = m.user_id;

commit;
