-- questions_reasons.test.sql — CR-06 batch B (runs last).

\set ON_ERROR_STOP 1
\set QUIET 1
\set owner    '''00000000-0000-0000-0000-00000000000a'''
\set partner  '''00000000-0000-0000-0000-00000000000b'''
\set stranger '''00000000-0000-0000-0000-00000000000c'''

select count(*) from public.claim_due_notifications(now() + interval '10 seconds') \g /dev/null
select test.ok((select count(*) from public.question_bank where created_by is null) = 40, 'Q 40 built-in generic questions seeded');

-- ------------------------------------------------------ question of the day
select test.act_as('authenticated', :partner);
create temp table q_partner as select * from public.today_question();
reset role;
select test.act_as('authenticated', :owner);
create temp table q_owner as select * from public.today_question();
reset role;
select test.ok((select count(*) from q_partner) = 1, 'Q today has exactly one question');
select test.ok((select question_id from q_partner) = (select question_id from q_owner), 'Q both phones get the same question');
select test.ok((select day from q_partner) = (now() at time zone 'UTC')::date, 'Q day follows the relationship timezone');
select test.act_as('authenticated', :stranger);
select test.ok(test.raises('select * from public.today_question()'), 'Q strangers cannot get the question');
reset role;

select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.question_answers (day, answer) values (public.relationship_today(), 'HER SECRET ANSWER')$$) = 1, 'Q partner answers');
select test.ok(test.affected($$insert into public.question_answers (day, answer) values (public.relationship_today() - 1, 'backdated')$$) = -1, 'Q cannot answer another day');
select test.ok(test.affected($$update public.question_answers set answer = 'HER SECRET ANSWER (edited)' where user_id = '00000000-0000-0000-0000-00000000000b'$$) = 1, 'Q she can edit her answer today');
reset role;

-- The every-minute notifier runs while only she has answered.
create temp table claimed_waiting as select * from public.claim_due_notifications(now() + interval '10 seconds');
select test.ok((select count(*) from claimed_waiting where kind = 'question' and user_id = :owner) = 1, 'N9 her answer tells him a question is waiting');
select test.ok((select count(*) from claimed_waiting where kind = 'question' and user_id = :partner) = 0, 'N9 not her (she answered)');
select test.ok((select count(*) from claimed_waiting where kind = 'question_ready') = 0, 'N10 not ready while only one answered');

select test.act_as('authenticated', :owner);
select test.ok(test.count_rows('select * from public.question_answers') = 0, 'Q owner cannot read her answer before answering');
select test.ok((select they_answered and not i_answered from public.today_question()), 'Q owner only sees that she has answered');
select test.ok(test.affected($$insert into public.question_answers (day, answer, user_id) values (public.relationship_today(), 'forged', '00000000-0000-0000-0000-00000000000b')$$) = -1, 'Q cannot answer as the other');
select test.ok(test.affected($$insert into public.question_answers (day, answer) values (public.relationship_today(), 'his answer')$$) = 1, 'Q owner answers');
select test.ok(test.count_rows('select * from public.question_answers') = 2, 'Q after answering, both answers are visible');
reset role;
select test.act_as('authenticated', :stranger);
select test.ok(test.count_rows('select * from public.question_answers') = 0, 'Q strangers see no answers');
reset role;

create temp table claimed as select * from public.claim_due_notifications(now() + interval '11 seconds');
select test.ok((select count(*) from claimed where kind = 'question') = 0, 'N9 not repeated once both answered');
select test.ok((select count(*) from claimed where kind = 'question_ready') = 2, 'N10 both told answers are ready');
select test.ok((select bool_and(body not like '%SECRET%' and body not like '%his answer%') from claimed), 'N9/N10 never include answers');
select test.ok((select count(*) from public.claim_due_notifications(now() + interval '12 seconds') where kind like 'question%') = 0, 'N9/N10 once per day');
drop table claimed;

-- Question bank additions
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.question_bank (text) values ('What do you want to cook together?')$$) = 1, 'Q partner adds a question');
select test.ok(test.affected($$delete from public.question_bank where created_by is null$$) = 0, 'Q partner cannot delete built-in questions');
reset role;

-- ------------------------------------------------------------- reasons jar
select test.act_as('authenticated', :partner);
select test.ok(test.affected($$insert into public.love_reasons (body) values ('first reason')$$) = 1, 'R partner writes a reason');
select test.ok(test.affected($$insert into public.love_reasons (body) values ('second reason')$$) = 1, 'R and another');
select test.ok((select array_agg(number order by number) from public.love_reasons where created_by = '00000000-0000-0000-0000-00000000000b') = array[1, 2], 'R numbered per author #1, #2');
select test.ok(test.affected($$insert into public.love_reasons (body, number) values ('x', 99)$$) = -1, 'R number cannot be chosen by the client');
reset role;
select test.act_as('authenticated', :owner);
select test.ok(test.affected($$insert into public.love_reasons (body) values ('his reason')$$) = 1, 'R owner writes one');
select test.ok((select number from public.love_reasons where body = 'his reason') = 1, 'R his numbering starts at #1');
select test.ok(test.affected($$update public.love_reasons set body = 'edited' where body = 'first reason'$$) = 0, 'R owner cannot edit hers');
select test.ok(test.affected($$insert into public.reason_favorites (reason_id) select id from public.love_reasons where body = 'first reason'$$) = 1, 'R owner favorites one of hers');
reset role;
select test.act_as('authenticated', :partner);
select test.ok(test.count_rows('select * from public.reason_favorites') = 0, 'R favorites are private to each person');
select test.ok(test.affected($$delete from public.love_reasons where body = 'his reason'$$) = 0, 'R partner cannot delete his');
reset role;
select test.act_as('authenticated', :owner);
select test.ok(test.affected($$delete from public.love_reasons where body = 'second reason'$$) = 1, 'R owner may remove any (TD-022)');
reset role;

create temp table claimed as select * from public.claim_due_notifications(now() + interval '13 seconds');
select test.ok((select count(*) from claimed where kind = 'reasons' and user_id = :owner) = 1, 'N11 her two reasons → one notification for him');
select test.ok((select count(*) from claimed where kind = 'reasons' and user_id = :partner) = 1, 'N11 his reason → one for her');
select test.ok((select bool_and(body not like '%reason%' or body = '🫙 New reasons were added to your jar') from claimed where kind = 'reasons'), 'N11 reason text never in notifications');

\echo 'questions_reasons.test.sql: all assertions passed'
