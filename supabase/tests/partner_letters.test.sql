-- partner_letters.test.sql — CR-01: both members write letters for each other.
-- Runs after security.test.sql in the same database (shares its fixtures/helpers).

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

-- Fresh letters authored by the partner (inserted as the database owner).
insert into public.letters (id, label, unlock_type, unlock_at, status, created_by) values
  ('50000000-0000-0000-0000-000000000001', 'For you, someday', 'scheduled', now() + interval '5 days', 'published', :partner),
  ('50000000-0000-0000-0000-000000000002', 'For you, anytime', 'on_demand', null, 'published', :partner),
  ('50000000-0000-0000-0000-000000000003', 'Her unfinished draft', 'on_demand', null, 'draft', :partner);
insert into public.letter_contents (letter_id, body, photo_path) values
  ('50000000-0000-0000-0000-000000000001', 'HER SECRET future body', 'letters/50000000-0000-0000-0000-000000000001/p.webp'),
  ('50000000-0000-0000-0000-000000000002', 'her anytime body', null),
  ('50000000-0000-0000-0000-000000000003', 'HER SECRET draft body', null);
insert into storage.objects (bucket_id, name, owner_id) values
  ('media', 'letters/50000000-0000-0000-0000-000000000001/p.webp', :partner);

-- ------------------------------------------------------------ partner writes
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.letters (id, label) values ('50000000-0000-0000-0000-000000000010', 'Written by her')$$) = 1,
  'CR1 partner creates a letter');
select test.ok(test.affected($$insert into public.letter_contents (letter_id, body) values ('50000000-0000-0000-0000-000000000010', 'hello')$$) = 1,
  'CR1 partner writes its content');
select test.ok((select created_by from public.letters where id = '50000000-0000-0000-0000-000000000010') = '00000000-0000-0000-0000-00000000000b',
  'CR1 created_by defaults to the author');
select test.ok(test.affected($$insert into public.letters (label, created_by) values ('forged', '00000000-0000-0000-0000-00000000000a')$$) = -1,
  'CR1 partner cannot create a letter as the owner');
select test.ok(test.affected($$update public.letters set label = 'mine now' where id = '50000000-0000-0000-0000-000000000002'$$) = 1,
  'CR1 partner edits her own letter');
select test.ok(test.affected($$update public.letters set first_opened_at = now() where id = '50000000-0000-0000-0000-000000000002'$$) = -1,
  'CR1 authors cannot set read status directly');
select test.ok(test.count_rows($$select * from public.letter_contents where letter_id = '50000000-0000-0000-0000-000000000001'$$) = 1,
  'CR1 partner reads her own locked content');
select test.ok(test.count_rows($$select * from public.letters where id = '50000000-0000-0000-0000-000000000003'$$) = 1,
  'CR1 partner sees her own draft');
select test.ok((select body from public.open_letter('50000000-0000-0000-0000-000000000001')) = 'HER SECRET future body',
  'CR1 author previews her own locked letter');
select test.ok((select first_opened_at is null from public.letters where id = '50000000-0000-0000-0000-000000000001'),
  'CR1 author preview does not mark it read');
select test.ok(test.count_rows($$select * from storage.objects where name like 'letters/50000000-0000-0000-0000-000000000001/%'$$) = 1,
  'CR1 author sees her own letter photo');
select test.ok(test.affected($$insert into storage.objects (bucket_id, name, owner_id) values ('media', 'letters/50000000-0000-0000-0000-000000000099/a.webp', '00000000-0000-0000-0000-00000000000b')$$) = 1,
  'CR1 partner uploads into a new letter folder');
select test.ok(test.affected($$insert into storage.objects (bucket_id, name, owner_id) values ('media', 'letters/20000000-0000-0000-0000-000000000001/x.webp', '00000000-0000-0000-0000-00000000000b')$$) = -1,
  'CR1 partner still cannot upload into owner letter folders');
select test.ok(test.affected($$update public.letters set label = 'x' where id = '20000000-0000-0000-0000-000000000001'$$) = 0,
  'CR1 partner still cannot edit owner letters');
select test.ok(test.affected($$delete from public.letters where id = '20000000-0000-0000-0000-000000000001'$$) = 0,
  'CR1 partner cannot delete owner letters');
reset role;

-- ------------------------------------------------------------- owner reads
select test.act_as('authenticated', :owner);
select test.ok(test.count_rows($$select * from public.letters where id = '50000000-0000-0000-0000-000000000003'$$) = 0,
  'CR1 owner cannot see her drafts');
select test.ok(test.count_rows($$select * from public.letters where id = '50000000-0000-0000-0000-000000000001'$$) = 1,
  'CR1 owner sees her published envelope');
select test.ok(test.count_rows($$select * from public.letter_contents where letter_id::text like '5%'$$) = 0,
  'CR1 owner reads none of her letter contents via the table API');
select test.ok(test.raises($$select * from public.open_letter('50000000-0000-0000-0000-000000000001')$$),
  'CR1 owner cannot open her letter before it unlocks');
select test.ok(test.count_rows($$select * from storage.objects where name like 'letters/50000000-0000-0000-0000-000000000001/%'$$) = 0,
  'CR1 owner cannot see her locked letter photo');
select test.ok((select author_id from public.open_letter('50000000-0000-0000-0000-000000000002')) = '00000000-0000-0000-0000-00000000000b',
  'CR1 owner opens her anytime letter; author returned');
select test.ok((select first_opened_at is not null from public.letters where id = '50000000-0000-0000-0000-000000000002'),
  'CR1 owner opening her letter records read status');
select test.ok(test.affected($$update public.letters set label = 'edited by owner' where id = '50000000-0000-0000-0000-000000000002'$$) = 0,
  'CR1 owner cannot edit her letters');
select test.ok(test.affected($$update public.letter_contents set body = 'x' where letter_id = '50000000-0000-0000-0000-000000000002'$$) = 0,
  'CR1 owner cannot rewrite her letter content');
select test.ok(test.affected($$update storage.objects set owner_id = 'x' where name like 'letters/50000000-0000-0000-0000-000000000001/%'$$) = 0,
  'CR1 owner cannot overwrite her letter files');
select test.ok(test.affected($$delete from public.letters where id = '50000000-0000-0000-0000-000000000002'$$) = 1,
  'CR1 owner deletes a letter she wrote');
select test.ok(test.affected($$delete from public.letters where id = '50000000-0000-0000-0000-000000000003'$$) = 0,
  'CR1 owner cannot delete a draft he cannot see');
select test.ok(test.count_rows($$select * from public.letter_contents where letter_id = '20000000-0000-0000-0000-000000000001'$$) = 1,
  'CR1 owner still reads his own letter contents');
reset role;

-- ----------------------------------------------------------- stranger
select test.act_as('authenticated', :stranger);
select test.ok(test.affected($$insert into public.letters (label) values ('intruder')$$) = -1, 'CR1 stranger cannot write letters');
select test.ok(test.raises($$select * from public.open_letter('50000000-0000-0000-0000-000000000001')$$), 'CR1 stranger cannot open letters');
reset role;

-- Time-based unlock for the owner as recipient.
update public.letters set unlock_at = now() - interval '1 second' where id = '50000000-0000-0000-0000-000000000001';
select test.act_as('authenticated', :owner);
select test.ok((select body from public.open_letter('50000000-0000-0000-0000-000000000001')) = 'HER SECRET future body',
  'CR1 her scheduled letter opens for the owner once due');
select test.ok(test.count_rows($$select * from storage.objects where name like 'letters/50000000-0000-0000-0000-000000000001/%'$$) = 1,
  'CR1 its photo becomes visible to the owner once due');
reset role;

\echo 'partner_letters.test.sql: all assertions passed'
