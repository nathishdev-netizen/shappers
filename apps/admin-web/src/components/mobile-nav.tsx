"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Dumbbell, UserPlus, MoreHorizontal,
  ScanLine, Salad, CreditCard, Receipt, Contact, Building2, LogOut, X,
} from "lucide-react";
import { useTenant } from "@/lib/tenant-context";

/** Mirrors the native app's tab bar, so the two builds navigate identically. */
const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/leads", label: "Leads", icon: UserPlus },
];

const MORE = [
  { href: "/attendance", label: "Attendance", hint: "Check members in", icon: ScanLine, group: "Clients" },
  { href: "/diet", label: "Diet plans", hint: "Nutrition programmes", icon: Salad, group: "Coaching" },
  { href: "/plans", label: "Membership plans", hint: "Pricing and cycles", icon: CreditCard, group: "Business" },
  { href: "/invoices", label: "Invoices", hint: "Payments and dues", icon: Receipt, group: "Business" },
  { href: "/staff", label: "Staff", hint: "Trainers and front desk", icon: Contact, group: "Business" },
  { href: "/branches", label: "Branches", hint: "Locations in the network", icon: Building2, group: "Business" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { tenant, logout } = useTenant();
  const [open, setOpen] = useState(false);

  const onMoreRoute = MORE.some((m) => pathname.startsWith(m.href));
  const groups = ["Clients", "Coaching", "Business"];

  return (
    <>
      {/* The More sheet — the phone stand-in for the sidebar's lower groups. */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[88%] overflow-y-auto rounded-t-3xl border-t p-5 pb-32"
            style={{ backgroundColor: "var(--page)", borderColor: "var(--hairline-strong)" }}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--baseline)" }} />

            <div className="mb-5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-bold text-white">{tenant?.name}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--brand)" }}>
                  More
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full"
                style={{ backgroundColor: "var(--surface-raised)", color: "var(--ink-secondary)" }}
              >
                <X size={15} />
              </button>
            </div>

            {groups.map((g) => (
              <div key={g} className="mb-5">
                <p
                  className="mb-2 ml-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {g}
                </p>
                <div className="card overflow-hidden !p-0">
                  {MORE.filter((m) => m.group === g).map(({ href, label, hint, icon: Icon }, i, arr) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-4 py-3.5"
                      style={{
                        borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--hairline)",
                      }}
                    >
                      <Icon size={17} style={{ color: "var(--brand-on-tint)" }} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-white">{label}</span>
                        <span className="block text-[12px]" style={{ color: "var(--ink-muted)" }}>{hint}</span>
                      </span>
                      <span style={{ color: "var(--ink-muted)" }}>›</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-full border py-3.5 text-[14px] font-bold"
              style={{ borderColor: "var(--hairline-strong)", color: "var(--status-critical)" }}
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-4 bottom-5 z-50 flex rounded-full border p-1.5 lg:hidden"
        style={{
          backgroundColor: "var(--surface-raised)",
          borderColor: "var(--hairline-strong)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = !onMoreRoute && !open && (pathname === href || pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-colors"
              style={{
                backgroundColor: active ? "var(--brand)" : "transparent",
                color: active ? "var(--brand-ink)" : "var(--ink-muted)",
              }}
            >
              <Icon size={19} strokeWidth={2} />
              <span className="text-[9.5px]" style={{ fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex flex-1 flex-col items-center gap-0.5 rounded-full py-2 transition-colors"
          style={{
            backgroundColor: open || onMoreRoute ? "var(--brand)" : "transparent",
            color: open || onMoreRoute ? "var(--brand-ink)" : "var(--ink-muted)",
          }}
        >
          <MoreHorizontal size={19} strokeWidth={2} />
          <span className="text-[9.5px]" style={{ fontWeight: open || onMoreRoute ? 700 : 500 }}>More</span>
        </button>
      </nav>
    </>
  );
}
