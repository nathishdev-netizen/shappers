"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Phone, Mail, Users, CalendarDays, Salad } from "lucide-react";
import { api, type StaffMemberDto, type BranchDto } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Reveal, Item, Page, Lift, Spotlight } from "@/components/motion";
import { Avatar, Pill, Drawer, Labelled, Toast } from "@/components/ui";

const ROLES = ["OWNER", "ADMIN", "STAFF", "TRAINER"];
const humanize = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMemberDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "TRAINER", phone: "", specialty: "", branchId: "" });

  useEffect(() => { load(); api.getBranches().then(setBranches); }, []);
  const load = () => api.listStaff().then(setStaff);

  async function create() {
    try {
      await api.createStaff({ ...form, branchId: form.branchId || undefined, phone: form.phone || undefined, specialty: form.specialty || undefined });
      setOpen(false); setToast(`${form.firstName} added to the team`); setTimeout(() => setToast(null), 2000);
      setForm({ firstName: "", lastName: "", email: "", password: "", role: "TRAINER", phone: "", specialty: "", branchId: "" });
      load();
    } catch (e) { setToast(e instanceof Error ? e.message : "Could not add staff"); setTimeout(() => setToast(null), 2500); }
  }

  async function toggle(s: StaffMemberDto) {
    await api.updateStaff(s.id, { isActive: !s.isActive });
    load();
  }

  const trainers = staff.filter((s) => s.role === "TRAINER");
  const admins = staff.filter((s) => s.role !== "TRAINER");

  return (
    <Page>
      <PageHeader title="Staff" subtitle={`${staff.filter((s) => s.isActive).length} active across ${branches.length} branches`} actions={<button onClick={() => setOpen(true)} className="btn-brand"><Plus size={15} strokeWidth={2.4} /> Add staff</button>} />

      <div className="space-y-8 p-6 lg:px-10">
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Trainers</h2>
          <Reveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {trainers.map((s) => <Item key={s.id}><StaffCard s={s} onToggle={() => toggle(s)} /></Item>)}
          </Reveal>
        </section>
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Management &amp; front desk</h2>
          <Reveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {admins.map((s) => <Item key={s.id}><StaffCard s={s} onToggle={() => toggle(s)} /></Item>)}
          </Reveal>
        </section>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} title="Add a staff member" subtitle="They'll be able to sign in immediately"
        footer={<div className="flex justify-end gap-2"><button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button><button onClick={create} disabled={!form.firstName || !form.lastName || !form.email || form.password.length < 8} className="btn-brand">Create account</button></div>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="First name *"><input className="field" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Labelled>
            <Labelled label="Last name *"><input className="field" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Labelled>
          </div>
          <Labelled label="Email *"><input type="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Labelled>
          <Labelled label="Temporary password *" hint="At least 8 characters — they can change it later"><input type="password" className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Role"><select className="field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}</select></Labelled>
            <Labelled label="Branch"><select className="field" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}><option value="">Any branch</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></Labelled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Phone"><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Labelled>
            <Labelled label="Specialty"><input className="field" placeholder="e.g. Strength, Yoga, Rehab" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></Labelled>
          </div>
        </div>
      </Drawer>
      <Toast message={toast} />
    </Page>
  );
}

function StaffCard({ s, onToggle }: { s: StaffMemberDto; onToggle: () => void }) {
  return (
    <Lift>
      <Spotlight className="card-glass h-full p-5" style={{ opacity: s.isActive ? 1 : 0.55 }}>
        <Link href={`/staff/${s.id}`} className="block">
        <div className="flex items-start gap-3">
          <Avatar first={s.firstName} last={s.lastName} size={46} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{s.firstName} {s.lastName}</p>
            <p className="truncate text-xs text-ink-secondary">{s.specialty ?? humanize(s.role)}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone={s.role === "TRAINER" ? "brand" : "muted"}>{humanize(s.role)}</Pill>
              {s.branch && <Pill tone="muted">{s.branch.name}</Pill>}
              {!s.isActive && <Pill tone="critical">Inactive</Pill>}
            </div>
          </div>
        </div>

        {s.role === "TRAINER" && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
            <Stat icon={<Users size={13} />} value={s.assignedClients} label="clients" />
            <Stat icon={<CalendarDays size={13} />} value={s.sessionsThisWeek} label="sessions/wk" />
            <Stat icon={<Salad size={13} />} value={s.activeDietPlans} label="diet plans" />
          </div>
        )}
        </Link>

        <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs" style={{ borderColor: "var(--hairline)" }}>
          <span className="flex items-center gap-3 text-ink-muted">
            {s.phone && <span className="flex items-center gap-1"><Phone size={11} />{s.phone}</span>}
            <span className="flex items-center gap-1"><Mail size={11} />{s.email}</span>
          </span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
            className="text-ink-muted hover:text-ink"
          >
            {s.isActive ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </Spotlight>
    </Lift>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] text-ink-muted">{icon}{label}</p>
      <p className="stat-figure text-[20px] font-semibold text-ink">{value}</p>
    </div>
  );
}
