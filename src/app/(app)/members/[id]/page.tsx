"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Mail, MapPin, Briefcase, Cake, IdCard, HeartPulse, AlertTriangle,
  ShieldCheck, Dumbbell, Target, Ruler, StickyNote, CalendarClock, Snowflake, Wallet,
  TrendingDown, TrendingUp, Clock, CheckCircle2, XCircle, CreditCard, UserRound, Pin,
  ScanLine, Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMember, checkInMember, recordPayment, addMemberNote, type MemberDetail, type Meal } from "@/lib/insights/members";
import type { TimelineEvent } from "@/lib/insights/member-insights";
import type { Database } from "@/lib/supabase/types";
import { useTenant } from "@/lib/tenant-context";
import { formatCurrency, formatDate, initials } from "@/lib/format";
import { AccessPill, ChurnPill, accessMeta } from "@/components/access-badge";
import { Drawer, Labelled, Pill, Toast } from "@/components/ui";
import { Bar, Ring, Reveal, Item } from "@/components/motion";
import { Salad } from "lucide-react";

const TABS = ["Membership & fees", "Training & diet", "Attendance", "Health & safety", "Progress", "Notes", "Overview"] as const;
type Tab = (typeof TABS)[number];

export default function MemberProfilePage({ params }: PageProps<"/members/[id]">) {
  const { id } = use(params);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [tab, setTab] = useState<Tab>("Membership & fees");
  const [notFound, setNotFound] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    getMember(createClient(), id).then(setMember).catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (notFound) {
    return (
      <div className="p-10">
        <p className="text-sm text-ink-secondary">That member could not be found.</p>
        <Link href="/members" className="mt-2 inline-block text-sm underline">Back to members</Link>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-4 p-6 lg:p-10">
        <div className="h-32 animate-pulse rounded-2xl border border-hairline bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl border border-hairline bg-surface" />
      </div>
    );
  }

  return (
    <>
      <MemberHeader
        member={member}
        onRecordPayment={() => setPayOpen(true)}
        onCheckedIn={(msg) => {
          setToast(msg);
          setTimeout(() => setToast(null), 3000);
          load();
        }}
      />
      <RecordPaymentDrawer member={member} open={payOpen} onClose={() => setPayOpen(false)} onDone={async (msg) => {
        setPayOpen(false); setToast(msg); setTimeout(() => setToast(null), 3000);
        setMember(await getMember(createClient(), member.id));
      }} />
      <Toast message={toast} />

      <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-hairline bg-surface px-6 lg:px-10">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative whitespace-nowrap px-3 py-3 text-sm transition-colors"
            style={{ color: tab === t ? "var(--ink)" : "var(--ink-muted)" }}
          >
            {t}
            {tab === t && (
              <span
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full"
                style={{ backgroundColor: "var(--brand)" }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-6 lg:p-10">
        {tab === "Overview" && <OverviewTab member={member} />}
        {tab === "Membership & fees" && <MembershipTab member={member} />}
        {tab === "Training & diet" && <TrainingTab member={member} />}
        {tab === "Attendance" && <AttendanceTab member={member} />}
        {tab === "Health & safety" && <HealthTab member={member} />}
        {tab === "Progress" && <ProgressTab member={member} />}
        {tab === "Notes" && <NotesTab member={member} onChange={setMember} />}
      </div>
    </>
  );
}

/** Header carries the two questions staff ask first: can they get in, and are they slipping away. */
function MemberHeader({
  member, onRecordPayment, onCheckedIn,
}: {
  member: MemberDetail;
  onRecordPayment: () => void;
  onCheckedIn: (msg: string) => void;
}) {
  const meta = accessMeta(member.access.reason);
  const { daysRemaining } = member.access;

  return (
    <header className="border-b border-hairline bg-surface px-6 pb-6 pt-6 lg:px-10">
      <Link
        href="/members"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        All members
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand) 12%, transparent)",
              color: "var(--brand-on-tint)",
            }}
          >
            {initials(member.first_name, member.last_name)}
          </span>
          <div>
            <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-ink">
              {member.first_name} {member.last_name}
              {member.member_code && (
                <span className="rounded-md px-1.5 py-0.5 font-mono text-[12px] font-medium" style={{ backgroundColor: "var(--surface-sunken)", color: "var(--ink-secondary)" }}>
                  {member.member_code}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Member since {formatDate(member.created_at)}
              {member.assigned_trainer && ` · Trainer: ${member.assigned_trainer.first_name} ${member.assigned_trainer.last_name}`}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <AccessPill access={member.access} />
              <ChurnPill risk={member.churnRisk} />
            </div>
          </div>
        </div>

        {/* The headline answer: how much longer can this person train here. */}
        <div
          className="min-w-[230px] rounded-xl border p-4"
          style={{
            borderColor: `color-mix(in srgb, ${meta.color} 30%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${meta.color} 6%, transparent)`,
          }}
        >
          <p className="text-xs text-ink-secondary">Gym access</p>
          {member.access.allowed && daysRemaining !== null ? (
            <>
              <p className="mt-1 text-2xl font-semibold leading-none" style={{ color: meta.color }}>
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
              </p>
              <p className="mt-1.5 text-xs text-ink-secondary">
                Valid until {member.access.validUntil && formatDate(member.access.validUntil)}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 text-xl font-semibold leading-tight" style={{ color: meta.color }}>
                {meta.label}
              </p>
              <p className="mt-1.5 text-xs text-ink-secondary">
                {member.access.reason === "FROZEN" && member.access.frozenUntil
                  ? `On hold until ${formatDate(member.access.frozenUntil)}`
                  : member.access.validUntil
                    ? `Lapsed ${formatDate(member.access.validUntil)}`
                    : meta.hint}
              </p>
            </>
          )}
          {member.outstandingCents > 0 && (
            <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-hairline pt-2.5">
              <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--status-critical)" }}>
                <Wallet size={14} strokeWidth={2.2} />
                {formatCurrency(member.outstandingCents)} due
              </p>
              <button onClick={onRecordPayment} className="btn-brand !py-1 !px-3 !text-xs">Record payment</button>
            </div>
          )}

          <CheckInPanel member={member} onCheckedIn={onCheckedIn} />
        </div>
      </div>
    </header>
  );
}

/**
 * Check-in where the member already is, rather than back on the attendance list.
 * Shows the three things a receptionist needs before waving someone through —
 * how long they have left, when they last came, how often lately — so the
 * decision and the action are in the same place.
 */
function CheckInPanel({
  member, onCheckedIn,
}: { member: MemberDetail; onCheckedIn: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The API returns today's events already; a second tap would just log a duplicate.
  const today = new Date().toDateString();
  const alreadyIn = member.attendance_events.some(
    (e) => new Date(e.checked_in_at).toDateString() === today,
  );

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      await checkInMember(createClient(), member.id);
      onCheckedIn(`${member.first_name} checked in`);
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed.");
    } finally {
      setBusy(false);
    }
  }

  const since = member.visits.daysSinceLastVisit;

  return (
    <div className="mt-2.5 border-t border-hairline pt-3">
      <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
        <span>
          Last visit{" "}
          <strong className="font-semibold text-ink">
            {since === null ? "never" : since === 0 ? "today" : `${since}d ago`}
          </strong>
        </span>
        <span>
          <strong className="font-semibold text-ink">{member.visits.visitsLast30}</strong> visits / 30d
        </span>
      </div>

      {error && (
        <p className="mt-2 text-xs" style={{ color: "var(--status-critical)" }}>{error}</p>
      )}

      {alreadyIn ? (
        <p
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold"
          style={{ backgroundColor: "color-mix(in srgb, var(--status-good) 12%, transparent)", color: "var(--status-good)" }}
        >
          <Check size={14} strokeWidth={2.6} />
          Already checked in today
        </p>
      ) : confirming ? (
        // Access is blocked, so make the override deliberate rather than a reflex.
        <div className="mt-3">
          <p className="text-xs" style={{ color: "var(--status-critical)" }}>
            Membership is {member.access.reason.toLowerCase().replace(/_/g, " ")}. Check in anyway?
          </p>
          <div className="mt-2 flex gap-2">
            <button onClick={checkIn} disabled={busy} className="btn-brand !py-1.5 !px-3 !text-xs">
              {busy ? "Checking in…" : "Yes, check in"}
            </button>
            <button onClick={() => setConfirming(false)} className="btn-ghost !py-1.5 !px-3 !text-xs">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => (member.access.allowed ? checkIn() : setConfirming(true))}
          disabled={busy}
          className="btn-brand mt-3 flex w-full items-center justify-center gap-2 !py-2 !text-xs"
        >
          <ScanLine size={14} strokeWidth={2.4} />
          {busy ? "Checking in…" : "Check in"}
        </button>
      )}
    </div>
  );
}

function RecordPaymentDrawer({ member, open, onClose, onDone }: { member: MemberDetail; open: boolean; onClose: () => void; onDone: (msg: string) => void }) {
  const [amount, setAmount] = useState(member.outstandingCents / 100);
  const [method, setMethod] = useState("UPI");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setAmount(member.outstandingCents / 100); }, [member.outstandingCents]);

  async function submit() {
    setSaving(true);
    try {
      const r = await recordPayment(createClient(), member.id, Math.round(amount * 100), method as Database["public"]["Enums"]["payment_method"], note || undefined);
      onDone(`${formatCurrency(Math.round(amount * 100))} recorded · ${r.invoiceNumber}${r.balanceCleared ? " · balance cleared" : ""}`);
    } finally { setSaving(false); }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Record a payment" subtitle={`${member.first_name} owes ${formatCurrency(member.outstandingCents)}`}
      footer={<div className="flex justify-end gap-2"><button onClick={onClose} className="btn-ghost">Cancel</button><button onClick={submit} disabled={saving || amount <= 0} className="btn-brand">{saving ? "Saving…" : "Confirm payment"}</button></div>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Labelled label="Amount (₹)"><input type="number" min={1} className="field" value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></Labelled>
          <Labelled label="Method"><select className="field" value={method} onChange={(e) => setMethod(e.target.value)}><option value="UPI">UPI</option><option value="CARD">Card</option><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank transfer</option></select></Labelled>
        </div>
        <div className="flex gap-2">
          {[member.outstandingCents / 100, Math.round(member.outstandingCents / 200), 1000].map((v) => (
            <button key={v} onClick={() => setAmount(v)} className="btn-ghost !py-1 !px-3 !text-xs">₹{v.toLocaleString("en-IN")}</button>
          ))}
        </div>
        <Labelled label="Note"><input className="field" placeholder="e.g. Counter payment" value={note} onChange={(e) => setNote(e.target.value)} /></Labelled>
        <p className="rounded-xl p-3 text-xs text-ink-secondary" style={{ backgroundColor: "var(--brand-soft)" }}>
          After this payment: {amount * 100 >= member.outstandingCents ? "balance cleared, access restored if it was blocked for non-payment." : `${formatCurrency(member.outstandingCents - Math.round(amount * 100))} will remain due.`}
        </p>
      </div>
    </Drawer>
  );
}

function TrainingTab({ member }: { member: MemberDetail }) {
  const pt = member.ptSummary;
  const diet = member.activeDietPlan;
  const humanize = (v: string | null) => v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") : null;

  return (
    <Reveal className="grid gap-5 lg:grid-cols-2">
      <Item>
        <Card title="Personal training" icon={Dumbbell}>
          {pt.purchased === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No PT package. Sell one from the Personal Training screen.</p>
          ) : (
            <>
              <div className="flex items-center gap-5">
                <Ring value={pt.used / pt.purchased} size={104} stroke={10}>
                  <span className="stat-figure text-[24px] font-semibold text-ink">{pt.remaining}</span>
                  <span className="unit">left</span>
                </Ring>
                <div className="flex-1 space-y-2">
                  <Row label="Trainer" value={member.assigned_trainer ? `${member.assigned_trainer.first_name} ${member.assigned_trainer.last_name}` : null} />
                  <Row label="Purchased" value={`${pt.purchased} sessions`} />
                  <Row label="Completed" value={`${pt.used}`} />
                  <Row label="Booked ahead" value={`${pt.scheduled}`} />
                </div>
              </div>
              <div className="mt-4"><Bar value={pt.used / pt.purchased} /></div>
              {member.upcomingSessions.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium text-ink-secondary">Next sessions</p>
                  <ul className="space-y-1.5">
                    {member.upcomingSessions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "var(--surface-sunken)" }}>
                        <span className="text-ink">{s.focus ?? "Session"}</span>
                        <span className="text-xs text-ink-muted">{new Date(s.scheduled_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {member.pt_packages[0]?.sessions.filter((s) => s.status === "COMPLETED" && s.notes).slice(0, 3).length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-medium text-ink-secondary">Trainer notes</p>
                  <ul className="space-y-1.5">
                    {member.pt_packages[0].sessions.filter((s) => s.status === "COMPLETED" && s.notes).slice(0, 3).map((s) => (
                      <li key={s.id} className="text-[13px] text-ink-secondary"><span className="text-ink-muted">{formatDate(s.scheduled_at)} · </span>{s.notes}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>
      </Item>

      <Item>
        <Card title="Diet plan" icon={Salad}>
          {!diet ? (
            <p className="py-6 text-center text-sm text-ink-muted">No active diet plan.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--brand)" }}>{humanize(diet.goal)}</p>
                  <p className="mt-0.5 text-[16px] font-semibold text-ink">{diet.title}</p>
                  <p className="text-xs text-ink-muted">{diet.trainer ? `Set by ${diet.trainer.first_name}` : "Trainer not set"} · from {formatDate(diet.start_date)}</p>
                </div>
                <Pill tone="good">Active</Pill>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[["kcal", diet.daily_calories, true], ["Protein", diet.protein_g, false], ["Carbs", diet.carbs_g, false], ["Fat", diet.fat_g, false]].map(([l, v, a]) => (
                  <div key={String(l)} className="rounded-lg p-2.5 text-center" style={{ backgroundColor: a ? "var(--brand-soft)" : "var(--surface-sunken)" }}>
                    <p className="stat-figure text-[18px] font-semibold" style={{ color: a ? "var(--brand)" : "var(--ink)" }}>{String(v ?? "—")}</p>
                    <p className="text-[10px] text-ink-muted">{String(l)}{!a && v ? " (g)" : ""}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-1.5">
                {((diet.meals as unknown as Meal[]) ?? []).map((m, i) => (
                  <li key={i} className="flex gap-3 text-[13px]">
                    <span className="w-16 shrink-0 text-xs text-ink-muted">{m.time}</span>
                    <span className="min-w-0 flex-1"><span className="text-ink">{m.name}</span><span className="text-ink-muted"> · {m.items.join(", ")}</span></span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </Item>
    </Reveal>
  );
}

function Card({ title, icon: Icon, children, className = "" }: {
  title: string; icon?: typeof Phone; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-hairline bg-surface p-5 ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
        {Icon && <Icon size={15} strokeWidth={2.2} className="text-ink-muted" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ icon: Icon, label, value }: { icon?: typeof Phone; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-muted" />}
      <span className="w-36 shrink-0 text-[13px] text-ink-secondary">{label}</span>
      <span className="min-w-0 flex-1 text-[13px] text-ink">{value || <span className="text-ink-muted">—</span>}</span>
    </div>
  );
}

/** Acronyms would otherwise come back as "Upi" / "Rfid" from the enum values. */
const ACRONYMS: Record<string, string> = {
  UPI: "UPI",
  QR: "QR",
  RFID: "RFID",
  AADHAAR: "Aadhaar",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  BANK_TRANSFER: "Bank transfer",
  DRIVING_LICENSE: "Driving licence",
  VOTER_ID: "Voter ID",
};

function humanize(value: string | null) {
  if (!value) return null;
  if (ACRONYMS[value]) return ACRONYMS[value];
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");
}

function OverviewTab({ member }: { member: MemberDetail }) {
  const sub = member.subscriptions[0];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Contact & identity" icon={UserRound}>
        <div className="divide-y divide-hairline">
          <Row label="Member ID" value={member.member_code} />
          <Row icon={Phone} label="Phone" value={member.phone} />
          <Row label="Alternate phone" value={member.alternate_phone} />
          <Row icon={Mail} label="Email" value={member.email} />
          <Row label="Preferred contact" value={humanize(member.preferred_contact)} />
          <Row icon={Cake} label="Date of birth" value={member.date_of_birth && formatDate(member.date_of_birth)} />
          <Row label="Gender" value={humanize(member.gender)} />
          <Row icon={Briefcase} label="Occupation" value={member.occupation} />
          <Row
            icon={MapPin}
            label="Address"
            value={[member.address_line, member.city, member.state, member.postal_code].filter(Boolean).join(", ")}
          />
          <Row
            icon={IdCard}
            label="ID proof"
            value={
              member.id_proof_type ? (
                <span>
                  {humanize(member.id_proof_type)} ···· {member.id_proof_last4}
                  <span className="ml-2 text-xs text-ink-muted">(full number not stored)</span>
                </span>
              ) : null
            }
          />
          <Row label="Access card" value={member.access_card_number} />
        </div>
      </Card>

      <div className="space-y-5">
        <Card title="Emergency contact" icon={AlertTriangle}>
          {member.emergency_name ? (
            <div className="divide-y divide-hairline">
              <Row label="Name" value={member.emergency_name} />
              <Row label="Relationship" value={member.emergency_relationship} />
              <Row icon={Phone} label="Phone" value={member.emergency_phone} />
            </div>
          ) : (
            <p className="rounded-lg p-3 text-[13px]" style={{ backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, transparent)", color: "var(--status-critical)" }}>
              No emergency contact on file — collect this before their next session.
            </p>
          )}
        </Card>

        <Card title="Membership" icon={CalendarClock}>
          <div className="divide-y divide-hairline">
            <Row label="Plan" value={sub?.membership_plan.name} />
            <Row label="Fee" value={sub && formatCurrency(sub.membership_plan.price_cents)} />
            <Row label="Billing" value={humanize(sub?.membership_plan.billing_cycle ?? null)} />
            <Row label="Renews / expires" value={sub && formatDate(sub.current_period_end)} />
            <Row label="Outstanding" value={member.outstandingCents > 0
              ? <span style={{ color: "var(--status-critical)" }}>{formatCurrency(member.outstandingCents)}</span>
              : "Nothing due"} />
          </div>
        </Card>

        <Card title="Training" icon={Dumbbell}>
          <div className="divide-y divide-hairline">
            <Row label="Goal" value={humanize(member.primary_goal)} />
            <Row label="Experience" value={humanize(member.experience_level)} />
            <Row label="Assigned trainer" value={member.assigned_trainer && `${member.assigned_trainer.first_name} ${member.assigned_trainer.last_name}`} />
            <Row
              label="PT sessions"
              value={member.ptSummary.purchased > 0
                ? `${member.ptSummary.remaining} of ${member.ptSummary.purchased} remaining`
                : null}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

const TIMELINE_ICON = {
  JOINED: UserRound, PAYMENT: CreditCard, FREEZE: Snowflake, PLAN_START: CalendarClock, EXPIRY: Clock,
} as const;

const STATUS_COLOR = {
  good: "var(--status-good)", warning: "var(--status-warning)",
  critical: "var(--status-critical)", neutral: "var(--ink-muted)",
} as const;

function FeeSummary({ member }: { member: MemberDetail }) {
  const ps = member.paymentSummary;
  const settled = ps.outstandingCents === 0;

  if (!ps.planName) {
    return <Card title="Fees" icon={Wallet}><p className="py-6 text-center text-sm text-ink-muted">No membership yet.</p></Card>;
  }

  return (
    <section className={`${settled ? "card-glass" : "card-hero"} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="brand-eyebrow">{humanize(ps.billingCycle)} plan</p>
          <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-ink">{ps.planName}</h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {formatCurrency(ps.planPriceCents ?? 0)} per cycle
            {ps.instalments > 1 && ` · ${ps.instalments} instalments`}
          </p>
        </div>
        <Pill tone={settled ? "good" : "critical"}>{settled ? "Paid in full" : "Balance due"}</Pill>
      </div>

      {/* The three numbers staff are asked for at the counter. */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <Money label="Total billed" value={ps.totalBilledCents} />
        <Money label="Paid" value={ps.paidCents} tone="good" />
        <Money label="Remaining" value={ps.outstandingCents} tone={settled ? undefined : "critical"} />
      </div>

      <div className="mt-4">
        <Bar value={ps.paidRatio} color={settled ? "var(--status-good)" : "var(--brand)"} height={8} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
          <span>{Math.round(ps.paidRatio * 100)}% collected</span>
          {ps.nextDueAt && !settled && (
            <span style={{ color: "var(--status-critical)" }}>
              Next due {formatDate(ps.nextDueAt)}
            </span>
          )}
          {ps.lastPaidAt && <span>Last payment {formatDate(ps.lastPaidAt)}</span>}
        </div>
      </div>
    </section>
  );
}

function Money({ label, value, tone }: { label: string; value: number; tone?: "good" | "critical" }) {
  const color = tone === "good" ? "var(--status-good-text)" : tone === "critical" ? "var(--status-critical)" : "var(--ink)";
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "var(--surface-sunken)" }}>
      <p className="text-[11px] text-ink-muted">{label}</p>
      <p className="stat-figure mt-1 text-[20px] font-semibold leading-none" style={{ color }}>{formatCurrency(value)}</p>
    </div>
  );
}

function MembershipTab({ member }: { member: MemberDetail }) {
  const sub = member.subscriptions[0];
  const payments = member.subscriptions.flatMap((s) => s.payments ?? []);

  return (
    <div className="space-y-5">
    <FeeSummary member={member} />
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <Card title="Fee & access timeline" icon={CalendarClock}>
        <ol className="relative space-y-1">
          <span className="absolute bottom-2 left-[15px] top-2 w-px bg-hairline" aria-hidden="true" />
          {member.timeline.map((event) => (
            <TimelineRow key={event.id} event={event} />
          ))}
        </ol>
      </Card>

      <div className="space-y-5">
        <Card title="Current plan" icon={Wallet}>
          <div className="divide-y divide-hairline">
            <Row label="Plan" value={sub?.membership_plan.name} />
            <Row label="Status" value={<AccessPill access={member.access} />} />
            <Row label="Started" value={sub && formatDate(sub.start_date)} />
            <Row label="Valid until" value={sub && formatDate(sub.current_period_end)} />
            <Row
              label="Days remaining"
              value={member.access.daysRemaining !== null
                ? member.access.daysRemaining >= 0
                  ? `${member.access.daysRemaining} days`
                  : <span style={{ color: "var(--status-critical)" }}>{Math.abs(member.access.daysRemaining)} days overdue</span>
                : null}
            />
          </div>
        </Card>

        <Card title="Payment history" icon={CreditCard}>
          {payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-muted">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-hairline">
              {payments.slice(0, 10).map((p) => {
                const ok = p.status === "SUCCEEDED";
                const Icon = ok ? CheckCircle2 : XCircle;
                const color = ok ? "var(--status-good)" : p.status === "PENDING" ? "var(--status-warning)" : "var(--status-critical)";
                return (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <Icon size={15} strokeWidth={2.2} style={{ color }} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink">{formatCurrency(p.amount_cents)}</p>
                      <p className="text-xs text-ink-muted">
                        {p.method ? `${humanize(p.method)} · ` : ""}
                        {p.paid_at ? formatDate(p.paid_at) : p.due_at ? `due ${formatDate(p.due_at)}` : "—"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium" style={{ color }}>{humanize(p.status)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
    </div>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const Icon = TIMELINE_ICON[event.kind];
  const color = STATUS_COLOR[event.status ?? "neutral"];
  const future = new Date(event.at) > new Date();

  return (
    <li className="relative flex gap-3 py-2">
      <span
        className="relative z-10 mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-surface"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, var(--surface))`, color }}
      >
        <Icon size={14} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-[13px] font-medium text-ink">{event.title}</p>
          {event.amountCents !== undefined && (
            <span className="text-[13px] font-semibold tabular-nums text-ink">
              {formatCurrency(event.amountCents)}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-muted">
          {formatDate(event.at)}
          {future && " · upcoming"}
          {event.detail && ` · ${humanize(event.detail)}`}
        </p>
      </div>
    </li>
  );
}

function AttendanceTab({ member }: { member: MemberDetail }) {
  const { visits } = member;
  const trendDown = (visits.trendPercent ?? 0) < 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <Card title="Visit summary" icon={Clock}>
          <div className="divide-y divide-hairline">
            <Row label="Last visit" value={visits.lastVisitAt
              ? `${formatDate(visits.lastVisitAt)} (${visits.daysSinceLastVisit}d ago)`
              : "Never checked in"} />
            <Row label="Last 30 days" value={`${visits.visitsLast30} visits`} />
            <Row label="Previous 30 days" value={`${visits.visitsPrev30} visits`} />
            <Row
              label="Trend"
              value={visits.trendPercent !== null ? (
                <span className="inline-flex items-center gap-1.5" style={{ color: trendDown ? "var(--status-critical)" : "var(--status-good-text)" }}>
                  {trendDown ? <TrendingDown size={14} strokeWidth={2.2} /> : <TrendingUp size={14} strokeWidth={2.2} />}
                  {visits.trendPercent > 0 ? "+" : ""}{visits.trendPercent}%
                </span>
              ) : null}
            />
            <Row label="Usual time" value={visits.usualHour !== null
              ? `${visits.usualHour % 12 || 12}${visits.usualHour < 12 ? "am" : "pm"}`
              : null} />
            <Row label="Retention" value={<ChurnPill risk={member.churnRisk} />} />
          </div>
        </Card>

        {(member.churnRisk === "HIGH" || member.churnRisk === "MEDIUM") && (
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: "color-mix(in srgb, var(--status-critical) 25%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--status-critical) 6%, transparent)",
            }}
          >
            <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--status-critical)" }}>
              <AlertTriangle size={15} strokeWidth={2.2} />
              Worth a call
            </p>
            <p className="mt-1.5 text-[13px] text-ink-secondary">
              {visits.daysSinceLastVisit !== null
                ? `No visit in ${visits.daysSinceLastVisit} days`
                : "No recorded visits"}
              {visits.trendPercent !== null && `, and attendance is down ${Math.abs(visits.trendPercent)}% on the previous month`}.
              Members who go quiet usually cancel before anyone notices.
            </p>
          </div>
        )}
      </div>

      <Card title="Recent check-ins" icon={CalendarClock}>
        {member.attendance_events.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No check-ins recorded.</p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-hairline overflow-auto">
            {member.attendance_events.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-ink">{formatDate(e.checked_in_at)}</span>
                <span className="text-xs text-ink-muted">
                  {new Date(e.checked_in_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  {" · "}{humanize(e.source)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function HealthTab({ member }: { member: MemberDetail }) {
  const missingParq = !member.parq_completed_at;
  const missingWaiver = !member.waiver_signed_at;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Medical screening" icon={HeartPulse}>
        <div className="divide-y divide-hairline">
          <Row label="Conditions" value={member.medical_conditions} />
          <Row label="Allergies" value={member.allergies} />
          <Row label="Medications" value={member.medications} />
          <Row label="Injuries / limitations" value={member.injuries} />
          <Row
            label="Physician clearance"
            value={member.physician_clearance
              ? <span style={{ color: "var(--status-good)" }}>On file</span>
              : <span className="text-ink-muted">Not required</span>}
          />
        </div>
      </Card>

      <Card title="Compliance" icon={ShieldCheck}>
        <div className="space-y-3">
          <ComplianceRow label="PAR-Q health questionnaire" done={!missingParq} at={member.parq_completed_at} />
          <ComplianceRow label="Liability waiver signed" done={!missingWaiver} at={member.waiver_signed_at} />
        </div>

        {(missingParq || missingWaiver) && (
          <p
            className="mt-4 rounded-lg p-3 text-[13px]"
            style={{ backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, transparent)", color: "var(--status-critical)" }}
          >
            Paperwork incomplete. Training a member without a signed waiver leaves the club exposed.
          </p>
        )}
      </Card>
    </div>
  );
}

function ComplianceRow({ label, done, at }: { label: string; done: boolean; at: string | null }) {
  const Icon = done ? CheckCircle2 : XCircle;
  const color = done ? "var(--status-good)" : "var(--status-critical)";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline p-3">
      <Icon size={17} strokeWidth={2.2} style={{ color }} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-muted">{done && at ? `Completed ${formatDate(at)}` : "Not on file"}</p>
      </div>
    </div>
  );
}

function ProgressTab({ member }: { member: MemberDetail }) {
  const latest = member.latestMeasurement;
  const history = member.measurements;
  const first = history[history.length - 1];
  const weightChange = latest?.weight_kg && first?.weight_kg
    ? Math.round((latest.weight_kg - first.weight_kg) * 10) / 10
    : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <Card title="Current metrics" icon={Ruler}>
        <div className="divide-y divide-hairline">
          <Row icon={Target} label="Goal" value={humanize(member.primary_goal)} />
          <Row label="Height" value={member.height_cm && `${member.height_cm} cm`} />
          <Row label="Weight" value={latest?.weight_kg && `${latest.weight_kg} kg`} />
          <Row label="BMI" value={member.bmi} />
          <Row label="Body fat" value={latest?.body_fat_percent && `${latest.body_fat_percent}%`} />
          <Row label="Waist" value={latest?.waist_cm && `${latest.waist_cm} cm`} />
          <Row label="Chest" value={latest?.chest_cm && `${latest.chest_cm} cm`} />
          <Row
            label="Since first record"
            value={weightChange !== null ? (
              <span style={{ color: weightChange <= 0 ? "var(--status-good-text)" : "var(--ink)" }}>
                {weightChange > 0 ? "+" : ""}{weightChange} kg
              </span>
            ) : null}
          />
        </div>
      </Card>

      <Card title="Measurement history" icon={TrendingDown}>
        {history.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No measurements recorded yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-hairline text-left text-ink-secondary">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 text-right font-medium">Weight</th>
                <th className="pb-2 text-right font-medium">Body fat</th>
                <th className="pb-2 text-right font-medium">Waist</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {history.map((m) => (
                <tr key={m.id} className="border-b border-hairline/60 last:border-0">
                  <td className="py-2 text-ink-secondary">{formatDate(m.recorded_at)}</td>
                  <td className="py-2 text-right text-ink">{m.weight_kg ? `${m.weight_kg} kg` : "—"}</td>
                  <td className="py-2 text-right text-ink">{m.body_fat_percent ? `${m.body_fat_percent}%` : "—"}</td>
                  <td className="py-2 text-right text-ink">{m.waist_cm ? `${m.waist_cm} cm` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function NotesTab({ member, onChange }: { member: MemberDetail; onChange: (m: MemberDetail) => void }) {
  const { tenant, user } = useTenant();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !tenant || !user) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await addMemberNote(supabase, tenant.id, member.id, user.userId, body.trim());
      const refreshed = await getMember(supabase, member.id);
      onChange(refreshed);
      setBody("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Add a note" icon={StickyNote}>
        <form onSubmit={handleAdd}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="What should the rest of the team know about this member?"
            className="w-full resize-none rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2"
            style={{ ["--tw-ring-color" as string]: "color-mix(in srgb, var(--brand) 35%, transparent)" }}
          />
          <button
            type="submit"
            disabled={saving || !body.trim()}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "var(--brand)", color: "var(--brand-ink)" }}
          >
            {saving ? "Saving…" : "Add note"}
          </button>
        </form>
      </Card>

      <Card title={`Notes (${member.member_notes.length})`} icon={StickyNote}>
        {member.member_notes.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {member.member_notes.map((note) => (
              <li key={note.id} className="py-3">
                <div className="flex items-start gap-2">
                  {note.pinned && <Pin size={13} strokeWidth={2.2} className="mt-1 shrink-0" style={{ color: "var(--brand)" }} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-ink">{note.body}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {note.author ? `${note.author.first_name} ${note.author.last_name}` : "System"} · {formatDate(note.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
