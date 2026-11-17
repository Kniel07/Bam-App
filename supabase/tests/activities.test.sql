-- activities.test.sql — CR-06 batch A (runs last).

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

-- Isolate from earlier files: age their nudges (as the database owner) past the
-- double-tap guard and the notification windows, then clear pending events.
update public.nudges set created_at = created_at - interval '2 hours';
select count(*) from public.claim_due_notifications(now() + interval '2 seconds') \g /dev/null

-- ------------------------------------------------------------ hold-to-hug
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.nudges (kind, hug_seconds) values ('hug', 5)$$) = 1, 'HUG a 5-second hug is sent');
select test.ok(test.affected($$insert into public.nudges (kind, hug_seconds) values ('good_night', 5)$$) = -1, 'HUG seconds only on hugs');
select test.ok(test.affected($$insert into public.nudges (kind, hug_seconds) values ('thinking_of_you', null)$$) = 1, 'HUG other nudges unaffected');
reset role;
select test.act_as('authenticated', :owner);
select test.ok(test.affected($$insert into public.nudges (kind, hug_seconds) values ('hug', 99)$$) = -1, 'HUG capped at 30 seconds');
reset role;

-- ---------------------------------------------------------------- moods
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.moods (mood, note) values ('sleepy', 'long day')$$) = 1, 'MOOD partner checks in');
select test.ok(test.affected($$insert into public.moods (mood) values ('happy')$$) = -1, 'MOOD one check-in per minute');
select test.ok(test.affected($$insert into public.moods (mood, user_id) values ('happy', '00000000-0000-0000-0000-00000000000a')$$) = -1, 'MOOD cannot check in as the other');
select test.ok(test.affected($$insert into public.moods (mood) values ('furious_dragon')$$) = -1, 'MOOD unknown moods rejected');
reset role;
select test.act_as('authenticated', :owner);
select test.ok(test.affected($$insert into public.moods (mood, note) values ('loving', repeat('x', 81))$$) = -1, 'MOOD note capped at 80 characters');
select test.ok(test.count_rows('select * from public.moods') = 1, 'MOOD owner sees her mood');
reset role;
select test.act_as('authenticated', :stranger);
select test.ok(test.count_rows('select * from public.moods') = 0, 'MOOD strangers see nothing');
reset role;

-- ------------------------------------------------------------ countdowns
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.countdowns (id, title, target_at) values ('80000000-0000-0000-0000-000000000001', 'Our trip', now() + interval '12 days')$$) = 1, 'CD partner adds a countdown');
select test.ok(test.affected($$insert into public.countdowns (title, target_at) values ('Already past', now() - interval '1 hour')$$) = -1, 'CD past targets refused');
select test.ok(test.affected($$update public.countdowns set title = 'Our big trip' where id = '80000000-0000-0000-0000-000000000001'$$) = 1, 'CD author edits her own');
reset role;
select test.act_as('authenticated', :owner);
select test.ok(test.count_rows('select * from public.countdowns') = 1, 'CD owner sees it');
select test.ok(test.affected($$update public.countdowns set title = 'mine now' where id = '80000000-0000-0000-0000-000000000001'$$) = 0, 'CD owner cannot edit hers');
select test.ok(test.affected($$insert into public.countdowns (id, title, target_at) values ('80000000-0000-0000-0000-000000000002', 'See you', now() + interval '3 days')$$) = 1, 'CD owner adds one');
reset role;
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$delete from public.countdowns where id = '80000000-0000-0000-0000-000000000002'$$) = 0, 'CD partner cannot delete his');
reset role;
select test.act_as('authenticated', :stranger);
select test.ok(test.affected($$insert into public.countdowns (title, target_at) values ('x', now() + interval '1 day')$$) = -1, 'CD strangers cannot add');
reset role;

-- ------------------------------------------------- notifications N4/N6/N7/N8
create temp table claimed as select * from public.claim_due_notifications(now() + interval '3 seconds');
select test.ok((select body from claimed where kind = 'nudge_hug' and user_id = :owner) = '🤗 A 5-second hug for you', 'N4 hug notification carries its length');
select test.ok((select count(*) from claimed where kind = 'mood' and user_id = :owner) = 1, 'N7 her mood notifies him');
select test.ok((select count(*) from claimed where kind = 'mood' and user_id = :partner) = 0, 'N7 not herself');
select test.ok((select bool_and(body is not null and body not like '%long day%') from claimed), 'N7 bodies never include the note');
drop table claimed;

-- Same-moment magic: both press "I miss you" within a minute.
select pg_sleep(0);
select test.act_as('authenticated', :owner);
select test.ok(test.affected($$insert into public.nudges (kind) values ('miss_you')$$) = 1, 'N6 he presses');
reset role;
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.nudges (kind) values ('miss_you')$$) = 1, 'N6 she presses within the minute');
reset role;
create temp table claimed as select * from public.claim_due_notifications(now() + interval '4 seconds');
select test.ok((select count(*) from claimed where kind = 'together') = 2, 'N6 both get the same-moment notification');
select test.ok((select count(*) from public.claim_due_notifications(now() + interval '5 seconds') where kind = 'together') = 0, 'N6 exactly once');
drop table claimed;

-- Countdown reaching zero (moved into the past as the database owner).
update public.countdowns set target_at = now() - interval '1 second' where id = '80000000-0000-0000-0000-000000000001';
create temp table claimed as select * from public.claim_due_notifications(now() + interval '6 seconds');
select test.ok((select count(*) from claimed where kind = 'countdown') = 2, 'N8 both notified when a countdown reaches zero');
select test.ok((select bool_and(body not like '%trip%') from claimed where kind = 'countdown'), 'N8 the title stays private');

\echo 'activities.test.sql: all assertions passed'
