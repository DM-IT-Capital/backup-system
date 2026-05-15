create type managed_user_status as enum ('active', 'invited', 'disabled');

create table managed_users (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'operator', 'viewer')),
  status managed_user_status not null default 'invited',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (customer_id, email)
);

alter table managed_users enable row level security;

create policy "members can manage users"
on managed_users for all
using (is_customer_member(customer_id))
with check (is_customer_member(customer_id));
