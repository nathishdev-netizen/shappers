import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  api,
  type MembershipPlanDto,
  type NewMemberPayload,
  type StaffDto,
} from "./api";
import {
  Card, ChipSelect, Checkbox, Empty, Field, FieldRow, PickerField,
  PrimaryButton, Rise, Sheet, Tap,
} from "./components";
import { formatCurrency, palette, withAlpha } from "./theme";

const STEPS = ["Personal", "Membership", "Health", "Training"] as const;

const CYCLE_DAYS: Record<string, number> = {
  MONTHLY: 30, QUARTERLY: 90, YEARLY: 365, ONE_TIME: 30,
};

/** Blank strings would overwrite real columns with empties, so they never leave here. */
function prune<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  ) as Partial<T>;
}

export function OnboardWizard({
  visible, onClose, onCreated,
}: { visible: boolean; onClose: () => void; onCreated: (name: string) => void }) {
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — identity
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [preferredContact, setPreferredContact] = useState("PHONE");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [idProofType, setIdProofType] = useState("");
  const [idProofLast4, setIdProofLast4] = useState("");

  // Step 2 — membership & money
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationDays, setDurationDays] = useState("30");
  const [totalFee, setTotalFee] = useState("");
  const [payingNow, setPayingNow] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [balanceDueAt, setBalanceDueAt] = useState("");

  // Step 3 — health & safety
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [injuries, setInjuries] = useState("");
  const [parqCompleted, setParqCompleted] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [physicianClearance, setPhysicianClearance] = useState(false);

  // Step 4 — training
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [accessCardNumber, setAccessCardNumber] = useState("");
  const [assignedTrainerId, setAssignedTrainerId] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!visible) return;
    Promise.all([api.getPlans(), api.getStaff()])
      .then(([p, s]) => { setPlans(p); setStaff(s); })
      .catch(() => {});
  }, [visible]);

  const plan = plans.find((p) => p.id === planId) ?? null;

  /** Picking a plan seeds duration and money, all of which stay editable. */
  function choosePlan(p: MembershipPlanDto) {
    setPlanId(p.id);
    setDurationDays(String(CYCLE_DAYS[p.billingCycle] ?? 30));
    setTotalFee(String(Math.round(p.priceCents / 100)));
    setPayingNow(String(Math.round(p.priceCents / 100)));
  }

  const feeNum = Number(totalFee) || 0;
  const paidNum = Number(payingNow) || 0;
  const balance = Math.max(0, feeNum - paidNum);

  const accessUntil = useMemo(() => {
    const d = new Date(startDate);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + (Number(durationDays) || 0));
    return d;
  }, [startDate, durationDays]);

  const canSubmit = Boolean(firstName.trim() && lastName.trim() && email.trim());

  function reset() {
    setStep(0); setError(null);
    setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setAlternatePhone("");
    setDateOfBirth(""); setGender(""); setOccupation(""); setPreferredContact("PHONE");
    setAddressLine(""); setCity(""); setState(""); setPostalCode("");
    setIdProofType(""); setIdProofLast4("");
    setPlanId(""); setStartDate(new Date().toISOString().slice(0, 10));
    setDurationDays("30"); setTotalFee(""); setPayingNow(""); setPaymentMethod("UPI"); setBalanceDueAt("");
    setEmergencyName(""); setEmergencyRelationship(""); setEmergencyPhone("");
    setMedicalConditions(""); setAllergies(""); setMedications(""); setInjuries("");
    setParqCompleted(false); setWaiverSigned(false); setPhysicianClearance(false);
    setPrimaryGoal(""); setExperienceLevel(""); setHeightCm(""); setAccessCardNumber("");
    setAssignedTrainerId(""); setNotes("");
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...prune({
          firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(),
          phone, alternatePhone, dateOfBirth, gender, occupation, preferredContact,
          addressLine, city, state, postalCode, idProofType, idProofLast4,
          emergencyName, emergencyRelationship, emergencyPhone,
          medicalConditions, allergies, medications, injuries,
          primaryGoal, experienceLevel, accessCardNumber, assignedTrainerId, notes,
        }),
        parqCompleted, waiverSigned, physicianClearance,
        ...(heightCm ? { heightCm: Number(heightCm) } : {}),
        ...(plan
          ? {
              membership: prune({
                membershipPlanId: plan.id,
                startDate: new Date(startDate).toISOString(),
                durationDays: Number(durationDays) || undefined,
                totalFeeCents: Math.round(feeNum * 100),
                amountPaidCents: Math.round(paidNum * 100),
                paymentMethod,
                balanceDueAt: balance > 0 && balanceDueAt ? new Date(balanceDueAt).toISOString() : undefined,
              }) as NewMemberPayload["membership"],
            }
          : {}),
      } as NewMemberPayload;

      await api.createMember(payload);
      onCreated(`${firstName.trim()} ${lastName.trim()}`);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the member.");
    } finally {
      setSaving(false);
    }
  }

  const last = step === STEPS.length - 1;

  return (
    <Sheet
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      title="Onboard a client"
      subtitle="Only name and email are required — everything else can wait."
      footer={
        <>
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={{ flexDirection: "row", gap: 10 }}>
            {step > 0 && (
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Back" tone="ghost" onPress={() => setStep(step - 1)} />
              </View>
            )}
            <View style={{ flex: 2 }}>
              {last ? (
                <PrimaryButton label="Create member" onPress={submit} disabled={!canSubmit} loading={saving} />
              ) : (
                <PrimaryButton label="Next" onPress={() => setStep(step + 1)} />
              )}
            </View>
          </View>
          {!last && canSubmit && (
            <Tap onPress={submit} disabled={saving}>
              <Text style={styles.skip}>Skip the rest & create</Text>
            </Tap>
          )}
        </>
      }
    >
      <StepBar step={step} onJump={setStep} />

      {step === 0 && (
        <Rise index={0}>
          <FieldRow>
            <View style={{ flex: 1 }}><Field label="First name" value={firstName} onChange={setFirstName} required /></View>
            <View style={{ flex: 1 }}><Field label="Last name" value={lastName} onChange={setLastName} required /></View>
          </FieldRow>
          <Field label="Email" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" required />
          <FieldRow>
            <View style={{ flex: 1 }}><Field label="Phone" value={phone} onChange={setPhone} keyboardType="phone-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Alternate" value={alternatePhone} onChange={setAlternatePhone} keyboardType="phone-pad" /></View>
          </FieldRow>
          <Field label="Date of birth" value={dateOfBirth} onChange={setDateOfBirth} placeholder="YYYY-MM-DD" />
          <ChipSelect
            label="Gender"
            value={gender}
            onChange={setGender}
            options={[
              { value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" },
              { value: "OTHER", label: "Other" }, { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
            ]}
          />
          <Field label="Occupation" value={occupation} onChange={setOccupation} />
          <ChipSelect
            label="Preferred contact"
            value={preferredContact}
            onChange={setPreferredContact}
            options={[
              { value: "PHONE", label: "Phone" }, { value: "WHATSAPP", label: "WhatsApp" },
              { value: "EMAIL", label: "Email" }, { value: "SMS", label: "SMS" },
            ]}
          />
          <Field label="Address" value={addressLine} onChange={setAddressLine} />
          <FieldRow>
            <View style={{ flex: 1 }}><Field label="City" value={city} onChange={setCity} /></View>
            <View style={{ flex: 1 }}><Field label="State" value={state} onChange={setState} /></View>
          </FieldRow>
          <Field label="PIN code" value={postalCode} onChange={setPostalCode} keyboardType="numeric" />
          <ChipSelect
            label="ID proof"
            value={idProofType}
            onChange={setIdProofType}
            options={[
              { value: "AADHAAR", label: "Aadhaar" }, { value: "PASSPORT", label: "Passport" },
              { value: "DRIVING_LICENSE", label: "Driving licence" }, { value: "VOTER_ID", label: "Voter ID" },
            ]}
          />
          <Field
            label="Last 4 digits"
            value={idProofLast4}
            onChange={setIdProofLast4}
            keyboardType="numeric"
            maxLength={4}
            hint="Full ID numbers are never stored."
          />
        </Rise>
      )}

      {step === 1 && (
        <Rise index={0}>
          <Text style={styles.stepHint}>Pick a plan, or skip and add one later.</Text>
          {plans.length === 0 ? <Empty>No plans set up yet.</Empty> : (
            <View style={{ gap: 8, marginBottom: 16 }}>
              {plans.map((p) => {
                const on = p.id === planId;
                return (
                  <Tap key={p.id} onPress={() => choosePlan(p)}>
                    <View style={[styles.planCard, on && styles.planCardOn]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.planName}>{p.name}</Text>
                        <Text style={styles.planMeta} numberOfLines={1}>
                          {p.description ?? `${CYCLE_DAYS[p.billingCycle] ?? 30} days of access`}
                        </Text>
                      </View>
                      <Text style={[styles.planPrice, on && { color: palette.brandOnTint }]}>
                        {formatCurrency(p.priceCents)}
                      </Text>
                    </View>
                  </Tap>
                );
              })}
            </View>
          )}

          {plan && (
            <>
              <FieldRow>
                <View style={{ flex: 1 }}><Field label="Start date" value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" /></View>
                <View style={{ flex: 1 }}><Field label="Duration (days)" value={durationDays} onChange={setDurationDays} keyboardType="numeric" /></View>
              </FieldRow>
              <FieldRow>
                <View style={{ flex: 1 }}><Field label="Total fee ₹" value={totalFee} onChange={setTotalFee} keyboardType="numeric" hint="Edit to apply a discount" /></View>
                <View style={{ flex: 1 }}><Field label="Paying now ₹" value={payingNow} onChange={setPayingNow} keyboardType="numeric" /></View>
              </FieldRow>
              <ChipSelect
                label="Payment method"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={[
                  { value: "UPI", label: "UPI" }, { value: "CARD", label: "Card" },
                  { value: "CASH", label: "Cash" }, { value: "BANK_TRANSFER", label: "Bank" },
                  { value: "OTHER", label: "Other" },
                ]}
              />
              {balance > 0 && (
                <Field label="Balance due by" value={balanceDueAt} onChange={setBalanceDueAt} placeholder="YYYY-MM-DD" />
              )}

              <Card style={{ marginTop: 4 }}>
                <SummaryRow label="Access until" value={accessUntil ? accessUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
                <SummaryRow label="Paying now" value={`₹${paidNum.toLocaleString("en-IN")}`} />
                <SummaryRow
                  label="Balance"
                  value={balance > 0 ? `₹${balance.toLocaleString("en-IN")}` : "Paid in full"}
                  tone={balance > 0 ? palette.statusCritical : palette.statusGood}
                  last
                />
              </Card>
            </>
          )}
        </Rise>
      )}

      {step === 2 && (
        <Rise index={0}>
          <Field label="Emergency contact name" value={emergencyName} onChange={setEmergencyName} />
          <FieldRow>
            <View style={{ flex: 1 }}><Field label="Relationship" value={emergencyRelationship} onChange={setEmergencyRelationship} /></View>
            <View style={{ flex: 1 }}><Field label="Phone" value={emergencyPhone} onChange={setEmergencyPhone} keyboardType="phone-pad" /></View>
          </FieldRow>
          <Field label="Medical conditions" value={medicalConditions} onChange={setMedicalConditions} multiline />
          <Field label="Allergies" value={allergies} onChange={setAllergies} />
          <Field label="Medications" value={medications} onChange={setMedications} />
          <Field label="Injuries or limitations" value={injuries} onChange={setInjuries} multiline />

          <View style={styles.checks}>
            <Checkbox label="PAR-Q health questionnaire completed" value={parqCompleted} onChange={setParqCompleted} />
            <Checkbox label="Liability waiver signed" value={waiverSigned} onChange={setWaiverSigned} />
            <Checkbox label="Physician clearance on file" value={physicianClearance} onChange={setPhysicianClearance} />
          </View>
        </Rise>
      )}

      {step === 3 && (
        <Rise index={0}>
          <ChipSelect
            label="Primary goal"
            value={primaryGoal}
            onChange={setPrimaryGoal}
            options={[
              { value: "WEIGHT_LOSS", label: "Weight loss" }, { value: "MUSCLE_GAIN", label: "Muscle gain" },
              { value: "STRENGTH", label: "Strength" }, { value: "ENDURANCE", label: "Endurance" },
              { value: "REHAB", label: "Rehab" }, { value: "GENERAL_FITNESS", label: "General fitness" },
            ]}
          />
          <ChipSelect
            label="Experience level"
            value={experienceLevel}
            onChange={setExperienceLevel}
            options={[
              { value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" },
              { value: "ADVANCED", label: "Advanced" },
            ]}
          />
          <FieldRow>
            <View style={{ flex: 1 }}><Field label="Height (cm)" value={heightCm} onChange={setHeightCm} keyboardType="numeric" /></View>
            <View style={{ flex: 1 }}><Field label="Access card" value={accessCardNumber} onChange={setAccessCardNumber} /></View>
          </FieldRow>
          <PickerField
            label="Assigned trainer"
            items={staff}
            value={assignedTrainerId}
            onChange={setAssignedTrainerId}
            labelOf={(s) => `${s.firstName} ${s.lastName}`}
            subtitleOf={(s) => s.role.charAt(0) + s.role.slice(1).toLowerCase()}
            placeholder="Assign later"
          />
          <Field label="Notes" value={notes} onChange={setNotes} multiline />
        </Rise>
      )}
    </Sheet>
  );
}

function StepBar({ step, onJump }: { step: number; onJump: (i: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepBar}>
      {STEPS.map((label, i) => {
        const on = i === step;
        const done = i < step;
        return (
          <Pressable key={label} onPress={() => onJump(i)} style={styles.stepItem}>
            <View style={[styles.stepDot, on && styles.stepDotOn, done && styles.stepDotDone]}>
              <Text style={[styles.stepNum, (on || done) && { color: palette.brandInk }]}>
                {done ? "✓" : i + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, on && { color: palette.ink, fontWeight: "700" }]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SummaryRow({ label, value, tone, last }: { label: string; value: string; tone?: string; last?: boolean }) {
  return (
    <View style={[styles.summaryRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stepBar: { gap: 8, paddingBottom: 18 },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 8 },
  stepDot: {
    width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.hairline,
  },
  stepDotOn: { backgroundColor: palette.brand, borderColor: palette.brand },
  stepDotDone: { backgroundColor: withAlpha(palette.brand, 0.55), borderColor: "transparent" },
  stepNum: { fontSize: 11, fontWeight: "800", color: palette.inkMuted },
  stepLabel: { fontSize: 12.5, color: palette.inkMuted },

  stepHint: { color: palette.inkMuted, fontSize: 12.5, marginBottom: 12 },

  planCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: palette.surfaceSunken, borderRadius: 14,
    borderWidth: 1, borderColor: palette.hairline, padding: 14,
  },
  planCardOn: { borderColor: palette.brand, backgroundColor: palette.brandSoft },
  planName: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  planMeta: { color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  planPrice: { color: palette.ink, fontSize: 15, fontWeight: "800" },

  summaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
  summaryLabel: { color: palette.inkMuted, fontSize: 12.5 },
  summaryValue: { color: palette.ink, fontSize: 14, fontWeight: "700" },

  checks: { marginTop: 6, gap: 2 },
  error: { color: palette.statusCritical, fontSize: 13 },
  skip: { color: palette.inkMuted, fontSize: 12.5, textAlign: "center", paddingVertical: 4 },
});
