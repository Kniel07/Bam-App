-- 0002_core.sql
-- Profiles, the single relationship, and its two members.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 40),
  welcomed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.relationship (
  id uuid primary key default gen_random_uuid(),
  start_at timestamptz not null,
  timezone text not null check (public.is_valid_timezone(timezone)),
  counter_message text not null default '' check (char_length(counter_message) <= 200),
  welcome_message text not null default '' check (char_length(welcome_message) <= 5000),
  intro_story text not null default '' check (char_length(intro_story) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exactly one relationship row can ever exist.
create unique index relationship_singleton on public.relationship ((true));

create table public.relationship_members (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  relationship_id uuid not null references public.relationship (id) on delete cascade,
  role public.member_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- At most one owner and one partner: "only two accounts" is a database fact.
  constraint relationship_members_one_per_role unique (relationship_id, role)
);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger relationship_set_updated_at before update on public.relationship
  for each row execute function public.set_updated_at();
create trigger relationship_members_set_updated_at before update on public.relationship_members
  for each row execute function public.set_updated_at();

-- Every new auth user gets a profile row (display name set later by the owner).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
