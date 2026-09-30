"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listPlans, createPlan } from "@/lib/insights/members";
import { getAnalyticsOverview } from "@/lib/insights/analytics";
import { useTenant } from "@/lib/tenant-context";
import type { Database } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/format";

type MembershipPlanRow = Database["public"]["Tables"]["membership_plans"]["Row"];
type PlanDistribution = Awaited<ReturnType<typeof getAnalyticsOverview>>["planDistribution"];
import { PageHeader } from "@/components/page-header";
import { Reveal, Item, Page, Lift, Spotlight, CountUp } from "@/components/motion";
import { Pill, Drawer, Labelled } from "@/components/ui";

const CYCLES = ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"];
const DAYS: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365, ONE_TIME: 30 };
const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function PlansPage() {
  const { tenant } = useTenant();
  const [plans, setPlans] = useState<MembershipPlanRow[]>([]);
  const [dist, setDist] = useState<PlanDistribution>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", priceRupees: 1999, billingCycle: "MONTHLY" });

  useEffect(() => {
    const supabase = createClient();
    listPlans(supabase).then(setPlans);
    getAnalyticsOverview(supabase).then((a) => setDist(a.planDistribution));
  }, []);

  async function create() {
    if (!tenant) return;
    await createPlan(createClient(), tenant.id, {
      name: form.name,
      description: form.description || undefined,
      price_cents: Math.round(form.priceRupees * 100),
      billing_cycle: form.billingCycle as Database["public"]["Enums"]["billing_cycle"],
    });
    setOpen(false);
    listPlans(createClient()).then(setPlans);
  }

  const most = dist[0]?.name;

  return (
    <Page>
      <PageHeader title="Plans" subtitle="What you sell, and how it's selling" actions={<button onClick={() => setOpen(true)} className="btn-brand"><Plus size={15} strokeWidth={2.4} /> New plan</button>} />
      <div className="p-6 lg:px-10">
        <Reveal className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => {
            const count = dist.find((d) => d.name === p.name)?.count ?? 0;
            const hero = p.name === most;
            return (
              <Item key={p.id}>
                <Lift>
                  <Spotlight className={`${hero ? "card-hero" : "card-glass"} flex h-full flex-col p-6`}>
                    <div className="flex items-start justify-between">
                      <Pill tone={hero ? "brand" : "muted"}>{humanize(p.billing_cycle)}</Pill>
                      {hero && <Pill tone="brand" icon={<Check size={11} />}>Most popular</Pill>}
                    </div>
                    <h2 className="mt-4 text-[18px] font-semibold text-ink">{p.name}</h2>
                    <p className="mt-1 min-h-[32px] text-xs text-ink-secondary">{p.description ?? `${DAYS[p.billing_cycle]} days of access`}</p>
                    <p className="stat-figure mt-5 text-[38px] font-semibold leading-none text-ink">{formatCurrency(p.price_cents)}</p>
                    <p className="mt-1 text-xs text-ink-muted">≈ {formatCurrency(Math.round(p.price_cents / DAYS[p.billing_cycle]))} / day · {DAYS[p.billing_cycle]} days</p>
                    <div className="mt-auto flex items-end justify-between border-t pt-4" style={{ borderColor: hero ? "rgba(255,106,31,0.25)" : "var(--hairline)" }}>
                      <div><p className="text-[11px] text-ink-muted">Active members</p><p className="stat-figure text-[24px] font-semibold text-ink"><CountUp value={count} /></p></div>
                      <div className="text-right"><p className="text-[11px] text-ink-muted">Monthly value</p><p className="text-[15px] font-semibold text-ink">{formatCurrency(Math.round((p.price_cents * count) / (DAYS[p.billing_cycle] / 30)))}</p></div>
                    </div>
                  </Spotlight>
                </Lift>
              </Item>
            );
          })}
        </Reveal>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="New membership plan" footer={<div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button><button onClick={create} disabled={!form.name} className="btn-brand">Create plan</button></div>}>
        <div className="space-y-4">
          <Labelled label="Name *"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Labelled>
          <Labelled label="Description"><input className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Price (₹)"><input type="number" min={0} className="field" value={form.priceRupees} onChange={(e) => setForm({ ...form, priceRupees: Number(e.target.value) })} /></Labelled>
            <Labelled label="Billing cycle"><select className="field" value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>{CYCLES.map((c) => <option key={c} value={c}>{humanize(c)} · {DAYS[c]} days</option>)}</select></Labelled>
          </div>
        </div>
      </Drawer>
    </Page>
  );
}
