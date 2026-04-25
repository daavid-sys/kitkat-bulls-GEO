-- SWARM v3 — initial schema.
-- Postgres + pgvector. Mirrors the schema in .context/plans/full-plan.md.

create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- profiles mirrors auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  domain text not null,
  peec_brand_id text,
  peec_project_id text,
  voice_profile jsonb,
  seed_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (owner_id, domain)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  peec_topic_id text,
  name text not null
);
create index if not exists topics_brand_idx on public.topics(brand_id);

create table if not exists public.visibility_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  visibility numeric,
  share_of_voice numeric,
  sentiment numeric,
  ran_at timestamptz not null default now()
);
create index if not exists visibility_runs_brand_idx on public.visibility_runs(brand_id, ran_at desc);

create table if not exists public.context_chunks (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  source_url text not null,
  source_type text,
  text text not null,
  topic_ids uuid[] not null default '{}',
  embedding vector(768),
  is_likely_outdated boolean not null default false,
  last_traffic_check_at timestamptz,
  ingested_at timestamptz not null default now()
);
create index if not exists context_chunks_brand_idx on public.context_chunks(brand_id);
create index if not exists context_chunks_embedding_idx
  on public.context_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  agent_kind text not null,
  status text not null default 'running',
  trace jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists agent_runs_brand_idx on public.agent_runs(brand_id, started_at desc);

do $$ begin
  create type public.task_kind as enum ('trend','opportunity','outdated_content','mention');
exception when duplicate_object then null; end $$;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  agent_run_id uuid references public.agent_runs(id) on delete set null,
  kind public.task_kind not null,
  status text not null default 'open',
  title text not null,
  summary text,
  source_url text not null,
  source_domain text,
  platform text,
  related_topic_id uuid references public.topics(id) on delete set null,
  estimated_lift numeric,
  score numeric,
  raw jsonb,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tasks_brand_idx on public.tasks(brand_id, created_at desc);
create index if not exists tasks_kind_idx on public.tasks(kind);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  opener text,
  angle text,
  supporting text,
  cta text,
  alternates jsonb,
  context_chunk_ids uuid[] not null default '{}',
  status text not null default 'draft',
  updated_at timestamptz not null default now(),
  unique (task_id)
);

-- updated_at autobump for drafts
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists drafts_touch on public.drafts;
create trigger drafts_touch
  before update on public.drafts
  for each row execute function public.touch_updated_at();
