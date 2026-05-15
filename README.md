# Antarex Backup Control

Veeam-style backup management platform for cloud-managed and on-prem deployments.

The first scaffold is a Next.js control plane that can be hosted on Vercel and backed by Supabase. Real backup, restore, replication, hypervisor discovery, and agent deployment should run through a separate on-prem gateway service inside the customer network.

## What is included now

- Dashboard UI for customers, servers, jobs, restore, and agent state.
- Supabase Auth login with protected dashboard routes.
- User management for customer users, roles, invite status, edit, and removal.
- API routes for customer creation, user management, server onboarding, agent deploy commands, job creation, job runs, and restore requests.
- TypeScript domain model for tenants, servers, agents, and jobs.
- Supabase schema with tenant isolation tables and row-level security policies.
- Architecture notes for cloud, on-prem, and hybrid deployments.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AGENT_ENROLLMENT_SECRET=
```

When Supabase variables are configured, `/login` requires a real Supabase Auth user. Without Supabase variables, the app falls back to local demo data for development.

## Production setup

1. Create a Supabase project.
2. Run `docs/SUPABASE_SCHEMA.sql` in Supabase SQL Editor.
3. Create at least one Supabase Auth user.
4. Add the environment variables in Vercel.
5. Deploy the app.
6. Sign in at `/login`, create a customer, then create repositories, gateways, servers, jobs, and restore requests.

## Important architecture note

Vercel is suitable for the dashboard and control APIs. It is not suitable for long-running backup jobs, privileged OS operations, direct customer-network access, or hypervisor data movement. The production system needs an on-prem gateway/agent runtime for those tasks.
