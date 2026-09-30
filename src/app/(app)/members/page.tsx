"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, UserPlus, ChevronRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listMembers, listBranches, type MemberListRow } from "@/lib/insights/members";
import type { Database } from "@/lib/supabase/types";

type BranchRow = Database["public"]["Tables"]["branches"]["Row"];
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { AccessPill, ChurnPill } from "@/components/access-badge";
import { OnboardWizard } from "@/components/onboard-wizard";
import { Reveal, Item, Page, CountUp } from "@/components/motion";
import { Avatar, PillTabs, Th, Td, Empty } from "@/components/ui";

type Filter = "ALL" | "ACTIVE" | "EXPIRING" | "OVERDUE" | "AT_RISK";

export default function MembersPage() {
  return <Suspense><MembersInner /></Suspense>;
}

function MembersInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [members, setMembers] = useState<MemberListRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [branch, setBranch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    listBranches(createClient()).then(setBranches);
  }, []);
  useEffect(() => { setQuery(params.get("q") ?? ""); }, [params]);

  async function load() { setMembers(await listMembers(createClient())); setLoading(false); }

  const counts = useMemo(() => ({
    ALL: members.length,
    ACTIVE: members.filter((m) => m.access.allowed).length,
    EXPIRING: members.filter((m) => m.access.allowed && m.access.daysRemaining !== null && m.access.daysRemaining <= 7).length,
    OVERDUE: members.filter((m) => m.access.reason === "PAST_DUE" || m.access.reason === "EXPIRED").length,
    AT_RISK: members.filter((m) => m.churnRisk === "HIGH" || m.churnRisk === "MEDIUM").length,
  }), [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (q && !`${m.first_name} ${m.last_name} ${m.email} ${m.phone ?? ""}`.toLowerCase().includes(q)) return false;
      if (branch && m.branch?.id !== branch) return false;
      switch (filter) {
        case "ACTIVE": return m.access.allowed;
        case "EXPIRING": return m.access.allowed && m.access.daysRemaining !== null && m.access.daysRemaining <= 7;
        case "OVERDUE": return m.access.reason === "PAST_DUE" || m.access.reason === "EXPIRED";
        case "AT_RISK": return m.churnRisk === "HIGH" || m.churnRisk === "MEDIUM";
        default: return true;
      }
    });
  }, [members, query, filter, branch]);

  return (
    <Page>
      <PageHeader title="Members" subtitle={`${members.length} clients on the books`} search={false}
        actions={<button onClick={() => setDrawerOpen(true)} className="btn-brand"><UserPlus size={15} strokeWidth={2.4} /> Onboard client</button>} />

      <div className="space-y-5 p-6 lg:px-10">
        <Reveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {([["ALL", "Total", "var(--ink)"], ["ACTIVE", "Active", "var(--status-good)"], ["EXPIRING", "Expiring in 7d", "var(--status-warning)"], ["OVERDUE", "Overdue / expired", "var(--status-critical)"], ["AT_RISK", "At risk of leaving", "var(--status-critical)"]] as [Filter, string, string][]).map(([k, label, color]) => (
            <Item key={k}>
              <button onClick={() => setFilter(k)} className={`${k === "ALL" ? "card-hero" : "card"} w-full p-5 text-left transition-colors`} style={filter === k && k !== "ALL" ? { borderColor: "var(--brand)" } : undefined}>
                <p className="text-xs text-ink-secondary">{label}</p>
                <p className="stat-figure mt-1 text-[30px] font-semibold" style={{ color }}><CountUp value={counts[k]} /></p>
              </button>
            </Item>
          ))}
        </Reveal>

        <div className="card-glass overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
            <div className="relative min-w-[260px] flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email or phone" className="field !pl-9" />
            </div>
            <select className="field !w-auto" value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">All branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <PillTabs tabs={[{ value: "ALL" as Filter, label: "All" }, { value: "ACTIVE" as Filter, label: "Active" }, { value: "EXPIRING" as Filter, label: "Expiring" }, { value: "OVERDUE" as Filter, label: "Overdue" }, { value: "AT_RISK" as Filter, label: "At risk" }]} value={filter} onChange={setFilter} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                <Th>Member</Th><Th>Branch</Th><Th>Plan</Th><Th>Last visit</Th><Th>Access until</Th><Th right>Fee</Th><Th>Access</Th><Th>Retention</Th><Th><span className="sr-only">Open</span></Th>
              </tr></thead>
              <tbody>
                {filtered.map((m) => {
                  const sub = m.subscriptions?.[0];
                  const days = m.access.daysRemaining;
                  const since = m.visits.daysSinceLastVisit;
                  return (
                    <tr key={m.id} className="table-row cursor-pointer" onClick={() => router.push(`/members/${m.id}`)}>
                      <Td><div className="flex items-center gap-3"><Avatar first={m.first_name} last={m.last_name} size={36} /><div className="min-w-0"><p className="truncate font-medium">{m.first_name} {m.last_name}</p><p className="truncate text-xs text-ink-muted">{m.email}</p></div></div></Td>
                      <Td>{m.branch ? <span className="flex items-center gap-1.5 text-ink-secondary"><MapPin size={12} />{m.branch.name}</span> : <span className="text-ink-muted">—</span>}</Td>
                      <Td><span className="text-ink-secondary">{sub?.membership_plan?.name ?? "—"}</span></Td>
                      <Td>{since === null ? <span className="text-ink-muted">Never</span> : <span style={since >= 14 ? { color: "var(--status-critical)" } : undefined}>{since === 0 ? "Today" : `${since}d ago`}</span>}</Td>
                      <Td>{sub ? <span className="tabular-nums text-ink-secondary">{formatDate(sub.current_period_end)}{days !== null && days >= 0 && days <= 7 && <span className="ml-1.5 text-xs" style={{ color: "var(--status-warning)" }}>{days}d</span>}</span> : "—"}</Td>
                      <Td right><span className="font-semibold tabular-nums">{sub ? formatCurrency(sub.membership_plan!.price_cents) : "—"}</span></Td>
                      <Td><AccessPill access={m.access} /></Td>
                      <Td><ChurnPill risk={m.churnRisk} compact /></Td>
                      <Td><ChevronRight size={15} className="text-ink-muted" /></Td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && <tr><td colSpan={9}><Empty>{query ? `No members match "${query}".` : "No members in this view."}</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drawerOpen && <OnboardWizard onClose={() => setDrawerOpen(false)} onCreated={() => { setDrawerOpen(false); load(); }} />}
    </Page>
  );
}
