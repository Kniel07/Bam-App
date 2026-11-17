-- notifications.test.sql — CR-04 Phase A (runs after the other test files).
-- Uses far-future instants so earlier fixtures fall outside the windows.

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

-- Relationship fixture: start 2020-01-31 00:30 UTC (month-end anchor).
insert into public.letters (id, label, unlock_type, unlock_at, status, created_by) values
  ('70000000-0000-0000-0000-000000000001', 'his scheduled', 'scheduled', '2030-01-01T00:00:00Z', 'published', :owner),
  ('70000000-0000-0000-0000-000000000002', 'her scheduled', 'scheduled', '2030-01-01T00:00:00Z', 'published', :partner),
  ('70000000-0000-0000-0000-000000000003', 'his draft', 'scheduled', '2030-01-01T00:00:00Z', 'draft', :owner),
  ('70000000-0000-0000-0000-000000000004', 'not yet', 'scheduled', '2030-01-01T00:05:00Z', 'published', :owner);

create temp table claimed as
  select * from public.claim_due_notifications('2030-01-01T00:00:30Z');
select test.ok((select count(*) from claimed) = 2, 'N1 two letters due → two notifications (drafts and future letters excluded)');
select test.ok((select user_id from claimed where event_key = 'letter-unlock:70000000-0000-0000-0000-000000000001') = :partner,
  'N1 his letter notifies her');
select test.ok((select user_id from claimed where event_key = 'letter-unlock:70000000-0000-0000-0000-000000000002') = :owner,
  'N1 her letter notifies him');
select test.ok((select bool_and(kind = 'letter_unlocked' and url = '/letters') from claimed), 'N1 kind and link');
select test.ok((select count(*) from claimed where event_key like 'monthsary:%') = 0, 'N2 no monthsary on a non-monthsary day');
select test.ok((select count(*) from public.claim_due_notifications('2030-01-01T00:00:45Z')) = 0, 'N1 a second run sends nothing again');
select test.ok((select count(*) from public.claim_due_notifications('2030-01-01T00:05:10Z')) = 1, 'N1 the next letter notifies at its own minute');
select test.ok((select count(*) from public.claim_due_notifications('2030-01-03T00:00:00Z')) = 0, 'N1 nothing stale after the window');

-- N2: anchor 2020-01-31 00:30 UTC → monthsary 121 falls on 2030-02-28 00:30 (month-end clamp).
select test.ok((select count(*) from public.claim_due_notifications('2030-02-28T00:29:00Z')) = 0, 'N2 nothing one minute early');
drop table claimed;
create temp table claimed as select * from public.claim_due_notifications('2030-02-28T00:30:20Z');
select test.ok((select count(*) from claimed) = 2, 'N2 monthsary notifies both members');
select test.ok((select bool_and(event_key = 'monthsary:121' and kind = 'monthsary' and url = '/') from claimed), 'N2 numbered with month-end clamp');
select test.ok((select count(*) from claimed where user_id = :stranger) = 0, 'N2 non-members never notified');
select test.ok((select count(*) from public.claim_due_notifications('2030-02-28T05:00:00Z')) = 0, 'N2 exactly once per monthsary');
select test.ok((select count(*) from public.claim_due_notifications('2030-03-31T13:00:00Z')) = 0, 'N2 not sent when the window has passed (outage)');

-- Access control
select test.act_as('authenticated', :partner);
select test.ok(test.raises('select * from public.claim_due_notifications()'), 'members cannot run the notifier');
select test.ok(test.raises('select * from public.notification_log'), 'members cannot read the log');
select test.ok(test.affected($$insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/abc', 'k', 'a')$$) = 1,
  'partner saves her device subscription');
select test.ok(test.affected($$insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/abc', 'k2', 'a2') on conflict (endpoint) do update set endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth$$) = 1,
  'partner re-subscribing the same phone updates her row (browser upsert)');
select test.ok(test.affected($$insert into public.push_subscriptions (endpoint, p256dh, auth, user_id) values ('https://push.example/forged', 'k', 'a', '00000000-0000-0000-0000-00000000000a')$$) = -1,
  'partner cannot register a device for the owner');
select test.ok(test.affected($$insert into public.push_subscriptions (endpoint, p256dh, auth) values ('http://insecure.example/x', 'k', 'a')$$) = -1,
  'non-https endpoints rejected');
reset role;
select test.act_as('authenticated', :owner);
select test.ok(test.count_rows('select * from public.push_subscriptions') = 0, 'owner cannot see her devices');
select test.ok(test.affected($$delete from public.push_subscriptions where endpoint = 'https://push.example/abc'$$) = 0, 'owner cannot remove her devices');
reset role;
select test.act_as('authenticated', :stranger);
select test.ok(test.affected($$insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/s', 'k', 'a')$$) = -1,
  'strangers cannot subscribe');
reset role;
select test.act_as('anon', null);
select test.ok(test.raises('select * from public.push_subscriptions'), 'anon cannot read subscriptions');
reset role;
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$delete from public.push_subscriptions where endpoint = 'https://push.example/abc'$$) = 1, 'partner removes her own device');
reset role;
set role service_role;
select test.ok((select count(*) from public.claim_due_notifications('2030-04-30T00:30:30Z')) = 2, 'service role (Edge Function) can claim');
reset role;

\echo 'notifications.test.sql: all assertions passed'
