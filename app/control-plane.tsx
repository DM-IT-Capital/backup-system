"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { customers as seedCustomers, jobs as seedJobs, restores as seedRestores, servers as seedServers } from "@/lib/mock-data";
import type {
  AgentStatus,
  Customer,
  DeploymentMode,
  JobStatus,
  ProtectedServer,
  ProtectionAction,
  ProtectionJob,
  RestoreRequest,
  ServerKind
} from "@/lib/types";

type View = "overview" | "customers" | "servers" | "jobs" | "restore";
type Modal = "customer" | "server" | "job" | "restore" | "deploy" | null;

const storageKey = "backup-control-state-v1";

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

type Store = {
  customers: Customer[];
  servers: ProtectedServer[];
  jobs: ProtectionJob[];
  restores: RestoreRequest[];
};

const initialStore: Store = {
  customers: seedCustomers,
  servers: seedServers,
  jobs: seedJobs,
  restores: seedRestores
};

export function ControlPlane({ initialView }: { initialView: View }) {
  const [store, setStore] = useState<Store>(initialStore);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedServer, setSelectedServer] = useState<string>(seedServers[0]?.id ?? "");
  const [message, setMessage] = useState("Ready");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setStore(JSON.parse(saved) as Store);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(store));
  }, [store]);

  const customerName = useMemo(() => {
    return new Map(store.customers.map((customer) => [customer.id, customer.name]));
  }, [store.customers]);

  const serverName = useMemo(() => {
    return new Map(store.servers.map((server) => [server.id, server.hostname]));
  }, [store.servers]);

  const protectedCount = store.customers.reduce((sum, customer) => sum + customer.protectedServers, 0);
  const runningJobs = store.jobs.filter((job) => job.status === "running").length;
  const warningCustomers = store.customers.filter((customer) => customer.health === "warning").length;

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
    setMessage(`Customer ${customer.name} created`);
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
    setSelectedServer(server.id);
    setMessage(`Server ${server.hostname} queued for agent deployment`);
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
    setMessage(`${action} job ${job.name} queued`);
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
    setMessage("Restore request queued");
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
    setMessage("Agent deployment command sent");
    setModal(null);
  }

  function runJob(jobId: string) {
    setStore((current) => ({
      ...current,
      jobs: current.jobs.map((job) => (job.id === jobId ? { ...job, status: "running" } : job))
    }));
    setMessage("Job run started");
  }

  function markRestoreRunning(restoreId: string) {
    setStore((current) => ({
      ...current,
      restores: current.restores.map((restore) =>
        restore.id === restoreId ? { ...restore, status: "running" } : restore
      )
    }));
    setMessage("Restore workflow started");
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand brand-link" href="/">
          <span className="brand-mark">B</span>
          <div>
            <strong>Backup Control</strong>
            <span>Cloud and on-prem</span>
          </div>
        </a>
        <nav className="nav">
          {navItems.map((item) => (
            <a href={item.href} className={initialView === item.view ? "active" : ""} key={item.href}>
              {item.label}
            </a>
          ))}
          <a href="/login">Login</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Centralized backup management</p>
            <h1>{initialView === "overview" ? "Protect, replicate, and restore customer workloads" : navItems.find((item) => item.view === initialView)?.label}</h1>
            <p className="status-line">{message}</p>
          </div>
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => setModal("server")}>Add server by IP</button>
            <button type="button" className="button primary" onClick={() => setModal("job")}>Create job</button>
            <a className="button secondary" href="/login">Login</a>
          </div>
        </header>

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
                  </div>
                ))}
              </div>
            </section>
          </>
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
            {modal === "server" && <ServerForm customers={store.customers} onSubmit={addServer} />}
            {modal === "job" && <JobForm customers={store.customers} onSubmit={createJob} />}
            {modal === "restore" && <RestoreForm customers={store.customers} servers={store.servers} onSubmit={startRestore} />}
            {modal === "deploy" && <DeployForm servers={store.servers} selectedServer={selectedServer} onSubmit={deployAgent} />}
          </div>
        </div>
      )}
    </main>
  );
}

const modalTitles: Record<Exclude<Modal, null>, string> = {
  customer: "New customer",
  server: "Add server by IP",
  job: "Create protection job",
  restore: "Start restore",
  deploy: "Deploy agent"
};

function CustomerForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer name<input name="name" required placeholder="Customer company name" /></label>
      <label>Deployment mode<select name="mode" defaultValue="cloud"><option value="cloud">Cloud managed</option><option value="onprem">On-prem only</option></select></label>
      <label>Sites<input name="sites" type="number" min="1" defaultValue="1" required /></label>
      <button className="button primary" type="submit">Create customer</button>
    </form>
  );
}

function ServerForm({ customers, onSubmit }: { customers: Customer[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} /></label>
      <label>Hostname<input name="hostname" required placeholder="sql-prod-01" /></label>
      <label>IP address<input name="address" required placeholder="10.10.10.25" pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$" /></label>
      <label>Server type<select name="kind" defaultValue="windows"><option value="windows">Windows</option><option value="linux">Linux</option><option value="esxi">ESXi</option><option value="hyperv">Hyper-V</option><option value="proxmox">Proxmox</option><option value="generic">Generic</option></select></label>
      <label>Repository<input name="repository" required placeholder="Local repository A" /></label>
      <button className="button primary" type="submit">Add and deploy agent</button>
    </form>
  );
}

function JobForm({ customers, onSubmit }: { customers: Customer[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} /></label>
      <label>Job name<input name="name" required placeholder="Production backup" /></label>
      <label>Action<select name="action" defaultValue="backup"><option value="backup">Backup</option><option value="replicate">Replicate</option><option value="restore">Restore test</option></select></label>
      <label>Target<input name="target" required placeholder="vSphere cluster or server group" /></label>
      <label>Schedule<input name="schedule" required placeholder="Every 4 hours" /></label>
      <label>RPO<input name="rpo" required placeholder="4h" /></label>
      <button className="button primary" type="submit">Queue job</button>
    </form>
  );
}

function RestoreForm({ customers, servers, onSubmit }: { customers: Customer[]; servers: ProtectedServer[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="modal-form" onSubmit={onSubmit}>
      <label>Customer<SelectCustomer customers={customers} /></label>
      <label>Server<select name="serverId" required>{servers.map((server) => <option value={server.id} key={server.id}>{server.hostname}</option>)}</select></label>
      <label>Restore point<select name="restorePoint" defaultValue="Latest successful backup"><option>Latest successful backup</option><option>Last night backup</option><option>Manual restore point</option></select></label>
      <label>Restore target<input name="target" required placeholder="Original server or sandbox network" /></label>
      <button className="button primary" type="submit">Queue restore</button>
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

function SelectCustomer({ customers }: { customers: Customer[] }) {
  return (
    <select name="customerId" required>
      {customers.map((customer) => (
        <option value={customer.id} key={customer.id}>{customer.name}</option>
      ))}
    </select>
  );
}
