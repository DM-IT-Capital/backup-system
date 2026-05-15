# Product Roadmap

## Phase 1: Control plane

- Supabase Auth and tenant membership. Done for initial email/password flow.
- Customers, users, protected servers, jobs, and restore requests. Initial API routes are implemented.
- Sites, repositories, and gateways. Schema exists; full UI still needs to be expanded.
- Dashboard connected to Supabase data when environment variables are configured.
- Audit events for every user and system action.
- Gateway enrollment token generation.

## Phase 2: Gateway

- On-prem gateway service for Windows and Linux.
- Outbound-only connection to cloud API.
- Heartbeat, command polling, structured logs, and version reporting.
- Credential vault integration.
- Server discovery by IP with SSH and WinRM.

## Phase 3: Agent deployment

- Linux agent installer over SSH.
- Windows agent installer over WinRM or PowerShell remoting.
- Agent enrollment, heartbeat, and command execution.
- File-level backup to a local repository.
- File-level restore to original or alternate location.

## Phase 4: Hypervisor support

- VMware vCenter/ESXi inventory.
- Snapshot orchestration and VM metadata capture.
- Hyper-V inventory through gateway PowerShell.
- Proxmox inventory through API.
- Restore-point browsing and instant recovery design.

## Phase 5: Replication and DR

- Replica job definitions.
- WAN-aware transfer queue.
- DR site mapping.
- Restore verification.
- Scheduled restore testing reports.

## Phase 6: Production hardening

- Immutable backup repository support.
- Encryption at rest and in transit.
- RPO/RTO reporting.
- Alerting and webhook integrations.
- Role-based access control per customer.
- Full row-level security policies.
