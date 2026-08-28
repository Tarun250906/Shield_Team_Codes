import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Lock, User, AlertCircle } from "lucide-react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname ?? "/overview";

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (u: string) => {
    setUsername(u);
    setPassword("shield123");
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-11 h-11 rounded-lg bg-brand-dim border border-brand/30 flex items-center justify-center mb-3">
            <ShieldCheck size={22} className="text-brand" strokeWidth={2.2} />
          </div>
          <div className="text-[17px] font-semibold text-text-primary tracking-tight">SHIELD</div>
          <div className="text-[11.5px] text-text-tertiary mt-0.5">Mule Account Risk Console</div>
        </div>

        <form onSubmit={onSubmit} className="bg-surface border border-border rounded-lg p-5 space-y-3.5">
          <div>
            <label className="block text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary mb-1.5">Username</label>
            <div className="relative">
              <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="analyst"
                className="w-full bg-surface-2 border border-border rounded-md pl-8 pr-3 py-2 text-[12.5px] outline-none focus:border-brand/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary mb-1.5">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-2 border border-border rounded-md pl-8 pr-3 py-2 text-[12.5px] outline-none focus:border-brand/50"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-[11px] text-critical bg-critical-dim border border-critical/30 rounded-md px-2.5 py-1.5">
              <AlertCircle size={12} className="shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full bg-brand text-black font-medium text-[12.5px] rounded-md py-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>

          <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary bg-surface-2 border border-border rounded px-2.5 py-1.5 leading-relaxed">
            <span>⚠</span>
            <span>Demo authentication for this prototype only — not connected to a real identity provider, SSO, or MFA. A production deployment would integrate the bank's IAM/SSO stack here.</span>
          </div>
        </form>

        <div className="mt-3 bg-surface border border-border rounded-lg p-3">
          <div className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary mb-2">Demo credentials</div>
          <div className="flex gap-2">
            <button onClick={() => fillDemo("analyst")} className="flex-1 text-[11px] border border-border rounded-md py-1.5 text-text-secondary hover:bg-surface-hover">
              analyst / shield123
            </button>
            <button onClick={() => fillDemo("admin")} className="flex-1 text-[11px] border border-border rounded-md py-1.5 text-text-secondary hover:bg-surface-hover">
              admin / shield123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
