import type { BackupRepository, Customer, ManagedUser, ProtectedServer, ProtectionJob, RestoreRequest } from "@/lib/types";

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
    connectivity: "reachable",
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
    connectivity: "reachable",
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
    connectivity: "checking",
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
    rpo: "4h",
    progressPercent: 100,
    throughputMbps: 0,
    processedGb: 812,
    duration: "38 min",
    bottleneck: "None"
  },
  {
    id: "job-replica-dr",
    customerId: "cust-apex",
    name: "DR site replication",
    action: "replicate",
    schedule: "Every 30 minutes",
    target: "DR gateway",
    status: "running",
    rpo: "30m",
    progressPercent: 62,
    throughputMbps: 412,
    processedGb: 1280,
    duration: "22 min",
    bottleneck: "Network"
  },
  {
    id: "job-restore-test",
    customerId: "cust-northwind",
    name: "Monthly restore test",
    action: "restore",
    schedule: "Monthly",
    target: "Sandbox network",
    status: "warning",
    rpo: "24h",
    progressPercent: 14,
    throughputMbps: 96,
    processedGb: 44,
    duration: "8 min",
    bottleneck: "Repository"
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

export const users: ManagedUser[] = [
  {
    id: "user-owner-apex",
    accountType: "customer_user",
    customerId: "cust-apex",
    name: "Apex Backup Admin",
    email: "admin@apex.example",
    role: "owner",
    status: "active",
    lastSeen: "15 min ago"
  },
  {
    id: "user-ops-apex",
    accountType: "customer_user",
    customerId: "cust-apex",
    name: "Operations Team",
    email: "ops@apex.example",
    role: "operator",
    status: "active",
    lastSeen: "1 hr ago"
  },
  {
    id: "user-viewer-northwind",
    accountType: "customer_user",
    customerId: "cust-northwind",
    name: "Clinic Viewer",
    email: "viewer@northwind.example",
    role: "viewer",
    status: "invited",
    lastSeen: "Never"
  }
];

export const repositories: BackupRepository[] = [
  {
    id: "repo-local-a",
    customerId: "cust-apex",
    name: "On-prem repo A",
    type: "nas",
    location: "\\\\backup-nas\\repo-a",
    capacityGb: 4096,
    usedGb: 1430,
    immutable: false,
    status: "success"
  },
  {
    id: "repo-s3-immutable",
    customerId: "cust-apex",
    name: "Immutable S3 bucket",
    type: "s3",
    location: "s3://apex-backup-immutable",
    capacityGb: 10240,
    usedGb: 2880,
    immutable: true,
    status: "success"
  },
  {
    id: "repo-clinic-nas",
    customerId: "cust-northwind",
    name: "Local NAS",
    type: "nas",
    location: "\\\\clinic-nas\\backup",
    capacityGb: 2048,
    usedGb: 1710,
    immutable: false,
    status: "warning"
  }
];
