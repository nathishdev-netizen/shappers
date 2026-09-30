"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Users, Dumbbell, CalendarDays, Clock, AlertTriangle, IndianRupee } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { api, type AnalyticsOverview, type SubscriptionDto } from "@/lib/api";
import { formatCompactCurrency, formatCurrency, formatMonth, formatShortDay, daysUntil } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { BarEmphasis } from "@/components/charts/bar-emphasis";
import { Reveal, Item, CountUp, Ring, RingStack, Spotlight, Lift, Page } from "@/components/motion";
import { Avatar, Pill, SectionTitle, Empty } from "@/components/ui";

function weekOverWeek(points: { checkIns: number }[]) {
  if (points.length < 14) return 0;
  const sum = (a: { checkIns: number }[]) => a.reduce((t, p) => t + p.checkIns, 0);
  const prior = sum(points.slice(-14, -7)), recent = sum(points.slice(-7));
  return prior === 0 ? 0 : Math.round(((recent - prior) / prior) * 100);
}

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [dues, setDues] = useState<SubscriptionDto[]>([]);

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getDuesOverview()]).then(([a, d]) => { setData(a); setDues(d); });
  }, []);

  if (!data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[132px]" />)}
        </div>
      </>
    );
  }

  const { totals, attendanceTrend, revenueByMonth, registrations, expiringSoon, sessionsToday, planDistribution } = data;
  const capacity = Math.max(1, totals.activeSubscriptions);
  const attendanceRate = Math.min(1, totals.checkedInToday / Math.max(1, Math.round(capacity * 0.6)));
  const collectionRate = totals.activeSubscriptions / Math.max(1, totals.activeSubscriptions + totals.overdueSubscriptions);
  const ptUtil = Math.min(1, totals.sessionsToday / Math.max(1, totals.trainersAvailable * 6));

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        subtitle="How the club is performing right now"
        actions={<Link href="/members" className="btn-brand">Onboard a client <ArrowRight size={15} strokeWidth={2.4} /></Link>}
      />

      <div className="space-y-5 p-6 lg:px-10">
        {/* KPI row */}
        <Reveal className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <Item><StatTile label="Active members" value={String(totals.activeSubscriptions)} delta={{ value: 6, period: "vs last month" }} icon={<Users size={15} />} /></Item>
          <Item><StatTile label="Trainers available" value={String(totals.trainersAvailable)} delta={{ value: 0, period: "on shift today" }} icon={<Dumbbell size={15} />} /></Item>
          <Item><StatTile label="Outstanding dues" value={formatCompactCurrency(totals.outstandingCents)} status={totals.outstandingCents > 0 ? "critical" : "good"} hint={`${totals.outstandingInvoices} unpaid invoice${totals.outstandingInvoices === 1 ? "" : "s"}`} icon={<AlertTriangle size={15} />} /></Item>
          <Item><StatTile label="Revenue (MRR)" value={formatCompactCurrency(totals.mrrCents)} delta={{ value: 10, period: "vs last month" }} sparkline={revenueByMonth.map((r) => r.amountCents)} icon={<IndianRupee size={15} />} /></Item>
        </Reveal>

        {/* Bento: hero + charts */}
        <Reveal className="grid gap-5 lg:grid-cols-12">
          {/* Hero — today's pulse */}
          <Item className="lg:col-span-4">
            <div className="card-hero h-full p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand)" }}>Today's pulse</p>
              <div className="mt-5 flex items-center gap-6">
                <RingStack rings={[
                  { value: attendanceRate, color: "var(--brand)" },
                  { value: collectionRate, color: "#22c55e" },
                  { value: ptUtil, color: "#60a5fa" },
                ]} size={150} />
                <div className="space-y-3">
                  <Legend color="var(--brand)" label="Check-ins" value={<><CountUp value={totals.checkedInToday} /> <span className="unit">today</span></>} />
                  <Legend color="#22c55e" label="Paid up" value={<><CountUp value={Math.round(collectionRate * 100)} /><span className="unit">%</span></>} />
                  <Legend color="#60a5fa" label="PT sessions" value={<><CountUp value={totals.sessionsToday} /> <span className="unit">booked</span></>} />
                </div>
              </div>
              <div className="mt-6 flex items-end justify-between border-t pt-4" style={{ borderColor: "rgba(255,106,31,0.2)" }}>
                <div>
                  <p className="text-xs text-ink-secondary">Open leads</p>
                  <p className="stat-figure mt-0.5 text-[30px] font-semibold leading-none text-ink"><CountUp value={totals.openLeads} /></p>
                </div>
                <Link href="/leads" className="btn-ghost !py-1.5 !text-xs">Pipeline <ArrowUpRight size={13} /></Link>
              </div>
            </div>
          </Item>

          {/* Registrations */}
          <Item className="lg:col-span-4">
            <Spotlight className="card-glass h-full p-5">
              <SectionTitle title="Members registrations" subtitle="New sign-ups, last 7 days" />
              <BarEmphasis data={registrations.map((r) => ({ label: formatShortDay(r.date), value: r.count }))} height={200} />
            </Spotlight>
          </Item>

          {/* Revenue growth */}
          <Item className="lg:col-span-4">
            <Spotlight className="card-glass h-full p-5">
              <SectionTitle title="Revenue growth" subtitle="Collected per month" />
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueByMonth} margin={{ top: 8, right: 4, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="month" tickFormatter={formatMonth} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => formatCompactCurrency(v)} tickLine={false} axisLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} width={52} />
                    <Tooltip
                      cursor={{ stroke: "var(--baseline)" }}
                      content={({ active, payload }) => active && payload?.length ? (
                        <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-raised)" }}>
                          <p className="text-xs text-ink-secondary">{formatMonth(payload[0].payload.month)}</p>
                          <p className="text-sm font-semibold text-ink">{formatCurrency(payload[0].payload.amountCents)}</p>
                        </div>
                      ) : null}
                    />
                    <Area type="monotone" dataKey="amountCents" stroke="var(--brand)" strokeWidth={2.5} fill="url(#revFill)" activeDot={{ r: 5, fill: "var(--brand)", stroke: "var(--surface)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Spotlight>
          </Item>
        </Reveal>

        {/* Row 3: agenda, expiring, dues, plans */}
        <Reveal className="grid gap-5 lg:grid-cols-12">
          <Item className="lg:col-span-4">
            <div className="card-glass h-full p-5">
              <SectionTitle title="PT sessions today" subtitle={`${sessionsToday.length} scheduled`} action={<Link href="/training" className="text-xs text-ink-secondary hover:text-ink">All</Link>} />
              {sessionsToday.length === 0 ? <Empty>No sessions today.</Empty> : (
                <ul className="divide-y" style={{ borderColor: "var(--hairline)" }}>
                  {sessionsToday.slice(0, 5).map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2.5" style={{ borderColor: "var(--hairline)" }}>
                      <span className="flex h-9 w-12 shrink-0 flex-col items-center justify-center rounded-lg text-[11px] font-semibold" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}>
                        {new Date(s.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).replace(" ", "")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{s.member.firstName} {s.member.lastName}</p>
                        <p className="truncate text-xs text-ink-muted">{s.focus ?? "Session"} · {s.trainer ? `${s.trainer.firstName}` : "Unassigned"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Item>

          <Item className="lg:col-span-4">
            <div className="card-glass h-full p-5">
              <SectionTitle title="Expiring this week" subtitle="Renewals to chase" action={<Clock size={15} className="text-ink-muted" />} />
              {expiringSoon.length === 0 ? <Empty>Nothing expiring in the next 7 days.</Empty> : (
                <ul className="divide-y" style={{ borderColor: "var(--hairline)" }}>
                  {expiringSoon.slice(0, 5).map((e) => {
                    const d = daysUntil(e.currentPeriodEnd);
                    return (
                      <li key={e.id} className="flex items-center gap-3 py-2.5" style={{ borderColor: "var(--hairline)" }}>
                        <Avatar first={e.member.firstName} last={e.member.lastName} size={34} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/members/${e.member.id}`} className="block truncate text-[13px] font-medium text-ink hover:underline">{e.member.firstName} {e.member.lastName}</Link>
                          <p className="truncate text-xs text-ink-muted">{e.membershipPlan.name}</p>
                        </div>
                        <Pill tone={d <= 2 ? "critical" : "warning"}>{d === 0 ? "Today" : `${d}d`}</Pill>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Item>

          <Item className="lg:col-span-4">
            <div className="card-glass h-full p-5">
              <SectionTitle title="Payments to follow up" subtitle={`${dues.length} overdue`} action={<AlertTriangle size={15} style={{ color: "var(--status-critical)" }} />} />
              {dues.length === 0 ? <Empty>Everyone is paid up.</Empty> : (
                <ul className="divide-y" style={{ borderColor: "var(--hairline)" }}>
                  {dues.slice(0, 5).map((sub) => (
                    <li key={sub.id} className="flex items-center gap-3 py-2.5" style={{ borderColor: "var(--hairline)" }}>
                      <Avatar first={sub.member?.firstName ?? "?"} last={sub.member?.lastName ?? ""} size={34} tone="muted" />
                      <div className="min-w-0 flex-1">
                        <Link href={`/members/${sub.member?.id}`} className="block truncate text-[13px] font-medium text-ink hover:underline">{sub.member?.firstName} {sub.member?.lastName}</Link>
                        <p className="truncate text-xs text-ink-muted">{sub.membershipPlan.name}</p>
                      </div>
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--status-critical)" }}>{formatCurrency(sub.membershipPlan.priceCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Item>
        </Reveal>

        {/* Row 4: attendance trend + plan mix */}
        <Reveal className="grid gap-5 lg:grid-cols-12">
          <Item className="lg:col-span-8">
            <Spotlight className="card-glass p-5">
              <SectionTitle title="Attendance" subtitle="Daily check-ins, last 14 days" action={<Pill tone={weekOverWeek(attendanceTrend) >= 0 ? "good" : "critical"}>{weekOverWeek(attendanceTrend) >= 0 ? "+" : ""}{weekOverWeek(attendanceTrend)}% wk/wk</Pill>} />
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrend} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
                    <defs>
                      <linearGradient id="attFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--gridline)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatShortDay} tickLine={false} axisLine={{ stroke: "var(--baseline)" }} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} width={40} allowDecimals={false} />
                    <Tooltip cursor={{ stroke: "var(--baseline)" }} content={({ active, payload }) => active && payload?.length ? (
                      <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-raised)" }}>
                        <p className="text-xs text-ink-secondary">{formatShortDay(payload[0].payload.date)}</p>
                        <p className="text-sm font-semibold text-ink">{payload[0].payload.checkIns} check-ins</p>
                      </div>
                    ) : null} />
                    <Area type="monotone" dataKey="checkIns" stroke="var(--brand)" strokeWidth={2.5} fill="url(#attFill)" activeDot={{ r: 5, fill: "var(--brand)", stroke: "var(--surface)", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Spotlight>
          </Item>

          <Item className="lg:col-span-4">
            <div className="card-glass h-full p-5">
              <SectionTitle title="Members by plan" subtitle="Active subscriptions" />
              <div className="flex items-center gap-5">
                <Ring value={planDistribution[0] ? planDistribution[0].count / capacity : 0} size={110} stroke={11}>
                  <span className="stat-figure text-[22px] font-semibold text-ink"><CountUp value={capacity} /></span>
                  <span className="unit">active</span>
                </Ring>
                <ul className="min-w-0 flex-1 space-y-2">
                  {planDistribution.slice(0, 4).map((p, i) => (
                    <li key={p.name} className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2 text-ink-secondary">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: i === 0 ? "var(--brand)" : "var(--baseline)" }} />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-ink">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Item>
        </Reveal>
      </div>
    </Page>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <div>
        <p className="text-[11px] text-ink-muted">{label}</p>
        <p className="stat-figure text-[20px] font-semibold leading-tight text-ink">{value}</p>
      </div>
    </div>
  );
}
