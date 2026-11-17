-- memories_featured.test.sql — S5 + CR-03 (runs last).

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

-- Isolation: earlier files already used this hour's memory notification
-- (hourly grouping), so reset that state and age earlier fixtures.
update public.memories set created_at = created_at - interval '2 hours';
delete from public.notification_log where kind = 'memory';
select count(*) from public.claim_due_notifications(now() + interval '20 seconds') \g /dev/null

select test.act_as('authenticated', :partner);
select test.ok(not test.raises($$select public.set_memory_featured('40000000-0000-0000-0000-000000000001', true)$$), 'F partner features HIS published memory');
select test.ok((select is_featured and featured_at is not null from public.memories where id = '40000000-0000-0000-0000-000000000001'), 'F it is featured');
select test.ok(test.raises($$select public.set_memory_featured('40000000-0000-0000-0000-000000000002', true)$$), 'F partner cannot feature his draft (hidden from her)');
select test.ok(test.affected($$update public.memories set is_featured = true where id = '40000000-0000-0000-0000-000000000003'$$) = -1, 'F featuring only through the function');
select test.ok(test.affected($$update public.memories set caption = 'not mine' where id = '40000000-0000-0000-0000-000000000001'$$) = 0, 'F featuring grants no edit rights');
select test.ok(test.affected($$insert into public.memories (id, caption, photo_path, created_by) values ('40000000-0000-0000-0000-000000000077', 'x', 'memories/40000000-0000-0000-0000-000000000077/a.webp', '00000000-0000-0000-0000-00000000000a')$$) = -1, 'F cannot insert as the other (column grant)');
select test.ok(test.affected($$insert into public.memories (id, caption, photo_path) values ('40000000-0000-0000-0000-000000000078', 'her new memory', 'memories/40000000-0000-0000-0000-000000000078/a.webp')$$) = 1, 'F partner adds a memory');
select test.ok(test.affected($$update public.memories set caption = 'edited', taken_on = current_date where id = '40000000-0000-0000-0000-000000000078'$$) = 1, 'F partner edits her own');
reset role;

select test.act_as('authenticated', :owner);
select test.ok(not test.raises($$select public.set_memory_featured('40000000-0000-0000-0000-000000000078', true)$$), 'F owner features her memory');
select test.ok(not test.raises($$select public.set_memory_featured('40000000-0000-0000-0000-000000000001', false)$$), 'F and can unfeature');
select test.ok((select not is_featured and featured_at is null from public.memories where id = '40000000-0000-0000-0000-000000000001'), 'F unfeatured clears the date');
reset role;

select test.act_as('authenticated', :stranger);
select test.ok(test.raises($$select public.set_memory_featured('40000000-0000-0000-0000-000000000078', false)$$), 'F strangers cannot feature');
reset role;
select test.act_as('anon', null);
select test.ok(test.raises($$select public.set_memory_featured('40000000-0000-0000-0000-000000000078', false)$$), 'F anon cannot feature');
reset role;

create temp table claimed as select * from public.claim_due_notifications(now() + interval '21 seconds');
select test.ok((select count(*) from claimed where kind = 'memory' and user_id = :owner) = 1, 'N12 her new memory notifies him');
select test.ok((select count(*) from claimed where kind = 'memory' and user_id = :partner) = 0, 'N12 not herself');
select test.ok((select bool_and(body not like '%her new memory%') from claimed where kind = 'memory'), 'N12 caption stays private');

\echo 'memories_featured.test.sql: all assertions passed'
