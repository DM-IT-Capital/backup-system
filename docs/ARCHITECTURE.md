# Antarex Backup Control Architecture

This project is designed as a Veeam-like backup control plane with separate execution workers.

## Core rule

Vercel should host the dashboard, tenant API, authentication, reporting, policy management, and command queue. Vercel should not run backup, restore, replication, discovery, VMware API crawling, SSH, WinRM, SMB, iSCSI, or long-running transfer jobs.

Those operations must run inside the customer environment through an on-prem gateway and workload agents.

## Deployment modes

- Cloud mode: the SaaS dashboard manages many customers. Each customer has one or more on-prem gateways that call out to the cloud API.
- On-prem mode: the same dashboard/API can be deployed in the customer environment and scoped to that customer only.
- Hybrid mode: customer on-prem gateway performs work locally, while the cloud dashboard stores metadata, schedules, alerts, and audit trails.

## Components

- Web dashboard: Next.js on Vercel for customers, servers, jobs, restore points, alerts, and audit logs.
- Supabase: Postgres database, authentication, row-level security, object metadata, and realtime job state.
- Control API: validates user actions, writes jobs, and queues commands for gateways/agents.
- On-prem gateway: installed once per site. It discovers servers, talks to hypervisors, deploys agents, moves backup data, and reports status.
- Workload agent: installed on Windows/Linux servers for file, volume, application-aware, and bare-metal workflows.
- Repository service: stores backup blocks locally, in S3-compatible storage, or in immutable cloud storage.

## Server onboarding flow

1. User adds server IP, OS/hypervisor type, credentials, and customer/site.
2. Control plane creates a discovery command for the on-prem gateway.
3. Gateway connects by SSH, WinRM, VMware API, Hyper-V PowerShell, or Proxmox API.
4. Gateway installs or registers an agent when needed.
5. Agent starts heartbeating to the gateway or cloud API.
6. Server becomes eligible for backup, replication, and restore jobs.

## Job flow

1. User creates one operation and selects backup, replication, or restore.
2. API saves job definition and creates one or more job runs.
3. Gateway polls for commands or receives a realtime notification.
4. Gateway executes the job locally and streams progress events.
5. Supabase stores run state, network throughput, progress, bottleneck, logs, restore points, and audit events.

## Replication flow

Replication is executed by the on-prem gateway, not by Vercel. A replication operation should define source workload, target site/gateway, target datastore/repository, network mapping, retention, and RPO. The gateway reads changed data from the source, transfers it to the target repository or hypervisor, and reports throughput and lag back to the cloud control plane.

## Server discovery and agent install

Adding a server IP must not mark the agent online. The correct state flow is:

1. `unknown`: IP was added, not checked yet.
2. `checking`: gateway is testing reachability.
3. `reachable`: gateway can connect by SSH, WinRM, or hypervisor API.
4. `installing`: agent installation command was sent.
5. `online`: installed agent has heartbeated successfully.

The UI should only show an agent as online after the real agent heartbeat is received.

## Repositories

Repositories are backup storage targets. They can be local disk, NAS/SMB, S3-compatible storage, Azure Blob, or Google Cloud Storage. Backup and replication operations should select a repository, and restore operations should select from restore points stored in a repository.

## Hypervisor support path

- VMware ESXi/vCenter: use VMware APIs from the on-prem gateway. Start with VM inventory, snapshots, CBT-aware backup design, and restore metadata.
- Hyper-V: use PowerShell/WinRM locally from the gateway.
- Proxmox: use the Proxmox API from the gateway.
- Generic server: use workload agent for file/volume backups.

## Security baseline

- Tenant isolation with Supabase row-level security.
- No inbound firewall hole required for cloud mode; gateways call out to the cloud.
- Per-customer gateway enrollment token.
- Credentials encrypted before storage.
- Immutable audit log for login, credential, server, job, restore, and policy changes.
- Least-privilege service accounts for hypervisor and server access.

## First production milestones

1. Multi-tenant dashboard, auth, customers, sites, servers, and jobs.
2. Gateway enrollment and heartbeat.
3. Server discovery by IP for Linux SSH and Windows WinRM.
4. Agent installer for Linux and Windows.
5. File-level backup to local repository.
6. Restore to alternate path.
7. Hypervisor inventory and snapshot orchestration.
8. Replication and disaster recovery workflows.
