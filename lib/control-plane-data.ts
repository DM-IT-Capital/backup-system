import { customers, jobs, restores, servers, users } from "@/lib/mock-data";
import type { Customer, ManagedUser, ProtectedServer, ProtectionJob, RestoreRequest } from "@/lib/types";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ControlPlaneStore = {
  customers: Customer[];
  servers: ProtectedServer[];
  jobs: ProtectionJob[];
  restores: RestoreRequest[];
  users: ManagedUser[];
};

const fallbackStore: ControlPlaneStore = {
  customers,
  servers,
  jobs,
  restores,
  users
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
    usersResult
  ] = await Promise.all([
    supabase.from("customers").select("id,name,mode,created_at"),
    supabase.from("protected_servers").select("id,customer_id,hostname,address,kind,agent_status,last_seen_at,repository:repositories(name)"),
    supabase.from("protection_jobs").select("id,customer_id,name,action,schedule_cron,policy,enabled,created_at"),
    supabase.from("restore_requests").select("id,customer_id,server_id,restore_point,target,status,created_at"),
    supabase.from("managed_users").select("id,customer_id,name,email,role,status,last_seen_at,created_at")
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
    const repository = server.repository as { name?: string } | { name?: string }[] | null;

    return {
      id: server.id,
      customerId: server.customer_id,
      hostname: server.hostname,
      address: String(server.address),
      kind: server.kind,
      agentStatus: server.agent_status,
      lastSeen: server.last_seen_at ? new Date(server.last_seen_at).toLocaleString() : "Never",
      repository: Array.isArray(repository)
        ? repository[0]?.name ?? "Unassigned"
        : repository?.name ?? "Unassigned"
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
    rpo: typeof job.policy?.rpo === "string" ? job.policy.rpo : "Not set"
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

  const mappedUsers: ManagedUser[] = (usersResult.data ?? []).map((user) => ({
    id: user.id,
    customerId: user.customer_id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    lastSeen: user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : "Never"
  }));

  return {
    customers: mappedCustomers,
    servers: mappedServers,
    jobs: mappedJobs,
    restores: mappedRestores,
    users: mappedUsers
  };
}
