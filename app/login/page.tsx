import { signIn } from "@/app/auth/actions";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isConfigured = hasSupabaseConfig();

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Backup platform sign in">
        <div className="login-brand">
          <span className="brand-mark">B</span>
          <div>
            <strong>Antarex Backup Control</strong>
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
        <form className="login-form" action={signIn}>
          <input type="hidden" name="next" value={params.next ?? "/"} />
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

          <p className={params.error ? "login-note login-error" : "login-note"}>
            {params.error ?? (
              isConfigured
                ? "Use a Supabase Auth user created in your Supabase project."
                : "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy."
            )}
          </p>
          {!isConfigured && (
            <div className="setup-box">
              <strong>Required before login works</strong>
              <span>Set `NEXT_PUBLIC_SUPABASE_URL`</span>
              <span>Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`</span>
              <span>Create a Supabase Auth user</span>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
