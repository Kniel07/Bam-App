-- 0006_rpc.sql
-- Database functions exposed through the API (DATABASE-DESIGN §6).

-- The ONLY way the partner can read letter content (TD-019).
-- Raises not_found (P0002) for non-members, drafts, and locked letters, so a
-- locked letter is indistinguishable from a missing one.
create function public.open_letter(p_letter_id uuid)
returns table (
  letter_id uuid,
  label text,
  body text,
  photo_path text,
  audio_path text,
  first_opened_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_is_owner boolean := public.is_owner();
begin
  if not public.is_member() then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if not v_is_owner and not public.letter_is_open(p_letter_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Record the partner's first opening (the owner previewing doesn't count).
  if not v_is_owner then
    update public.letters
       set first_opened_at = now()
     where id = p_letter_id
       and first_opened_at is null;
  end if;

  return query
    select l.id, l.label, c.body, c.photo_path, c.audio_path, l.first_opened_at
      from public.letters l
      join public.letter_contents c on c.letter_id = l.id
     where l.id = p_letter_id;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

-- Marks the caller's first-visit welcome as seen (A1). Idempotent.
create function public.mark_welcomed()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles
     set welcomed_at = now()
   where id = (select auth.uid())
     and welcomed_at is null
     and public.is_member();
$$;

-- Server clock for countdown calibration (display only; never for security).
create function public.get_server_time()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

-- Harmless call for the scheduled keep-alive job (TD-012/TD-020). Reads nothing.
create function public.keepalive()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 1;
$$;

-- Ends every partner session (key rotation, F12). service_role only.
create function public.revoke_partner_sessions()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from auth.sessions s
   using public.relationship_members m
   where m.role = 'partner'
     and s.user_id = m.user_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.open_letter(uuid) from public, anon;
revoke execute on function public.mark_welcomed() from public, anon;
revoke execute on function public.get_server_time() from public, anon;
revoke execute on function public.keepalive() from public;
revoke execute on function public.revoke_partner_sessions() from public, anon, authenticated;

grant execute on function public.open_letter(uuid) to authenticated;
grant execute on function public.mark_welcomed() to authenticated;
grant execute on function public.get_server_time() to authenticated;
grant execute on function public.keepalive() to anon, authenticated;
grant execute on function public.revoke_partner_sessions() to service_role;
