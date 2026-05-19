"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ControlPlaneStore } from "@/lib/control-plane-data";
import type {
  AgentStatus,
  BackupRepository,
  ConnectivityStatus,
  Customer,
  DeploymentMode,
  JobStatus,
  ManagedUser,
  ProtectedServer,
  ProtectionAction,
  ProtectionJob,
  RestoreRequest,
  RepositoryType,
  ServerKind,
  UserRole,
  UserStatus
} from "@/lib/types";

type View = "overview" | "customers" | "users" | "servers" | "repositories" | "jobs" | "restore";
type Modal =
  | "customer"
  | "editCustomer"
  | "user"
  | "editUser"
  | "server"
  | "editServer"
  | "operation"
  | "editOperation"
  | "jobDetails"
  | "repository"
  | "editRepository"
  | "restore"
  | "editRestore"
  | "deploy"
  | null;

const storageKey = "antarex-backup-control-state-v1";

const statusLabels: Record<JobStatus, string> = {
  idle: "Idle",
  queued: "Queued",
  running: "Running",
  warning: "Warning",
  failed: "Failed",
  success: "Healthy"
};

const navItems: { href: string; label: string; view: View }[] = [
  { href: "/", label: "Overview", view: "overview" },
  { href: "/customers", label: "Customers", view: "customers" },
  { href: "/users", label: "Users", view: "users" },
  { href: "/servers", label: "Servers", view: "servers" },
  { href: "/repositories", label: "Repositories", view: "repositories" },
  { href: "/jobs", label: "Operations", view: "jobs" },
  { href: "/restore", label: "Restore", view: "restore" }
];

function statusClass(status: JobStatus) {
  return `pill pill-${status}`;
}

function nowLabel() {
  return new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function getSelectedCustomerIds(form: FormData) {
  return form.getAll("customerIds").map(String).filter(Boolean);
}

function primaryCustomerId(customerIds: string[]) {
  return customerIds[0] ?? null;
}

export function ControlPlane({
  initialView,
  initialStore,
  enableLocalPersistence
}: {
  initialView: View;
  initialStore: ControlPlaneStore;
  enableLocalPersistence: boolean;
}) {
  const [store, setStore] = useState<Store>(initialStore);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>(initialStore.customers[0]?.id ?? "");
  const [selectedUser, setSelectedUser] = useState<string>(initialStore.users[0]?.id ?? "");
  const [selectedServer, setSelectedServer] = useState<string>(initialStore.servers[0]?.id ?? "");
  const [selectedRepository, setSelectedRepository] = useState<string>(initialStore.repositories[0]?.id ?? "");
  const [selectedJob, setSelectedJob] = useState<string>(initialStore.jobs[0]?.id ?? "");
  const [selectedRestore, setSelectedRestore] = useState<string>(initialStore.restores[0]?.id ?? "");
  const [message, setMessage] = useState("Ready");

  useEffect(() => {
    if (!enableLocalPersistence) {
      return;
    }

    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setStore(JSON.parse(saved) as Store);
    }
  }, [enableLocalPersistence]);

  useEffect(() => {
    if (!enableLocalPersistence) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(store));
  }, [enableLocalPersistence, store]);

  const customerName = useMemo(() => {
    return new Map(store.customers.map((customer) => [customer.id, customer.name]));
  }, [store.customers]);

  const serverName = useMemo(() => {
    return new Map(store.servers.map((server) => [server.id, server.hostname]));
  }, [store.servers]);

  const protectedCount = store.customers.reduce((sum, customer) => sum + customer.protectedServers, 0);
  const runningJobs = store.jobs.filter((job) => job.status === "running").length;
  const warningCustomers = store.customers.filter((customer) => customer.health === "warning").length;
  const onlineServers = store.servers.filter((server) => server.agentStatus === "online").length;
  const reachableServers = store.servers.filter((server) => server.connectivity === "reachable").length;
  const queuedRestores = store.restores.filter((restore) => restore.status === "queued").length;
  const activeUsers = store.users.filter((user) => user.status === "active").length;
  const repositoryCapacityGb = store.repositories.reduce((sum, repository) => sum + repository.capacityGb, 0);
  const repositoryUsedGb = store.repositories.reduce((sum, repository) => sum + repository.usedGb, 0);
  const systemHealth = warningCustomers > 0 ? "Attention needed" : "Operational";
  const activeCustomer = store.customers.find((customer) => customer.id === selectedCustomer);
  const activeUser = store.users.find((user) => user.id === selectedUser);
  const activeServer = store.servers.find((server) => server.id === selectedServer);
  const activeRepository = store.repositories.find((repository) => repository.id === selectedRepository);
  const activeJob = store.jobs.find((job) => job.id === selectedJob);
  const activeRestore = store.restores.find((restore) => restore.id === selectedRestore);

  async function addCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customer: Customer = {
      id: makeId("cust"),
      name: String(form.get("name")),
      mode: String(form.get("mode")) as DeploymentMode,
      sites: Number(form.get("sites")),
      protectedServers: 0,
      lastBackup: "No backups yet",
      health: "idle"
    };

    try {
      const result = await postJsonStrict<{ id?: string }>("/api/customers", customer);
      const savedCustomer = { ...customer, id: result.id ?? customer.id };
      setStore((current) => ({ ...current, customers: [savedCustomer, ...current.customers] }));
      setSelectedCustomer(savedCustomer.id);
      setMessage(`Customer ${savedCustomer.name} created`);
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create customer");
    }
  }

  function editCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated: Customer = {
      ...(activeCustomer as Customer),
      name: String(form.get("name")),
      mode: String(form.get("mode")) as DeploymentMode,
      sites: Number(form.get("sites"))
    };
    setStore((current) => ({
      ...current,
      customers: current.customers.map((customer) => (customer.id === updated.id ? updated : customer))
    }));
    void patchJson(`/api/customers/${updated.id}`, updated);
    setMessage(`Customer ${updated.name} updated`);
    setModal(null);
  }

  async function addUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const accountType = String(form.get("accountType")) as ManagedUser["accountType"];
    const customerIds = accountType === "platform_admin" ? [] : getSelectedCustomerIds(form);

    if (accountType === "customer_user" && customerIds.length === 0) {
      setMessage("Select at least one customer for this customer user");
      return;
    }

    const user: ManagedUser = {
      id: makeId("user"),
      accountType,
      customerId: accountType === "platform_admin" ? null : primaryCustomerId(customerIds),
      customerIds,
      name: String(form.get("name")),
      email: String(form.get("email")),
      role: String(form.get("role")) as UserRole,
      status: "active",
      lastSeen: "Never"
    };

    try {
      const result = await postJsonStrict<{ id?: string }>("/api/users", {
        ...user,
        password: String(form.get("password"))
      });
      setStore((current) => ({
        ...current,
        users: [{ ...user, id: result.id ?? user.id }, ...current.users]
      }));
      setMessage(`User ${user.email} created and can now sign in`);
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create user");
    }
  }

  function editUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const accountType = String(form.get("accountType")) as ManagedUser["accountType"];
    const customerIds = accountType === "platform_admin" ? [] : getSelectedCustomerIds(form);

    if (accountType === "customer_user" && customerIds.length === 0) {
      setMessage("Select at least one customer for this customer user");
      return;
    }

    const updated: ManagedUser = {
      ...(activeUser as ManagedUser),
      accountType,
      customerId: accountType === "platform_admin" ? null : primaryCustomerId(customerIds),
      customerIds,
      name: String(form.get("name")),
      email: String(form.get("email")),
      role: String(form.get("role")) as UserRole,
      status: String(form.get("status")) as UserStatus
    };
    setStore((current) => ({
      ...current,
      users: current.users.map((user) => (user.id === updated.id ? updated : user))
    }));
    void patchJson(`/api/users/${updated.id}`, updated);
    setMessage(`User ${updated.email} updated`);
    setModal(null);
  }

  async function addServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerId = String(form.get("customerId"));
    const server: ProtectedServer = {
      id: makeId("srv"),
      customerId,
      hostname: String(form.get("hostname")),
      address: String(form.get("address")),
      kind: String(form.get("kind")) as ServerKind,
      connectivity: "unknown",
      agentStatus: "not_installed",
      lastSeen: "Not discovered",
      repository: String(form.get("repository"))
    };

    try {
      const result = await postJsonStrict<{ id?: string }>("/api/servers", server);
      const savedServer = { ...server, id: result.id ?? server.id };
      setStore((current) => ({
        ...current,
        servers: [savedServer, ...current.servers],
        customers: current.customers.map((customer) =>
          customer.id === customerId
            ? { ...customer, protectedServers: customer.protectedServers + 1, health: "warning" }
            : customer
        )
      }));
      setSelectedServer(savedServer.id);
      setMessage(`Server ${savedServer.hostname} queued for agent deployment`);
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add server");
    }
  }

  function editServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated: ProtectedServer = {
      ...(activeServer as ProtectedServer),
      customerId: String(form.get("customerId")),
      hostname: String(form.get("hostname")),
      address: String(form.get("address")),
      kind: String(form.get("kind")) as ServerKind,
      repository: String(form.get("repository"))
    };
    setStore((current) => ({
      ...current,
      servers: current.servers.map((server) => (server.id === updated.id ? updated : server))
    }));
    void patchJson(`/api/servers/${updated.id}`, updated);
    setMessage(`Server ${updated.hostname} updated`);
    setModal(null);
  }

  async function addRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const repository: BackupRepository = {
      id: makeId("repo"),
      customerId: String(form.get("customerId")),
      name: String(form.get("name")),
      type: String(form.get("type")) as RepositoryType,
      location: String(form.get("location")),
      capacityGb: Number(form.get("capacityGb")),
      usedGb: 0,
      immutable: form.get("immutable") === "on",
      status: "idle"
    };

    try {
      const result = await postJsonStrict<{ id?: string }>("/api/repositories", repository);
      const savedRepository = { ...repository, id: result.id ?? repository.id };
      setStore((current) => ({ ...current, repositories: [savedRepository, ...current.repositories] }));
      setSelectedRepository(savedRepository.id);
      setMessage(`Repository ${savedRepository.name} added`);
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add repository");
    }
  }

  function editRepository(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated: BackupRepository = {
      ...(activeRepository as BackupRepository),
      customerId: String(form.get("customerId")),
      name: String(form.get("name")),
      type: String(form.get("type")) as RepositoryType,
      location: String(form.get("location")),
      capacityGb: Number(form.get("capacityGb")),
      usedGb: Number(form.get("usedGb")),
      immutable: form.get("immutable") === "on"
    };
    setStore((current) => ({
      ...current,
      repositories: current.repositories.map((repository) => (repository.id === updated.id ? updated : repository))
    }));
    void patchJson(`/api/repositories/${updated.id}`, updated);
    setMessage(`Repository ${updated.name} updated`);
    setModal(null);
  }

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action")) as ProtectionAction;
    const job: ProtectionJob = {
      id: makeId("job"),
      customerId: String(form.get("customerId")),
      name: String(form.get("name")),
      action,
      schedule: String(form.get("schedule")),
      target: String(form.get("target")),
      status: "queued",
      rpo: String(form.get("rpo")),
      progressPercent: 0,
      throughputMbps: 0,
      processedGb: 0,
      duration: "0 min",
      bottleneck: "Pending"
    };

    try {
      const result = await postJsonStrict<{ id?: string }>("/api/jobs", job);
      const savedJob = { ...job, id: result.id ?? job.id };
      setStore((current) => ({ ...current, jobs: [savedJob, ...current.jobs] }));
      setSelectedJob(savedJob.id);
      setMessage(`${action} job ${savedJob.name} queued`);
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create job");
    }
  }

  function editJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated: ProtectionJob = {
      ...(activeJob as ProtectionJob),
      customerId: String(form.get("customerId")),
      name: String(form.get("name")),
      action: String(form.get("action")) as ProtectionAction,
      schedule: String(form.get("schedule")),
      target: String(form.get("target")),
      rpo: String(form.get("rpo"))
    };
    setStore((current) => ({
      ...current,
      jobs: current.jobs.map((job) => (job.id === updated.id ? updated : job))
    }));
    void patchJson(`/api/jobs/${updated.id}`, updated);
    setMessage(`Job ${updated.name} updated`);
    setModal(null);
  }

  async function startRestore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const restore: RestoreRequest = {
      id: makeId("restore"),
      customerId: String(form.get("customerId")),
      serverId: String(form.get("serverId")),
      restorePoint: String(form.get("restorePoint")),
      target: String(form.get("target")),
      status: "queued",
      requestedAt: nowLabel()
    };

    try {
      const result = await postJsonStrict<{ id?: string }>("/api/restores", restore);
      const savedRestore = { ...restore, id: result.id ?? restore.id };
      setStore((current) => ({ ...current, restores: [savedRestore, ...current.restores] }));
      setSelectedRestore(savedRestore.id);
      setMessage("Restore request queued");
      setModal(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start restore");
    }
  }

  function editRestore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated: RestoreRequest = {
      ...(activeRestore as RestoreRequest),
      customerId: String(form.get("customerId")),
      serverId: String(form.get("serverId")),
      restorePoint: String(form.get("restorePoint")),
      target: String(form.get("target"))
    };
    setStore((current) => ({
      ...current,
      restores: current.restores.map((restore) => (restore.id === updated.id ? updated : restore))
    }));
    void patchJson(`/api/restores/${updated.id}`, updated);
    setMessage("Restore request updated");
    setModal(null);
  }

  function deployAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const serverId = String(form.get("serverId"));
    const status = String(form.get("agentStatus")) as AgentStatus;
    const target = store.servers.find((server) => server.id === serverId);

    if (target?.connectivity !== "reachable") {
      setMessage("Discover the server first. Agent install is only allowed after the gateway confirms the IP is reachable.");
      setModal(null);
      return;
    }

    setStore((current) => ({
      ...current,
      servers: current.servers.map((server) =>
        server.id === serverId ? { ...server, agentStatus: status, lastSeen: "Agent installation queued" } : server
      )
    }));
    void postJson(`/api/servers/${serverId}/agent`, { agentStatus: status });
    setMessage("Agent deployment command sent");
    setModal(null);
  }

  function runJob(jobId: string) {
    setStore((current) => ({
      ...current,
      jobs: current.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: "running",
              progressPercent: Math.max(job.progressPercent, 8),
              throughputMbps: job.action === "replicate" ? 420 : 185,
              processedGb: Math.max(job.processedGb, 12),
              duration: "Running",
              bottleneck: job.action === "replicate" ? "Network" : "Source"
            }
          : job
      )
    }));
    void postJson(`/api/jobs/${jobId}/run`, {});
    setMessage("Job run started");
  }

  function markRestoreRunning(restoreId: string) {
    setStore((current) => ({
      ...current,
      restores: current.restores.map((restore) =>
        restore.id === restoreId ? { ...restore, status: "running" } : restore
      )
    }));
    void postJson(`/api/restores/${restoreId}/start`, {});
    setMessage("Restore workflow started");
  }

  function discoverServer(serverId: string) {
    setStore((current) => ({
      ...current,
      servers: current.servers.map((server) =>
        server.id === serverId
          ? { ...server, connectivity: "reachable", lastSeen: "Reachable just now" }
          : server
      )
    }));
    void postJson(`/api/servers/${serverId}/discover`, {});
    setMessage("Gateway discovery confirmed the server IP is reachable");
  }

  function deleteRepository(repository: BackupRepository) {
    if (!window.confirm(`Delete repository ${repository.name}?`)) {
      return;
    }
    setStore((current) => ({
      ...current,
      repositories: current.repositories.filter((item) => item.id !== repository.id)
    }));
    void deleteJson(`/api/repositories/${repository.id}`);
    setMessage(`Repository ${repository.name} deleted`);
  }

  function deleteCustomer(customer: Customer) {
    if (!window.confirm(`Delete customer ${customer.name}? This also removes local servers, jobs, and restores for that customer.`)) {
      return;
    }
    setStore((current) => ({
      customers: current.customers.filter((item) => item.id !== customer.id),
      servers: current.servers.filter((server) => server.customerId !== customer.id),
      jobs: current.jobs.filter((job) => job.customerId !== customer.id),
      restores: current.restores.filter((restore) => restore.customerId !== customer.id),
      users: current.users.filter((user) => user.customerId !== customer.id),
      repositories: current.repositories.filter((repository) => repository.customerId !== customer.id)
    }));
    void deleteJson(`/api/customers/${customer.id}`);
    setMessage(`Customer ${customer.name} deleted`);
  }

  function deleteServer(server: ProtectedServer) {
    if (!window.confirm(`Delete server ${server.hostname}?`)) {
      return;
    }
    setStore((current) => ({
      ...current,
      servers: current.servers.filter((item) => item.id !== server.id),
      restores: current.restores.filter((restore) => restore.serverId !== server.id),
      customers: current.customers.map((customer) =>
        customer.id === server.customerId
          ? { ...customer, protectedServers: Math.max(0, customer.protectedServers - 1) }
          : customer
      )
    }));
    void deleteJson(`/api/servers/${server.id}`);
    setMessage(`Server ${server.hostname} deleted`);
  }

  function deleteUser(user: ManagedUser) {
    if (!window.confirm(`Remove user ${user.email}?`)) {
      return;
    }
    setStore((current) => ({
      ...current,
      users: current.users.filter((item) => item.id !== user.id)
    }));
    void deleteJson(`/api/users/${user.id}`);
    setMessage(`User ${user.email} removed`);
  }

  function deleteJob(job: ProtectionJob) {
    if (!window.confirm(`Delete job ${job.name}?`)) {
      return;
    }
    setStore((current) => ({
      ...current,
      jobs: current.jobs.filter((item) => item.id !== job.id)
    }));
    void deleteJson(`/api/jobs/${job.id}`);
    setMessage(`Job ${job.name} deleted`);
  }

  function deleteRestore(restore: RestoreRequest) {
    if (!window.confirm(`Delete restore request for ${serverName.get(restore.serverId) ?? "this server"}?`)) {
      return;
    }
    setStore((current) => ({
      ...current,
      restores: current.restores.filter((item) => item.id !== restore.id)
    }));
    void deleteJson(`/api/restores/${restore.id}`);
    setMessage("Restore request deleted");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand brand-link" href="/">
          <span className="brand-mark">A</span>
          <div>
            <strong>Antarex Backup Control</strong>
            <span>Cloud and on-prem</span>
          </div>
        </a>
        <nav className="nav">
          {navItems.map((item) => (
            <a href={item.href} className={initialView === item.view ? "active" : ""} key={item.href}>
              {item.label}
            </a>
          ))}
          <a href="/auth/signout">Sign out</a>
        </nav>
      </aside>

      <section className="workspace">
        <div className="command-bar">
          <div>
            <span className="signal-dot" />
            <strong>{systemHealth}</strong>
            <span>{store.customers.length} customers monitored</span>
          </div>
          <div>
            <span>Gateways</span>
            <strong>{reachableServers}/{store.servers.length} reachable</strong>
          </div>
          <div>
            <span>Users</span>
            <strong>{activeUsers} active</strong>
          </div>
        </div>

        <header className="topbar">
          <div>
            <p className="eyebrow">Centralized backup management</p>
            <h1>{initialView === "overview" ? "Protect, replicate, and restore customer workloads" : navItems.find((item) => item.view === initialView)?.label}</h1>
            <p className="status-line">{message}</p>
          </div>
        </header>

        <section className="ops-grid" aria-label="Operations summary">
          <article>
            <span>Recovery posture</span>
            <strong>{warningCustomers > 0 ? "Watch" : "Ready"}</strong>
            <small>{queuedRestores} restore request{queuedRestores === 1 ? "" : "s"} queued</small>
          </article>
          <article>
            <span>Agent coverage</span>
            <strong>{onlineServers}/{store.servers.length}</strong>
            <small>Agents currently reporting online</small>
          </article>
          <article>
            <span>Job activity</span>
            <strong>{runningJobs}</strong>
            <small>Running workload protection tasks</small>
          </article>
          <article>
            <span>Access control</span>
            <strong>{store.users.length}</strong>
            <small>{activeUsers} active platform user{activeUsers === 1 ? "" : "s"}</small>
          </article>
          <article>
            <span>Repository use</span>
            <strong>{repositoryUsedGb}/{repositoryCapacityGb} GB</strong>
            <small>{store.repositories.length} backup repositor{store.repositories.length === 1 ? "y" : "ies"}</small>
          </article>
        </section>

        {(initialView === "overview" || initialView === "customers") && (
          <>
            <section className="metrics" aria-label="Platform overview">
              <article>
                <span>Customers</span>
                <strong>{store.customers.length}</strong>
                <small>Cloud and isolated on-prem deployments</small>
              </article>
              <article>
                <span>Protected servers</span>
                <strong>{protectedCount}</strong>
                <small>Windows, Linux, ESXi, and hypervisors</small>
              </article>
              <article>
                <span>Running jobs</span>
                <strong>{runningJobs}</strong>
                <small>Backups, replicas, restore tests</small>
              </article>
              <article>
                <span>Needs attention</span>
                <strong>{warningCustomers}</strong>
                <small>Policy, capacity, or connectivity warnings</small>
              </article>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Customers</h2>
                <button type="button" className="ghost" onClick={() => setModal("customer")}>New customer</button>
              </div>
              <div className="table">
                <div className="table-row table-head">
                  <span>Name</span>
                  <span>Mode</span>
                  <span>Servers</span>
                  <span>Health</span>
                  <span>Actions</span>
                </div>
                {store.customers.map((customer) => (
                  <div className="table-row" key={customer.id}>
                    <span>
                      <strong>{customer.name}</strong>
                      <small>{customer.sites} site{customer.sites === 1 ? "" : "s"} - last backup {customer.lastBackup}</small>
                    </span>
                    <span>{customer.mode === "cloud" ? "Cloud managed" : "On-prem only"}</span>
                    <span>{customer.protectedServers}</span>
                    <span className={statusClass(customer.health)}>{statusLabels[customer.health]}</span>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="ghost row-action"
                        onClick={() => {
                          setSelectedCustomer(customer.id);
                          setModal("editCustomer");
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="ghost danger" onClick={() => deleteCustomer(customer)}>
                        Delete
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {(initialView === "overview" || initialView === "users") && (
          <section className="panel page-panel">
            <div className="panel-head">
              <h2>User management</h2>
              <button type="button" className="ghost" onClick={() => setModal("user")}>Add user</button>
            </div>
            <div className="table">
              <div className="table-row user-table-row table-head">
                <span>User</span>
                <span>Customer</span>
                <span>Role</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {store.users.map((user) => (
                <div className="table-row user-table-row" key={user.id}>
                  <span>
                    <strong>{user.name}</strong>
                    <small>{user.email} - last seen {user.lastSeen}</small>
                  </span>
                  <span>{formatUserCustomers(user, customerName)}</span>
                  <span>{user.role}</span>
                  <span className={`pill user-${user.status}`}>{user.status}</span>
                  <span className="row-actions">
                    <button
                      type="button"
                      className="ghost row-action"
                      onClick={() => {
                        setSelectedUser(user.id);
                        setModal("editUser");
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="ghost danger" onClick={() => deleteUser(user)}>
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(initialView === "overview" || initialView === "repositories") && (
          <section className="panel page-panel">
            <div className="panel-head">
              <h2>Backup repositories</h2>
              <button type="button" className="ghost" onClick={() => setModal("repository")}>Add repository</button>
            </div>
            <div className="job-list">
              {store.repositories.map((repository) => {
                const usedPercent = repository.capacityGb > 0 ? Math.round((repository.usedGb / repository.capacityGb) * 100) : 0;

                return (
                  <article className="job repository-row" key={repository.id}>
                    <div>
                      <span className="job-action">{repository.type}</span>
                      <strong>{repository.name}</strong>
                      <small>{customerName.get(repository.customerId)} - {repository.location} - {repository.immutable ? "Immutable" : "Mutable"}</small>
                      <div className="progress-track">
                        <span style={{ width: `${Math.min(100, usedPercent)}%` }} />
                      </div>
                    </div>
                    <div className="job-actions">
                      <span>{repository.usedGb} GB / {repository.capacityGb} GB</span>
                      <span className={statusClass(repository.status)}>{statusLabels[repository.status]}</span>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setSelectedRepository(repository.id);
                          setModal("editRepository");
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="ghost danger" onClick={() => deleteRepository(repository)}>
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {(initialView === "overview" || initialView === "servers") && (
          <section className="panel page-panel">
            <div className="panel-head">
              <h2>Servers and hypervisors</h2>
              <button type="button" className="ghost" onClick={() => setModal("server")}>Add server</button>
            </div>
            <div className="cards">
              {store.servers.map((server) => (
                <article className="server-card" key={server.id}>
                  <div>
                    <strong>{server.hostname}</strong>
                    <span>{server.address} - {server.kind.toUpperCase()} - {customerName.get(server.customerId)}</span>
                  </div>
                  <span className={`agent connectivity-${server.connectivity}`}>{server.connectivity}</span>
                  <span className={`agent agent-${server.agentStatus}`}>{server.agentStatus.replace("_", " ")}</span>
                  <small>Status: {server.lastSeen}</small>
                  <small>Repository: {server.repository}</small>
                  <button type="button" className="ghost row-action" onClick={() => discoverServer(server.id)}>
                    Discover
                  </button>
                  <button
                    type="button"
                    className="ghost row-action"
                    onClick={() => {
                      setSelectedServer(server.id);
                      setModal("deploy");
                    }}
                  >
                    Install agent
                  </button>
                  <span className="row-actions">
                    <button
                      type="button"
                      className="ghost row-action"
                      onClick={() => {
                        setSelectedServer(server.id);
                        setModal("editServer");
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="ghost danger" onClick={() => deleteServer(server)}>
                      Delete
                    </button>
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        {(initialView === "overview" || initialView === "jobs") && (
          <section className="panel page-panel">
            <div className="panel-head">
              <h2>Backup, replication, and restore operations</h2>
              <button type="button" className="ghost" onClick={() => setModal("operation")}>New operation</button>
            </div>
            <div className="job-list">
              {store.jobs.map((job) => (
                <article className="job" key={job.id}>
                  <div>
                    <span className="job-action">{job.action}</span>
                    <strong>{job.name}</strong>
                    <small>{customerName.get(job.customerId)} - {job.target} - {job.schedule} - RPO {job.rpo}</small>
                    {job.status === "running" && (
                      <div className="progress-track">
                        <span style={{ width: `${Math.min(100, job.progressPercent)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="job-actions">
                    <span className={statusClass(job.status)}>{statusLabels[job.status]}</span>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setSelectedJob(job.id);
                        setModal("jobDetails");
                      }}
                    >
                      Details
                    </button>
                    <button type="button" className="ghost" onClick={() => runJob(job.id)}>Run now</button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setSelectedJob(job.id);
                        setModal("editOperation");
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="ghost danger" onClick={() => deleteJob(job)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(initialView === "overview" || initialView === "restore") && (
          <section className="panel page-panel">
            <div className="panel-head">
              <h2>Restore queue</h2>
              <button type="button" className="ghost" onClick={() => setModal("restore")}>Start restore</button>
            </div>
            <div className="job-list">
              {store.restores.map((restore) => (
                <article className="job" key={restore.id}>
                  <div>
                    <span className="job-action">restore</span>
                    <strong>{serverName.get(restore.serverId)} to {restore.target}</strong>
                    <small>{customerName.get(restore.customerId)} - {restore.restorePoint} - requested {restore.requestedAt}</small>
                  </div>
                  <div className="job-actions">
                    <span className={statusClass(restore.status)}>{statusLabels[restore.status]}</span>
                    <button type="button" className="ghost" onClick={() => markRestoreRunning(restore.id)}>Start</button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setSelectedRestore(restore.id);
                        setModal("editRestore");
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="ghost danger" onClick={() => deleteRestore(restore)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>

      {modal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <div className="panel-head">
              <h2>{modalTitles[modal]}</h2>
              <button type="button" className="ghost" onClick={() => setModal(null)}>Close</button>
            </div>
            {modal === "customer" && <CustomerForm onSubmit={addCustomer} />}
            {modal === "editCustomer" && activeCustomer && <CustomerForm customer={activeCustomer} onSubmit={editCustomer} />}
            {modal === "user" && <UserForm customers={store.customers} onSubmit={addUser} />}
            {modal === "editUser" && activeUser && <UserForm customers={store.customers} user={activeUser} onSubmit={editUser} />}
            {modal === "server" && <ServerForm customers={store.customers} onSubmit={addServer} />}
            {modal === "editServer" && activeServer && <ServerForm customers={store.customers} server={activeServer} onSubmit={editServer} />}
            {modal === "repository" && <RepositoryForm customers={store.customers} onSubmit={addRepository} />}
            {modal === "editRepository" && activeRepository && <RepositoryForm customers={store.customers} repository={activeRepository} onSubmit={editRepository} />}
            {modal === "operation" && <JobForm customers={store.customers} repositories={store.repositories} onSubmit={createJob} />}
            {modal === "editOperation" && activeJob && <JobForm customers={store.customers} repositories={store.repositories} job={activeJob} onSubmit={editJob} />}
            {modal === "jobDetails" && activeJob && <JobDetails job={activeJob} />}
            {modal === "restore" && <RestoreForm customers={store.customers} servers={store.servers} onSubmit={startRestore} />}
            {modal === "editRestore" && activeRestore && <RestoreForm customers={store.customers} servers={store.servers} restore={activeRestore} onSubmit={editRestore} />}
            {modal === "deploy" && <DeployForm servers={store.servers} selectedServer={selectedServer} onSubmit={deployAgent} />}
          </div>
        </div>
      )}
    </main>
  );
}

type Store = ControlPlaneStore;

async function postJson(path: string, payload: unknown) {
  try {
    await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // Local UI state remains usable if Supabase is not configured yet.
  }
}


async function postJsonStrict<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : "Request failed";
    throw new Error(message);
  }

  return body as T;
}

async function patchJson(path: string, payload: unknown) {
  try {
    await fetch(path, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // Local UI state remains usable if Supabase is not configured yet.
  }
}

async function deleteJson(path: string) {
  try {
    await fetch(path, { method: "DELETE" });
  } catch {
    // Local UI state remains usable if Supabase is not configured yet.
  }
}

const modalTitles: Record<Exclude<Modal, null>, string> = {
  customer: "New customer",
  editCustomer: "Edit customer",
  user: "Add user",
  editUser: "Edit user",
  server: "Add server by IP",
  editServer: "Edit server",
  operation: "New backup operation",
  editOperation: "Edit backup operation",
  jobDetails: "Operation details",
  repository: "Add repository",
  editRepository: "Edit repository",
  restore: "Start restore",
  editRestore: "Edit restore request",
  deploy: "Install agent"
};

function CustomerForm({ customer, onSubmit }: { customer?: Customer; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer name<input name="name" required placeholder="Customer company name" defaultValue={customer?.name} /></label>
      <label>Deployment mode<select name="mode" defaultValue={customer?.mode ?? "cloud"}><option value="cloud">Cloud managed</option><option value="onprem">On-prem only</option></select></label>
      <label>Sites<input name="sites" type="number" min="1" defaultValue={customer?.sites ?? 1} required /></label>
      <button className="button primary" type="submit">{customer ? "Save customer" : "Create customer"}</button>
    </form>
  );
}

function UserForm({ customers, user, onSubmit }: { customers: Customer[]; user?: ManagedUser; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const defaultAccountType = user?.accountType ?? "customer_user";
  const [accountType, setAccountType] = useState<ManagedUser["accountType"]>(defaultAccountType);
  const selectedCustomerIds = user?.customerIds ?? (user?.customerId ? [user.customerId] : []);

  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>
        User type
        <select
          name="accountType"
          value={accountType}
          onChange={(event) => setAccountType(event.target.value as ManagedUser["accountType"])}
        >
          <option value="platform_admin">Platform admin</option>
          <option value="customer_user">Customer user</option>
        </select>
      </label>

      {accountType === "customer_user" && (
        <fieldset className="checkbox-fieldset">
          <legend>Customer access</legend>
          <small>Select one or more customers this user can access.</small>
          <div className="checkbox-list">
            {customers.map((customer) => (
              <label className="checkbox-item" key={customer.id}>
                <input
                  type="checkbox"
                  name="customerIds"
                  value={customer.id}
                  defaultChecked={selectedCustomerIds.includes(customer.id)}
                />
                <span>{customer.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {accountType === "platform_admin" && (
        <div className="form-note">Platform admins can see and manage all customers. No customer selection is required.</div>
      )}

      <label>Name<input name="name" required placeholder="User full name" defaultValue={user?.name} /></label>
      <label>Email<input name="email" type="email" required placeholder="user@company.com" defaultValue={user?.email} /></label>
      {!user && (
        <label>Temporary password<input name="password" type="password" minLength={8} required placeholder="At least 8 characters" /></label>
      )}
      <label>Role<select name="role" defaultValue={user?.role ?? "operator"}><option value="owner">Owner</option><option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select></label>
      {user && (
        <label>Status<select name="status" defaultValue={user.status}><option value="active">Active</option><option value="invited">Invited</option><option value="disabled">Disabled</option></select></label>
      )}
      <button className="button primary" type="submit">{user ? "Save user" : "Add user"}</button>
    </form>
  );
}

function formatUserCustomers(user: ManagedUser, customerName: Map<string, string>) {
  if (user.accountType === "platform_admin") {
    return "All customers";
  }

  const customerIds = user.customerIds?.length ? user.customerIds : user.customerId ? [user.customerId] : [];

  if (customerIds.length === 0) {
    return "Unassigned";
  }

  return customerIds.map((customerId) => customerName.get(customerId) ?? "Unknown customer").join(", ");
}

function RepositoryForm({ customers, repository, onSubmit }: { customers: Customer[]; repository?: BackupRepository; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} defaultValue={repository?.customerId} /></label>
      <label>Name<input name="name" required placeholder="Backup Volume 01" defaultValue={repository?.name} /></label>
      <label>Repository type<select name="type" defaultValue={repository?.type ?? "nas"}><option value="local">Local disk</option><option value="nas">NAS / SMB</option><option value="s3">S3 compatible</option><option value="azure_blob">Azure Blob</option><option value="gcs">Google Cloud Storage</option></select></label>
      <label>Location<input name="location" required placeholder="\\\\backup-nas\\repo or s3://bucket" defaultValue={repository?.location} /></label>
      <label>Capacity GB<input name="capacityGb" type="number" min="1" required defaultValue={repository?.capacityGb ?? 1024} /></label>
      {repository && <label>Used GB<input name="usedGb" type="number" min="0" required defaultValue={repository.usedGb} /></label>}
      <label className="checkbox-row"><input type="checkbox" name="immutable" defaultChecked={repository?.immutable} /> Immutable repository</label>
      <button className="button primary" type="submit">{repository ? "Save repository" : "Add repository"}</button>
    </form>
  );
}

function ServerForm({ customers, server, onSubmit }: { customers: Customer[]; server?: ProtectedServer; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} defaultValue={server?.customerId} /></label>
      <label>Hostname<input name="hostname" required placeholder="sql-prod-01" defaultValue={server?.hostname} /></label>
      <label>IP address<input name="address" required placeholder="10.10.10.25" pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$" defaultValue={server?.address} /></label>
      <label>Server type<select name="kind" defaultValue={server?.kind ?? "windows"}><option value="windows">Windows</option><option value="linux">Linux</option><option value="esxi">ESXi</option><option value="hyperv">Hyper-V</option><option value="proxmox">Proxmox</option><option value="generic">Generic</option></select></label>
      <label>Repository<input name="repository" required placeholder="Local repository A" defaultValue={server?.repository} /></label>
      <button className="button primary" type="submit">{server ? "Save server" : "Add and deploy agent"}</button>
    </form>
  );
}

function JobForm({ customers, repositories, job, onSubmit }: { customers: Customer[]; repositories: BackupRepository[]; job?: ProtectionJob; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} defaultValue={job?.customerId} /></label>
      <label>Operation name<input name="name" required placeholder="Production protection" defaultValue={job?.name} /></label>
      <label>Operation<select name="action" defaultValue={job?.action ?? "backup"}><option value="backup">Backup</option><option value="replicate">Replicate</option><option value="restore">Restore</option></select></label>
      <label>Target<input name="target" required placeholder="vSphere cluster or server group" defaultValue={job?.target} /></label>
      <label>Repository<select name="repository">{repositories.map((repository) => <option value={repository.id} key={repository.id}>{repository.name}</option>)}</select></label>
      <label>Schedule<input name="schedule" required placeholder="Every 4 hours" defaultValue={job?.schedule} /></label>
      <label>RPO<input name="rpo" required placeholder="4h" defaultValue={job?.rpo} /></label>
      <button className="button primary" type="submit">{job ? "Save operation" : "Create operation"}</button>
    </form>
  );
}

function JobDetails({ job }: { job: ProtectionJob }) {
  return (
    <div className="details-panel">
      <div className="details-grid">
        <article>
          <span>Progress</span>
          <strong>{job.progressPercent}%</strong>
        </article>
        <article>
          <span>Network speed</span>
          <strong>{job.throughputMbps} Mbps</strong>
        </article>
        <article>
          <span>Processed</span>
          <strong>{job.processedGb} GB</strong>
        </article>
        <article>
          <span>Bottleneck</span>
          <strong>{job.bottleneck}</strong>
        </article>
      </div>
      <div className="progress-track large">
        <span style={{ width: `${Math.min(100, job.progressPercent)}%` }} />
      </div>
      <dl className="job-detail-list">
        <div><dt>Status</dt><dd>{statusLabels[job.status]}</dd></div>
        <div><dt>Operation</dt><dd>{job.action}</dd></div>
        <div><dt>Target</dt><dd>{job.target}</dd></div>
        <div><dt>Duration</dt><dd>{job.duration}</dd></div>
      </dl>
    </div>
  );
}

function RestoreForm({ customers, servers, restore, onSubmit }: { customers: Customer[]; servers: ProtectedServer[]; restore?: RestoreRequest; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} defaultValue={restore?.customerId} /></label>
      <label>Server<select name="serverId" required defaultValue={restore?.serverId}>{servers.map((server) => <option value={server.id} key={server.id}>{server.hostname}</option>)}</select></label>
      <label>Restore point<select name="restorePoint" defaultValue={restore?.restorePoint ?? "Latest successful backup"}><option>Latest successful backup</option><option>Last night backup</option><option>Manual restore point</option></select></label>
      <label>Restore target<input name="target" required placeholder="Original server or sandbox network" defaultValue={restore?.target} /></label>
      <button className="button primary" type="submit">{restore ? "Save restore request" : "Queue restore"}</button>
    </form>
  );
}

function DeployForm({ servers, selectedServer, onSubmit }: { servers: ProtectedServer[]; selectedServer: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Server<select name="serverId" defaultValue={selectedServer}>{servers.map((server) => <option value={server.id} key={server.id}>{server.hostname}</option>)}</select></label>
      <label>Command<select name="agentStatus" defaultValue="installing"><option value="installing">Queue agent installation</option><option value="offline">Mark offline</option><option value="error">Mark error</option></select></label>
      <button className="button primary" type="submit">Send install command</button>
    </form>
  );
}

function SelectCustomer({ customers, defaultValue }: { customers: Customer[]; defaultValue?: string }) {
  return (
    <select name="customerId" required defaultValue={defaultValue}>
      {customers.map((customer) => (
        <option value={customer.id} key={customer.id}>{customer.name}</option>
      ))}
    </select>
  );
}
