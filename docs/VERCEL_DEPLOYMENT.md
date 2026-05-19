# Vercel Deployment

This repository is ready to deploy the web control plane to Vercel after dependencies are installed.

## Required services

- Vercel for the Next.js dashboard and API routes.
- Supabase for Postgres, Auth, and realtime job metadata.
- On-prem gateway service for actual backup, restore, replication, and server onboarding work.

## Deploy steps

1. Create a Supabase project.
2. Run `docs/SUPABASE_SCHEMA.sql` in the Supabase SQL editor.
3. Create at least one Supabase Auth user.
4. Create a Vercel project from this repository.
5. Add these Vercel environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AGENT_ENROLLMENT_SECRET=
```

6. Deploy with the default Next.js build command:

```bash
npm run build
```

## Project settings

Use these Vercel project settings:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: `.next`

If the deployment fails with `No Output Directory named "public" found`, the Vercel project is configured as a static site. Change the Output Directory from `public` to `.next`, or clear the setting and let the Next.js preset manage it.

## Login troubleshooting

If `/login` shows `Supabase is not configured`, the app is missing required environment variables.

Set these in Vercel Project Settings > Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AGENT_ENROLLMENT_SECRET=
```

Then redeploy. The email and password must belong to a user created in Supabase Authentication.

The Users page manages application-level customer users and roles. Supabase Authentication still controls who can sign in; create real login accounts in Supabase Authentication, then manage their customer-facing access from `/users`.

## Vercel boundary

Keep these workloads outside Vercel:

- Backup data transfer.
- Restore execution.
- Hypervisor snapshot and replication work.
- Agent installation over SSH, WinRM, or PowerShell.
- Long-running scheduled workers.

Use the Vercel-hosted app as the control plane. The on-prem gateway should perform customer-network operations and report progress back to Supabase/API routes.

## Required Supabase variables for login and Add user

In Vercel, add these Environment Variables for the Production environment, then redeploy:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role secret key, required by the Add user flow to create Supabase Auth users without email invites

The first admin must still exist in Supabase Auth before the first login. Create it in Supabase Dashboard > Authentication > Users > Add user, confirm the email, then use it to sign in to this app. After that, use the Users page > Add user button to create more platform or customer users with a temporary password.

## Supabase login troubleshooting

If the login page says `NEXT_PUBLIC_SUPABASE_URL is not a valid URL`, check the Vercel value for `NEXT_PUBLIC_SUPABASE_URL`.

Use the Supabase **Project URL** only, for example:

```text
https://xxxxx.supabase.co
```

Do not paste the database connection string, the anon key, or the whole `.env` line into the value field.

Correct Vercel values:

```text
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your anon public key
SUPABASE_SERVICE_ROLE_KEY=your service_role secret key
```

After editing variables, redeploy with **Use existing Build Cache** turned **OFF**.

You can also open `/api/debug/supabase-config` after deployment. It will only show whether the Supabase URL is readable and valid; it does not reveal the full key.

## Multi-customer user access

This version supports assigning a customer user to multiple customers. Platform admins do not need customer selection and can see all customers.

After deploying this code, run this SQL file in Supabase SQL Editor:

```text
/docs/SUPABASE_MULTI_CUSTOMER_USER_MIGRATION.sql
```

For the first manually-created admin, make sure the Supabase Auth user also has a row in `managed_users` with `account_type = 'platform_admin'` and `status = 'active'`.
