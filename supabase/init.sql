create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  role text not null default 'member' check (role in ('admin', 'member', 'viewer')),
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.profiles (id, email)
select id, email
from auth.users
on conflict (id) do update
set email = excluded.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text,
  status text not null default '选题中',
  deadline date,
  priority text default '中',
  owner_name text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.projects
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.projects
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.project_updates
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.project_updates
  add column if not exists created_by_email text;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;

create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;

drop policy if exists "Authenticated users can read profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Authenticated users can read projects" on public.projects;
drop policy if exists "Authenticated users can insert projects" on public.projects;
drop policy if exists "Authenticated users can update projects" on public.projects;
drop policy if exists "Authenticated users can delete projects" on public.projects;

create policy "Authenticated users can read projects"
on public.projects
for select
to authenticated
using (true);

create policy "Authenticated users can insert projects"
on public.projects
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
);

create policy "Authenticated users can update projects"
on public.projects
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
);

create policy "Authenticated users can delete projects"
on public.projects
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
);

drop policy if exists "Authenticated users can read project updates" on public.project_updates;
drop policy if exists "Authenticated users can insert project updates" on public.project_updates;
drop policy if exists "Authenticated users can update project updates" on public.project_updates;
drop policy if exists "Authenticated users can delete project updates" on public.project_updates;

create policy "Authenticated users can read project updates"
on public.project_updates
for select
to authenticated
using (true);

create policy "Authenticated users can insert project updates"
on public.project_updates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
);

create policy "Authenticated users can update project updates"
on public.project_updates
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
)
with check (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
);

create policy "Authenticated users can delete project updates"
on public.project_updates
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid() and p.role in ('admin', 'member')
  )
);
