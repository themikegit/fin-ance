-- Run this in the Supabase SQL editor for your project.
-- These tables store finance data scoped to Clerk user IDs.

create extension if not exists "pgcrypto";

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text not null check (
    category in ('gas','groceries','housing','pharmacy','bills','restaurants','other')
  ),
  name text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_created_at_idx
  on public.expenses (user_id, created_at desc);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  label text not null,
  amount numeric(12, 2) not null check (amount > 0),
  recurring boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.incomes
  add column if not exists recurring boolean not null default true;

create index if not exists incomes_user_id_idx
  on public.incomes (user_id);

create table if not exists public.monthly_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  label text not null,
  amount numeric(12, 2) not null check (amount > 0),
  months integer check (months is null or months > 0),
  created_at timestamptz not null default now()
);

alter table public.monthly_expenses
  add column if not exists months integer
    check (months is null or months > 0);

create index if not exists monthly_expenses_user_id_idx
  on public.monthly_expenses (user_id);

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade,
  user_id text,
  invited_email text not null,
  role text not null default 'member',
  status text not null default 'pending',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index if not exists space_members_space_id_idx on public.space_members (space_id);
create index if not exists space_members_user_id_idx on public.space_members (user_id);

-- Spaces are pure aggregation: expenses always belong to a user, the space
-- view rolls up across accepted members.
alter table public.expenses drop column if exists space_id;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.categories drop column if exists emoji;

alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses
  add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.expenses drop column if exists category;
alter table public.expenses drop column if exists category_emoji;

-- We authenticate via Clerk and access Supabase using the service role key
-- from server-side route handlers only. RLS is therefore not relied on, but
-- enabling it with a deny-by-default policy is good defense-in-depth: if the
-- anon key is ever exposed to a client by mistake, no rows leak.
alter table public.expenses         enable row level security;
alter table public.incomes          enable row level security;
alter table public.monthly_expenses enable row level security;
alter table public.spaces           enable row level security;
alter table public.space_members    enable row level security;
alter table public.categories       enable row level security;

-- No policies = deny all to anon / authenticated. service_role bypasses RLS.
