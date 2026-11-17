-- 0013_activities.sql
-- CR-06 batch A: shared activities.
--   1  Same-moment magic: both press "I miss you" within 60 s → both notified
--   2  Mood check-in:     share how you feel → the other is notified
--   3  Hold-to-hug:       a hug nudge carries its length in seconds
--   5  Countdowns:        shared countdowns → both notified when one reaches zero
-- Also: notification text now comes from the database (`body`), so future
-- notification kinds need only a migration, not an Edge Function redeploy.
-- RLS is enabled in the same block that creates each table (KI-08).

-- ------------------------------------------------------------- hold-to-hug
alter table public.nudges add column hug_seconds smallint check (hug_seconds between 1 and 30);
alter table public.nudges add constraint nudges_hug_seconds_only_for_hugs
  check (hug_seconds is null or kind = 'hug');
grant insert (kind, hug_seconds) on public.nudges to authenticated;

-- ------------------------------------------------------------------- moods
create table public.moods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mood text not null check (mood in ('happy', 'loving', 'sleepy', 'sad', 'stressed', 'grumpy', 'excited', 'missing')),
  note text check (note is null or char_length(note) <= 80),
  created_at timestamptz not null default now()
);
alter table public.moods enable row level security;
create index moods_user_created_idx on public.moods (user_id, created_at desc);

revoke all on public.moods from anon, authenticated;
grant select on public.moods to authenticated;
grant insert (mood, note) on public.moods to authenticated;

create policy moods_select on public.moods
  for select to authenticated using (public.is_member());
create policy moods_insert on public.moods
  for insert to authenticated with check (public.is_member() and user_id = (select auth.uid()));

-- One check-in per minute per person.
create function public.limit_moods()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.moods
     where user_id = new.user_id and created_at > now() - interval '1 minute'
  ) then
    raise exception 'mood_too_soon' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_moods() from public, anon, authenticated;
create trigger moods_rate_limit before insert on public.moods
  for each row execute function public.limit_moods();

-- -------------------------------------------------------------- countdowns
create table public.countdowns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  target_at timestamptz not null,
  created_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.countdowns enable row level security;
create index countdowns_target_idx on public.countdowns (target_at);
create trigger countdowns_set_updated_at before update on public.countdowns
  for each row execute function public.set_updated_at();

revoke all on public.countdowns from anon, authenticated;
grant select, delete on public.countdowns to authenticated;
grant insert (id, title, target_at) on public.countdowns to authenticated;
grant update (title, target_at) on public.countdowns to authenticated;

-- Shared authorship (TD-022): both add; each edits own; owner may remove any.
create policy countdowns_select on public.countdowns
  for select to authenticated using (public.is_member());
-- Targets must be in the future, so saving one can never fire "reached zero" at once.
create policy countdowns_insert on public.countdowns
  for insert to authenticated
  with check (public.is_member() and created_by = (select auth.uid()) and target_at > now());
create policy countdowns_update on public.countdowns
  for update to authenticated
  using (public.is_member() and created_by = (select auth.uid()))
  with check (public.is_member() and created_by = (select auth.uid()) and target_at > now());
create policy countdowns_delete on public.countdowns
  for delete to authenticated
  using (public.is_member() and (created_by = (select auth.uid()) or public.is_owner()));

-- Live updates in the open app where Realtime exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.moods';
    execute 'alter publication supabase_realtime add table public.countdowns';
  end if;
end;
$$;

-- --------------------------------------------------------- notification text
alter table public.notification_log add column body text;
alter table public.notification_log drop constraint notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in (
    'letter_unlocked', 'monthsary', 'test', 'together', 'mood', 'countdown',
    'nudge_miss_you', 'nudge_thinking_of_you', 'nudge_hug', 'nudge_good_night'
  ));

-- The return type gains `body`, so the notifier is recreated. All texts stay
-- generic: no names and no user-written words (CR-04 §4).
drop function public.claim_due_notifications(timestamptz, interval, interval);

create function public.claim_due_notifications(
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
end;
$$;

revoke execute on function public.claim_due_notifications(timestamptz, interval, interval) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz, interval, interval) to service_role;
