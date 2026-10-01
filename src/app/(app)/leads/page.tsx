"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Phone, CalendarClock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listLeads, createLead, updateLead, type LeadRow } from "@/lib/insights/leads";
import { listPlans, listStaff } from "@/lib/insights/members";
import { useTenant } from "@/lib/tenant-context";
import type { Database } from "@/lib/supabase/types";
import { formatCurrency, formatDate } from "@/lib/format";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type MembershipPlanRow = Database["public"]["Tables"]["membership_plans"]["Row"];
type StaffRow = Database["public"]["Tables"]["profiles"]["Row"];
import { PageHeader } from "@/components/page-header";
import { Reveal, Item, Page, CountUp } from "@/components/motion";
import { Avatar, Pill, PillTabs, Drawer, Labelled, Th, Td, Empty, Toast } from "@/components/ui";

const STAGES: { value: LeadStatus; label: string; tone: "brand" | "warning" | "good" | "critical" | "muted" }[] = [
  { value: "NEW", label: "New", tone: "brand" },
  { value: "CONTACTED", label: "Contacted", tone: "warning" },
  { value: "TRIAL", label: "Trial", tone: "good" },
  { value: "CONVERTED", label: "Converted", tone: "good" },
  { value: "LOST", label: "Lost", tone: "muted" },
];

const SOURCES = ["WALK_IN", "WEBSITE", "INSTAGRAM", "REFERRAL", "PHONE", "OTHER"];
const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function LeadsPage() {
  const { tenant } = useTenant();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [funnel, setFunnel] = useState<{ status: LeadStatus; count: number }[]>([]);
  const [plans, setPlans] = useState<MembershipPlanRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [tab, setTab] = useState<LeadStatus | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", source: "WALK_IN", interestedPlanId: "", assignedTrainerId: "", notes: "", followUpAt: "" });

  useEffect(() => {
    const supabase = createClient();
    load();
    listPlans(supabase).then(setPlans);
    listStaff(supabase).then(setStaff);
  }, []);
  async function load() { const r = await listLeads(createClient()); setLeads(r.leads); setFunnel(r.funnel); }

  const visible = useMemo(() => (tab === "ALL" ? leads : leads.filter((l) => l.status === tab)), [leads, tab]);
  const total = funnel.reduce((t, f) => t + f.count, 0);
  const converted = funnel.find((f) => f.status === "CONVERTED")?.count ?? 0;

  async function advance(lead: LeadRow, status: LeadStatus) {
    await updateLead(createClient(), lead.id, { status });
    setToast(`${lead.first_name} moved to ${humanize(status)}`);
    setTimeout(() => setToast(null), 2000);
    load();
  }

  async function create() {
    if (!tenant) return;
    await createLead(createClient(), {
      tenant_id: tenant.id,
      first_name: form.firstName,
      last_name: form.lastName,
      phone: form.phone,
      email: form.email || undefined,
      source: form.source as Database["public"]["Enums"]["lead_source"],
      interested_plan_id: form.interestedPlanId || undefined,
      assigned_trainer_id: form.assignedTrainerId || undefined,
      notes: form.notes || undefined,
      follow_up_at: form.followUpAt ? new Date(form.followUpAt).toISOString() : undefined,
    });
    setOpen(false);
    setForm({ firstName: "", lastName: "", phone: "", email: "", source: "WALK_IN", interestedPlanId: "", assignedTrainerId: "", notes: "", followUpAt: "" });
    load();
  }

  return (
    <Page>
      <PageHeader title="Leads" subtitle="Everyone who has enquired but not yet joined" actions={<button onClick={() => setOpen(true)} className="btn-brand"><Plus size={15} strokeWidth={2.4} /> Add lead</button>} />

      <div className="space-y-5 p-6 lg:px-10">
        <Reveal className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <Item><div className="card-hero p-5"><p className="text-xs text-ink-secondary">Conversion rate</p><p className="stat-figure mt-1 text-[32px] font-semibold text-ink"><CountUp value={total ? Math.round((converted / total) * 100) : 0} />%</p></div></Item>
          {STAGES.map((s) => {
            const n = funnel.find((f) => f.status === s.value)?.count ?? 0;
            return (
              <Item key={s.value}>
                <button onClick={() => setTab(s.value)} className="card w-full p-5 text-left transition-colors hover:border-[var(--hairline-strong)]">
                  <Pill tone={s.tone}>{s.label}</Pill>
                  <p className="stat-figure mt-3 text-[28px] font-semibold text-ink"><CountUp value={n} /></p>
                </button>
              </Item>
            );
          })}
        </Reveal>

        <div className="card-glass overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "var(--hairline)" }}>
            <PillTabs tabs={[{ value: "ALL" as const, label: "All", count: leads.length }, ...STAGES.map((s) => ({ value: s.value, label: s.label }))]} value={tab} onChange={setTab} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                <Th>Lead</Th><Th>Contact</Th><Th>Source</Th><Th>Interested plan</Th><Th>Assigned trainer</Th><Th>Follow-up</Th><Th>Status</Th><Th right>Move</Th>
              </tr></thead>
              <tbody>
                {visible.map((l) => {
                  const idx = STAGES.findIndex((s) => s.value === l.status);
                  const next = idx >= 0 && idx < 3 ? STAGES[idx + 1] : null;
                  return (
                    <tr key={l.id} className="table-row">
                      <Td><div className="flex items-center gap-3"><Avatar first={l.first_name} last={l.last_name} size={34} /><div><p className="font-medium">{l.first_name} {l.last_name}</p><p className="text-xs text-ink-muted">{l.branch?.name ?? "—"} · {formatDate(l.created_at)}</p></div></div></Td>
                      <Td><span className="flex items-center gap-1.5 text-ink-secondary"><Phone size={12} />{l.phone}</span></Td>
                      <Td><span className="text-ink-secondary">{humanize(l.source)}</span></Td>
                      <Td>{l.interested_plan ? <span>{l.interested_plan.name} <span className="text-ink-muted">· {formatCurrency(l.interested_plan.price_cents)}</span></span> : <span className="text-ink-muted">—</span>}</Td>
                      <Td>{l.assigned_trainer ? `${l.assigned_trainer.first_name} ${l.assigned_trainer.last_name}` : <span className="text-ink-muted">Unassigned</span>}</Td>
                      <Td>{l.follow_up_at ? <span className="flex items-center gap-1.5 text-ink-secondary"><CalendarClock size={12} />{formatDate(l.follow_up_at)}</span> : <span className="text-ink-muted">—</span>}</Td>
                      <Td><Pill tone={STAGES[idx]?.tone ?? "muted"}>{humanize(l.status)}</Pill></Td>
                      <Td right>
                        {next ? <button onClick={() => advance(l, next.value)} className="btn-ghost !py-1 !px-3 !text-xs">{next.label} <ArrowRight size={12} /></button>
                          : l.status !== "LOST" && l.status !== "CONVERTED" ? null : <span className="text-xs text-ink-muted">Closed</span>}
                        {idx >= 0 && idx < 3 && <button onClick={() => advance(l, "LOST")} className="ml-2 text-xs text-ink-muted hover:text-ink">Lost</button>}
                      </Td>
                    </tr>
                  );
                })}
                {visible.length === 0 && <tr><td colSpan={8}><Empty>No leads in this stage.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add a lead" subtitle="Capture the enquiry now, convert later"
        footer={<div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button><button onClick={create} disabled={!form.firstName || !form.lastName || !form.phone} className="btn-brand">Save lead</button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="First name *"><input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Labelled>
            <Labelled label="Last name *"><input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Labelled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Phone *"><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Labelled>
            <Labelled label="Email"><input className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Labelled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Source"><select className="field" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>{SOURCES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></Labelled>
            <Labelled label="Follow-up date"><input type="date" className="field" value={form.followUpAt} onChange={(e) => setForm({ ...form, followUpAt: e.target.value })} /></Labelled>
          </div>
          <Labelled label="Interested plan"><select className="field" value={form.interestedPlanId} onChange={(e) => setForm({ ...form, interestedPlanId: e.target.value })}><option value="">Not sure yet</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price_cents)}</option>)}</select></Labelled>
          <Labelled label="Assign to"><select className="field" value={form.assignedTrainerId} onChange={(e) => setForm({ ...form, assignedTrainerId: e.target.value })}><option value="">Unassigned</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.role.toLowerCase()}</option>)}</select></Labelled>
          <Labelled label="Notes"><textarea rows={3} className="field resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Labelled>
        </div>
      </Drawer>
      <Toast message={toast} />
    </Page>
  );
}
