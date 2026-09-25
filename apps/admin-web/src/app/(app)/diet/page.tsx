"use client";

import { useEffect, useState } from "react";
import { Plus, Flame, Beef, Wheat, Droplet } from "lucide-react";
import { api, type DietPlanDto, type MemberDto, type StaffDto, type Meal } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Reveal, Item, Page, Lift, Spotlight, CountUp } from "@/components/motion";
import { Avatar, Pill, Drawer, Labelled, Empty } from "@/components/ui";

const GOALS = ["FAT_LOSS", "MUSCLE_GAIN", "MAINTENANCE", "PERFORMANCE"];
const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

const TEMPLATE: Meal[] = [
  { time: "7:30 AM", name: "Breakfast", items: ["Oats", "Eggs", "Fruit"], calories: 500 },
  { time: "1:00 PM", name: "Lunch", items: ["Rice", "Protein 150g", "Vegetables"], calories: 650 },
  { time: "5:00 PM", name: "Pre-workout", items: ["Toast + peanut butter"], calories: 250 },
  { time: "8:00 PM", name: "Dinner", items: ["Protein 150g", "Roti", "Dal", "Salad"], calories: 600 },
];

export default function DietPage() {
  const [plans, setPlans] = useState<DietPlanDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [selected, setSelected] = useState<DietPlanDto | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ memberId: "", trainerId: "", title: "", goal: "MAINTENANCE", dailyCalories: 2000, proteinG: 130, carbsG: 220, fatG: 65, notes: "", meals: TEMPLATE });

  useEffect(() => { load(); api.getMembers().then(setMembers); api.getStaff().then(setStaff); }, []);
  const load = () => api.getDietPlans().then((p) => { setPlans(p); setSelected((s) => s ?? p[0] ?? null); });

  async function create() {
    await api.createDietPlan({ ...form, trainerId: form.trainerId || undefined, notes: form.notes || undefined });
    setOpen(false); load();
  }

  const active = plans.filter((p) => p.isActive);

  return (
    <Page>
      <PageHeader title="Diet Plans" subtitle="Nutrition plans your trainers have set" actions={<button onClick={() => setOpen(true)} className="btn-brand"><Plus size={15} strokeWidth={2.4} /> New plan</button>} />

      <div className="grid gap-5 p-6 lg:grid-cols-12 lg:px-10">
        <div className="space-y-4 lg:col-span-5">
          <Reveal className="grid grid-cols-2 gap-4">
            <Item><div className="card-hero p-5"><p className="text-xs text-ink-secondary">Active plans</p><p className="stat-figure mt-1 text-[32px] font-semibold text-ink"><CountUp value={active.length} /></p></div></Item>
            <Item><div className="card p-5"><p className="text-xs text-ink-secondary">Avg daily target</p><p className="stat-figure mt-1 text-[32px] font-semibold text-ink"><CountUp value={active.length ? Math.round(active.reduce((t, p) => t + (p.dailyCalories ?? 0), 0) / active.length) : 0} /><span className="unit ml-1">kcal</span></p></div></Item>
          </Reveal>

          <Reveal className="space-y-2">
            {plans.map((p) => (
              <Item key={p.id}>
                <Lift onClick={() => setSelected(p)} className="cursor-pointer">
                  <div className="card flex items-center gap-3 p-4" style={{ borderColor: selected?.id === p.id ? "var(--brand)" : undefined, opacity: p.isActive ? 1 : 0.6 }}>
                    <Avatar first={p.member?.firstName ?? "?"} last={p.member?.lastName ?? ""} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{p.member?.firstName} {p.member?.lastName}</p>
                      <p className="truncate text-xs text-ink-muted">{p.title} · {p.dailyCalories} kcal</p>
                    </div>
                    <Pill tone={p.goal === "FAT_LOSS" ? "warning" : p.goal === "MUSCLE_GAIN" ? "brand" : "muted"}>{humanize(p.goal)}</Pill>
                  </div>
                </Lift>
              </Item>
            ))}
            {plans.length === 0 && <div className="card"><Empty>No diet plans yet.</Empty></div>}
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          {selected ? (
            <Spotlight className="card-glass p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand)" }}>{humanize(selected.goal)}</p>
                  <h2 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">{selected.title}</h2>
                  <p className="mt-1 text-sm text-ink-secondary">
                    For {selected.member?.firstName} {selected.member?.lastName}
                    {selected.trainer && ` · set by ${selected.trainer.firstName} ${selected.trainer.lastName}`}
                    {` · from ${formatDate(selected.startDate)}`}
                  </p>
                </div>
                <Pill tone={selected.isActive ? "good" : "muted"}>{selected.isActive ? "Active" : "Archived"}</Pill>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3">
                <Macro icon={<Flame size={14} />} label="Calories" value={selected.dailyCalories} unit="kcal" accent />
                <Macro icon={<Beef size={14} />} label="Protein" value={selected.proteinG} unit="g" />
                <Macro icon={<Wheat size={14} />} label="Carbs" value={selected.carbsG} unit="g" />
                <Macro icon={<Droplet size={14} />} label="Fat" value={selected.fatG} unit="g" />
              </div>

              <div className="mt-6">
                <h3 className="mb-3 text-[13px] font-semibold text-ink">Daily meals</h3>
                <ol className="relative space-y-3">
                  <span className="absolute bottom-3 left-[68px] top-3 w-px" style={{ backgroundColor: "var(--hairline)" }} />
                  {(selected.meals as Meal[]).map((m, i) => (
                    <li key={i} className="flex gap-4">
                      <span className="w-[60px] shrink-0 whitespace-nowrap pt-1 text-right text-[11px] font-medium text-ink-muted">{m.time}</span>
                      <span className="relative z-10 mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: "var(--brand)", boxShadow: "0 0 8px var(--brand-glow)" }} />
                      <div className="min-w-0 flex-1 rounded-xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-sunken)" }}>
                        <div className="flex items-center justify-between"><p className="text-[13px] font-medium text-ink">{m.name}</p>{m.calories && <span className="text-xs text-ink-muted">{m.calories} kcal</span>}</div>
                        <p className="mt-1 text-xs text-ink-secondary">{m.items.join(" · ")}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {selected.notes && <p className="mt-5 rounded-xl p-3 text-xs text-ink-secondary" style={{ backgroundColor: "var(--brand-soft)" }}>{selected.notes}</p>}
            </Spotlight>
          ) : <div className="card-glass"><Empty>Select a plan to view it.</Empty></div>}
        </div>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="New diet plan" subtitle="Replaces the member's current active plan" width={540}
        footer={<div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button><button onClick={create} disabled={!form.memberId || !form.title} className="btn-brand">Save plan</button></div>}>
        <div className="space-y-4">
          <Labelled label="Member *"><select className="field" value={form.memberId} onChange={(e) => setForm({ ...form, memberId: e.target.value })}><option value="">Choose…</option>{members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}</select></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Title *"><input className="field" placeholder="e.g. Lean & Strong 8-week" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Labelled>
            <Labelled label="Goal"><select className="field" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>{GOALS.map((g) => <option key={g} value={g}>{humanize(g)}</option>)}</select></Labelled>
          </div>
          <Labelled label="Set by"><select className="field" value={form.trainerId} onChange={(e) => setForm({ ...form, trainerId: e.target.value })}><option value="">—</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></Labelled>
          <div className="grid grid-cols-4 gap-2">
            <Labelled label="kcal"><input type="number" className="field" value={form.dailyCalories} onChange={(e) => setForm({ ...form, dailyCalories: Number(e.target.value) })} /></Labelled>
            <Labelled label="Protein g"><input type="number" className="field" value={form.proteinG} onChange={(e) => setForm({ ...form, proteinG: Number(e.target.value) })} /></Labelled>
            <Labelled label="Carbs g"><input type="number" className="field" value={form.carbsG} onChange={(e) => setForm({ ...form, carbsG: Number(e.target.value) })} /></Labelled>
            <Labelled label="Fat g"><input type="number" className="field" value={form.fatG} onChange={(e) => setForm({ ...form, fatG: Number(e.target.value) })} /></Labelled>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-ink-secondary">Meals</p>
            <div className="space-y-2">
              {form.meals.map((m, i) => (
                <div key={i} className="grid grid-cols-[76px_1fr_2fr_64px] gap-2">
                  <input className="field !px-2" value={m.time} onChange={(e) => setForm({ ...form, meals: form.meals.map((x, j) => j === i ? { ...x, time: e.target.value } : x) })} />
                  <input className="field !px-2" value={m.name} onChange={(e) => setForm({ ...form, meals: form.meals.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                  <input className="field !px-2" placeholder="Items, comma separated" value={m.items.join(", ")} onChange={(e) => setForm({ ...form, meals: form.meals.map((x, j) => j === i ? { ...x, items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x) })} />
                  <input type="number" className="field !px-2" value={m.calories ?? ""} onChange={(e) => setForm({ ...form, meals: form.meals.map((x, j) => j === i ? { ...x, calories: Number(e.target.value) || undefined } : x) })} />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setForm({ ...form, meals: [...form.meals, { time: "", name: "", items: [] }] })} className="mt-2 text-xs text-ink-secondary hover:text-ink">+ Add meal</button>
          </div>
          <Labelled label="Notes"><textarea rows={2} className="field resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Labelled>
        </div>
      </Drawer>
    </Page>
  );
}

function Macro({ icon, label, value, unit, accent }: { icon: React.ReactNode; label: string; value: number | null; unit: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: accent ? "rgba(255,106,31,0.35)" : "var(--hairline)", backgroundColor: accent ? "var(--brand-soft)" : "var(--surface-sunken)" }}>
      <p className="flex items-center gap-1 text-[11px] text-ink-muted">{icon}{label}</p>
      <p className="stat-figure mt-1 text-[22px] font-semibold leading-none" style={{ color: accent ? "var(--brand)" : "var(--ink)" }}>{value ?? "—"}<span className="unit ml-1">{unit}</span></p>
    </div>
  );
}
