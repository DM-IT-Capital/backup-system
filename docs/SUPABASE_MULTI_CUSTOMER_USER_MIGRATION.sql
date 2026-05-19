-- Enables this access model:
-- 1. Platform admins can see and manage every customer.
-- 2. Customer users can be assigned to one or more customers through customer_members.
--
-- Run this once in Supabase SQL Editor after deploying the updated app code.

create or replace function is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from managed_users
    where managed_users.id = auth.uid()
    and managed_users.account_type = 'platform_admin'
    and managed_users.status = 'active'
  );
$$;

create or replace function is_customer_member(target_customer_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select is_platform_admin() or exists (
    select 1
    from customer_members
    where customer_members.customer_id = target_customer_id
    and customer_members.user_id = auth.uid()
  );
$$;

-- Recreate user policies so platform admins can manage all users and memberships.
drop policy if exists "members can read memberships" on customer_members;
drop policy if exists "users can create their owner membership" on customer_members;
drop policy if exists "members can manage users" on managed_users;

create policy "members can read memberships"
on customer_members for select
using (is_customer_member(customer_id));

create policy "platform admins can manage memberships"
on customer_members for all
using (is_platform_admin() or is_customer_member(customer_id))
with check (is_platform_admin() or is_customer_member(customer_id));

create policy "users can create their owner membership"
on customer_members for insert
to authenticated
with check (user_id = auth.uid() or is_platform_admin());

create policy "members can manage users"
on managed_users for all
using (is_platform_admin() or account_type = 'platform_admin' or is_customer_member(customer_id))
with check (is_platform_admin() or account_type = 'platform_admin' or is_customer_member(customer_id));

-- Optional but recommended for the first manually-created admin user:
-- Replace the values below, then run this insert once if your admin auth user
-- does not already exist in public.managed_users.
--
-- insert into managed_users (id, account_type, customer_id, name, email, role, status)
-- values ('YOUR_AUTH_USER_UUID', 'platform_admin', null, 'Platform Admin', 'admin@example.com', 'owner', 'active')
-- on conflict (id) do update set
--   account_type = excluded.account_type,
--   customer_id = excluded.customer_id,
--   name = excluded.name,
--   email = excluded.email,
--   role = excluded.role,
--   status = excluded.status;
