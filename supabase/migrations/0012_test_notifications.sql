-- 0012_test_notifications.sql
-- Diagnostics: a member can ask for a test notification on their own devices
-- ("Send me a test notification" in More → Notifications & app). Exercises the
-- whole chain: subscription → notifier → push service → phone.

create table public.notification_test_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.notification_test_requests enable row level security;
revoke all on public.notification_test_requests from anon, authenticated;
-- No policies: written only through request_test_notification().

-- One test per member per 30 seconds.
create function public.request_test_notification()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.is_member() then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.notification_test_requests
     where user_id = (select auth.uid()) and created_at > now() - interval '30 seconds'
  ) then
    raise exception 'test_too_soon' using errcode = 'P0001';
  end if;
  insert into public.notification_test_requests (user_id) values ((select auth.uid()));
end;
$$;
revoke execute on function public.request_test_notification() from public, anon;
grant execute on function public.request_test_notification() to authenticated;

alter table public.notification_log drop constraint notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in ('letter_unlocked', 'monthsary', 'nudge_miss_you', 'nudge_thinking_of_you', 'nudge_hug', 'nudge_good_night', 'test'));

-- The notifier gains N5 (tests); N1, N2 and N4 are unchanged.
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
  -- N5: test notifications a member requested for their own devices.
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url)
      select 'test:' || t.id::text, t.user_id, 'test', '/'
        from public.notification_test_requests t
       where t.created_at <= p_now
         and t.created_at > p_now - interval '10 minutes'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url
    )
    select * from inserted;
end;
$$;

revoke execute on function public.claim_due_notifications(timestamptz, interval, interval) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz, interval, interval) to service_role;
