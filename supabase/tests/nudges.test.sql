-- nudges.test.sql — CR-05 (runs after the other test files).

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.nudges (kind) values ('miss_you')$$) = 1, 'CR5 partner sends "I miss you"');
select test.ok((select sender_id from public.nudges order by created_at desc limit 1) = '00000000-0000-0000-0000-00000000000b',
  'CR5 sender is set by the database');
select test.ok(test.affected($$insert into public.nudges (kind) values ('miss_you')$$) = -1, 'CR5 a double tap within 10 s is refused');
select test.ok(test.affected($$insert into public.nudges (kind) values ('hug')$$) = 1, 'CR5 a different nudge is allowed right away');
select test.ok(test.affected($$insert into public.nudges (kind, sender_id) values ('good_night', '00000000-0000-0000-0000-00000000000a')$$) = -1,
  'CR5 cannot send as the other person');
select test.ok(test.affected($$insert into public.nudges (kind, created_at) values ('good_night', now() - interval '1 day')$$) = -1,
  'CR5 cannot backdate a nudge');
select test.ok(test.affected($$insert into public.nudges (kind) values ('kiss_me_now')$$) = -1, 'CR5 unknown nudge kinds rejected');
select test.ok(test.affected($$delete from public.nudges$$) = -1, 'CR5 nudges cannot be deleted by members');
reset role;

select test.act_as('authenticated', :owner);
select test.ok(test.count_rows('select * from public.nudges') = 2, 'CR5 owner sees her nudges');
select test.ok(test.affected($$insert into public.nudges (kind) values ('thinking_of_you')$$) = 1, 'CR5 owner sends a nudge');
reset role;

select test.act_as('authenticated', :stranger);
select test.ok(test.count_rows('select * from public.nudges') = 0, 'CR5 strangers see no nudges');
select test.ok(test.affected($$insert into public.nudges (kind) values ('miss_you')$$) = -1, 'CR5 strangers cannot send');
reset role;
select test.act_as('anon', null);
select test.ok(test.raises('select * from public.nudges'), 'CR5 anon cannot read nudges');
reset role;

-- N4: each nudge notifies the other member exactly once.
create temp table claimed as select * from public.claim_due_notifications(now()) where kind like 'nudge_%';
select test.ok((select count(*) from claimed) = 3, 'N4 three nudges → three notifications');
select test.ok((select count(*) from claimed where kind = 'nudge_miss_you' and user_id = :owner) = 1, 'N4 her "I miss you" goes to him');
select test.ok((select count(*) from claimed where kind = 'nudge_thinking_of_you' and user_id = :partner) = 1, 'N4 his nudge goes to her');
select test.ok((select count(*) from claimed c join public.nudges g on c.event_key = 'nudge:' || g.id::text where c.user_id = g.sender_id) = 0,
  'N4 nobody is notified of their own nudge');
select test.ok((select count(*) from public.claim_due_notifications(now() + interval '1 second') where kind like 'nudge_%') = 0,
  'N4 delivered exactly once');
select test.ok((select count(*) from public.claim_due_notifications(now() + interval '2 hours') where kind like 'nudge_%') = 0,
  'N4 old nudges never sent late');

\echo 'nudges.test.sql: all assertions passed'
