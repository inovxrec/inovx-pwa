-- Stream C: Accounts, login & directory
-- Run AFTER 001 (Stream A's base schema + tenures table)

alter table users
  add column if not exists must_change_password boolean not null default true,
  add column if not exists status text not null default 'active'
  check (status in ('active', 'deactivated'));

create table if not exists member_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dob date,
  team text,
  card_url text,
  photo_url text,
  external_key text unique,
  linked_user_id uuid references users(id),
  conflict_flag boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table member_directory enable row level security;

create policy "directory_read_all_authenticated"
  on member_directory for select
  using (auth.role() = 'authenticated');