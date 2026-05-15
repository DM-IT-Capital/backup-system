"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [message, setMessage] = useState("Use any email and password for demo access.");

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    window.localStorage.setItem("backup-control-session", JSON.stringify({ email, signedInAt: new Date().toISOString() }));
    setMessage(`Signed in as ${email}. Redirecting to dashboard...`);
    window.setTimeout(() => {
      window.location.href = "/";
    }, 600);
  }

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Backup platform sign in">
        <div className="login-brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>Backup Control</strong>
            <span>Centralized backup, replication, and restore</span>
          </div>
        </div>

        <div className="login-copy">
          <p className="eyebrow">Secure access</p>
          <h1>Manage cloud and on-prem protection from one console</h1>
          <p>
            Sign in to manage customers, deploy gateways, add servers by IP, monitor backup jobs,
            and start restore workflows.
          </p>
        </div>

        <div className="login-highlights" aria-label="Platform highlights">
          <span>Multi-customer cloud dashboard</span>
          <span>Isolated on-prem console mode</span>
          <span>Gateway and agent orchestration</span>
        </div>
      </section>

      <section className="login-panel" aria-label="Sign in form">
        <form className="login-form" onSubmit={signIn}>
          <div>
            <p className="eyebrow">Welcome back</p>
            <h2>Sign in</h2>
          </div>

          <label>
            Email address
            <input type="email" name="email" placeholder="admin@company.com" autoComplete="email" required />
          </label>

          <label>
            Password
            <input type="password" name="password" placeholder="Enter password" autoComplete="current-password" required />
          </label>

          <div className="login-options">
            <label className="checkbox-row">
              <input type="checkbox" name="remember" />
              Remember this device
            </label>
            <a href="/login">Forgot password?</a>
          </div>

          <button className="button primary login-submit" type="submit">
            Sign in to dashboard
          </button>

          <p className="login-note">{message}</p>
        </form>
      </section>
    </main>
  );
}
