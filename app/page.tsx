import { customers, jobs, servers } from "@/lib/mock-data";
import type { JobStatus } from "@/lib/types";

const statusLabels: Record<JobStatus, string> = {
  idle: "Idle",
  queued: "Queued",
  running: "Running",
  warning: "Warning",
  failed: "Failed",
  success: "Healthy"
};

function statusClass(status: JobStatus) {
  return `pill pill-${status}`;
}

export default function DashboardPage() {
  const protectedCount = customers.reduce((sum, customer) => sum + customer.protectedServers, 0);
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const warningCustomers = customers.filter((customer) => customer.health === "warning").length;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>Backup Control</strong>
            <span>Cloud and on-prem</span>
          </div>
        </div>
        <nav className="nav">
          <a href="#overview" className="active">Overview</a>
          <a href="#customers">Customers</a>
          <a href="#servers">Servers</a>
          <a href="#jobs">Jobs</a>
          <a href="#restore">Restore</a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Centralized backup management</p>
            <h1>Protect, replicate, and restore customer workloads</h1>
          </div>
          <div className="actions">
            <button type="button" className="button secondary">Add server by IP</button>
            <button type="button" className="button primary">Create job</button>
          </div>
        </header>

        <section id="overview" className="metrics" aria-label="Platform overview">
          <article>
            <span>Customers</span>
            <strong>{customers.length}</strong>
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

        <section className="grid two">
          <div id="customers" className="panel">
            <div className="panel-head">
              <h2>Customers</h2>
              <button type="button" className="ghost">New customer</button>
            </div>
            <div className="table">
              <div className="table-row table-head">
                <span>Name</span>
                <span>Mode</span>
                <span>Servers</span>
                <span>Health</span>
              </div>
              {customers.map((customer) => (
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
          </div>

          <div id="restore" className="panel">
            <div className="panel-head">
              <h2>Restore queue</h2>
              <button type="button" className="ghost">Start restore</button>
            </div>
            <div className="restore-box">
              <div>
                <span className="restore-icon">R</span>
                <h3>Instant VM recovery workflow</h3>
                <p>Select customer, restore point, target network, and repository. The on-prem gateway performs the privileged recovery task while this dashboard tracks state.</p>
              </div>
              <ol>
                <li>Choose restore point</li>
                <li>Mount or copy workload</li>
                <li>Verify boot and network</li>
              </ol>
            </div>
          </div>
        </section>

        <section className="grid two">
          <div id="servers" className="panel">
            <div className="panel-head">
              <h2>Servers and hypervisors</h2>
              <button type="button" className="ghost">Deploy agent</button>
            </div>
            <div className="cards">
              {servers.map((server) => (
                <article className="server-card" key={server.id}>
                  <div>
                    <strong>{server.hostname}</strong>
                    <span>{server.address} - {server.kind.toUpperCase()}</span>
                  </div>
                  <span className={`agent agent-${server.agentStatus}`}>{server.agentStatus.replace("_", " ")}</span>
                  <small>Last seen: {server.lastSeen}</small>
                  <small>Repository: {server.repository}</small>
                </article>
              ))}
            </div>
          </div>

          <div id="jobs" className="panel">
            <div className="panel-head">
              <h2>Protection jobs</h2>
              <button type="button" className="ghost">Run now</button>
            </div>
            <div className="job-list">
              {jobs.map((job) => (
                <article className="job" key={job.id}>
                  <div>
                    <span className="job-action">{job.action}</span>
                    <strong>{job.name}</strong>
                    <small>{job.target} - {job.schedule} - RPO {job.rpo}</small>
                  </div>
                  <span className={statusClass(job.status)}>{statusLabels[job.status]}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
