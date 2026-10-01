"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MapPin, Users, CalendarDays, Salad, CheckCircle2,
  XCircle, Clock, TrendingDown, ChevronRight, UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getStaffDetail, type StaffDetail } from "@/lib/insights/staff";
import { formatCurrency, formatDate } from "@/lib/format";
import { AccessPill, ChurnPill } from "@/components/access-badge";
import { Reveal, Item, Page, CountUp, Bar, Spotlight } from "@/components/motion";
import { Avatar, Pill, PillTabs, SectionTitle, Th, Td, Empty } from "@/components/ui";

type Tab = "clients" | "sessions" | "packages" | "diet";
const humanize = (s: string | null) =>
  s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : null;

export default function StaffDetailPage({ params }: PageProps<"/staff/[id]">) {
  const { id } = use(params);
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [tab, setTab] = useState<Tab>("clients");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    getStaffDetail(createClient(), id).then(setStaff).catch(() => setNotFound(true));
  }, [id]);

  if (notFound) {
    return (
      <div className="p-10">
        <p className="text-sm text-ink-secondary">That staff member could not be found.</p>
        <Link href="/staff" className="mt-2 inline-block text-sm underline">Back to staff</Link>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="space-y-4 p-6 lg:p-10">
        <div className="skeleton h-36" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  const s = staff.stats;
  const upcoming = staff.sessions.filter((x) => x.status === "SCHEDULED" && new Date(x.scheduled_at) >= new Date());
  const past = staff.sessions.filter((x) => x.status !== "SCHEDULED" || new Date(x.scheduled_at) < new Date());
  const showRate = s.sessionsCompleted + s.noShows > 0
    ? s.sessionsCompleted / (s.sessionsCompleted + s.noShows)
    : 1;

  return (
    <Page>
      <header className="border-b border-hairline px-6 pb-6 pt-6 lg:px-10">
        <Link href="/staff" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink">
          <ArrowLeft size={15} strokeWidth={2} />
          All staff
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <Avatar first={staff.first_name} last={staff.last_name} size={64} />
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight text-ink">
                {staff.first_name} {staff.last_name}
              </h1>
              <p className="mt-1 text-sm text-ink-secondary">
                {staff.specialty ?? humanize(staff.role)}
                {staff.branch && ` · ${staff.branch.name}`}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Pill tone={staff.role === "TRAINER" ? "brand" : "muted"}>{humanize(staff.role)}</Pill>
                {!staff.is_active && <Pill tone="critical">Inactive</Pill>}
                <span className="flex items-center gap-3 text-xs text-ink-muted">
                  {staff.phone && <span className="flex items-center gap-1"><Phone size={11} />{staff.phone}</span>}
                  <span className="flex items-center gap-1"><Mail size={11} />{staff.email}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="card-hero min-w-[240px] p-5">
            <p className="text-xs text-ink-secondary">Clients assigned</p>
            <p className="stat-figure mt-1 text-[38px] font-semibold leading-none text-ink">
              <CountUp value={s.clients} />
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              {s.sessionsThisWeek} session{s.sessionsThisWeek === 1 ? "" : "s"} booked this week
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-6 lg:px-10">
        <Reveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Item><Kpi icon={<Users size={14} />} label="Clients" value={s.clients} /></Item>
          <Item><Kpi icon={<CalendarDays size={14} />} label="Upcoming sessions" value={s.sessionsUpcoming} /></Item>
          <Item><Kpi icon={<CheckCircle2 size={14} />} label="Sessions completed" value={s.sessionsCompleted} /></Item>
          <Item><Kpi icon={<XCircle size={14} />} label="No-shows" value={s.noShows} tone={s.noShows > 0 ? "critical" : undefined} /></Item>
          <Item><Kpi icon={<Salad size={14} />} label="Active diet plans" value={s.activeDietPlans} /></Item>
        </Reveal>

        {s.sessionsCompleted + s.noShows > 0 && (
          <div className="card-glass p-5">
            <SectionTitle title="Show-up rate" subtitle={`${s.sessionsCompleted} completed vs ${s.noShows} no-shows`} />
            <div className="flex items-center gap-4">
              <span className="stat-figure text-[28px] font-semibold text-ink">{Math.round(showRate * 100)}%</span>
              <div className="flex-1"><Bar value={showRate} color={showRate >= 0.8 ? "var(--status-good)" : "var(--status-warning)"} /></div>
            </div>
          </div>
        )}

        <PillTabs
          tabs={[
            { value: "clients" as Tab, label: "Clients", count: staff.clients.length },
            { value: "sessions" as Tab, label: "Sessions", count: staff.sessions.length },
            { value: "packages" as Tab, label: "PT packages", count: staff.packages.length },
            { value: "diet" as Tab, label: "Diet plans", count: staff.dietPlans.length },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "clients" && (
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                  <Th>Client</Th><Th>Goal</Th><Th>Plan</Th><Th>Last visit</Th><Th>Access</Th><Th>Retention</Th><Th><span className="sr-only">Open</span></Th>
                </tr></thead>
                <tbody>
                  {staff.clients.map((c) => {
                    const sub = c.subscriptions?.[0];
                    const since = c.visits.daysSinceLastVisit;
                    return (
                      <tr key={c.id} className="table-row">
                        <Td>
                          <Link href={`/members/${c.id}`} className="flex items-center gap-3 hover:underline">
                            <Avatar first={c.first_name} last={c.last_name} size={34} />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{c.first_name} {c.last_name}</p>
                              <p className="truncate text-xs text-ink-muted">{c.email}</p>
                            </div>
                          </Link>
                        </Td>
                        <Td><span className="text-ink-secondary">{humanize(c.primary_goal) ?? "—"}</span></Td>
                        <Td><span className="text-ink-secondary">{sub?.membership_plan.name ?? "—"}</span></Td>
                        <Td>{since === null ? <span className="text-ink-muted">Never</span>
                          : <span style={since >= 14 ? { color: "var(--status-critical)" } : undefined}>{since === 0 ? "Today" : `${since}d ago`}</span>}</Td>
                        <Td><AccessPill access={c.access} /></Td>
                        <Td><ChurnPill risk={c.churnRisk} compact /></Td>
                        <Td><Link href={`/members/${c.id}`}><ChevronRight size={15} className="text-ink-muted" /></Link></Td>
                      </tr>
                    );
                  })}
                  {staff.clients.length === 0 && <tr><td colSpan={7}><Empty>No clients assigned yet.</Empty></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "sessions" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card-glass p-5">
              <SectionTitle title="Upcoming" subtitle={`${upcoming.length} scheduled`} />
              {upcoming.length === 0 ? <Empty>Nothing booked.</Empty> : (
                <ul className="divide-y" style={{ borderColor: "var(--hairline)" }}>
                  {upcoming.slice(0, 12).map((x) => (
                    <li key={x.id} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-10 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-[11px] font-semibold"
                        style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}>
                        {new Date(x.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        <span className="text-[9px] font-normal opacity-80">
                          {new Date(x.scheduled_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/members/${x.member.id}`} className="block truncate text-[13px] font-medium text-ink hover:underline">
                          {x.member.first_name} {x.member.last_name}
                        </Link>
                        <p className="truncate text-xs text-ink-muted">{x.focus ?? "Session"} · {x.duration_minutes}m</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card-glass p-5">
              <SectionTitle title="History" subtitle={`${past.length} past sessions`} />
              {past.length === 0 ? <Empty>No history yet.</Empty> : (
                <ul className="max-h-[420px] divide-y overflow-auto" style={{ borderColor: "var(--hairline)" }}>
                  {past.slice(0, 20).map((x) => (
                    <li key={x.id} className="flex items-center gap-3 py-2.5">
                      {x.status === "COMPLETED"
                        ? <CheckCircle2 size={15} style={{ color: "var(--status-good)" }} className="shrink-0" />
                        : <XCircle size={15} style={{ color: "var(--status-critical)" }} className="shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink">{x.member.first_name} {x.member.last_name}</p>
                        <p className="truncate text-xs text-ink-muted">{x.focus ?? "Session"}{x.notes ? ` · ${x.notes}` : ""}</p>
                      </div>
                      <span className="shrink-0 text-xs text-ink-muted">{formatDate(x.scheduled_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === "packages" && (
          <Reveal className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {staff.packages.map((p) => (
              <Item key={p.id}>
                <Spotlight className="card-glass p-5">
                  <div className="flex items-center gap-3">
                    <Avatar first={p.member.first_name} last={p.member.last_name} size={38} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/members/${p.member.id}`} className="block truncate text-[14px] font-semibold text-ink hover:underline">
                        {p.member.first_name} {p.member.last_name}
                      </Link>
                      <p className="truncate text-xs text-ink-muted">{formatCurrency(p.price_cents)}</p>
                    </div>
                    {p.remaining <= 2 && <Pill tone="warning">Low</Pill>}
                  </div>
                  <p className="stat-figure mt-4 text-[26px] font-semibold leading-none text-ink">
                    {p.remaining}<span className="unit ml-1">/ {p.sessions_purchased} left</span>
                  </p>
                  <div className="mt-3"><Bar value={p.used / p.sessions_purchased} /></div>
                </Spotlight>
              </Item>
            ))}
            {staff.packages.length === 0 && <div className="card-glass md:col-span-2 xl:col-span-3"><Empty>No PT packages.</Empty></div>}
          </Reveal>
        )}

        {tab === "diet" && (
          <Reveal className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {staff.dietPlans.map((d) => (
              <Item key={d.id}>
                <div className="card-glass p-5" style={{ opacity: d.is_active ? 1 : 0.6 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand)" }}>{humanize(d.goal)}</p>
                      <p className="mt-0.5 truncate text-[15px] font-semibold text-ink">{d.title}</p>
                      {d.member && (
                        <Link href={`/members/${d.member.id}`} className="truncate text-xs text-ink-muted hover:underline">
                          {d.member.first_name} {d.member.last_name}
                        </Link>
                      )}
                    </div>
                    <Pill tone={d.is_active ? "good" : "muted"}>{d.is_active ? "Active" : "Archived"}</Pill>
                  </div>
                  <p className="mt-3 text-sm text-ink-secondary">{d.daily_calories} kcal · P{d.protein_g} / C{d.carbs_g} / F{d.fat_g}</p>
                </div>
              </Item>
            ))}
            {staff.dietPlans.length === 0 && <div className="card-glass md:col-span-2 xl:col-span-3"><Empty>No diet plans set.</Empty></div>}
          </Reveal>
        )}
      </div>
    </Page>
  );
}

function Kpi({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: "critical" }) {
  return (
    <div className="card p-5">
      <p className="flex items-center gap-1.5 text-[12px] text-ink-secondary">{icon}{label}</p>
      <p className="stat-figure mt-2 text-[30px] font-semibold leading-none"
        style={{ color: tone === "critical" && value > 0 ? "var(--status-critical)" : "var(--ink)" }}>
        <CountUp value={value} />
      </p>
    </div>
  );
}
