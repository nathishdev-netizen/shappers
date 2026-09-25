"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserPlus, Contact, Dumbbell, Salad,
  CreditCard, Receipt, Building2, ScanLine, LogOut, Lock,
} from "lucide-react";
import { useTenant } from "@/lib/tenant-context";
import { isLocked } from "@/lib/locked";

const NAV: { href: string; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users, group: "Clients" },
  { href: "/leads", label: "Leads", icon: UserPlus },
  { href: "/attendance", label: "Attendance", icon: ScanLine },
  { href: "/training", label: "Personal Training", icon: Dumbbell, group: "Coaching" },
  { href: "/diet", label: "Diet Plans", icon: Salad },
  { href: "/plans", label: "Plans", icon: CreditCard, group: "Business" },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/staff", label: "Staff", icon: Contact },
  { href: "/branches", label: "Branches", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { tenant, logout } = useTenant();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col border-r lg:flex"
      style={{ backgroundColor: "var(--sidebar)", borderColor: "var(--hairline)" }}
    >
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        {/* The club's own mark when it has one; the SHAPER mark is the default. */}
        <img
          src={tenant?.logoUrl || "/brand/mark.png"}
          alt=""
          className="h-11 w-11 shrink-0 object-contain"
          style={{ filter: "drop-shadow(0 0 14px var(--brand-glow))" }}
        />
        <div className="min-w-0">
          {/* Two lines, so a full studio name isn't chopped to an ellipsis. */}
          <p className="line-clamp-2 text-[13.5px] font-semibold leading-[1.25] text-white">{tenant?.name}</p>
          <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--sidebar-ink)" }}>
            {tenant?.subdomain}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
        {NAV.map(({ href, label, icon: Icon, group }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const locked = isLocked(href);
          return (
            <div key={href}>
              {group && (
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--ink-muted)" }}>
                  {group}
                </p>
              )}
              {locked ? (
                // Rendered as a non-interactive row: a disabled <Link> would still
                // navigate on middle-click or "open in new tab".
                <div
                  aria-disabled="true"
                  title={`${label} is temporarily locked`}
                  className="relative flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] opacity-45"
                  style={{ color: "var(--sidebar-ink)" }}
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                  <Lock size={12} strokeWidth={2.4} className="ml-auto shrink-0" />
                </div>
              ) : (
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors"
                  style={{
                    backgroundColor: active ? "var(--sidebar-hover)" : "transparent",
                    color: active ? "#ffffff" : "var(--sidebar-ink)",
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                      style={{ backgroundColor: "var(--brand)", boxShadow: "0 0 12px var(--brand-glow)" }}
                    />
                  )}
                  <Icon size={17} strokeWidth={2} style={{ color: active ? "var(--brand)" : undefined }} />
                  {label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t p-3" style={{ borderColor: "var(--hairline)" }}>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors hover:bg-white/5 hover:text-white"
          style={{ color: "var(--sidebar-ink)" }}
        >
          <LogOut size={17} strokeWidth={2} />
          Log out
        </button>
      </div>
    </aside>
  );
}
