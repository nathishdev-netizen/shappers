"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import { api, type MembershipPlanDto, type NewMemberPayload, type StaffDto } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/format";

const STEPS = ["Personal", "Membership & payment", "Health & safety", "Training"] as const;
type Step = number;

const DAYS_FOR_CYCLE: Record<string, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
  ONE_TIME: 30,
};

const RING = { ["--tw-ring-color" as string]: "color-mix(in srgb, var(--brand) 35%, transparent)" };
const FIELD =
  "w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Labelled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function OnboardWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<NewMemberPayload>({
    firstName: "",
    lastName: "",
    email: "",
    preferredContact: "PHONE",
  });

  // Membership fields are held separately so "touched" defaults can follow the plan.
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [durationDays, setDurationDays] = useState<number | "">("");
  const [totalFee, setTotalFee] = useState<number | "">("");
  const [amountPaid, setAmountPaid] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [balanceDueAt, setBalanceDueAt] = useState("");

  useEffect(() => {
    Promise.all([api.getPlans(), api.getStaff()]).then(([p, s]) => {
      setPlans(p);
      setStaff(s);
    });
  }, []);

  const plan = plans.find((p) => p.id === planId);

  // Selecting a plan seeds duration and fee; staff can still override either.
  function choosePlan(id: string) {
    setPlanId(id);
    const selected = plans.find((p) => p.id === id);
    if (!selected) return;
    setDurationDays(DAYS_FOR_CYCLE[selected.billingCycle] ?? 30);
    setTotalFee(selected.priceCents / 100);
    setAmountPaid(selected.priceCents / 100);
  }

  const days = typeof durationDays === "number" ? durationDays : 0;
  const feeRupees = typeof totalFee === "number" ? totalFee : 0;
  const paidRupees = typeof amountPaid === "number" ? amountPaid : 0;
  const balanceRupees = Math.max(0, feeRupees - paidRupees);

  const endDate = useMemo(() => {
    if (!startDate || !days) return null;
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    return d;
  }, [startDate, days]);

  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.email.trim();

  async function handleSubmit() {
    if (!canSubmit) {
      setStep(0);
      setError("First name, last name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: NewMemberPayload = {
        ...form,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        ...(plan
          ? {
              membership: {
                membershipPlanId: plan.id,
                startDate: new Date(startDate).toISOString(),
                durationDays: days || undefined,
                totalFeeCents: Math.round(feeRupees * 100),
                amountPaidCents: Math.round(paidRupees * 100),
                paymentMethod,
                balanceDueAt: balanceRupees > 0 && balanceDueAt
                  ? new Date(balanceDueAt).toISOString()
                  : undefined,
              },
            }
          : {}),
      };

      // Strip empty strings so optional fields aren't rejected by validation.
      for (const key of Object.keys(payload) as (keyof NewMemberPayload)[]) {
        if (payload[key] === "" || payload[key] === undefined) delete payload[key];
      }

      await api.createMember(payload);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create member");
      setSaving(false);
    }
  }

  const set = (patch: Partial<NewMemberPayload>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside
        className="relative flex h-full w-full max-w-lg flex-col bg-page"
        style={{ boxShadow: "var(--shadow-raised)" }}
      >
        <header className="border-b border-hairline bg-surface px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Onboard a client</h2>
              <p className="mt-0.5 text-xs text-ink-secondary">
                Only name and email are required — everything else can be filled in later
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-page">
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          <ol className="mt-4 flex gap-1.5">
            {STEPS.map((label, i) => (
              <li key={label} className="flex-1">
                <button onClick={() => setStep(i)} className="w-full text-left">
                  <span
                    className="block h-1 rounded-full transition-colors"
                    style={{ backgroundColor: i <= step ? "var(--brand)" : "var(--hairline)" }}
                  />
                  <span
                    className="mt-1.5 block truncate text-[11px]"
                    style={{ color: i === step ? "var(--ink)" : "var(--ink-muted)" }}
                  >
                    {label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {step === 0 && <PersonalStep form={form} set={set} />}
          {step === 1 && (
            <MembershipStep
              plans={plans}
              planId={planId}
              choosePlan={choosePlan}
              startDate={startDate}
              setStartDate={setStartDate}
              durationDays={durationDays}
              setDurationDays={setDurationDays}
              totalFee={totalFee}
              setTotalFee={setTotalFee}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              balanceDueAt={balanceDueAt}
              setBalanceDueAt={setBalanceDueAt}
              balanceRupees={balanceRupees}
              endDate={endDate}
              plan={plan}
            />
          )}
          {step === 2 && <HealthStep form={form} set={set} />}
          {step === 3 && <TrainingStep form={form} set={set} staff={staff} />}

          {error && (
            <p
              className="mt-4 flex items-center gap-2 rounded-lg p-3 text-sm"
              style={{
                backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, transparent)",
                color: "var(--status-critical)",
              }}
            >
              <CircleAlert size={15} strokeWidth={2.2} />
              {error}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-hairline bg-surface px-6 py-4">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-hairline px-3 py-2 text-sm text-ink-secondary disabled:opacity-40"
          >
            <ChevronLeft size={15} strokeWidth={2.2} />
            Back
          </button>

          <div className="flex items-center gap-2">
            {step < STEPS.length - 1 && (
              <button
                onClick={handleSubmit}
                disabled={saving || !canSubmit}
                className="rounded-lg px-3 py-2 text-sm text-ink-secondary hover:text-ink disabled:opacity-40"
              >
                Skip &amp; create
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: "var(--brand)", color: "var(--brand-ink)" }}
              >
                Next
                <ChevronRight size={15} strokeWidth={2.2} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !canSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: "var(--brand)", color: "var(--brand-ink)" }}
              >
                <Check size={15} strokeWidth={2.4} />
                {saving ? "Creating…" : "Create member"}
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}

type SetFn = (patch: Partial<NewMemberPayload>) => void;

function PersonalStep({ form, set }: { form: NewMemberPayload; set: SetFn }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Labelled label="First name *">
          <input className={FIELD} style={RING} value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} />
        </Labelled>
        <Labelled label="Last name *">
          <input className={FIELD} style={RING} value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} />
        </Labelled>
      </div>

      <Labelled label="Email *">
        <input type="email" className={FIELD} style={RING} value={form.email} onChange={(e) => set({ email: e.target.value })} />
      </Labelled>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Phone">
          <input className={FIELD} style={RING} value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
        </Labelled>
        <Labelled label="Alternate phone">
          <input className={FIELD} style={RING} value={form.alternatePhone ?? ""} onChange={(e) => set({ alternatePhone: e.target.value })} />
        </Labelled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Date of birth">
          <input type="date" className={FIELD} style={RING} value={form.dateOfBirth ?? ""} onChange={(e) => set({ dateOfBirth: e.target.value })} />
        </Labelled>
        <Labelled label="Gender">
          <select className={FIELD} style={RING} value={form.gender ?? ""} onChange={(e) => set({ gender: e.target.value })}>
            <option value="">Not specified</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </Labelled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Occupation">
          <input className={FIELD} style={RING} value={form.occupation ?? ""} onChange={(e) => set({ occupation: e.target.value })} />
        </Labelled>
        <Labelled label="Preferred contact">
          <select className={FIELD} style={RING} value={form.preferredContact ?? "PHONE"} onChange={(e) => set({ preferredContact: e.target.value })}>
            <option value="PHONE">Phone</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="EMAIL">Email</option>
            <option value="SMS">SMS</option>
          </select>
        </Labelled>
      </div>

      <Labelled label="Address">
        <input className={FIELD} style={RING} value={form.addressLine ?? ""} onChange={(e) => set({ addressLine: e.target.value })} />
      </Labelled>

      <div className="grid grid-cols-3 gap-3">
        <Labelled label="City">
          <input className={FIELD} style={RING} value={form.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
        </Labelled>
        <Labelled label="State">
          <input className={FIELD} style={RING} value={form.state ?? ""} onChange={(e) => set({ state: e.target.value })} />
        </Labelled>
        <Labelled label="PIN code">
          <input className={FIELD} style={RING} value={form.postalCode ?? ""} onChange={(e) => set({ postalCode: e.target.value })} />
        </Labelled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="ID proof type">
          <select className={FIELD} style={RING} value={form.idProofType ?? ""} onChange={(e) => set({ idProofType: e.target.value })}>
            <option value="">None</option>
            <option value="AADHAAR">Aadhaar</option>
            <option value="PASSPORT">Passport</option>
            <option value="DRIVING_LICENSE">Driving licence</option>
            <option value="VOTER_ID">Voter ID</option>
          </select>
        </Labelled>
        <Labelled label="Last 4 digits" hint="Full ID numbers are never stored">
          <input maxLength={4} className={FIELD} style={RING} value={form.idProofLast4 ?? ""} onChange={(e) => set({ idProofLast4: e.target.value })} />
        </Labelled>
      </div>
    </div>
  );
}

function MembershipStep(props: {
  plans: MembershipPlanDto[];
  plan?: MembershipPlanDto;
  planId: string;
  choosePlan: (id: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  durationDays: number | "";
  setDurationDays: (v: number | "") => void;
  totalFee: number | "";
  setTotalFee: (v: number | "") => void;
  amountPaid: number | "";
  setAmountPaid: (v: number | "") => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  balanceDueAt: string;
  setBalanceDueAt: (v: string) => void;
  balanceRupees: number;
  endDate: Date | null;
}) {
  const {
    plans, plan, planId, choosePlan, startDate, setStartDate, durationDays, setDurationDays,
    totalFee, setTotalFee, amountPaid, setAmountPaid, paymentMethod, setPaymentMethod,
    balanceDueAt, setBalanceDueAt, balanceRupees, endDate,
  } = props;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium text-ink-secondary">Plan</p>
        <div className="grid gap-2">
          {plans.map((p) => {
            const selected = p.id === planId;
            return (
              <button
                key={p.id}
                onClick={() => choosePlan(p.id)}
                className="flex items-center justify-between rounded-xl border p-3 text-left transition-colors"
                style={{
                  borderColor: selected ? "var(--brand)" : "var(--hairline)",
                  backgroundColor: selected
                    ? "color-mix(in srgb, var(--brand) 7%, transparent)"
                    : "var(--surface)",
                }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{p.name}</p>
                  <p className="truncate text-xs text-ink-muted">
                    {p.description ?? `${p.billingCycle.toLowerCase()} membership`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-ink">{formatCurrency(p.priceCents)}</p>
                  <p className="text-xs text-ink-muted">{DAYS_FOR_CYCLE[p.billingCycle] ?? 30} days</p>
                </div>
              </button>
            );
          })}
          {plans.length === 0 && <p className="text-sm text-ink-muted">No plans configured yet.</p>}
        </div>
      </div>

      {plan && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Start date">
              <input type="date" className={FIELD} style={RING} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Labelled>
            <Labelled label="Duration (days)" hint="Override for custom packages">
              <input
                type="number"
                min={1}
                className={FIELD}
                style={RING}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </Labelled>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Total fee (₹)" hint="Edit to apply a discount">
              <input
                type="number"
                min={0}
                className={FIELD}
                style={RING}
                value={totalFee}
                onChange={(e) => setTotalFee(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </Labelled>
            <Labelled label="Paying now (₹)">
              <input
                type="number"
                min={0}
                className={FIELD}
                style={RING}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </Labelled>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Labelled label="Payment method">
              <select className={FIELD} style={RING} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </Labelled>
            {balanceRupees > 0 && (
              <Labelled label="Balance due by">
                <input type="date" className={FIELD} style={RING} value={balanceDueAt} onChange={(e) => setBalanceDueAt(e.target.value)} />
              </Labelled>
            )}
          </div>

          {/* Live summary so staff confirm the deal before it is written. */}
          <div className="rounded-xl border border-hairline bg-surface p-4">
            <p className="text-xs font-medium text-ink-secondary">Summary</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-secondary">Access until</dt>
                <dd className="font-medium text-ink">{endDate ? formatDate(endDate.toISOString()) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-secondary">Paying now</dt>
                <dd className="font-medium text-ink">₹{(typeof amountPaid === "number" ? amountPaid : 0).toLocaleString("en-IN")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-secondary">Balance</dt>
                <dd className="font-medium" style={{ color: balanceRupees > 0 ? "var(--status-critical)" : "var(--status-good-text)" }}>
                  {balanceRupees > 0
                    ? `₹${balanceRupees.toLocaleString("en-IN")}${balanceDueAt ? ` due ${formatDate(balanceDueAt)}` : ""}`
                    : "Paid in full"}
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  );
}

function HealthStep({ form, set }: { form: NewMemberPayload; set: SetFn }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-muted">
        Emergency details and screening are optional here, but a signed waiver protects the club.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Emergency contact name">
          <input className={FIELD} style={RING} value={form.emergencyName ?? ""} onChange={(e) => set({ emergencyName: e.target.value })} />
        </Labelled>
        <Labelled label="Relationship">
          <input className={FIELD} style={RING} value={form.emergencyRelationship ?? ""} onChange={(e) => set({ emergencyRelationship: e.target.value })} />
        </Labelled>
      </div>

      <Labelled label="Emergency phone">
        <input className={FIELD} style={RING} value={form.emergencyPhone ?? ""} onChange={(e) => set({ emergencyPhone: e.target.value })} />
      </Labelled>

      <Labelled label="Medical conditions">
        <input className={FIELD} style={RING} value={form.medicalConditions ?? ""} onChange={(e) => set({ medicalConditions: e.target.value })} />
      </Labelled>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Allergies">
          <input className={FIELD} style={RING} value={form.allergies ?? ""} onChange={(e) => set({ allergies: e.target.value })} />
        </Labelled>
        <Labelled label="Medications">
          <input className={FIELD} style={RING} value={form.medications ?? ""} onChange={(e) => set({ medications: e.target.value })} />
        </Labelled>
      </div>

      <Labelled label="Injuries or limitations">
        <input className={FIELD} style={RING} value={form.injuries ?? ""} onChange={(e) => set({ injuries: e.target.value })} />
      </Labelled>

      <div className="space-y-2 rounded-xl border border-hairline bg-surface p-4">
        {([
          ["parqCompleted", "PAR-Q health questionnaire completed"],
          ["waiverSigned", "Liability waiver signed"],
          ["physicianClearance", "Physician clearance on file"],
        ] as const).map(([key, label]) => (
          <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={Boolean(form[key])}
              onChange={(e) => set({ [key]: e.target.checked } as Partial<NewMemberPayload>)}
              className="h-4 w-4 rounded border-hairline"
              style={{ accentColor: "var(--brand)" }}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function TrainingStep({ form, set, staff }: { form: NewMemberPayload; set: SetFn; staff: StaffDto[] }) {
  const trainers = staff.filter((s) => s.role === "TRAINER" || s.role === "OWNER" || s.role === "ADMIN");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Primary goal">
          <select className={FIELD} style={RING} value={form.primaryGoal ?? ""} onChange={(e) => set({ primaryGoal: e.target.value })}>
            <option value="">Not set</option>
            <option value="WEIGHT_LOSS">Weight loss</option>
            <option value="MUSCLE_GAIN">Muscle gain</option>
            <option value="STRENGTH">Strength</option>
            <option value="ENDURANCE">Endurance</option>
            <option value="REHAB">Rehab</option>
            <option value="GENERAL_FITNESS">General fitness</option>
          </select>
        </Labelled>
        <Labelled label="Experience level">
          <select className={FIELD} style={RING} value={form.experienceLevel ?? ""} onChange={(e) => set({ experienceLevel: e.target.value })}>
            <option value="">Not set</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </Labelled>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Labelled label="Height (cm)">
          <input
            type="number"
            className={FIELD}
            style={RING}
            value={form.heightCm ?? ""}
            onChange={(e) => set({ heightCm: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </Labelled>
        <Labelled label="Access card number">
          <input className={FIELD} style={RING} value={form.accessCardNumber ?? ""} onChange={(e) => set({ accessCardNumber: e.target.value })} />
        </Labelled>
      </div>

      <Labelled label="Assigned trainer">
        <select className={FIELD} style={RING} value={form.assignedTrainerId ?? ""} onChange={(e) => set({ assignedTrainerId: e.target.value })}>
          <option value="">Unassigned</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName} · {t.role.toLowerCase()}
            </option>
          ))}
        </select>
      </Labelled>

      <Labelled label="Notes">
        <textarea
          rows={3}
          className={`${FIELD} resize-none`}
          style={RING}
          value={form.notes ?? ""}
          onChange={(e) => set({ notes: e.target.value })}
          placeholder="Anything the team should know"
        />
      </Labelled>
    </div>
  );
}
