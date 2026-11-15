-- 0004_security_helpers.sql
-- Membership checks used by every policy. SECURITY DEFINER so they can read
-- relationship_members without recursive RLS; empty search_path for safety.

create function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.relationship_members where user_id = (select auth.uid())
  );
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.relationship_members
    where user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- A letter's content is available to the partner only when published and
-- either on-demand or past its unlock moment (database clock, DR-03).
create function public.letter_is_open(p_letter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.letters l
    where l.id = p_letter_id
      and l.status = 'published'
      and (l.unlock_type = 'on_demand' or l.unlock_at <= now())
  );
$$;

revoke execute on function public.is_member() from public, anon;
revoke execute on function public.is_owner() from public, anon;
revoke execute on function public.letter_is_open(uuid) from public, anon;
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.letter_is_open(uuid) to authenticated;
