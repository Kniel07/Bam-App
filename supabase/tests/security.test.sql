-- security.test.sql — RLS, RPC and storage policy tests (DATABASE-DESIGN §9).
-- Runs as the database superuser, switching to API roles per test.
-- Any failed assertion raises an exception and stops the run (ON_ERROR_STOP).

\set ON_ERROR_STOP 1
\set QUIET 1

-- ---------------------------------------------------------------- helpers
create schema test;
grant usage on schema test to anon, authenticated, service_role;

create function test.ok(condition boolean, label text) returns void
language plpgsql as $$
begin
  if condition is distinct from true then
    raise exception 'FAIL: %', label;
  end if;
  raise notice 'pass: %', label;
end;
$$;

-- Number of rows a query returns, run with the caller's privileges.
create function test.count_rows(query text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute format('select count(*) from (%s) q', query) into n;
  return n;
end;
$$;

-- Rows affected by a DML statement; errors count as -1 (denied).
create function test.affected(statement text) returns integer
language plpgsql as $$
declare n integer;
begin
  execute statement;
  get diagnostics n = row_count;
  return n;
exception when others then
  return -1;
end;
$$;

-- True if the statement raises any error.
create function test.raises(statement text) returns boolean
language plpgsql as $$
begin
  execute statement;
  return false;
exception when others then
  return true;
end;
$$;

grant execute on all functions in schema test to anon, authenticated, service_role;

-- Switch identity: role + JWT subject.
create function test.act_as(p_role text, p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_user is null then '' else json_build_object('sub', p_user)::text end, false);
  execute format('set role %I', p_role);
end;
$$;
grant execute on function test.act_as(text, uuid) to anon, authenticated, service_role;

-- --------------------------------------------------------------- fixtures
-- Fixed test identities (not real people).
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

insert into auth.users (id, email) values
  (:owner, 'owner@example.com'),
  (:partner, 'partner@example.com'),
  (:stranger, 'stranger@example.com');

select test.ok((select count(*) from public.profiles) = 3, 'profiles auto-created for new auth users');

insert into public.relationship (id, start_at, timezone, counter_message)
values ('10000000-0000-0000-0000-000000000001', '2020-01-31 00:30:00+00', 'UTC', 'test message');

insert into public.relationship_members (user_id, relationship_id, role) values
  (:owner, '10000000-0000-0000-0000-000000000001', 'owner'),
  (:partner, '10000000-0000-0000-0000-000000000001', 'partner');

-- Letters: L1 on-demand published, L2 future scheduled, L3 past scheduled, L4 draft.
insert into public.letters (id, label, unlock_type, unlock_at, status, created_by) values
  ('20000000-0000-0000-0000-000000000001', 'Open when you miss me', 'on_demand', null, 'published', :owner),
  ('20000000-0000-0000-0000-000000000002', 'Open on our monthsary', 'scheduled', now() + interval '3 days', 'published', :owner),
  ('20000000-0000-0000-0000-000000000003', 'Open on the last one', 'scheduled', now() - interval '1 hour', 'published', :owner),
  ('20000000-0000-0000-0000-000000000004', 'Unfinished letter', 'on_demand', null, 'draft', :owner);

insert into public.letter_contents (letter_id, body, photo_path) values
  ('20000000-0000-0000-0000-000000000001', 'body one', null),
  ('20000000-0000-0000-0000-000000000002', 'SECRET future body', 'letters/20000000-0000-0000-0000-000000000002/p.webp'),
  ('20000000-0000-0000-0000-000000000003', 'body three', 'letters/20000000-0000-0000-0000-000000000003/p.webp'),
  ('20000000-0000-0000-0000-000000000004', 'SECRET draft body', null);

insert into public.story_milestones (id, title, occurred_on, status, created_by) values
  ('30000000-0000-0000-0000-000000000001', 'Published milestone', '2020-01-31', 'published', :owner),
  ('30000000-0000-0000-0000-000000000002', 'Draft milestone', '2020-02-14', 'draft', :owner);

insert into public.memories (id, caption, photo_path, status, created_by) values
  ('40000000-0000-0000-0000-000000000001', 'owner memory', 'memories/40000000-0000-0000-0000-000000000001/a.webp', 'published', :owner),
  ('40000000-0000-0000-0000-000000000002', 'owner draft memory', 'memories/40000000-0000-0000-0000-000000000002/a.webp', 'draft', :owner),
  ('40000000-0000-0000-0000-000000000003', 'partner memory', 'memories/40000000-0000-0000-0000-000000000003/a.webp', 'published', :partner);

insert into storage.objects (bucket_id, name, owner_id) values
  ('media', 'letters/20000000-0000-0000-0000-000000000002/p.webp', :owner),
  ('media', 'letters/20000000-0000-0000-0000-000000000003/p.webp', :owner),
  ('media', 'memories/40000000-0000-0000-0000-000000000001/a.webp', :owner),
  ('media', 'memories/40000000-0000-0000-0000-000000000002/a.webp', :owner),
  ('media', 'memories/40000000-0000-0000-0000-000000000003/a.webp', :partner);

insert into auth.sessions (user_id) values (:owner), (:partner), (:partner);

-- ----------------------------------------------------------- constraints
select test.ok(test.raises($$insert into public.relationship (start_at, timezone) values (now(), 'UTC')$$),
  'singleton: a second relationship row is rejected');
select test.ok(test.raises($$update public.relationship set timezone = 'Mars/Olympus'$$),
  'invalid IANA timezone is rejected');
select test.ok(test.raises($$insert into public.letters (label, unlock_type) values ('x', 'scheduled')$$),
  'scheduled letter without unlock_at is rejected');
select test.ok(test.raises($$insert into public.memories (caption, photo_path) values ('x', 'memories/not-this-row/a.webp')$$),
  'memory photo_path must live under its own id');

-- ------------------------------------------------------------ S1: anon
select test.act_as('anon', null);
select test.ok(test.raises('select * from public.relationship'), 'S1 anon cannot read relationship');
select test.ok(test.raises('select * from public.letters'), 'S1 anon cannot read letters');
select test.ok(test.raises('select * from public.letter_contents'), 'S1 anon cannot read letter_contents');
select test.ok(test.raises('select * from public.memories'), 'S1 anon cannot read memories');
select test.ok(test.raises('select * from public.profiles'), 'S1 anon cannot read profiles');
select test.ok(test.raises($$select * from public.open_letter('20000000-0000-0000-0000-000000000001')$$), 'S1 anon cannot call open_letter');
select test.ok(test.count_rows('select * from storage.objects') = 0, 'S1 anon sees no storage objects');
select test.ok(public.keepalive() = 1, 'keepalive callable by anon');
reset role;

-- -------------------------------------------------------- S2: stranger
select test.act_as('authenticated', :stranger);
select test.ok(test.count_rows('select * from public.relationship') = 0, 'S2 stranger sees no relationship');
select test.ok(test.count_rows('select * from public.letters') = 0, 'S2 stranger sees no letters');
select test.ok(test.count_rows('select * from public.memories') = 0, 'S2 stranger sees no memories');
select test.ok(test.count_rows('select * from public.story_milestones') = 0, 'S2 stranger sees no milestones');
select test.ok(test.count_rows('select * from public.profiles') = 0, 'S2 stranger sees no profiles');
select test.ok(test.count_rows('select * from storage.objects') = 0, 'S2 stranger sees no files');
select test.ok(test.raises($$select * from public.open_letter('20000000-0000-0000-0000-000000000001')$$), 'S2 stranger open_letter refused');
select test.ok(test.affected($$insert into public.memories (id, caption, photo_path) values ('40000000-0000-0000-0000-0000000000ff', 'x', 'memories/40000000-0000-0000-0000-0000000000ff/a.webp')$$) = -1,
  'S2 stranger cannot add memories');
reset role;

-- --------------------------------------------------------- partner
select test.act_as('authenticated', :partner);

select test.ok(test.count_rows('select * from public.letter_contents') = 0, 'S3 partner reads zero letter_contents rows');
select test.ok(test.count_rows('select * from public.letters') = 3, 'partner sees 3 published envelopes, not the draft');
select test.ok(test.raises($$select * from public.open_letter('20000000-0000-0000-0000-000000000002')$$), 'S4 future scheduled letter refused');
select test.ok(test.raises($$select * from public.open_letter('20000000-0000-0000-0000-000000000004')$$), 'S5 draft letter refused');
select test.ok((select body from public.open_letter('20000000-0000-0000-0000-000000000001')) = 'body one', 'S6 on-demand letter opens');
select test.ok((select body from public.open_letter('20000000-0000-0000-0000-000000000003')) = 'body three', 'S6 past scheduled letter opens');
select test.ok((select first_opened_at is not null from public.letters where id = '20000000-0000-0000-0000-000000000001'), 'S6 first_opened_at recorded');

select test.ok(test.count_rows($$select * from storage.objects where name like 'letters/20000000-0000-0000-0000-000000000002/%'$$) = 0, 'S7 locked letter photo invisible');
select test.ok(test.count_rows($$select * from storage.objects where name like 'letters/20000000-0000-0000-0000-000000000003/%'$$) = 1, 'unlocked letter photo visible');
select test.ok(test.count_rows($$select * from storage.objects where name like 'memories/40000000-0000-0000-0000-000000000002/%'$$) = 0, 'owner draft memory photo invisible');

select test.ok(test.affected($$update public.memories set caption = 'hacked' where id = '40000000-0000-0000-0000-000000000001'$$) = 0, 'S8 partner cannot edit owner memory');
select test.ok(test.affected($$delete from public.memories where id = '40000000-0000-0000-0000-000000000001'$$) = 0, 'S8 partner cannot delete owner memory');
select test.ok(test.affected($$update public.memories set caption = 'mine, edited' where id = '40000000-0000-0000-0000-000000000003'$$) = 1, 'partner edits own memory');
select test.ok(test.affected($$update public.memories set created_by = '00000000-0000-0000-0000-00000000000a' where id = '40000000-0000-0000-0000-000000000003'$$) = -1, 'partner cannot reassign memory ownership');
select test.ok(test.affected($$insert into public.memories (id, caption, photo_path, created_by) values ('40000000-0000-0000-0000-000000000010', 'x', 'memories/40000000-0000-0000-0000-000000000010/a.webp', '00000000-0000-0000-0000-00000000000a')$$) = -1, 'S9 partner cannot insert as owner');
select test.ok(test.affected($$insert into public.memories (id, caption, photo_path, status) values ('40000000-0000-0000-0000-000000000011', 'x', 'memories/40000000-0000-0000-0000-000000000011/a.webp', 'draft')$$) = -1, 'S10 partner cannot insert draft memory');
select test.ok(test.affected($$insert into public.memories (id, caption, photo_path) values ('40000000-0000-0000-0000-000000000012', 'new one', 'memories/40000000-0000-0000-0000-000000000012/a.webp')$$) = 1, 'partner adds a memory');

select test.ok(test.affected($$update public.letters set status = 'published' where id = '20000000-0000-0000-0000-000000000004'$$) = 0, 'S11 partner cannot update letters');
select test.ok(test.affected($$update public.letters set unlock_at = now() - interval '1 day' where id = '20000000-0000-0000-0000-000000000002'$$) = 0, 'S11 partner cannot move unlock dates');
select test.ok(test.affected($$update public.relationship set counter_message = 'x'$$) = 0, 'S11 partner cannot update relationship');
select test.ok(test.affected($$insert into public.letter_contents (letter_id, body) values ('20000000-0000-0000-0000-000000000002', 'x')$$) = -1, 'partner cannot write letter_contents');
select test.ok(test.count_rows('select * from public.story_milestones') = 1, 'S12 partner sees only published milestones');
select test.ok(test.affected($$insert into public.relationship_members (user_id, relationship_id, role) values ('00000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-000000000001', 'partner')$$) = -1, 'S13 partner cannot add members');
select test.ok(test.affected($$update public.profiles set welcomed_at = now()$$) = -1, 'partner cannot write welcomed_at directly');
select test.ok(test.affected($$update public.profiles set display_name = 'x' where id = '00000000-0000-0000-0000-00000000000a'$$) = 0, 'partner cannot rename owner');
select test.ok(test.raises('select public.revoke_partner_sessions()'), 'partner cannot revoke sessions');

-- Storage writes
select test.ok(test.affected($$insert into storage.objects (bucket_id, name, owner_id) values ('media', 'memories/40000000-0000-0000-0000-000000000099/b.webp', '00000000-0000-0000-0000-00000000000b')$$) = 1, 'partner uploads into a new memory folder');
select test.ok(test.affected($$insert into storage.objects (bucket_id, name, owner_id) values ('media', 'memories/40000000-0000-0000-0000-000000000001/x.webp', '00000000-0000-0000-0000-00000000000b')$$) = -1, 'partner cannot upload into owner memory folder');
select test.ok(test.affected($$insert into storage.objects (bucket_id, name, owner_id) values ('media', 'letters/20000000-0000-0000-0000-000000000001/x.webp', '00000000-0000-0000-0000-00000000000b')$$) = -1, 'partner cannot upload letter files');
select test.ok(test.affected($$delete from storage.objects where name = 'memories/40000000-0000-0000-0000-000000000001/a.webp'$$) = 0, 'partner cannot delete owner memory file');
select test.ok(test.affected($$delete from storage.objects where name = 'memories/40000000-0000-0000-0000-000000000003/a.webp'$$) = 1, 'partner deletes own memory file');

select public.mark_welcomed();
reset role;
select test.ok((select welcomed_at is not null from public.profiles where id = :partner), 'mark_welcomed sets welcomed_at');

-- --------------------------------------------------------------- owner
select test.act_as('authenticated', :owner);
select test.ok(test.count_rows('select * from public.letter_contents') = 4, 'S14 owner reads all letter contents');
select test.ok(test.count_rows('select * from public.story_milestones') = 2, 'S14 owner sees drafts');
select test.ok((select body from public.open_letter('20000000-0000-0000-0000-000000000002')) = 'SECRET future body', 'owner previews locked letter');
select test.ok((select first_opened_at is null from public.letters where id = '20000000-0000-0000-0000-000000000002'), 'owner preview does not mark as read');
select test.ok(test.affected($$update public.letters set label = 'Edited' where id = '20000000-0000-0000-0000-000000000004'$$) = 1, 'S14 owner edits letters');
select test.ok(test.affected($$update public.memories set caption = 'tidied' where id = '40000000-0000-0000-0000-000000000003'$$) = 1, 'S14 owner can edit partner memory');
select test.ok(test.affected($$update public.relationship set counter_message = 'Every day with you'$$) = 1, 'S14 owner updates settings');
select test.ok(test.affected($$insert into public.story_milestones (title, occurred_on) values ('New', current_date)$$) = 1, 'S14 owner adds milestone');
select test.ok(test.affected($$delete from public.letters where id = '20000000-0000-0000-0000-000000000004'$$) = 1, 'S14 owner deletes letter');
select test.ok(test.affected($$update public.relationship_members set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000b'$$) = -1, 'S13 even owner cannot change membership via API');
select test.ok(test.raises('select public.revoke_partner_sessions()'), 'owner (authenticated) cannot revoke sessions via API');
reset role;

select test.ok((select count(*) from public.letter_contents where letter_id = '20000000-0000-0000-0000-000000000004') = 0, 'deleting a letter cascades to its content');

-- ---------------------------------------------------------- service role
set role service_role;
select test.ok(public.revoke_partner_sessions() = 2, 'service_role revokes exactly the partner sessions');
reset role;
select test.ok((select count(*) from auth.sessions) = 1, 'owner session untouched by revocation');

-- ------------------------------------------------- time-based unlocking
-- Move the future letter into the past (as the database owner) and confirm it opens.
update public.letters set unlock_at = now() - interval '1 second'
 where id = '20000000-0000-0000-0000-000000000002';
select test.act_as('authenticated', :partner);
select test.ok((select body from public.open_letter('20000000-0000-0000-0000-000000000002')) = 'SECRET future body', 'scheduled letter opens once due');
select test.ok(test.count_rows($$select * from storage.objects where name like 'letters/20000000-0000-0000-0000-000000000002/%'$$) = 1, 'its photo becomes visible once due');
reset role;

\echo 'security.test.sql: all assertions passed'
