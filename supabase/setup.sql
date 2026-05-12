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
  created_at timestamptz not null default now()
);

create index if not exists incomes_user_id_idx
  on public.incomes (user_id);

-- We authenticate via Clerk and access Supabase using the service role key
-- from server-side route handlers only. RLS is therefore not relied on, but
-- enabling it with a deny-by-default policy is good defense-in-depth: if the
-- anon key is ever exposed to a client by mistake, no rows leak.
alter table public.expenses enable row level security;
alter table public.incomes  enable row level security;

-- No policies = deny all to anon / authenticated. service_role bypasses RLS.
