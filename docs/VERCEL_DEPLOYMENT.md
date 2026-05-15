# Vercel Deployment

This repository is ready to deploy the web control plane to Vercel after dependencies are installed.

## Required services

- Vercel for the Next.js dashboard and API routes.
- Supabase for Postgres, Auth, and realtime job metadata.
- On-prem gateway service for actual backup, restore, replication, and server onboarding work.

## Deploy steps

1. Create a Supabase project.
2. Run `docs/SUPABASE_SCHEMA.sql` in the Supabase SQL editor.
3. Create a Vercel project from this repository.
4. Add these Vercel environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AGENT_ENROLLMENT_SECRET=
```

5. Deploy with the default Next.js build command:

```bash
npm run build
```

## Project settings

Use these Vercel project settings:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: `.next`

If the deployment fails with `No Output Directory named "public" found`, the Vercel project is configured as a static site. Change the Output Directory from `public` to `.next`, or clear the setting and let the Next.js preset manage it.

## Vercel boundary

Keep these workloads outside Vercel:

- Backup data transfer.
- Restore execution.
- Hypervisor snapshot and replication work.
- Agent installation over SSH, WinRM, or PowerShell.
- Long-running scheduled workers.

Use the Vercel-hosted app as the control plane. The on-prem gateway should perform customer-network operations and report progress back to Supabase/API routes.
