"use client";

import { useEffect, useState } from "react";
import { Plus, MapPin, Phone, Clock, Users, Contact, CalendarDays, UserPlus } from "lucide-react";
import { api, type BranchDto } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Reveal, Item, Page, Lift, Spotlight, CountUp, Ring } from "@/components/motion";
import { Pill, Drawer, Labelled } from "@/components/ui";

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", addressLine: "", city: "", phone: "", openingHours: "" });

  useEffect(() => { load(); }, []);
  const load = () => api.getBranches().then(setBranches);

  async function create() {
    await api.createBranch({ ...form, code: form.code || undefined, addressLine: form.addressLine || undefined, city: form.city || undefined, phone: form.phone || undefined, openingHours: form.openingHours || undefined } as never);
    setOpen(false); load();
  }

  const totalMembers = branches.reduce((t, b) => t + b._count.members, 0);

  return (
    <Page>
      <PageHeader title="Branches" subtitle={`${branches.length} locations · ${totalMembers} members across the network`} actions={<button onClick={() => setOpen(true)} className="btn-brand"><Plus size={15} strokeWidth={2.4} /> Add branch</button>} />
      <div className="p-6 lg:px-10">
        <Reveal className="grid gap-5 md:grid-cols-2">
          {branches.map((b, i) => {
            const share = totalMembers ? b._count.members / totalMembers : 0;
            return (
              <Item key={b.id}>
                <Lift>
                  <Spotlight className={`${i === 0 ? "card-hero" : "card-glass"} p-6`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-[20px] font-semibold tracking-tight text-ink">{b.name}</h2>
                          {b.code && <Pill tone="muted">{b.code}</Pill>}
                          {!b.isActive && <Pill tone="critical">Closed</Pill>}
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-secondary"><MapPin size={13} />{[b.addressLine, b.city].filter(Boolean).join(", ") || "Address not set"}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-muted">
                          {b.phone && <span className="flex items-center gap-1"><Phone size={11} />{b.phone}</span>}
                          {b.openingHours && <span className="flex items-center gap-1"><Clock size={11} />{b.openingHours}</span>}
                        </div>
                      </div>
                      <Ring value={share} size={84} stroke={8}>
                        <span className="stat-figure text-[18px] font-semibold text-ink">{Math.round(share * 100)}<span className="unit">%</span></span>
                      </Ring>
                    </div>

                    <div className="mt-6 grid grid-cols-4 gap-3 border-t pt-5" style={{ borderColor: i === 0 ? "rgba(255,106,31,0.25)" : "var(--hairline)" }}>
                      <Stat icon={<Users size={13} />} label="Members" value={b._count.members} />
                      <Stat icon={<Contact size={13} />} label="Staff" value={b._count.users} />
                      <Stat icon={<CalendarDays size={13} />} label="Classes" value={b._count.classes} />
                      <Stat icon={<UserPlus size={13} />} label="In today" value={b.checkInsToday} accent />
                    </div>
                  </Spotlight>
                </Lift>
              </Item>
            );
          })}
        </Reveal>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add a branch" footer={<div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button><button onClick={create} disabled={!form.name} className="btn-brand">Create branch</button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <Labelled label="Branch name *"><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Labelled>
            <Labelled label="Code"><input className="field" placeholder="IND" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Labelled>
          </div>
          <Labelled label="Address"><input className="field" value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} /></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="City"><input className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Labelled>
            <Labelled label="Phone"><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Labelled>
          </div>
          <Labelled label="Opening hours"><input className="field" placeholder="6:00am – 10:00pm" value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} /></Labelled>
        </div>
      </Drawer>
    </Page>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] text-ink-muted">{icon}{label}</p>
      <p className="stat-figure text-[24px] font-semibold" style={{ color: accent ? "var(--brand)" : "var(--ink)" }}><CountUp value={value} /></p>
    </div>
  );
}
