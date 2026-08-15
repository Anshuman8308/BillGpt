import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { ApiError } from "../services/api";

export default function Login() {
  const { login, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      clearSessionExpired();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-gradient flex items-center justify-center px-5">
      <div className="w-full max-w-sm bg-cream rounded-3xl shadow-card p-7 animate-fade-in">
        <div className="flex items-center gap-1 font-extrabold text-ink text-xl mb-1">
          Bill
          <span className="text-[10px] font-bold bg-ink text-cream px-1.5 py-0.5 rounded-md -rotate-6">
            OPT
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-ink mb-1">Welcome back</h1>
        <p className="text-sm text-ink/60 mb-6">Sign in to find your best deals.</p>

        {sessionExpired && (
          <p role="alert" className="text-xs font-medium text-accent-red bg-accent-red/10 rounded-lg px-3 py-2 mb-4">
            Your session expired. Please sign in again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <label htmlFor="email" className="text-xs font-semibold text-ink/60 block mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-semibold text-ink/60 block mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-ink/40"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-accent-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ink text-cream font-semibold py-2.5 text-sm mt-2 disabled:opacity-50 hover:brightness-110 transition"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-ink/60 text-center mt-5">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-ink underline underline-offset-2">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
