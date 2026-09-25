"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, Receipt } from "lucide-react";
import { api, type InvoiceRowDto } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Reveal, Item, Page, CountUp } from "@/components/motion";
import { Avatar, Pill, PillTabs, Th, Td, Empty } from "@/components/ui";

type Tab = "ALL" | "SUCCEEDED" | "PENDING" | "FAILED";
const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRowDto[]>([]);
  const [tab, setTab] = useState<Tab>("ALL");

  useEffect(() => { api.getInvoices().then(setRows); }, []);

  const visible = useMemo(() => tab === "ALL" ? rows : rows.filter((r) => r.status === tab), [rows, tab]);
  const collected = rows.filter((r) => r.status === "SUCCEEDED").reduce((t, r) => t + r.amountCents, 0);
  const pending = rows.filter((r) => r.status === "PENDING" || r.status === "FAILED").reduce((t, r) => t + r.amountCents, 0);
  const monthCollected = rows.filter((r) => r.status === "SUCCEEDED" && r.paidAt && new Date(r.paidAt).getMonth() === new Date().getMonth()).reduce((t, r) => t + r.amountCents, 0);

  return (
    <Page>
      <PageHeader title="Invoices" subtitle="Every payment, receipt and outstanding balance" />
      <div className="space-y-5 p-6 lg:px-10">
        <Reveal className="grid gap-4 sm:grid-cols-3">
          <Item><div className="card-hero p-5"><p className="text-xs text-ink-secondary">Collected this month</p><p className="stat-figure mt-1 text-[32px] font-semibold text-ink"><CountUp value={monthCollected / 100} format={(v) => formatCurrency(Math.round(v) * 100)} /></p></div></Item>
          <Item><div className="card p-5"><p className="text-xs text-ink-secondary">Outstanding</p><p className="stat-figure mt-1 text-[32px] font-semibold" style={{ color: pending ? "var(--status-critical)" : "var(--ink)" }}><CountUp value={pending / 100} format={(v) => formatCurrency(Math.round(v) * 100)} /></p></div></Item>
          <Item><div className="card p-5"><p className="text-xs text-ink-secondary">All-time collected</p><p className="stat-figure mt-1 text-[32px] font-semibold text-ink"><CountUp value={collected / 100} format={(v) => formatCurrency(Math.round(v) * 100)} /></p></div></Item>
        </Reveal>

        <div className="card-glass overflow-hidden">
          <div className="border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
            <PillTabs tabs={[{ value: "ALL" as Tab, label: "All", count: rows.length }, { value: "SUCCEEDED" as Tab, label: "Paid" }, { value: "PENDING" as Tab, label: "Pending" }, { value: "FAILED" as Tab, label: "Failed" }]} value={tab} onChange={setTab} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom: "1px solid var(--hairline)" }}><Th>Invoice</Th><Th>Member</Th><Th>Plan</Th><Th>Method</Th><Th>Date</Th><Th>Status</Th><Th right>Amount</Th></tr></thead>
              <tbody>
                {visible.map((r) => {
                  const Icon = r.status === "SUCCEEDED" ? CheckCircle2 : r.status === "PENDING" ? Clock : XCircle;
                  const tone = r.status === "SUCCEEDED" ? "good" : r.status === "PENDING" ? "warning" : "critical";
                  return (
                    <tr key={r.id} className="table-row">
                      <Td><span className="flex items-center gap-2 font-mono text-xs text-ink-secondary"><Receipt size={13} className="text-ink-muted" />{r.invoiceNumber ?? "—"}</span></Td>
                      <Td><Link href={`/members/${r.subscription.member.id}`} className="flex items-center gap-2.5 hover:underline"><Avatar first={r.subscription.member.firstName} last={r.subscription.member.lastName} size={30} /><span className="font-medium">{r.subscription.member.firstName} {r.subscription.member.lastName}</span></Link></Td>
                      <Td><span className="text-ink-secondary">{r.subscription.membershipPlan.name}</span></Td>
                      <Td><span className="text-ink-secondary">{r.method ? (r.method === "UPI" ? "UPI" : humanize(r.method)) : "—"}</span></Td>
                      <Td><span className="text-ink-secondary">{r.paidAt ? formatDate(r.paidAt) : r.dueAt ? `Due ${formatDate(r.dueAt)}` : formatDate(r.createdAt)}</span></Td>
                      <Td><Pill tone={tone} icon={<Icon size={11} />}>{humanize(r.status)}</Pill></Td>
                      <Td right><span className="font-semibold tabular-nums">{formatCurrency(r.amountCents)}</span></Td>
                    </tr>
                  );
                })}
                {visible.length === 0 && <tr><td colSpan={7}><Empty>Nothing here.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Page>
  );
}
