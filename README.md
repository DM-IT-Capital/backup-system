# Backup System

Veeam-style backup management platform for cloud-managed and on-prem deployments.

The first scaffold is a Next.js control plane that can be hosted on Vercel and backed by Supabase. Real backup, restore, replication, hypervisor discovery, and agent deployment should run through a separate on-prem gateway service inside the customer network.

## What is included now

- Dashboard UI for customers, servers, jobs, restore, and agent state.
- Placeholder API routes for job creation and agent heartbeat.
- TypeScript domain model for tenants, servers, agents, and jobs.
- Supabase schema draft with tenant isolation tables.
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

## Important architecture note

Vercel is suitable for the dashboard and control APIs. It is not suitable for long-running backup jobs, privileged OS operations, direct customer-network access, or hypervisor data movement. The production system needs an on-prem gateway/agent runtime for those tasks.
