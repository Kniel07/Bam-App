-- 0014_question_and_reasons.sql
-- CR-06 batch B:
--   4  Question of the day: one shared question per day; each answer stays
--      hidden from the other until both have answered (enforced by RLS).
--   7  Reasons jar: numbered reasons written for each other; favorites.
-- RLS is enabled in the same block that creates each table (KI-08).

-- Today's date in the relationship timezone (day boundaries for the question).
create function public.relationship_today(p_now timestamptz default now())
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (p_now at time zone r.timezone)::date from public.relationship r limit 1;
$$;
revoke execute on function public.relationship_today(timestamptz) from public, anon;
grant execute on function public.relationship_today(timestamptz) to authenticated;

-- ----------------------------------------------------------- question bank
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) between 5 and 200),
  -- null = built-in generic question; otherwise added by a member
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.question_bank enable row level security;
revoke all on public.question_bank from anon, authenticated;
grant select, delete on public.question_bank to authenticated;
grant insert (text) on public.question_bank to authenticated;
create policy question_bank_select on public.question_bank for select to authenticated using (public.is_member());
create policy question_bank_insert on public.question_bank for insert to authenticated
  with check (public.is_member() and created_by = (select auth.uid()));
create policy question_bank_delete on public.question_bank for delete to authenticated
  using (public.is_member() and (created_by = (select auth.uid()) or public.is_owner()));

-- Generic starter prompts (not personal content; members add their own).
insert into public.question_bank (text, created_by) select q, null from (values
  ('What made you smile today?'),
  ('What is one small thing I did recently that you loved?'),
  ('What song reminds you of us right now?'),
  ('If we could teleport anywhere for one hour today, where would we go?'),
  ('What is a memory of us you replay in your head?'),
  ('What do you want to do together next weekend?'),
  ('What is something you''ve never told me but want to?'),
  ('What is your favorite thing about the way I love you?'),
  ('What would our perfect lazy day look like?'),
  ('What is one thing you''re proud of this week?'),
  ('What is a food you want us to try together?'),
  ('Which moment of today would you send me if you could?'),
  ('What do you miss most about me right now?'),
  ('What is a dream you have for us in a year?'),
  ('What made you think of me today?'),
  ('What is a small habit of mine you secretly like?'),
  ('If today had a title, what would it be?'),
  ('What is a place you want to show me?'),
  ('What is something that made you laugh recently?'),
  ('What is one thing I can do to make your week easier?'),
  ('What is your favorite photo of us, and why?'),
  ('What is a movie or show you want us to watch together?'),
  ('What is a little tradition you want us to start?'),
  ('What did you dream about last night?'),
  ('What are you looking forward to this month?'),
  ('What is a compliment you''d like to hear more often?'),
  ('What is something about us that feels like home?'),
  ('What is a skill you''d like us to learn together?'),
  ('What would you write on a note for me today?'),
  ('What is a song you''d dedicate to me today?'),
  ('What is one word for how you feel about us right now?'),
  ('What is a trip we should plan someday?'),
  ('What is your favorite way to spend time with me?'),
  ('What is something new you learned about me recently?'),
  ('What was the best part of your day?'),
  ('What is a question you''ve always wanted to ask me?'),
  ('What made you feel loved this week?'),
  ('What would our dream home have?'),
  ('What is a moment you knew you liked me?'),
  ('What is one thing you want to tell me before you sleep tonight?')
) as seeds(q);

-- ------------------------------------------------- daily assignment + answers
create table public.daily_questions (
  day date primary key,
  question_id uuid not null references public.question_bank (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.daily_questions enable row level security;
revoke all on public.daily_questions from anon, authenticated;
grant select on public.daily_questions to authenticated;
create policy daily_questions_select on public.daily_questions for select to authenticated using (public.is_member());

create table public.question_answers (
  id uuid primary key default gen_random_uuid(),
  day date not null references public.daily_questions (day) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day, user_id)
);
alter table public.question_answers enable row level security;
create trigger question_answers_set_updated_at before update on public.question_answers
  for each row execute function public.set_updated_at();

create function public.has_answered(p_day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.question_answers where day = p_day and user_id = (select auth.uid()));
$$;
revoke execute on function public.has_answered(date) from public, anon;
grant execute on function public.has_answered(date) to authenticated;

revoke all on public.question_answers from anon, authenticated;
grant select on public.question_answers to authenticated;
grant insert (day, answer) on public.question_answers to authenticated;
grant update (answer) on public.question_answers to authenticated;

-- Your own answer always; theirs only once you've answered the same day.
create policy question_answers_select on public.question_answers for select to authenticated
  using (public.is_member() and (user_id = (select auth.uid()) or public.has_answered(day)));
-- Answer (and edit) only today's question, as yourself.
create policy question_answers_insert on public.question_answers for insert to authenticated
  with check (public.is_member() and user_id = (select auth.uid()) and day = public.relationship_today());
create policy question_answers_update on public.question_answers for update to authenticated
  using (public.is_member() and user_id = (select auth.uid()) and day = public.relationship_today())
  with check (public.is_member() and user_id = (select auth.uid()) and day = public.relationship_today());

-- Today's question: assigned on first request (least recently used, then random)
-- so it is identical on both phones and stable for the whole day.
create function public.today_question()
returns table (day date, question_id uuid, text text, i_answered boolean, they_answered boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_day date := public.relationship_today();
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if v_day is null then
    return;
  end if;
  insert into public.daily_questions (day, question_id)
  select v_day, q.id
    from public.question_bank q
   order by (select max(d.day) from public.daily_questions d where d.question_id = q.id) nulls first, random()
   limit 1
  on conflict (day) do nothing;

  return query
    select d.day, q.id, q.text,
           exists (select 1 from public.question_answers a where a.day = d.day and a.user_id = (select auth.uid())),
           exists (select 1 from public.question_answers a where a.day = d.day and a.user_id <> (select auth.uid()))
      from public.daily_questions d
      join public.question_bank q on q.id = d.question_id
     where d.day = v_day;
end;
$$;
revoke execute on function public.today_question() from public, anon;
grant execute on function public.today_question() to authenticated;

-- ------------------------------------------------------------- reasons jar
create table public.love_reasons (
  id uuid primary key default gen_random_uuid(),
  number integer not null,
  body text not null check (char_length(body) between 1 and 280),
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, number)
);
alter table public.love_reasons enable row level security;
create trigger love_reasons_set_updated_at before update on public.love_reasons
  for each row execute function public.set_updated_at();

-- "Reason #014": numbered per author.
create function public.number_love_reason()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.number := coalesce((select max(number) from public.love_reasons where created_by = new.created_by), 0) + 1;
  return new;
end;
$$;
revoke execute on function public.number_love_reason() from public, anon, authenticated;
create trigger love_reasons_number before insert on public.love_reasons
  for each row execute function public.number_love_reason();

revoke all on public.love_reasons from anon, authenticated;
grant select, delete on public.love_reasons to authenticated;
grant insert (body) on public.love_reasons to authenticated;
grant update (body) on public.love_reasons to authenticated;
create policy love_reasons_select on public.love_reasons for select to authenticated using (public.is_member());
create policy love_reasons_insert on public.love_reasons for insert to authenticated
  with check (public.is_member() and created_by = (select auth.uid()));
create policy love_reasons_update on public.love_reasons for update to authenticated
  using (public.is_member() and created_by = (select auth.uid()))
  with check (public.is_member() and created_by = (select auth.uid()));
create policy love_reasons_delete on public.love_reasons for delete to authenticated
  using (public.is_member() and (created_by = (select auth.uid()) or public.is_owner()));

create table public.reason_favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reason_id uuid not null references public.love_reasons (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, reason_id)
);
alter table public.reason_favorites enable row level security;
revoke all on public.reason_favorites from anon, authenticated;
grant select, delete on public.reason_favorites to authenticated;
grant insert (reason_id) on public.reason_favorites to authenticated;
create policy reason_favorites_select on public.reason_favorites for select to authenticated
  using (public.is_member() and user_id = (select auth.uid()));
create policy reason_favorites_insert on public.reason_favorites for insert to authenticated
  with check (public.is_member() and user_id = (select auth.uid()));
create policy reason_favorites_delete on public.reason_favorites for delete to authenticated
  using (public.is_member() and user_id = (select auth.uid()));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.question_answers';
    execute 'alter publication supabase_realtime add table public.love_reasons';
  end if;
end;
$$;

-- --------------------------------------------------------- notifications
alter table public.notification_log drop constraint notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in (
    'letter_unlocked', 'monthsary', 'test', 'together', 'mood', 'countdown',
    'question', 'question_ready', 'reasons',
    'nudge_miss_you', 'nudge_thinking_of_you', 'nudge_hug', 'nudge_good_night'
  ));

-- The notifier gains N9 (question waiting), N10 (answers ready), N11 (reasons).
create or replace function public.claim_due_notifications(
  p_now timestamptz default now(),
  p_letter_window interval default interval '1 day',
  p_monthsary_window interval default interval '12 hours'
)
returns table (event_key text, user_id uuid, kind text, url text, body text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_start timestamptz;
  v_zone text;
  v_local_start timestamp;
  v_local_now timestamp;
  v_months integer;
  v_moment timestamptz;
begin
  -- N1: scheduled letters that became open → recipient.
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select 'letter-unlock:' || l.id::text, m.user_id, 'letter_unlocked', '/letters', 'A letter just unlocked for you 💌'
        from public.letters l
        join public.relationship_members m on m.user_id is distinct from l.created_by
       where l.status = 'published' and l.unlock_type = 'scheduled'
         and l.unlock_at <= p_now and l.unlock_at > p_now - p_letter_window
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;

  -- N2: the most recent monthsary (DR-01) within the window → both.
  select r.start_at, r.timezone into v_start, v_zone from public.relationship r limit 1;
  if v_start is not null then
    v_local_start := v_start at time zone v_zone;
    v_local_now := p_now at time zone v_zone;
    v_months := (extract(year from v_local_now)::int - extract(year from v_local_start)::int) * 12
              + (extract(month from v_local_now)::int - extract(month from v_local_start)::int);
    while v_months > 0 and ((v_local_start + make_interval(months => v_months)) at time zone v_zone) > p_now loop
      v_months := v_months - 1;
    end loop;
    if v_months > 0 then
      v_moment := (v_local_start + make_interval(months => v_months)) at time zone v_zone;
      if p_now - v_moment < p_monthsary_window then
        return query
          with inserted as (
            insert into public.notification_log as n (event_key, user_id, kind, url, body)
            select 'monthsary:' || v_months::text, m.user_id, 'monthsary', '/', 'Happy monthsary 💗 Something is waiting for you.'
              from public.relationship_members m
            on conflict do nothing
            returning n.event_key, n.user_id, n.kind, n.url, n.body
          )
          select * from inserted;
      end if;
    end if;
  end if;

  -- N4: nudges → the other member (hugs carry their length).
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select 'nudge:' || g.id::text, m.user_id, 'nudge_' || g.kind, '/',
             case g.kind
               when 'miss_you' then '💗 I miss you'
               when 'thinking_of_you' then '💭 Thinking of you'
               when 'hug' then case when g.hug_seconds is null then '🤗 Sending you a hug'
                                    else '🤗 A ' || g.hug_seconds || '-second hug for you' end
               else '🌙 Good night'
             end
        from public.nudges g
        join public.relationship_members m on m.user_id <> g.sender_id
       where g.created_at <= p_now and g.created_at > p_now - interval '1 hour'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;

  -- N5: test notifications → the requester.
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select 'test:' || t.id::text, t.user_id, 'test', '/', '🔔 Test notification: it works on this phone!'
        from public.notification_test_requests t
       where t.created_at <= p_now and t.created_at > p_now - interval '10 minutes'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;

  -- N6: same-moment magic: an "I miss you" answered by the other's within 60 s → both.
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select 'together:' || later.id::text, m.user_id, 'together', '/', '💞 You both pressed “I miss you” at the same time'
        from public.nudges later
        join public.relationship_members m on true
       where later.kind = 'miss_you'
         and later.created_at <= p_now and later.created_at > p_now - interval '1 hour'
         and exists (
           select 1 from public.nudges earlier
            where earlier.kind = 'miss_you'
              and earlier.sender_id <> later.sender_id
              and earlier.created_at <= later.created_at
              and earlier.created_at > later.created_at - interval '60 seconds'
              and earlier.id <> later.id
         )
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;

  -- N7: mood check-ins → the other member (the mood itself stays in the app).
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select 'mood:' || md.id::text, m.user_id, 'mood', '/together', '🌤️ A new mood check-in is waiting'
        from public.moods md
        join public.relationship_members m on m.user_id <> md.user_id
       where md.created_at <= p_now and md.created_at > p_now - interval '1 hour'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;

  -- N8: countdowns reaching zero → both (titles stay in the app).
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select 'countdown:' || c.id::text, m.user_id, 'countdown', '/together', '⏳ A countdown just reached zero 🎉'
        from public.countdowns c
        join public.relationship_members m on true
       where c.target_at <= p_now and c.target_at > p_now - interval '1 day'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;
  -- N9: one answered today's question, the other hasn't yet → the other (once per day).
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select distinct 'question:' || a.day::text || ':' || m.user_id::text, m.user_id, 'question', '/together',
             '💬 Today''s question is waiting for your answer'
        from public.question_answers a
        join public.relationship_members m on m.user_id <> a.user_id
       where a.created_at <= p_now and a.created_at > p_now - interval '1 hour'
         and not exists (select 1 from public.question_answers b where b.day = a.day and b.user_id = m.user_id)
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;

  -- N10: both answered → both (once per day).
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select 'question-ready:' || d.day::text, m.user_id, 'question_ready', '/together',
             '💞 Your answers to today''s question are ready'
        from (
          select a.day from public.question_answers a
           group by a.day
          having count(*) >= 2 and max(a.created_at) <= p_now and max(a.created_at) > p_now - interval '1 hour'
        ) d
        join public.relationship_members m on true
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;

  -- N11: new reasons in your jar → the other member, at most once per author per hour.
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select distinct 'reasons:' || r.created_by::text || ':' || to_char(date_trunc('hour', r.created_at), 'YYYYMMDDHH24'),
             m.user_id, 'reasons', '/together', '🫙 New reasons were added to your jar'
        from public.love_reasons r
        join public.relationship_members m on m.user_id <> r.created_by
       where r.created_at <= p_now and r.created_at > p_now - interval '1 hour'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;
end;
$$;

revoke execute on function public.claim_due_notifications(timestamptz, interval, interval) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz, interval, interval) to service_role;
