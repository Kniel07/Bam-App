-- 0010_notifications.sql
-- CR-04 Phase A: phone notifications for the installed app.
--   N1  a scheduled letter unlocks  → its recipient
--   N2  a monthsary begins          → both members
-- Text is always generic (no content, labels or names): see the Edge Function.
-- RLS is enabled in the same statement block that creates each table (KI-08).

-- ------------------------------------------------------- push_subscriptions

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, delete on public.push_subscriptions to authenticated;
-- Upserts from the browser re-send all three columns for the same endpoint.
grant update (endpoint, p256dh, auth) on public.push_subscriptions to authenticated;

-- Each member manages only their own devices.
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (public.is_member() and user_id = (select auth.uid()));
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated with check (public.is_member() and user_id = (select auth.uid()));
create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (public.is_member() and user_id = (select auth.uid()))
  with check (public.is_member() and user_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (public.is_member() and user_id = (select auth.uid()));

-- -------------------------------------------------------- notification_log
-- Server-only. One row per (event, recipient): guarantees "exactly once".

create table public.notification_log (
  event_key text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('letter_unlocked', 'monthsary')),
  url text not null,
  claimed_at timestamptz not null default now(),
  primary key (event_key, user_id)
);
alter table public.notification_log enable row level security;
revoke all on public.notification_log from anon, authenticated;
-- No policies: only the service role (Edge Function) reads or writes it.

-- ------------------------------------------------- claim_due_notifications
-- Finds due events, records them in the log, and returns only the newly
-- claimed ones. Running it twice never yields the same event twice.
-- Windows keep a first deployment (or an outage) from sending stale news.

create function public.claim_due_notifications(
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
end;
$$;

revoke execute on function public.claim_due_notifications(timestamptz, interval, interval) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz, interval, interval) to service_role;
