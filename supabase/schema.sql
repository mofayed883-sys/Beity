-- Run this file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_name text not null,
  client_name text not null default '',
  client_phone text not null default '',
  room_type text not null default '',
  design_style text not null default '',
  notes text not null default '',
  room_image_path text,
  selected_furniture jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;
grant usage on schema public to authenticated;

create or replace function public.set_project_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_project_updated_at();

drop policy if exists "Project owners can read their projects" on public.projects;
create policy "Project owners can read their projects"
  on public.projects for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Project owners can create their projects" on public.projects;
create policy "Project owners can create their projects"
  on public.projects for insert to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Project owners can update their projects" on public.projects;
create policy "Project owners can update their projects"
  on public.projects for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Project owners can delete their projects" on public.projects;
create policy "Project owners can delete their projects"
  on public.projects for delete to authenticated
  using ((select auth.uid()) = owner_id);

grant select, insert, update, delete on public.projects to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users upload their own room photos" on storage.objects;
create policy "Users upload their own room photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users read their own room photos" on storage.objects;
create policy "Users read their own room photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their own room photos" on storage.objects;
create policy "Users delete their own room photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'room-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
