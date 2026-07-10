-- ============================================================
-- Outlier Dashboard — Supabase Schema Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  degree text not null default '',
  university_name text not null default '',
  graduation_year text not null default '',
  current_cgpa numeric not null default 0,
  target_gpa numeric not null default 0,
  semester text not null default '',
  course_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Courses
create table if not exists public.courses (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null default '',
  name text not null default '',
  credits integer not null default 0,
  grade_progress numeric not null default 0,
  impact_level text not null default 'standard',
  grade text not null default 'N/A',
  weightage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 3. Deadlines
create table if not exists public.deadlines (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  course text not null default '',
  topic text not null default '',
  due_date text not null default '',
  priority text not null default 'medium',
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 4. Onboarding States
create table if not exists public.onboarding_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  loadout_committed boolean not null default false,
  committed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS) — users can only access their own data
-- ============================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.deadlines enable row level security;
alter table public.onboarding_states enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Courses policies
create policy "Users can view own courses"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "Users can insert own courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "Users can update own courses"
  on public.courses for update
  using (auth.uid() = user_id);

create policy "Users can delete own courses"
  on public.courses for delete
  using (auth.uid() = user_id);

-- Deadlines policies
create policy "Users can view own deadlines"
  on public.deadlines for select
  using (auth.uid() = user_id);

create policy "Users can insert own deadlines"
  on public.deadlines for insert
  with check (auth.uid() = user_id);

create policy "Users can update own deadlines"
  on public.deadlines for update
  using (auth.uid() = user_id);

create policy "Users can delete own deadlines"
  on public.deadlines for delete
  using (auth.uid() = user_id);

-- Onboarding states policies
create policy "Users can view own onboarding state"
  on public.onboarding_states for select
  using (auth.uid() = user_id);

create policy "Users can insert own onboarding state"
  on public.onboarding_states for insert
  with check (auth.uid() = user_id);

create policy "Users can update own onboarding state"
  on public.onboarding_states for update
  using (auth.uid() = user_id);
