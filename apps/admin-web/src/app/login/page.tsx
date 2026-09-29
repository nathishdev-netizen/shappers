"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api, ApiError, apiBaseUrl, setToken } from "@/lib/api";

const DEMO_TENANTS = [
  { subdomain: "shaper", label: "SHAPER Elite Fitness Studio", email: "owner@shaper.fit", hex: "#f00000" },
  { subdomain: "iron-house", label: "Iron House Strength", email: "owner@iron-house.com", hex: "#2a78d6" },
];

export default function LoginPage() {
  const router = useRouter();
  const [subdomain, setSubdomain] = useState("shaper");
  const [email, setEmail] = useState("owner@shaper.fit");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("expired")
      ? "Your session expired — please sign in again."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await api.login(subdomain, email, password);
      setToken(accessToken);
      localStorage.setItem("shappers_user", JSON.stringify(user));
      router.push("/dashboard");
    } catch (err) {
      // A rejected password and an unreachable server are different problems.
      // Blaming the credentials for a network fault sends people to re-type a
      // password that was never wrong — and hides that the app is pointed at an
      // API it cannot see, which is what a stale build or old URL looks like.
      const rejected = err instanceof ApiError && (err.status === 401 || err.status === 400);
      setError(
        rejected
          ? "Those credentials didn't work. Check the subdomain and try again."
          : `Can't reach the server at ${apiBaseUrl}. If this is an old tab, reload the page.`,
      );
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-lg border border-hairline bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:ring-2";
  const ring = { ["--tw-ring-color" as string]: "color-mix(in srgb, var(--brand) 35%, transparent)" };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — the white-label story, stated up front. */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--sidebar)] p-12 lg:flex">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full blur-3xl"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand) 22%, transparent)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: "color-mix(in srgb, var(--brand) 12%, transparent)" }}
        />

        <div className="relative flex items-center gap-3">
          <img src="/brand/mark.png" alt="" className="h-9 w-9 object-contain" />
          <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-white/70">Shaper</span>
        </div>

        <div className="relative">
          <img
            src="/brand/lockup.png"
            alt="SHAPER — Elite Fitness Studio"
            className="mb-8 w-[260px] max-w-full object-contain"
            style={{ filter: "drop-shadow(0 0 40px var(--brand-glow))" }}
          />
          <h2 className="max-w-md text-[32px] font-semibold leading-[1.2] tracking-tight text-white">
            Built to shape
            <br />
            every body.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
            Members, trainers, PT, diet plans, fees and attendance — one console for the whole studio,
            on Android and the web.
          </p>

          <div className="mt-8 flex gap-8">
            {[
              ["28", "members"],
              ["2", "branches"],
              ["10", "PT packages"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-xl font-semibold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-white/40">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-white/30">Running entirely on open-source infrastructure</p>
      </div>

      {/* Login form */}
      <div className="relative flex items-center justify-center bg-page px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/brand/lockup.png" alt="SHAPER" className="mb-4 h-20 object-contain" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">Staff sign in</h1>
          <p className="mt-1.5 text-sm text-ink-secondary">Manage your club&apos;s members and memberships</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-secondary">Gym subdomain</label>
              <input
                className={field}
                style={ring}
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-secondary">Email</label>
              <input
                type="email"
                className={field}
                style={ring}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-secondary">Password</label>
              <input
                type="password"
                className={field}
                style={ring}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: "var(--status-critical)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--brand)", color: "var(--brand-ink)" }}
            >
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight size={15} strokeWidth={2.4} />}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-hairline bg-surface p-4">
            <p className="text-xs font-medium text-ink-secondary">Demo clubs</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Two tenants, same deployment — switch to see branding and data isolation.
            </p>
            <div className="mt-3 space-y-1.5">
              {DEMO_TENANTS.map((t) => (
                <button
                  key={t.subdomain}
                  onClick={() => {
                    setSubdomain(t.subdomain);
                    setEmail(t.email);
                    setPassword("Password123!");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-page"
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.hex }} />
                  <span className="flex-1 text-xs text-ink">{t.label}</span>
                  <span className="font-mono text-[11px] text-ink-muted">{t.subdomain}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
