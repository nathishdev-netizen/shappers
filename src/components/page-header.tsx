"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTenant } from "@/lib/tenant-context";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

/**
 * The top bar: a greeting on the left (the reference's "Welcome John, Good Morning!")
 * and a global member search on the right. Pages pass their own title + actions.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  search = true,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  search?: boolean;
}) {
  const router = useRouter();
  const { user } = useTenant();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/members?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="px-6 pb-2 pt-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[15px] text-ink-secondary">
          Welcome{user?.firstName ? " " : ""}
          <span className="font-semibold" style={{ color: "var(--brand)" }}>{user?.firstName ?? ""}</span>
          , {greeting()}!
        </p>

        {search && (
          <form
            onSubmit={submit}
            className="flex w-full max-w-md items-center gap-2 rounded-full border py-1 pl-4 pr-1"
            style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface)" }}
          >
            <Search size={15} strokeWidth={2} className="shrink-0 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search members, phone, email…"
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-muted"
            />
            <button type="submit" className="btn-brand !py-1.5 !px-4 !text-xs">Search</button>
          </form>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-secondary">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
