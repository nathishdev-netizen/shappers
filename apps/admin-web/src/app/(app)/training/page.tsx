"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, CheckCircle2, XCircle, Clock, Dumbbell } from "lucide-react";
import { api, type PtSessionDto, type PtPackageDto, type StaffDto, type MemberDto } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Reveal, Item, Page, Bar, CountUp, Lift } from "@/components/motion";
import { Avatar, Pill, PillTabs, Drawer, Labelled, Empty, Toast } from "@/components/ui";

type View = "agenda" | "packages";

export default function TrainingPage() {
  const [view, setView] = useState<View>("agenda");
  const [sessions, setSessions] = useState<PtSessionDto[]>([]);
  const [packages, setPackages] = useState<PtPackageDto[]>([]);
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [trainerFilter, setTrainerFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [openPkg, setOpenPkg] = useState(false);
  const [openSess, setOpenSess] = useState(false);
  const [pkgForm, setPkgForm] = useState({ memberId: "", trainerId: "", sessionsPurchased: 8, priceRupees: 6400 });
  const [sessForm, setSessForm] = useState({ packageId: "", date: "", time: "07:00", focus: "", durationMinutes: 60 });

  useEffect(() => { load(); api.getStaff().then(setStaff); api.getMembers().then(setMembers); }, []);
  async function load() {
    const [s, p] = await Promise.all([api.getPtSessions(), api.getPtPackages()]);
    setSessions(s); setPackages(p);
  }

  const trainers = staff.filter((s) => s.role === "TRAINER");
  const filtered = useMemo(() => trainerFilter ? sessions.filter((s) => s.trainer?.id === trainerFilter) : sessions, [sessions, trainerFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, PtSessionDto[]>();
    for (const s of filtered) { const k = s.scheduledAt.slice(0, 10); map.set(k, [...(map.get(k) ?? []), s]); }
    return [...map.entries()].sort();
  }, [filtered]);

  async function mark(s: PtSessionDto, status: PtSessionDto["status"]) {
    await api.updateSession(s.id, { status });
    setToast(`${s.member.firstName}'s session marked ${status.toLowerCase().replace("_", " ")}`);
    setTimeout(() => setToast(null), 2000);
    load();
  }

  async function createPackage() {
    await api.createPtPackage({ memberId: pkgForm.memberId, trainerId: pkgForm.trainerId || undefined, sessionsPurchased: pkgForm.sessionsPurchased, priceCents: Math.round(pkgForm.priceRupees * 100) });
    setOpenPkg(false); load();
  }

  async function schedule() {
    await api.scheduleSession({ packageId: sessForm.packageId, scheduledAt: new Date(`${sessForm.date}T${sessForm.time}:00`).toISOString(), focus: sessForm.focus || undefined, durationMinutes: sessForm.durationMinutes });
    setOpenSess(false); load();
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = sessions.filter((s) => s.scheduledAt.slice(0, 10) === todayKey && s.status === "SCHEDULED").length;
  const lowPackages = packages.filter((p) => p.remaining <= 2 && p.remaining >= 0);

  return (
    <Page>
      <PageHeader title="Personal Training" subtitle="Who is training whom, and when" actions={
        <div className="flex gap-2">
          <button onClick={() => setOpenSess(true)} className="btn-ghost"><Clock size={15} /> Schedule session</button>
          <button onClick={() => setOpenPkg(true)} className="btn-brand"><Plus size={15} strokeWidth={2.4} /> Sell PT package</button>
        </div>
      } />

      <div className="space-y-5 p-6 lg:px-10">
        <Reveal className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Item><div className="card-hero p-5"><p className="text-xs text-ink-secondary">Sessions today</p><p className="stat-figure mt-1 text-[34px] font-semibold text-ink"><CountUp value={todayCount} /></p></div></Item>
          <Item><div className="card p-5"><p className="text-xs text-ink-secondary">Upcoming (14 days)</p><p className="stat-figure mt-1 text-[34px] font-semibold text-ink"><CountUp value={sessions.filter((s) => s.status === "SCHEDULED").length} /></p></div></Item>
          <Item><div className="card p-5"><p className="text-xs text-ink-secondary">Active packages</p><p className="stat-figure mt-1 text-[34px] font-semibold text-ink"><CountUp value={packages.filter((p) => p.remaining > 0).length} /></p></div></Item>
          <Item><div className="card p-5"><p className="text-xs text-ink-secondary">Running low</p><p className="stat-figure mt-1 text-[34px] font-semibold" style={{ color: lowPackages.length ? "var(--status-warning)" : "var(--ink)" }}><CountUp value={lowPackages.length} /></p><p className="text-xs text-ink-muted">≤ 2 sessions left — upsell moment</p></div></Item>
        </Reveal>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <PillTabs tabs={[{ value: "agenda" as View, label: "Agenda" }, { value: "packages" as View, label: "Packages", count: packages.length }]} value={view} onChange={setView} />
          {view === "agenda" && (
            <select className="field !w-auto" value={trainerFilter} onChange={(e) => setTrainerFilter(e.target.value)}>
              <option value="">All trainers</option>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          )}
        </div>

        {view === "agenda" ? (
          byDay.length === 0 ? <div className="card-glass"><Empty>No sessions scheduled.</Empty></div> : (
            <Reveal className="space-y-5">
              {byDay.map(([day, list]) => (
                <Item key={day}>
                  <div className="card-glass p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <p className="text-[13px] font-semibold text-ink">{day === todayKey ? "Today" : formatDate(day)}</p>
                      <span className="text-xs text-ink-muted">{list.length} session{list.length === 1 ? "" : "s"}</span>
                    </div>
                    <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {list.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface-sunken)" }}>
                          <span className="flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-lg text-[12px] font-semibold" style={{ backgroundColor: s.status === "SCHEDULED" ? "var(--brand-soft)" : "var(--surface-raised)", color: s.status === "SCHEDULED" ? "var(--brand)" : "var(--ink-muted)" }}>
                            {new Date(s.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }).replace(" ", "")}
                            <span className="text-[9px] font-normal opacity-70">{s.durationMinutes}m</span>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-ink">{s.member.firstName} {s.member.lastName}</p>
                            <p className="truncate text-xs text-ink-muted">{s.focus ?? "Session"} · {s.trainer ? s.trainer.firstName : "Unassigned"}</p>
                          </div>
                          {s.status === "SCHEDULED" ? (
                            <div className="flex shrink-0 gap-1">
                              <button title="Completed" onClick={() => mark(s, "COMPLETED")} className="rounded-lg p-1.5 hover:bg-white/5" style={{ color: "var(--status-good)" }}><CheckCircle2 size={17} /></button>
                              <button title="No-show" onClick={() => mark(s, "NO_SHOW")} className="rounded-lg p-1.5 hover:bg-white/5" style={{ color: "var(--status-critical)" }}><XCircle size={17} /></button>
                            </div>
                          ) : <Pill tone={s.status === "COMPLETED" ? "good" : "critical"}>{s.status === "NO_SHOW" ? "No-show" : s.status.toLowerCase()}</Pill>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Item>
              ))}
            </Reveal>
          )
        ) : (
          <Reveal className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {packages.map((p) => (
              <Item key={p.id}>
                <Lift>
                  <div className="card-glass p-5">
                    <div className="flex items-center gap-3">
                      <Avatar first={p.member.firstName} last={p.member.lastName} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-semibold text-ink">{p.member.firstName} {p.member.lastName}</p>
                        <p className="truncate text-xs text-ink-muted">{p.trainer ? `with ${p.trainer.firstName}` : "No trainer"} · {formatCurrency(p.priceCents)}</p>
                      </div>
                      {p.remaining <= 2 && <Pill tone="warning">Low</Pill>}
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <p className="stat-figure text-[30px] font-semibold leading-none text-ink">{p.remaining}<span className="unit ml-1">/ {p.sessionsPurchased} left</span></p>
                      <p className="text-xs text-ink-muted">{p.used} done · {p.scheduled} booked</p>
                    </div>
                    <div className="mt-3"><Bar value={p.used / p.sessionsPurchased} /></div>
                    {p.expiresAt && <p className="mt-2 text-xs text-ink-muted">Expires {formatDate(p.expiresAt)}</p>}
                  </div>
                </Lift>
              </Item>
            ))}
          </Reveal>
        )}
      </div>

      <Drawer open={openPkg} onClose={() => setOpenPkg(false)} title="Sell a PT package" footer={<div className="flex justify-end gap-2"><button onClick={() => setOpenPkg(false)} className="btn-ghost">Cancel</button><button onClick={createPackage} disabled={!pkgForm.memberId} className="btn-brand">Create package</button></div>}>
        <div className="space-y-4">
          <Labelled label="Member *"><select className="field" value={pkgForm.memberId} onChange={(e) => setPkgForm({ ...pkgForm, memberId: e.target.value })}><option value="">Choose…</option>{members.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}</select></Labelled>
          <Labelled label="Trainer"><select className="field" value={pkgForm.trainerId} onChange={(e) => setPkgForm({ ...pkgForm, trainerId: e.target.value })}><option value="">Assign later</option>{trainers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}</select></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Sessions"><input type="number" min={1} className="field" value={pkgForm.sessionsPurchased} onChange={(e) => setPkgForm({ ...pkgForm, sessionsPurchased: Number(e.target.value) })} /></Labelled>
            <Labelled label="Price (₹)"><input type="number" min={0} className="field" value={pkgForm.priceRupees} onChange={(e) => setPkgForm({ ...pkgForm, priceRupees: Number(e.target.value) })} /></Labelled>
          </div>
          <p className="text-xs text-ink-muted">₹{pkgForm.sessionsPurchased ? Math.round(pkgForm.priceRupees / pkgForm.sessionsPurchased).toLocaleString("en-IN") : 0} per session</p>
        </div>
      </Drawer>

      <Drawer open={openSess} onClose={() => setOpenSess(false)} title="Schedule a session" footer={<div className="flex justify-end gap-2"><button onClick={() => setOpenSess(false)} className="btn-ghost">Cancel</button><button onClick={schedule} disabled={!sessForm.packageId || !sessForm.date} className="btn-brand">Book it</button></div>}>
        <div className="space-y-4">
          <Labelled label="Package *"><select className="field" value={sessForm.packageId} onChange={(e) => setSessForm({ ...sessForm, packageId: e.target.value })}><option value="">Choose…</option>{packages.filter((p) => p.remaining - p.scheduled > 0).map((p) => <option key={p.id} value={p.id}>{p.member.firstName} {p.member.lastName} — {p.remaining - p.scheduled} bookable</option>)}</select></Labelled>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Date *"><input type="date" className="field" value={sessForm.date} onChange={(e) => setSessForm({ ...sessForm, date: e.target.value })} /></Labelled>
            <Labelled label="Time"><input type="time" className="field" value={sessForm.time} onChange={(e) => setSessForm({ ...sessForm, time: e.target.value })} /></Labelled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Focus"><input className="field" placeholder="e.g. Lower body" value={sessForm.focus} onChange={(e) => setSessForm({ ...sessForm, focus: e.target.value })} /></Labelled>
            <Labelled label="Duration (min)"><input type="number" min={15} step={15} className="field" value={sessForm.durationMinutes} onChange={(e) => setSessForm({ ...sessForm, durationMinutes: Number(e.target.value) })} /></Labelled>
          </div>
        </div>
      </Drawer>
      <Toast message={toast} />
    </Page>
  );
}
