-- 0005_rls.sql
-- Row Level Security on every table. Default deny; no anon access at all.
-- Matrix: docs/database/DATABASE-DESIGN.md §5.

alter table public.profiles enable row level security;
alter table public.relationship enable row level security;
alter table public.relationship_members enable row level security;
alter table public.story_milestones enable row level security;
alter table public.letters enable row level security;
alter table public.letter_contents enable row level security;
alter table public.memories enable row level security;

-- Table privileges: anon gets nothing; authenticated gets only what policies need.
revoke all on public.profiles, public.relationship, public.relationship_members,
  public.story_milestones, public.letters, public.letter_contents, public.memories
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select, update on public.relationship to authenticated;
grant select on public.relationship_members to authenticated;
grant select, insert, update, delete on public.story_milestones to authenticated;
grant select, insert, update, delete on public.letters to authenticated;
grant select, insert, update, delete on public.letter_contents to authenticated;
grant select, insert, update, delete on public.memories to authenticated;

-- profiles
create policy profiles_select on public.profiles
  for select to authenticated using (public.is_member());
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_member() and (id = (select auth.uid()) or public.is_owner()))
  with check (public.is_member() and (id = (select auth.uid()) or public.is_owner()));

-- relationship (insert/delete only via provisioning as the database owner)
create policy relationship_select on public.relationship
  for select to authenticated using (public.is_member());
create policy relationship_update on public.relationship
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

-- relationship_members (read-only to members; never writable from the API)
create policy relationship_members_select on public.relationship_members
  for select to authenticated using (public.is_member());

-- story_milestones
create policy story_milestones_select on public.story_milestones
  for select to authenticated
  using (public.is_owner() or (public.is_member() and status = 'published'));
create policy story_milestones_insert on public.story_milestones
  for insert to authenticated with check (public.is_owner());
create policy story_milestones_update on public.story_milestones
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy story_milestones_delete on public.story_milestones
  for delete to authenticated using (public.is_owner());

-- letters (envelopes): partner sees published envelopes, never drafts
create policy letters_select on public.letters
  for select to authenticated
  using (public.is_owner() or (public.is_member() and status = 'published'));
create policy letters_insert on public.letters
  for insert to authenticated with check (public.is_owner());
create policy letters_update on public.letters
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy letters_delete on public.letters
  for delete to authenticated using (public.is_owner());

-- letter_contents: OWNER ONLY. The partner reads content exclusively through
-- open_letter() (TD-019), so no partner policy exists here by design.
create policy letter_contents_owner_all on public.letter_contents
  for all to authenticated using (public.is_owner()) with check (public.is_owner());

-- memories: shared scrapbook. Partner adds published memories and manages her own.
create policy memories_select on public.memories
  for select to authenticated
  using (public.is_owner() or (public.is_member() and status = 'published'));
create policy memories_insert on public.memories
  for insert to authenticated
  with check (
    public.is_member()
    and created_by = (select auth.uid())
    and (public.is_owner() or status = 'published')
  );
create policy memories_update on public.memories
  for update to authenticated
  using (public.is_owner() or (public.is_member() and created_by = (select auth.uid())))
  with check (
    public.is_owner()
    or (public.is_member() and created_by = (select auth.uid()) and status = 'published')
  );
create policy memories_delete on public.memories
  for delete to authenticated
  using (public.is_owner() or (public.is_member() and created_by = (select auth.uid())));
