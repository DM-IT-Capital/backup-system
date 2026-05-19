import { customers, jobs, repositories, restores, servers, users } from "@/lib/mock-data";
import type { BackupRepository, Customer, ManagedUser, ProtectedServer, ProtectionJob, RestoreRequest } from "@/lib/types";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ControlPlaneStore = {
  customers: Customer[];
  servers: ProtectedServer[];
  jobs: ProtectionJob[];
  restores: RestoreRequest[];
  users: ManagedUser[];
  repositories: BackupRepository[];
};

const fallbackStore: ControlPlaneStore = {
  customers,
  servers,
  jobs,
  restores,
  users,
  repositories
};

export async function getControlPlaneStore(): Promise<ControlPlaneStore> {
  if (!hasSupabaseConfig()) {
    return fallbackStore;
  }

  const supabase = await createSupabaseServerClient();

  const [
    customersResult,
    serversResult,
    jobsResult,
    restoresResult,
    usersResult,
    repositoriesResult,
    membershipsResult
  ] = await Promise.all([
    supabase.from("customers").select("id,name,mode,created_at"),
    supabase.from("protected_servers").select("id,customer_id,hostname,address,kind,agent_status,last_seen_at,repository_id,repository:repositories(id,name)"),
    supabase.from("protection_jobs").select("id,customer_id,name,action,schedule_cron,policy,enabled,created_at"),
    supabase.from("restore_requests").select("id,customer_id,server_id,restore_point,target,status,created_at"),
    supabase.from("managed_users").select("id,account_type,customer_id,name,email,role,status,last_seen_at,created_at"),
    supabase.from("repositories").select("id,customer_id,name,repository_type,config,created_at"),
    supabase.from("customer_members").select("user_id,customer_id")
  ]);

  if (customersResult.error) {
    return fallbackStore;
  }

  const serverRows = serversResult.data ?? [];
  const jobRows = jobsResult.data ?? [];

  const mappedCustomers: Customer[] = (customersResult.data ?? []).map((customer) => {
    const customerServers = serverRows.filter((server) => server.customer_id === customer.id);
    const customerJobs = jobRows.filter((job) => job.customer_id === customer.id);
    const hasRunning = customerJobs.some((job) => job.policy?.status === "running");

    return {
      id: customer.id,
      name: customer.name,
      mode: customer.mode,
      sites: 1,
      protectedServers: customerServers.length,
      lastBackup: "No completed backup yet",
      health: hasRunning ? "running" : "success"
    };
  });

  const mappedServers: ProtectedServer[] = serverRows.map((server) => {
    const repository = server.repository as { id?: string; name?: string } | { id?: string; name?: string }[] | null;

    return {
      id: server.id,
      customerId: server.customer_id,
      hostname: server.hostname,
      address: String(server.address),
      kind: server.kind,
      connectivity: server.last_seen_at ? "reachable" : "unknown",
      agentStatus: server.agent_status,
      lastSeen: server.last_seen_at ? new Date(server.last_seen_at).toLocaleString() : "Never",
      repository: Array.isArray(repository)
        ? repository[0]?.name ?? "Unassigned"
        : repository?.name ?? "Unassigned",
      repositoryId: server.repository_id ?? (Array.isArray(repository) ? repository[0]?.id ?? null : repository?.id ?? null)
    };
  });

  const mappedJobs: ProtectionJob[] = jobRows.map((job) => ({
    id: job.id,
    customerId: job.customer_id,
    name: job.name,
    action: job.action,
    schedule: job.schedule_cron ?? "Manual",
    target: typeof job.policy?.target === "string" ? job.policy.target : "Unassigned target",
    status: typeof job.policy?.status === "string" ? job.policy.status : "idle",
    rpo: typeof job.policy?.rpo === "string" ? job.policy.rpo : "Not set",
    progressPercent: typeof job.policy?.progressPercent === "number" ? job.policy.progressPercent : 0,
    throughputMbps: typeof job.policy?.throughputMbps === "number" ? job.policy.throughputMbps : 0,
    processedGb: typeof job.policy?.processedGb === "number" ? job.policy.processedGb : 0,
    duration: typeof job.policy?.duration === "string" ? job.policy.duration : "0 min",
    bottleneck: typeof job.policy?.bottleneck === "string" ? job.policy.bottleneck : "None"
  }));

  const mappedRestores: RestoreRequest[] = (restoresResult.data ?? []).map((restore) => ({
    id: restore.id,
    customerId: restore.customer_id,
    serverId: restore.server_id,
    restorePoint: restore.restore_point,
    target: restore.target,
    status: restore.status,
    requestedAt: new Date(restore.created_at).toLocaleString()
  }));

  const membershipsByUser = new Map<string, string[]>();
  for (const membership of membershipsResult.data ?? []) {
    const userMemberships = membershipsByUser.get(membership.user_id) ?? [];
    userMemberships.push(membership.customer_id);
    membershipsByUser.set(membership.user_id, userMemberships);
  }

  const mappedUsers: ManagedUser[] = (usersResult.data ?? []).map((user) => {
    const membershipCustomerIds = membershipsByUser.get(user.id) ?? [];
    const customerIds = user.account_type === "platform_admin"
      ? []
      : membershipCustomerIds.length > 0
        ? membershipCustomerIds
        : user.customer_id
          ? [user.customer_id]
          : [];

    return {
      id: user.id,
      accountType: user.account_type ?? "customer_user",
      customerId: user.account_type === "platform_admin" ? null : customerIds[0] ?? user.customer_id,
      customerIds,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastSeen: user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : "Never"
    };
  });

  const mappedRepositories: BackupRepository[] = (repositoriesResult.data ?? []).map((repository) => ({
    id: repository.id,
    customerId: repository.customer_id,
    name: repository.name,
    type: repository.repository_type,
    location: typeof repository.config?.location === "string" ? repository.config.location : "Not configured",
    capacityGb: typeof repository.config?.capacityGb === "number" ? repository.config.capacityGb : 0,
    usedGb: typeof repository.config?.usedGb === "number" ? repository.config.usedGb : 0,
    immutable: Boolean(repository.config?.immutable),
    status: typeof repository.config?.status === "string" ? repository.config.status : "idle"
  }));

  return {
    customers: mappedCustomers,
    servers: mappedServers,
    jobs: mappedJobs,
    restores: mappedRestores,
    users: mappedUsers,
    repositories: mappedRepositories
  };
}
