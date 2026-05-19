export type DeploymentMode = "cloud" | "onprem";

export type ServerKind = "windows" | "linux" | "esxi" | "hyperv" | "proxmox" | "generic";

export type ProtectionAction = "backup" | "replicate" | "restore";

export type JobStatus = "idle" | "queued" | "running" | "warning" | "failed" | "success";

export type AgentStatus = "not_installed" | "installing" | "online" | "offline" | "error";

export type UserRole = "owner" | "admin" | "operator" | "viewer";

export type UserStatus = "active" | "invited" | "disabled";

export type UserAccountType = "platform_admin" | "customer_user";

export type ConnectivityStatus = "unknown" | "checking" | "reachable" | "unreachable";

export type RepositoryType = "local" | "nas" | "s3" | "azure_blob" | "gcs";

export type Customer = {
  id: string;
  name: string;
  mode: DeploymentMode;
  sites: number;
  protectedServers: number;
  lastBackup: string;
  health: JobStatus;
};

export type ProtectedServer = {
  id: string;
  customerId: string;
  hostname: string;
  address: string;
  kind: ServerKind;
  connectivity: ConnectivityStatus;
  agentStatus: AgentStatus;
  lastSeen: string;
  repository: string;
  repositoryId?: string | null;
};

export type ProtectionJob = {
  id: string;
  customerId: string;
  name: string;
  action: ProtectionAction;
  schedule: string;
  target: string;
  status: JobStatus;
  rpo: string;
  progressPercent: number;
  throughputMbps: number;
  processedGb: number;
  duration: string;
  bottleneck: string;
};

export type RestoreRequest = {
  id: string;
  customerId: string;
  serverId: string;
  restorePoint: string;
  target: string;
  status: JobStatus;
  requestedAt: string;
};

export type ManagedUser = {
  id: string;
  accountType: UserAccountType;
  customerId: string | null;
  customerIds?: string[];
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastSeen: string;
};

export type BackupRepository = {
  id: string;
  customerId: string;
  name: string;
  type: RepositoryType;
  location: string;
  capacityGb: number;
  usedGb: number;
  immutable: boolean;
  status: JobStatus;
};
