import type { Customer, ProtectedServer, ProtectionJob, RestoreRequest } from "@/lib/types";

export const customers: Customer[] = [
  {
    id: "cust-apex",
    name: "Apex Manufacturing",
    mode: "cloud",
    sites: 3,
    protectedServers: 42,
    lastBackup: "12 min ago",
    health: "success"
  },
  {
    id: "cust-northwind",
    name: "Northwind Clinic",
    mode: "onprem",
    sites: 1,
    protectedServers: 14,
    lastBackup: "1 hr ago",
    health: "warning"
  },
  {
    id: "cust-orbit",
    name: "Orbit Finance",
    mode: "cloud",
    sites: 2,
    protectedServers: 27,
    lastBackup: "Running now",
    health: "running"
  }
];

export const servers: ProtectedServer[] = [
  {
    id: "srv-esxi-01",
    customerId: "cust-apex",
    hostname: "esxi-prod-01",
    address: "10.10.2.15",
    kind: "esxi",
    agentStatus: "online",
    lastSeen: "28 sec ago",
    repository: "On-prem repo A"
  },
  {
    id: "srv-sql-01",
    customerId: "cust-apex",
    hostname: "sql-core-01",
    address: "10.10.8.31",
    kind: "windows",
    agentStatus: "online",
    lastSeen: "1 min ago",
    repository: "Immutable S3 bucket"
  },
  {
    id: "srv-web-02",
    customerId: "cust-northwind",
    hostname: "web-claims-02",
    address: "172.16.20.44",
    kind: "linux",
    agentStatus: "installing",
    lastSeen: "Pending",
    repository: "Local NAS"
  }
];

export const jobs: ProtectionJob[] = [
  {
    id: "job-backup-prod",
    customerId: "cust-apex",
    name: "Production VM backup",
    action: "backup",
    schedule: "Every 4 hours",
    target: "vSphere cluster",
    status: "success",
    rpo: "4h"
  },
  {
    id: "job-replica-dr",
    customerId: "cust-apex",
    name: "DR site replication",
    action: "replicate",
    schedule: "Every 30 minutes",
    target: "DR gateway",
    status: "running",
    rpo: "30m"
  },
  {
    id: "job-restore-test",
    customerId: "cust-northwind",
    name: "Monthly restore test",
    action: "restore",
    schedule: "Monthly",
    target: "Sandbox network",
    status: "warning",
    rpo: "24h"
  }
];

export const restores: RestoreRequest[] = [
  {
    id: "restore-apex-001",
    customerId: "cust-apex",
    serverId: "srv-esxi-01",
    restorePoint: "Latest successful backup",
    target: "Sandbox network",
    status: "queued",
    requestedAt: "Today"
  }
];
