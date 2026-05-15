export type DeploymentMode = "cloud" | "onprem";

export type ServerKind = "windows" | "linux" | "esxi" | "hyperv" | "proxmox" | "generic";

export type ProtectionAction = "backup" | "replicate" | "restore";

export type JobStatus = "idle" | "queued" | "running" | "warning" | "failed" | "success";

export type AgentStatus = "not_installed" | "installing" | "online" | "offline" | "error";

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
  agentStatus: AgentStatus;
  lastSeen: string;
  repository: string;
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
};
