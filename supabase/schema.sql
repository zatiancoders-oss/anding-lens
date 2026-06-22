-- ============================================================
-- LandingLens — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with plan info
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  audit_count_this_month integer not null default 0,
  audit_reset_date date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- AUDITS TABLE
-- Stores all audit results
-- ============================================================
create table public.audits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  page_title text,
  overall_score integer not null default 0,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  recommendations text[] not null default '{}',
  top_problems text[] not null default '{}',
  top_improvements text[] not null default '{}',
  suggested_headline text,
  suggested_cta text,
  headline_clarity_score integer,
  cta_effectiveness_score integer,
  trust_signals_score integer,
  readability_score integer,
  value_proposition_score integer,
  seo_score integer,
  raw_analysis jsonb,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.audits enable row level security;

create policy "Users can view their own audits"
  on public.audits for select
  using (auth.uid() = user_id);

create policy "Users can insert their own audits"
  on public.audits for insert
  with check (auth.uid() = user_id);

-- Index for faster queries
create index audits_user_id_created_at_idx on public.audits(user_id, created_at desc);
