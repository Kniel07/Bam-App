-- test_notifications.test.sql — diagnostics (runs last).

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

select test.act_as('authenticated', :partner);
select test.ok(not test.raises('select public.request_test_notification()'), 'TEST partner requests a test notification');
select test.ok(test.raises('select public.request_test_notification()'), 'TEST a second request within 30 s is refused');
select test.ok(test.raises('select * from public.notification_test_requests'), 'TEST members cannot read the request table');
reset role;
select test.act_as('authenticated', :stranger);
select test.ok(test.raises('select public.request_test_notification()'), 'TEST strangers cannot request');
reset role;
select test.act_as('anon', null);
select test.ok(test.raises('select public.request_test_notification()'), 'TEST anon cannot request');
reset role;

create temp table claimed as select * from public.claim_due_notifications(now()) where kind = 'test';
select test.ok((select count(*) from claimed) = 1, 'N5 one test notification claimed');
select test.ok((select user_id from claimed) = :partner, 'N5 it goes to the requester herself');
select test.ok((select count(*) from public.claim_due_notifications(now() + interval '1 second') where kind = 'test') = 0, 'N5 exactly once');

\echo 'test_notifications.test.sql: all assertions passed'
