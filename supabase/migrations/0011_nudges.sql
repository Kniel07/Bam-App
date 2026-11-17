-- 0011_nudges.sql
-- CR-05: "Nudges". One-tap messages between the two members ("I miss you",
-- "Thinking of you", "Sending you a hug", "Good night"), each delivered as a
-- phone notification to the other person and shown in the app.

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('miss_you', 'thinking_of_you', 'hug', 'good_night')),
  created_at timestamptz not null default now()
);
alter table public.nudges enable row level security;
create index nudges_created_idx on public.nudges (created_at desc);
create index nudges_sender_kind_idx on public.nudges (sender_id, kind, created_at desc);

-- Clients may only choose the kind: sender and time come from the database,
-- so nobody can fake who sent a nudge or when.
revoke all on public.nudges from anon, authenticated;
grant select on public.nudges to authenticated;
grant insert (kind) on public.nudges to authenticated;

create policy nudges_select on public.nudges
  for select to authenticated using (public.is_member());
create policy nudges_insert on public.nudges
  for insert to authenticated with check (public.is_member() and sender_id = (select auth.uid()));

-- Double taps count once (10 s per kind) and a daily cap protects free-tier quotas.
create function public.limit_nudges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.nudges
     where sender_id = new.sender_id and kind = new.kind
       and created_at > now() - interval '10 seconds'
  ) then
    raise exception 'nudge_too_soon' using errcode = 'P0001', hint = 'Wait a few seconds before sending the same nudge again.';
  end if;
  if (select count(*) from public.nudges
       where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 200 then
    raise exception 'nudge_daily_limit' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.limit_nudges() from public, anon, authenticated;
create trigger nudges_rate_limit before insert on public.nudges
  for each row execute function public.limit_nudges();

-- Live updates in the open app (Supabase Realtime respects RLS). Skipped where
-- the realtime publication does not exist (e.g. local test databases).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.nudges';
  end if;
end;
$$;

-- Notification kinds now include nudges.
alter table public.notification_log drop constraint notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in ('letter_unlocked', 'monthsary', 'nudge_miss_you', 'nudge_thinking_of_you', 'nudge_hug', 'nudge_good_night'));

-- The notifier gains N4 (nudges); N1 and N2 are unchanged.
create or replace function public.claim_due_notifications(
  p_now timestamptz default now(),
  p_letter_window interval default interval '1 day',
  p_monthsary_window interval default interval '12 hours'
)
returns table (event_key text, user_id uuid, kind text, url text)
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
  -- N1: scheduled letters that became open within the window → recipient
  -- (the member who did not write it).
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url)
      select 'letter-unlock:' || l.id::text, m.user_id, 'letter_unlocked', '/letters'
        from public.letters l
        join public.relationship_members m on m.user_id is distinct from l.created_by
       where l.status = 'published'
         and l.unlock_type = 'scheduled'
         and l.unlock_at <= p_now
         and l.unlock_at > p_now - p_letter_window
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url
    )
    select * from inserted;

  -- N2: the most recent monthsary (DR-01: anchor + n months in the
  -- relationship timezone; Postgres clamps month ends), if within the window.
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
            insert into public.notification_log as n (event_key, user_id, kind, url)
            select 'monthsary:' || v_months::text, m.user_id, 'monthsary', '/'
              from public.relationship_members m
            on conflict do nothing
            returning n.event_key, n.user_id, n.kind, n.url
          )
          select * from inserted;
      end if;
    end if;
  end if;
  -- N4 (CR-05): nudges → the other member, delivered once, only if recent.
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url)
      select 'nudge:' || g.id::text, m.user_id, 'nudge_' || g.kind, '/'
        from public.nudges g
        join public.relationship_members m on m.user_id <> g.sender_id
       where g.created_at <= p_now
         and g.created_at > p_now - interval '1 hour'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url
    )
    select * from inserted;
end;
$$;

revoke execute on function public.claim_due_notifications(timestamptz, interval, interval) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz, interval, interval) to service_role;
