create type managed_user_status as enum ('active', 'invited', 'disabled');
create type managed_user_account_type as enum ('platform_admin', 'customer_user');

create table managed_users (
  id uuid primary key default gen_random_uuid(),
  account_type managed_user_account_type not null default 'customer_user',
  customer_id uuid references customers(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'operator', 'viewer')),
  status managed_user_status not null default 'invited',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (account_type = 'platform_admin' and customer_id is null)
    or (account_type = 'customer_user' and customer_id is not null)
  ),
  unique (customer_id, email)
);

alter table managed_users enable row level security;

create policy "members can manage users"
on managed_users for all
using (account_type = 'platform_admin' or is_customer_member(customer_id))
with check (account_type = 'platform_admin' or is_customer_member(customer_id));
