-- shared_story.test.sql — CR-02: both members add to Our Story (author model).
-- Runs after the other test files in the same database.

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''

select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.story_milestones (id, title, occurred_on, status) values ('60000000-0000-0000-0000-000000000001', 'Her milestone', '2025-02-01', 'published')$$) = 1,
  'CR2 partner adds a published milestone');
select test.ok(test.affected($$insert into public.story_milestones (id, title, occurred_on, status) values ('60000000-0000-0000-0000-000000000002', 'Her draft', '2025-02-02', 'draft')$$) = 1,
  'CR2 partner adds a draft milestone');
select test.ok(test.affected($$insert into public.story_milestones (title, occurred_on, created_by) values ('forged', '2025-02-03', '00000000-0000-0000-0000-00000000000a')$$) = -1,
  'CR2 partner cannot add a milestone as the owner');
select test.ok(test.affected($$update public.story_milestones set caption = 'edited' where id = '60000000-0000-0000-0000-000000000001'$$) = 1,
  'CR2 partner edits her own milestone');
select test.ok(test.affected($$update public.story_milestones set created_by = '00000000-0000-0000-0000-00000000000a' where id = '60000000-0000-0000-0000-000000000001'$$) = -1,
  'CR2 partner cannot reassign ownership');
select test.ok(test.affected($$update public.story_milestones set title = 'x' where id = '30000000-0000-0000-0000-000000000001'$$) = 0,
  'CR2 partner cannot edit owner milestones');
select test.ok(test.affected($$delete from public.story_milestones where id = '30000000-0000-0000-0000-000000000001'$$) = 0,
  'CR2 partner cannot delete owner milestones');
select test.ok(test.count_rows($$select * from public.story_milestones where id = '30000000-0000-0000-0000-000000000002'$$) = 0,
  'CR2 partner still cannot see owner drafts');
select test.ok(test.affected($$insert into storage.objects (bucket_id, name, owner_id) values ('media', 'story/60000000-0000-0000-0000-000000000001/a.webp', '00000000-0000-0000-0000-00000000000b')$$) = 1,
  'CR2 partner uploads a photo for her milestone');
select test.ok(test.affected($$insert into storage.objects (bucket_id, name, owner_id) values ('media', 'story/30000000-0000-0000-0000-000000000001/x.webp', '00000000-0000-0000-0000-00000000000b')$$) = -1,
  'CR2 partner cannot upload into owner milestone folders');
reset role;

select test.act_as('authenticated', :owner);
select test.ok(test.count_rows($$select * from public.story_milestones where id = '60000000-0000-0000-0000-000000000001'$$) = 1,
  'CR2 owner sees her published milestone');
select test.ok(test.count_rows($$select * from public.story_milestones where id = '60000000-0000-0000-0000-000000000002'$$) = 0,
  'CR2 owner cannot see her drafts');
select test.ok(test.count_rows($$select * from storage.objects where name like 'story/60000000-0000-0000-0000-000000000001/%'$$) = 1,
  'CR2 owner sees her milestone photo');
select test.ok(test.affected($$update public.story_milestones set title = 'owner edit' where id = '60000000-0000-0000-0000-000000000001'$$) = 0,
  'CR2 owner cannot edit her milestones');
select test.ok(test.affected($$update storage.objects set owner_id = 'x' where name like 'story/60000000-0000-0000-0000-000000000001/%'$$) = 0,
  'CR2 owner cannot overwrite her files');
select test.ok(test.affected($$delete from storage.objects where name like 'story/60000000-0000-0000-0000-000000000001/%'$$) = 1,
  'CR2 owner can remove her milestone photo');
select test.ok(test.affected($$delete from public.story_milestones where id = '60000000-0000-0000-0000-000000000001'$$) = 1,
  'CR2 owner removes her milestone');
select test.ok(test.affected($$delete from public.story_milestones where id = '60000000-0000-0000-0000-000000000002'$$) = 0,
  'CR2 owner cannot remove a draft he cannot see');
select test.ok(test.count_rows($$select * from storage.objects where name like 'memories/40000000-0000-0000-0000-000000000002/%'$$) = 1,
  'CR2 owner still sees his own draft memory photo');
reset role;

select test.act_as('authenticated', :partner);
select test.ok(test.count_rows($$select * from storage.objects where name like 'memories/40000000-0000-0000-0000-000000000002/%'$$) = 0,
  'CR2 partner still cannot see owner draft memory photo');
select test.ok(test.affected($$delete from public.story_milestones where id = '60000000-0000-0000-0000-000000000002'$$) = 1,
  'CR2 partner deletes her own draft');
reset role;

\echo 'shared_story.test.sql: all assertions passed'
