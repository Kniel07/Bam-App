-- 0007_storage.sql
-- Private media bucket and policies mirroring table access (DATABASE-DESIGN §7).
-- Path convention: {module}/{row_id}/{file}  e.g. memories/<uuid>/<random>.webp

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Read (also governs creating signed URLs).
create policy media_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and public.is_member()
    and (
      public.is_owner()
      or (
        (storage.foldername(name))[1] = 'story'
        and exists (
          select 1 from public.story_milestones m
          where m.id::text = (storage.foldername(name))[2] and m.status = 'published'
        )
      )
      or (
        (storage.foldername(name))[1] = 'letters'
        and exists (
          select 1 from public.letters l
          where l.id::text = (storage.foldername(name))[2] and public.letter_is_open(l.id)
        )
      )
      or (
        (storage.foldername(name))[1] = 'memories'
        and exists (
          select 1 from public.memories m
          where m.id::text = (storage.foldername(name))[2] and m.status = 'published'
        )
      )
    )
  );

-- Upload: owner anywhere; partner only into memories/<id>/ folders that are new
-- or belong to a memory she created.
create policy media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and public.is_member()
    and (
      public.is_owner()
      or (
        (storage.foldername(name))[1] = 'memories'
        and array_length(storage.foldername(name), 1) = 2
        and not exists (
          select 1 from public.memories m
          where m.id::text = (storage.foldername(name))[2]
            and m.created_by is distinct from (select auth.uid())
        )
      )
    )
  );

-- Overwrite: owner only (the app replaces files by uploading a new path).
create policy media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_owner())
  with check (bucket_id = 'media' and public.is_owner());

-- Delete: owner, or the partner for memory files she uploaded.
create policy media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and public.is_member()
    and (
      public.is_owner()
      or (
        (storage.foldername(name))[1] = 'memories'
        and owner_id = (select auth.uid())::text
      )
    )
  );
