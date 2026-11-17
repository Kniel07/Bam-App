-- 0015_memories_featured.sql
-- S5 Memories + CR-03 featured photos on Home.
--   * Either member can feature any memory they can see (via set_memory_featured),
--     without gaining general edit rights over the other's memories.
--   * Memory column grants tightened: clients can't set created_by or featured flags.
--   * N12: new memories notify the other member (at most hourly per author).

alter table public.memories add column is_featured boolean not null default false;
alter table public.memories add column featured_at timestamptz;
create index memories_featured_idx on public.memories (featured_at desc) where is_featured;

revoke insert, update on public.memories from authenticated;
grant insert (id, caption, taken_on, photo_path, status) on public.memories to authenticated;
grant update (caption, taken_on, photo_path) on public.memories to authenticated;

create function public.set_memory_featured(p_memory_id uuid, p_featured boolean)
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
  -- Only memories the caller can see: published ones, or their own drafts.
  update public.memories
     set is_featured = p_featured,
         featured_at = case when p_featured then now() else null end
   where id = p_memory_id
     and (status = 'published' or created_by = (select auth.uid()));
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.set_memory_featured(uuid, boolean) from public, anon;
grant execute on function public.set_memory_featured(uuid, boolean) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.memories';
  end if;
end;
$$;

alter table public.notification_log drop constraint notification_log_kind_check;
alter table public.notification_log add constraint notification_log_kind_check
  check (kind in (
    'letter_unlocked', 'monthsary', 'test', 'together', 'mood', 'countdown',
    'question', 'question_ready', 'reasons', 'memory',
    'nudge_miss_you', 'nudge_thinking_of_you', 'nudge_hug', 'nudge_good_night'
  ));

-- The notifier gains N12 (memories).
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
  -- N12: new memories in the scrapbook → the other member, at most once per author per hour.
  return query
    with inserted as (
      insert into public.notification_log as n (event_key, user_id, kind, url, body)
      select distinct 'memories:' || mm.created_by::text || ':' || to_char(date_trunc('hour', mm.created_at), 'YYYYMMDDHH24'),
             m.user_id, 'memory', '/memories', '📸 A new memory was added to our scrapbook'
        from public.memories mm
        join public.relationship_members m on m.user_id <> mm.created_by
       where mm.status = 'published'
         and mm.created_at <= p_now and mm.created_at > p_now - interval '1 hour'
      on conflict do nothing
      returning n.event_key, n.user_id, n.kind, n.url, n.body
    )
    select * from inserted;
end;
$$;

revoke execute on function public.claim_due_notifications(timestamptz, interval, interval) from public, anon, authenticated;
grant execute on function public.claim_due_notifications(timestamptz, interval, interval) to service_role;
