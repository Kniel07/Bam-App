-- 0009_shared_story.sql
-- Change request CR-02 (owner, BUILD): the partner can add to every content section.
-- Our Story adopts the same author model as letters (CR-01) and memories:
--   both members add milestones; each edits/deletes their own; drafts are
--   private to their author; the owner may also delete any milestone he can see.
-- Storage policies are recreated in one place so every module follows the same rule.

create function public.can_write_story_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member() and not exists (
    select 1 from public.story_milestones m
    where m.id::text = p_folder and m.created_by is distinct from (select auth.uid())
  );
$$;

create function public.can_write_memory_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_member() and not exists (
    select 1 from public.memories m
    where m.id::text = p_folder and m.created_by is distinct from (select auth.uid())
  );
$$;

revoke execute on function public.can_write_story_folder(text) from public, anon;
revoke execute on function public.can_write_memory_folder(text) from public, anon;
grant execute on function public.can_write_story_folder(text) to authenticated;
grant execute on function public.can_write_memory_folder(text) to authenticated;

-- ------------------------------------------------------- story_milestones

drop policy story_milestones_select on public.story_milestones;
drop policy story_milestones_insert on public.story_milestones;
drop policy story_milestones_update on public.story_milestones;
drop policy story_milestones_delete on public.story_milestones;

-- Authors may not reassign ownership.
revoke update on public.story_milestones from authenticated;
grant update (title, caption, occurred_on, photo_path, is_highlighted, sort_order, status)
  on public.story_milestones to authenticated;

create policy story_milestones_select on public.story_milestones
  for select to authenticated
  using (public.is_member() and (created_by = (select auth.uid()) or status = 'published'));

create policy story_milestones_insert on public.story_milestones
  for insert to authenticated
  with check (public.is_member() and created_by = (select auth.uid()));

create policy story_milestones_update on public.story_milestones
  for update to authenticated
  using (public.is_member() and created_by = (select auth.uid()))
  with check (public.is_member() and created_by = (select auth.uid()));

create policy story_milestones_delete on public.story_milestones
  for delete to authenticated
  using (public.is_member() and (created_by = (select auth.uid()) or public.is_owner()));

-- ------------------------------------------------------------------ storage
-- Read follows row visibility (the subqueries run under each table's RLS);
-- write needs a new folder or your own row; delete is the uploader or the owner.

drop policy media_select on storage.objects;
drop policy media_insert on storage.objects;
drop policy media_update on storage.objects;
drop policy media_delete on storage.objects;

create policy media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and public.is_member()
    and (
      (
        (storage.foldername(name))[1] = 'story'
        and exists (select 1 from public.story_milestones m where m.id::text = (storage.foldername(name))[2])
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
        and exists (select 1 from public.memories m where m.id::text = (storage.foldername(name))[2])
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
      ((storage.foldername(name))[1] = 'story' and public.can_write_story_folder((storage.foldername(name))[2]))
      or ((storage.foldername(name))[1] = 'letters' and public.can_write_letter_folder((storage.foldername(name))[2]))
      or ((storage.foldername(name))[1] = 'memories' and public.can_write_memory_folder((storage.foldername(name))[2]))
    )
  );

-- The app never overwrites files; kept to the uploader as defense in depth.
create policy media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_member() and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'media' and public.is_member() and owner_id = (select auth.uid())::text);

create policy media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and public.is_member()
    and (public.is_owner() or owner_id = (select auth.uid())::text)
  );
