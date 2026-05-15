create extension if not exists pgcrypto;

create type deployment_mode as enum ('cloud', 'onprem');
create type server_kind as enum ('windows', 'linux', 'esxi', 'hyperv', 'proxmox', 'generic');
create type agent_status as enum ('not_installed', 'installing', 'online', 'offline', 'error');
create type protection_action as enum ('backup', 'replicate', 'restore');
create type job_status as enum ('idle', 'queued', 'running', 'warning', 'failed', 'success');

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode deployment_mode not null default 'cloud',
  created_at timestamptz not null default now()
);

create table customer_members (
  customer_id uuid not null references customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (customer_id, user_id)
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table gateways (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  name text not null,
  enrollment_token_hash text not null,
  version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table protected_servers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  gateway_id uuid references gateways(id) on delete set null,
  hostname text not null,
  address inet not null,
  kind server_kind not null,
  agent_status agent_status not null default 'not_installed',
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table repositories (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  site_id uuid references sites(id) on delete set null,
  name text not null,
  repository_type text not null check (repository_type in ('local', 'nas', 's3', 'azure_blob', 'gcs')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table protection_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  action protection_action not null,
  schedule_cron text,
  policy jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table job_targets (
  job_id uuid not null references protection_jobs(id) on delete cascade,
  server_id uuid not null references protected_servers(id) on delete cascade,
  primary key (job_id, server_id)
);

create table job_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references protection_jobs(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  status job_status not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  bytes_processed bigint not null default 0,
  message text,
  created_at timestamptz not null default now()
);

create table restore_points (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  server_id uuid not null references protected_servers(id) on delete cascade,
  repository_id uuid not null references repositories(id) on delete restrict,
  job_run_id uuid references job_runs(id) on delete set null,
  captured_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table commands (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  gateway_id uuid references gateways(id) on delete cascade,
  command_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status job_status not null default 'queued',
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table customers enable row level security;
alter table customer_members enable row level security;
alter table sites enable row level security;
alter table gateways enable row level security;
alter table protected_servers enable row level security;
alter table repositories enable row level security;
alter table protection_jobs enable row level security;
alter table job_targets enable row level security;
alter table job_runs enable row level security;
alter table restore_points enable row level security;
alter table commands enable row level security;
alter table audit_events enable row level security;

create policy "members can read customers"
on customers for select
using (
  exists (
    select 1 from customer_members
    where customer_members.customer_id = customers.id
    and customer_members.user_id = auth.uid()
  )
);

-- Repeat the customer_members lookup policy for tenant-owned tables before production.
