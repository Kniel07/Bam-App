-- 0008_partner_letters.sql
-- Change request CR-01 (owner, BUILD): both members can write letters for each other.
--
--   Author (letters.created_by):  full control of their own letters; reads own content anytime.
--   Recipient (the other member): sees published envelopes; reads content only once open
--                                  (published and on-demand or past unlock_at, database clock).
--   Owner:                         may additionally delete any letter they can see.
--
-- Drafts are private to their author. The owner can no longer read the partner's
-- letters before they unlock (preserves her surprises).

-- ----------------------------------------------------------------- helpers

create function public.is_letter_author(p_letter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member() and exists (
    select 1 from public.letters l
    where l.id = p_letter_id and l.created_by = (select auth.uid())
  );
$$;

create function public.can_read_letter_content(p_letter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member()
     and (public.is_letter_author(p_letter_id) or public.letter_is_open(p_letter_id));
$$;

-- Storage helper: may the caller upload into letters/<folder>/ ? True when no
-- letter with that id exists yet (create flow uploads first) or the caller wrote it.
create function public.can_write_letter_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member() and not exists (
    select 1 from public.letters l
    where l.id::text = p_folder and l.created_by is distinct from (select auth.uid())
  );
$$;

revoke execute on function public.is_letter_author(uuid) from public, anon;
revoke execute on function public.can_read_letter_content(uuid) from public, anon;
revoke execute on function public.can_write_letter_folder(text) from public, anon;
grant execute on function public.is_letter_author(uuid) to authenticated;
grant execute on function public.can_read_letter_content(uuid) to authenticated;
grant execute on function public.can_write_letter_folder(text) to authenticated;

-- ----------------------------------------------------------------- letters

-- Authors may change envelope fields only (not created_by or first_opened_at).
revoke update on public.letters from authenticated;
grant update (label, unlock_type, unlock_at, status, sort_order) on public.letters to authenticated;

drop policy letters_select on public.letters;
drop policy letters_insert on public.letters;
drop policy letters_update on public.letters;
drop policy letters_delete on public.letters;

create policy letters_select on public.letters
  for select to authenticated
  using (public.is_member() and (created_by = (select auth.uid()) or status = 'published'));

create policy letters_insert on public.letters
  for insert to authenticated
  with check (public.is_member() and created_by = (select auth.uid()));

create policy letters_update on public.letters
  for update to authenticated
  using (public.is_member() and created_by = (select auth.uid()))
  with check (public.is_member() and created_by = (select auth.uid()));

create policy letters_delete on public.letters
  for delete to authenticated
  using (public.is_member() and (created_by = (select auth.uid()) or public.is_owner()));

-- --------------------------------------------------------- letter_contents
-- Only the author can read content through the table API; the recipient reads
-- exclusively via open_letter() (TD-019 still holds for recipients).

drop policy letter_contents_owner_all on public.letter_contents;

create policy letter_contents_select on public.letter_contents
  for select to authenticated using (public.is_letter_author(letter_id));
create policy letter_contents_insert on public.letter_contents
  for insert to authenticated with check (public.is_letter_author(letter_id));
create policy letter_contents_update on public.letter_contents
  for update to authenticated
  using (public.is_letter_author(letter_id))
  with check (public.is_letter_author(letter_id));
create policy letter_contents_delete on public.letter_contents
  for delete to authenticated using (public.is_letter_author(letter_id) or public.is_owner());

-- ------------------------------------------------------------ open_letter
-- Return type gains author_id, so the function is recreated.

drop function public.open_letter(uuid);

create function public.open_letter(p_letter_id uuid)
returns table (
  letter_id uuid,
  label text,
  body text,
  photo_path text,
  audio_path text,
  first_opened_at timestamptz,
  author_id uuid
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_is_author boolean := public.is_letter_author(p_letter_id);
begin
  if not public.is_member() then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  if not v_is_author and not public.letter_is_open(p_letter_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  -- Only the recipient's first opening counts (an author previewing doesn't).
  if not v_is_author then
    update public.letters
       set first_opened_at = now()
     where id = p_letter_id
       and first_opened_at is null;
  end if;

  return query
    select l.id, l.label, c.body, c.photo_path, c.audio_path, l.first_opened_at, l.created_by
      from public.letters l
      join public.letter_contents c on c.letter_id = l.id
     where l.id = p_letter_id;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.open_letter(uuid) from public, anon;
grant execute on function public.open_letter(uuid) to authenticated;

-- ------------------------------------------------------------------ storage

drop policy media_select on storage.objects;
drop policy media_insert on storage.objects;
drop policy media_delete on storage.objects;

create policy media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and public.is_member()
    and (
      (
        (storage.foldername(name))[1] = 'story'
        and (
          public.is_owner()
          or exists (
            select 1 from public.story_milestones m
            where m.id::text = (storage.foldername(name))[2] and m.status = 'published'
          )
        )
      )
      or (
        (storage.foldername(name))[1] = 'letters'
        and exists (
          select 1 from public.letters l
          where l.id::text = (storage.foldername(name))[2] and public.can_read_letter_content(l.id)
        )
      )
      or (
        (storage.foldername(name))[1] = 'memories'
        and (
          public.is_owner()
          or exists (
            select 1 from public.memories m
            where m.id::text = (storage.foldername(name))[2] and m.status = 'published'
          )
        )
      )
    )
  );

create policy media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and public.is_member()
    and array_length(storage.foldername(name), 1) = 2
    and (
      ((storage.foldername(name))[1] = 'story' and public.is_owner())
      or (
        (storage.foldername(name))[1] = 'letters'
        and public.can_write_letter_folder((storage.foldername(name))[2])
      )
      or (
        (storage.foldername(name))[1] = 'memories'
        and (
          public.is_owner()
          or not exists (
            select 1 from public.memories m
            where m.id::text = (storage.foldername(name))[2]
              and m.created_by is distinct from (select auth.uid())
          )
        )
      )
    )
  );

create policy media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and public.is_member()
    and (
      public.is_owner()
      or (
        (storage.foldername(name))[1] in ('memories', 'letters')
        and owner_id = (select auth.uid())::text
      )
    )
  );

-- Overwrite stays owner-only, but never inside the partner's letter folders.
drop policy media_update on storage.objects;
create policy media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and public.is_owner()
    and ((storage.foldername(name))[1] <> 'letters' or public.can_write_letter_folder((storage.foldername(name))[2]))
  )
  with check (
    bucket_id = 'media'
    and public.is_owner()
    and ((storage.foldername(name))[1] <> 'letters' or public.can_write_letter_folder((storage.foldername(name))[2]))
  );
