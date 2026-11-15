-- 0003_content.sql
-- R1 content tables. Storage paths embed the owning row id so storage
-- policies can join back to the row (DATABASE-DESIGN §7).

create table public.story_milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  caption text not null default '' check (char_length(caption) <= 2000),
  occurred_on date not null,
  photo_path text check (photo_path is null or photo_path like 'story/' || id::text || '/%'),
  is_highlighted boolean not null default false,
  sort_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index story_milestones_timeline_idx
  on public.story_milestones (status, occurred_on, sort_order);

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 1 and 80),
  unlock_type public.unlock_type not null default 'on_demand',
  unlock_at timestamptz,
  status public.content_status not null default 'draft',
  sort_order integer not null default 0,
  first_opened_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint letters_unlock_at_matches_type
    check ((unlock_type = 'scheduled') = (unlock_at is not null))
);
create index letters_status_unlock_idx on public.letters (status, unlock_at);

-- Letter body lives apart from the envelope so RLS can withhold it entirely.
create table public.letter_contents (
  letter_id uuid primary key references public.letters (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 20000),
  photo_path text check (photo_path is null or photo_path like 'letters/' || letter_id::text || '/%'),
  audio_path text check (audio_path is null or audio_path like 'letters/' || letter_id::text || '/%'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  caption text not null default '' check (char_length(caption) <= 500),
  taken_on date not null default current_date,
  photo_path text not null check (photo_path like 'memories/' || id::text || '/%'),
  status public.content_status not null default 'published',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memories_gallery_idx on public.memories (status, taken_on desc, created_at desc);
create index memories_created_by_idx on public.memories (created_by);

create trigger story_milestones_set_updated_at before update on public.story_milestones
  for each row execute function public.set_updated_at();
create trigger letters_set_updated_at before update on public.letters
  for each row execute function public.set_updated_at();
create trigger letter_contents_set_updated_at before update on public.letter_contents
  for each row execute function public.set_updated_at();
create trigger memories_set_updated_at before update on public.memories
  for each row execute function public.set_updated_at();
