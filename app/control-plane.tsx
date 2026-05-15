"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ControlPlaneStore } from "@/lib/control-plane-data";
import type {
  AgentStatus,
  Customer,
  DeploymentMode,
  JobStatus,
  ManagedUser,
  ProtectedServer,
  ProtectionAction,
  ProtectionJob,
  RestoreRequest,
  ServerKind,
  UserRole,
  UserStatus
} from "@/lib/types";

type View = "overview" | "customers" | "users" | "servers" | "jobs" | "restore";
type Modal =
  | "customer"
  | "editCustomer"
  | "user"
  | "editUser"
  | "server"
  | "editServer"
  | "job"
  | "editJob"
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
  { href: "/jobs", label: "Jobs", view: "jobs" },
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
  const queuedRestores = store.restores.filter((restore) => restore.status === "queued").length;
  const activeUsers = store.users.filter((user) => user.status === "active").length;
  const systemHealth = warningCustomers > 0 ? "Attention needed" : "Operational";
  const activeCustomer = store.customers.find((customer) => customer.id === selectedCustomer);
  const activeUser = store.users.find((user) => user.id === selectedUser);
  const activeServer = store.servers.find((server) => server.id === selectedServer);
  const activeJob = store.jobs.find((job) => job.id === selectedJob);
  const activeRestore = store.restores.find((restore) => restore.id === selectedRestore);

  function addCustomer(event: FormEvent<HTMLFormElement>) {
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
    setStore((current) => ({ ...current, customers: [customer, ...current.customers] }));
    void postJson("/api/customers", customer);
    setMessage(`Customer ${customer.name} created`);
    setModal(null);
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

  function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const user: ManagedUser = {
      id: makeId("user"),
      customerId: String(form.get("customerId")),
      name: String(form.get("name")),
      email: String(form.get("email")),
      role: String(form.get("role")) as UserRole,
      status: "invited",
      lastSeen: "Never"
    };
    setStore((current) => ({ ...current, users: [user, ...current.users] }));
    void postJson("/api/users", user);
    setMessage(`Invitation queued for ${user.email}`);
    setModal(null);
  }

  function editUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const updated: ManagedUser = {
      ...(activeUser as ManagedUser),
      customerId: String(form.get("customerId")),
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

  function addServer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerId = String(form.get("customerId"));
    const server: ProtectedServer = {
      id: makeId("srv"),
      customerId,
      hostname: String(form.get("hostname")),
      address: String(form.get("address")),
      kind: String(form.get("kind")) as ServerKind,
      agentStatus: "installing",
      lastSeen: "Discovery queued",
      repository: String(form.get("repository"))
    };
    setStore((current) => ({
      ...current,
      servers: [server, ...current.servers],
      customers: current.customers.map((customer) =>
        customer.id === customerId
          ? { ...customer, protectedServers: customer.protectedServers + 1, health: "warning" }
          : customer
      )
    }));
    void postJson("/api/servers", server);
    setSelectedServer(server.id);
    setMessage(`Server ${server.hostname} queued for agent deployment`);
    setModal(null);
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

  function createJob(event: FormEvent<HTMLFormElement>) {
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
      rpo: String(form.get("rpo"))
    };
    setStore((current) => ({ ...current, jobs: [job, ...current.jobs] }));
    void postJson("/api/jobs", job);
    setMessage(`${action} job ${job.name} queued`);
    setModal(null);
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

  function startRestore(event: FormEvent<HTMLFormElement>) {
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
    setStore((current) => ({ ...current, restores: [restore, ...current.restores] }));
    void postJson("/api/restores", restore);
    setMessage("Restore request queued");
    setModal(null);
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
    setStore((current) => ({
      ...current,
      servers: current.servers.map((server) =>
        server.id === serverId ? { ...server, agentStatus: status, lastSeen: status === "online" ? "Just now" : "Deployment queued" } : server
      )
    }));
    void postJson(`/api/servers/${serverId}/agent`, { agentStatus: status });
    setMessage("Agent deployment command sent");
    setModal(null);
  }

  function runJob(jobId: string) {
    setStore((current) => ({
      ...current,
      jobs: current.jobs.map((job) => (job.id === jobId ? { ...job, status: "running" } : job))
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

  function deleteCustomer(customer: Customer) {
    if (!window.confirm(`Delete customer ${customer.name}? This also removes local servers, jobs, and restores for that customer.`)) {
      return;
    }
    setStore((current) => ({
      customers: current.customers.filter((item) => item.id !== customer.id),
      servers: current.servers.filter((server) => server.customerId !== customer.id),
      jobs: current.jobs.filter((job) => job.customerId !== customer.id),
      restores: current.restores.filter((restore) => restore.customerId !== customer.id),
      users: current.users.filter((user) => user.customerId !== customer.id)
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
            <strong>{onlineServers}/{store.servers.length} online</strong>
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
            <small>Servers currently reporting online</small>
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
              <button type="button" className="ghost" onClick={() => setModal("user")}>Invite user</button>
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
                  <span>{customerName.get(user.customerId) ?? "Unassigned"}</span>
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
                  <span className={`agent agent-${server.agentStatus}`}>{server.agentStatus.replace("_", " ")}</span>
                  <small>Last seen: {server.lastSeen}</small>
                  <small>Repository: {server.repository}</small>
                  <button
                    type="button"
                    className="ghost row-action"
                    onClick={() => {
                      setSelectedServer(server.id);
                      setModal("deploy");
                    }}
                  >
                    Deploy agent
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
              <h2>Protection jobs</h2>
              <button type="button" className="ghost" onClick={() => setModal("job")}>Create job</button>
            </div>
            <div className="job-list">
              {store.jobs.map((job) => (
                <article className="job" key={job.id}>
                  <div>
                    <span className="job-action">{job.action}</span>
                    <strong>{job.name}</strong>
                    <small>{customerName.get(job.customerId)} - {job.target} - {job.schedule} - RPO {job.rpo}</small>
                  </div>
                  <div className="job-actions">
                    <span className={statusClass(job.status)}>{statusLabels[job.status]}</span>
                    <button type="button" className="ghost" onClick={() => runJob(job.id)}>Run now</button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setSelectedJob(job.id);
                        setModal("editJob");
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
            {modal === "user" && <UserForm customers={store.customers} onSubmit={inviteUser} />}
            {modal === "editUser" && activeUser && <UserForm customers={store.customers} user={activeUser} onSubmit={editUser} />}
            {modal === "server" && <ServerForm customers={store.customers} onSubmit={addServer} />}
            {modal === "editServer" && activeServer && <ServerForm customers={store.customers} server={activeServer} onSubmit={editServer} />}
            {modal === "job" && <JobForm customers={store.customers} onSubmit={createJob} />}
            {modal === "editJob" && activeJob && <JobForm customers={store.customers} job={activeJob} onSubmit={editJob} />}
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
  user: "Invite user",
  editUser: "Edit user",
  server: "Add server by IP",
  editServer: "Edit server",
  job: "Create protection job",
  editJob: "Edit protection job",
  restore: "Start restore",
  editRestore: "Edit restore request",
  deploy: "Deploy agent"
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
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} defaultValue={user?.customerId} /></label>
      <label>Name<input name="name" required placeholder="User full name" defaultValue={user?.name} /></label>
      <label>Email<input name="email" type="email" required placeholder="user@company.com" defaultValue={user?.email} /></label>
      <label>Role<select name="role" defaultValue={user?.role ?? "operator"}><option value="owner">Owner</option><option value="admin">Admin</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select></label>
      {user && (
        <label>Status<select name="status" defaultValue={user.status}><option value="active">Active</option><option value="invited">Invited</option><option value="disabled">Disabled</option></select></label>
      )}
      <button className="button primary" type="submit">{user ? "Save user" : "Invite user"}</button>
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

function JobForm({ customers, job, onSubmit }: { customers: Customer[]; job?: ProtectionJob; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} defaultValue={job?.customerId} /></label>
      <label>Job name<input name="name" required placeholder="Production backup" defaultValue={job?.name} /></label>
      <label>Action<select name="action" defaultValue={job?.action ?? "backup"}><option value="backup">Backup</option><option value="replicate">Replicate</option><option value="restore">Restore test</option></select></label>
      <label>Target<input name="target" required placeholder="vSphere cluster or server group" defaultValue={job?.target} /></label>
      <label>Schedule<input name="schedule" required placeholder="Every 4 hours" defaultValue={job?.schedule} /></label>
      <label>RPO<input name="rpo" required placeholder="4h" defaultValue={job?.rpo} /></label>
      <button className="button primary" type="submit">{job ? "Save job" : "Queue job"}</button>
    </form>
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
      <label>Command<select name="agentStatus" defaultValue="online"><option value="online">Install and mark online</option><option value="installing">Queue installation</option><option value="offline">Mark offline</option><option value="error">Mark error</option></select></label>
      <button className="button primary" type="submit">Send command</button>
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
