import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  api,
  type AccessReason,
  type DietPlanDto,
  type MemberDetailDto,
  type TimelineEvent,
} from "./api";
import {
  Avatar, Bar, Card, ChipSelect, DetailRow, Empty, Eyebrow, Field,
  Pill, PillTabs, PrimaryButton, Ring, Rise, SectionTitle, Sheet, Tap,
} from "./components";
import { formatCurrency, formatDate, formatTime, humanize, palette, withAlpha } from "./theme";

const { height: SCREEN_H } = Dimensions.get("window");

const ACCESS_LABEL: Record<AccessReason, string> = {
  ACTIVE: "Access allowed",
  EXPIRED: "Expired",
  PAST_DUE: "Payment overdue",
  FROZEN: "On hold",
  CANCELLED: "Cancelled",
  MANUALLY_BLOCKED: "Blocked by staff",
  NO_SUBSCRIPTION: "No plan",
};

function statusColor(reason: AccessReason): string {
  if (reason === "ACTIVE") return palette.statusGood;
  if (reason === "FROZEN") return palette.statusWarning;
  if (reason === "CANCELLED" || reason === "NO_SUBSCRIPTION") return palette.inkMuted;
  return palette.statusCritical;
}

const churnTone = (r: MemberDetailDto["churnRisk"]) =>
  r === "HIGH" ? "critical" : r === "MEDIUM" ? "warning" : r === "LOW" ? "good" : "muted";

// Order mirrors the web console: the generic Overview sits last, on purpose.
type TabKey = "fees" | "training" | "attendance" | "health" | "progress" | "notes" | "overview";
const TABS: { key: TabKey; label: string }[] = [
  { key: "fees", label: "Membership & fees" },
  { key: "training", label: "Training & diet" },
  { key: "attendance", label: "Attendance" },
  { key: "health", label: "Health & safety" },
  { key: "progress", label: "Progress" },
  { key: "notes", label: "Notes" },
  { key: "overview", label: "Overview" },
];

export function MemberSheet({
  memberId, onClose,
}: { memberId: string | null; onClose: () => void }) {
  const [member, setMember] = useState<MemberDetailDto | null>(null);
  const [tab, setTab] = useState<TabKey>("fees");
  const [payOpen, setPayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const slide = useRef(new Animated.Value(SCREEN_H)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!memberId) return;
    setMember(null);
    setTab("fees");
    reload(memberId);

    slide.setValue(SCREEN_H);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 190 }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [memberId]);

  function reload(id: string) {
    api.getMember(id).then(setMember).catch(() => onClose());
  }

  function dismiss() {
    Animated.parallel([
      Animated.timing(slide, { toValue: SCREEN_H, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  }

  return (
    <Modal visible={memberId !== null} transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={dismiss} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: slide }] }]}>
        <View style={styles.grabber} />

        {!member ? (
          <View style={styles.loading}><ActivityIndicator color={palette.brand} /></View>
        ) : (
          <>
            <View style={styles.headWrap}>
              <Head member={member} />
              {member.outstandingCents > 0 && (
                <Tap onPress={() => setPayOpen(true)}>
                  <View style={styles.payBtn}>
                    <Text style={styles.payBtnText}>
                      Record payment · {formatCurrency(member.outstandingCents)} due
                    </Text>
                  </View>
                </Tap>
              )}
              <View style={{ marginTop: 12, marginHorizontal: -16, paddingLeft: 16 }}>
                <PillTabs tabs={TABS} active={tab} onChange={setTab} />
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {tab === "fees" && <FeesTab member={member} />}
              {tab === "training" && <TrainingTab member={member} />}
              {tab === "attendance" && <AttendanceTab member={member} />}
              {tab === "health" && <HealthTab member={member} />}
              {tab === "progress" && <ProgressTab member={member} />}
              {tab === "notes" && <NotesTab member={member} onAdded={() => reload(member.id)} />}
              {tab === "overview" && <OverviewTab member={member} />}

              {toast && <Text style={styles.toast}>{toast}</Text>}

              <Tap onPress={dismiss}>
                <View style={styles.closeBtn}><Text style={styles.closeText}>Close</Text></View>
              </Tap>
            </ScrollView>
          </>
        )}
      </Animated.View>

      {member && (
        <RecordPaymentSheet
          visible={payOpen}
          member={member}
          onClose={() => setPayOpen(false)}
          onRecorded={(msg) => {
            setToast(msg);
            reload(member.id);
            setTimeout(() => setToast(null), 3500);
          }}
        />
      )}
    </Modal>
  );
}

/* ---------------- header ---------------- */

function Head({ member }: { member: MemberDetailDto }) {
  const color = statusColor(member.access.reason);
  const sub = member.subscriptions[0];
  const total = sub
    ? Math.max(1, Math.round(
        (new Date(sub.currentPeriodEnd).getTime() - new Date(sub.startDate).getTime()) / 86_400_000,
      ))
    : 1;
  const left = Math.max(0, member.access.daysRemaining ?? 0);

  return (
    <View style={styles.head}>
      <Ring value={member.access.allowed ? left / total : 0} size={62} stroke={4} color={color}>
        <Avatar first={member.firstName} last={member.lastName} size={46} />
      </Ring>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={1}>{member.firstName} {member.lastName}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {member.subscriptions[0]?.membershipPlan.name ?? "No plan"}
          {member.branch ? ` · ${member.branch.name}` : ""}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 7 }}>
          <Pill
            label={member.access.allowed ? `${left}d left` : ACCESS_LABEL[member.access.reason]}
            tone={member.access.allowed ? "good" : member.access.reason === "FROZEN" ? "warning" : "critical"}
          />
          <Pill label={`${humanize(member.churnRisk)} risk`} tone={churnTone(member.churnRisk)} />
        </View>
      </View>
    </View>
  );
}

/* ---------------- tab 1 · membership & fees ---------------- */

function FeesTab({ member }: { member: MemberDetailDto }) {
  const s = member.paymentSummary;
  const sub = member.subscriptions[0];
  const payments = sub?.payments ?? [];

  return (
    <>
      <Rise index={0}>
        <Card tone="hero">
          <Eyebrow>{s.billingCycle ? humanize(s.billingCycle) ?? "" : "Membership"}</Eyebrow>
          <Text style={styles.planName}>{s.planName ?? "No active plan"}</Text>
          <View style={styles.moneyRow}>
            <Money label="Total billed" value={s.totalBilledCents} />
            <Money label="Paid" value={s.paidCents} tone={palette.statusGood} />
            <Money label="Remaining" value={s.outstandingCents} tone={s.outstandingCents > 0 ? palette.statusCritical : palette.inkMuted} />
          </View>
          <View style={{ marginTop: 14, gap: 7 }}>
            <Bar value={s.paidRatio} color={s.outstandingCents > 0 ? palette.statusWarning : palette.statusGood} height={7} />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={styles.meta}>{Math.round(s.paidRatio * 100)}% collected · {s.instalments} instalment{s.instalments === 1 ? "" : "s"}</Text>
              {s.nextDueAt && <Text style={styles.metaWarn}>Next due {formatDate(s.nextDueAt)}</Text>}
            </View>
          </View>
        </Card>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="Current plan" />
          <DetailRow label="Plan" value={sub?.membershipPlan.name ?? "—"} />
          <DetailRow label="Status" value={ACCESS_LABEL[member.access.reason]} tone={statusColor(member.access.reason)} />
          <DetailRow label="Started" value={sub ? formatDate(sub.startDate) : "—"} />
          <DetailRow label="Valid until" value={member.access.validUntil ? formatDate(member.access.validUntil) : "—"} />
          <DetailRow
            label="Days remaining"
            value={member.access.daysRemaining === null ? "—" : member.access.daysRemaining < 0 ? `${Math.abs(member.access.daysRemaining)}d overdue` : `${member.access.daysRemaining} days`}
            last
          />
        </Card>
      </Rise>

      <Rise index={2}>
        <Card>
          <SectionTitle title="Fee & access timeline" />
          {member.timeline.map((e, i) => (
            <TimelineRow key={e.id} event={e} index={i} last={i === member.timeline.length - 1} />
          ))}
        </Card>
      </Rise>

      <Rise index={3}>
        <Card>
          <SectionTitle title="Payment history" action={<Text style={styles.count}>{payments.length}</Text>} />
          {payments.length === 0 ? <Empty>No payments recorded.</Empty> : payments.slice(0, 10).map((p, i, arr) => (
            <View key={p.id} style={[styles.row, i === arr.length - 1 && styles.rowLast]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>{formatCurrency(p.amountCents)}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {humanize(p.method) ?? "—"} · {p.paidAt ? formatDate(p.paidAt) : p.dueAt ? `due ${formatDate(p.dueAt)}` : formatDate(p.createdAt)}
                </Text>
              </View>
              <Pill
                label={humanize(p.status) ?? p.status}
                tone={p.status === "SUCCEEDED" ? "good" : p.status === "FAILED" ? "critical" : "warning"}
              />
            </View>
          ))}
        </Card>
      </Rise>
    </>
  );
}

function Money({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.moneyLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.moneyValue, tone ? { color: tone } : null]} numberOfLines={1}>
        {formatCurrency(value)}
      </Text>
    </View>
  );
}

/* ---------------- tab 2 · training & diet ---------------- */

function TrainingTab({ member }: { member: MemberDetailDto }) {
  const pt = member.ptSummary;
  const trainer = member.ptPackages[0]?.trainer ?? member.assignedTrainer;
  const notes = member.ptPackages
    .flatMap((p) => p.sessions)
    .filter((s) => s.status === "COMPLETED" && s.notes)
    .slice(0, 3);

  return (
    <>
      <Rise index={0}>
        <Card>
          <SectionTitle title="Personal training" />
          {pt.purchased === 0 ? <Empty>No PT package yet.</Empty> : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                <Ring value={pt.used / Math.max(1, pt.purchased)} size={94} stroke={8} color={palette.brand}>
                  <Text style={styles.ringValue}>{pt.remaining}</Text>
                  <Text style={styles.ringUnit}>left</Text>
                </Ring>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <DetailRow label="Trainer" value={trainer ? `${trainer.firstName} ${trainer.lastName}` : "Unassigned"} />
                  <DetailRow label="Purchased" value={String(pt.purchased)} />
                  <DetailRow label="Completed" value={String(pt.used)} />
                  <DetailRow label="Booked ahead" value={String(pt.scheduled)} last />
                </View>
              </View>
              <View style={{ marginTop: 14 }}>
                <Bar value={pt.used / Math.max(1, pt.purchased)} />
              </View>
            </>
          )}

          {member.upcomingSessions.length > 0 && (
            <View style={{ marginTop: 16, gap: 8 }}>
              <Text style={styles.subLabel}>Next sessions</Text>
              {member.upcomingSessions.map((s) => (
                <View key={s.id} style={styles.sessionRow}>
                  <View style={styles.dateChip}><Text style={styles.dateChipText}>{formatDate(s.scheduledAt)}</Text></View>
                  <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{s.focus ?? "Session"}</Text>
                  <Text style={styles.meta}>{formatTime(s.scheduledAt)}</Text>
                </View>
              ))}
            </View>
          )}

          {notes.length > 0 && (
            <View style={{ marginTop: 16, gap: 8 }}>
              <Text style={styles.subLabel}>Trainer notes</Text>
              {notes.map((s) => (
                <View key={s.id}>
                  <Text style={styles.noteBody}>{s.notes}</Text>
                  <Text style={styles.meta}>{formatDate(s.scheduledAt)} · {s.focus ?? "Session"}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </Rise>

      <Rise index={1}>
        <DietCard plan={member.activeDietPlan} />
      </Rise>
    </>
  );
}

function DietCard({ plan }: { plan: DietPlanDto | null }) {
  if (!plan) {
    return <Card><SectionTitle title="Diet plan" /><Empty>No diet plan assigned.</Empty></Card>;
  }
  return (
    <Card>
      <Eyebrow>{humanize(plan.goal) ?? "Plan"}</Eyebrow>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}>
        <Text style={[styles.planName, { flex: 1 }]} numberOfLines={1}>{plan.title}</Text>
        <Pill label={plan.isActive ? "Active" : "Archived"} tone={plan.isActive ? "good" : "muted"} />
      </View>
      <Text style={styles.meta}>
        {plan.trainer ? `Set by ${plan.trainer.firstName} ${plan.trainer.lastName} · ` : ""}from {formatDate(plan.startDate)}
      </Text>

      <View style={styles.macroRow}>
        <Macro label="kcal" value={plan.dailyCalories} />
        <Macro label="Protein" value={plan.proteinG} unit="g" />
        <Macro label="Carbs" value={plan.carbsG} unit="g" />
        <Macro label="Fat" value={plan.fatG} unit="g" />
      </View>

      {plan.meals?.length > 0 && (
        <View style={{ marginTop: 16, gap: 10 }}>
          <Text style={styles.subLabel}>Daily meals</Text>
          {plan.meals.map((m, i) => (
            <View key={i} style={styles.mealRow}>
              <View style={styles.timeChip}><Text style={styles.timeChipText}>{m.time}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>{m.name}{m.calories ? ` · ${m.calories} kcal` : ""}</Text>
                <Text style={styles.meta}>{m.items.join(", ")}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {plan.notes && <Text style={[styles.noteBody, { marginTop: 14 }]}>{plan.notes}</Text>}
    </Card>
  );
}

function Macro({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <View style={styles.macro}>
      <Text style={styles.macroValue}>{value ?? "—"}{value && unit ? unit : ""}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

/* ---------------- tab 3 · attendance ---------------- */

function AttendanceTab({ member }: { member: MemberDetailDto }) {
  const v = member.visits;
  const atRisk = member.churnRisk === "HIGH" || member.churnRisk === "MEDIUM";

  return (
    <>
      <Rise index={0}>
        <Card>
          <SectionTitle title="Visit summary" />
          <DetailRow
            label="Last visit"
            value={v.daysSinceLastVisit === null ? "Never" : v.daysSinceLastVisit === 0 ? "Today" : `${v.daysSinceLastVisit} days ago`}
            tone={(v.daysSinceLastVisit ?? 0) >= 14 ? palette.statusCritical : undefined}
          />
          <DetailRow label="Last 30 days" value={`${v.visitsLast30} visits`} />
          <DetailRow label="Previous 30" value={`${v.visitsPrev30} visits`} />
          <DetailRow
            label="Trend"
            value={v.trendPercent === null ? "—" : `${v.trendPercent > 0 ? "+" : ""}${v.trendPercent}%`}
            tone={v.trendPercent === null || v.trendPercent === 0 ? undefined : v.trendPercent > 0 ? palette.statusGood : palette.statusCritical}
          />
          <DetailRow label="Usual time" value={v.usualHour === null ? "—" : `${v.usualHour}:00`} />
          <DetailRow label="Retention" value={`${humanize(member.churnRisk)} risk`} tone={member.churnRisk === "HIGH" ? palette.statusCritical : undefined} last />
        </Card>
      </Rise>

      {atRisk && (
        <Rise index={1}>
          <View style={styles.callout}>
            <Text style={styles.calloutTitle}>Worth a call</Text>
            <Text style={styles.calloutBody}>
              {v.daysSinceLastVisit === null
                ? "This member has never checked in."
                : `Last seen ${v.daysSinceLastVisit} days ago, and attendance is trending down.`}
            </Text>
          </View>
        </Rise>
      )}

      <Rise index={2}>
        <Card>
          <SectionTitle title="Recent check-ins" action={<Text style={styles.count}>{member.attendanceEvents.length}</Text>} />
          {member.attendanceEvents.length === 0 ? <Empty>No check-ins on record.</Empty>
            : member.attendanceEvents.slice(0, 20).map((e, i, arr) => (
              <View key={e.id} style={[styles.row, i === arr.length - 1 && styles.rowLast]}>
                <Text style={[styles.rowTitle, { flex: 1 }]}>{formatDate(e.checkedInAt)}</Text>
                <Text style={styles.meta}>{formatTime(e.checkedInAt)}</Text>
                <Pill label={humanize(e.source) ?? e.source} tone="muted" />
              </View>
            ))}
        </Card>
      </Rise>
    </>
  );
}

/* ---------------- tab 4 · health & safety ---------------- */

function HealthTab({ member }: { member: MemberDetailDto }) {
  const incomplete = !member.parqCompletedAt || !member.waiverSignedAt;
  return (
    <>
      <Rise index={0}>
        <Card>
          <SectionTitle title="Medical screening" />
          <DetailRow label="Conditions" value={member.medicalConditions ?? "None recorded"} />
          <DetailRow label="Allergies" value={member.allergies ?? "None recorded"} />
          <DetailRow label="Medications" value={member.medications ?? "None recorded"} />
          <DetailRow label="Injuries" value={member.injuries ?? "None recorded"} />
          <DetailRow label="Physician clearance" value={member.physicianClearance ? "On file" : "Not provided"} last />
        </Card>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="Compliance" />
          <DetailRow
            label="PAR-Q"
            value={member.parqCompletedAt ? `Completed ${formatDate(member.parqCompletedAt)}` : "Not completed"}
            tone={member.parqCompletedAt ? palette.statusGood : palette.statusCritical}
          />
          <DetailRow
            label="Waiver"
            value={member.waiverSignedAt ? `Signed ${formatDate(member.waiverSignedAt)}` : "Not signed"}
            tone={member.waiverSignedAt ? palette.statusGood : palette.statusCritical}
            last
          />
          {incomplete && (
            <View style={styles.warnBanner}>
              <Text style={styles.warnText}>
                Paperwork is incomplete — collect this before the next session.
              </Text>
            </View>
          )}
        </Card>
      </Rise>

      <Rise index={2}>
        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>Emergency contact</Text>
          {member.emergencyName ? (
            <>
              <Text style={styles.rowTitle}>
                {member.emergencyName}
                <Text style={styles.meta}> · {member.emergencyRelationship}</Text>
              </Text>
              <Text style={styles.meta}>{member.emergencyPhone}</Text>
            </>
          ) : (
            <Text style={styles.safetyText}>No emergency contact on file. Ask at the next visit.</Text>
          )}
        </View>
      </Rise>
    </>
  );
}

/* ---------------- tab 5 · progress ---------------- */

function ProgressTab({ member }: { member: MemberDetailDto }) {
  const m = member.latestMeasurement;
  const first = member.measurements[member.measurements.length - 1];
  const delta =
    m?.weightKg != null && first?.weightKg != null ? m.weightKg - first.weightKg : null;

  return (
    <>
      <Rise index={0}>
        <Card>
          <SectionTitle title="Current metrics" />
          <DetailRow label="Goal" value={humanize(member.primaryGoal) ?? "Not set"} />
          <DetailRow label="Height" value={member.heightCm ? `${member.heightCm} cm` : "—"} />
          <DetailRow label="Weight" value={m?.weightKg != null ? `${m.weightKg} kg` : "—"} />
          <DetailRow label="BMI" value={member.bmi != null ? member.bmi.toFixed(1) : "—"} />
          <DetailRow label="Body fat" value={m?.bodyFatPercent != null ? `${m.bodyFatPercent}%` : "—"} />
          <DetailRow label="Waist" value={m?.waistCm != null ? `${m.waistCm} cm` : "—"} />
          <DetailRow label="Chest" value={m?.chestCm != null ? `${m.chestCm} cm` : "—"} />
          <DetailRow
            label="Since first record"
            value={delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
            tone={delta === null || delta === 0 ? undefined : delta < 0 ? palette.statusGood : palette.statusWarning}
            last
          />
        </Card>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="Measurement history" action={<Text style={styles.count}>{member.measurements.length}</Text>} />
          {member.measurements.length === 0 ? <Empty>No measurements recorded.</Empty>
            : member.measurements.map((x, i, arr) => (
              <View key={x.id} style={[styles.row, i === arr.length - 1 && styles.rowLast]}>
                <Text style={[styles.rowTitle, { flex: 1 }]}>{formatDate(x.recordedAt)}</Text>
                <Text style={styles.meta}>{x.weightKg != null ? `${x.weightKg} kg` : "—"}</Text>
                <Text style={styles.meta}>{x.bodyFatPercent != null ? `${x.bodyFatPercent}%` : "—"}</Text>
                <Text style={styles.meta}>{x.waistCm != null ? `${x.waistCm} cm` : "—"}</Text>
              </View>
            ))}
        </Card>
      </Rise>
    </>
  );
}

/* ---------------- tab 6 · notes ---------------- */

function NotesTab({ member, onAdded }: { member: MemberDetailDto; onAdded: () => void }) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.addNote(member.id, body.trim());
      setBody("");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Rise index={0}>
        <Card>
          <SectionTitle title="Add a note" />
          <Field label="" value={body} onChange={setBody} multiline placeholder="What should the next person on the desk know?" />
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label="Add note" onPress={add} disabled={!body.trim()} loading={saving} />
        </Card>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="Notes" action={<Text style={styles.count}>{member.memberNotes.length}</Text>} />
          {member.memberNotes.length === 0 ? <Empty>No notes yet.</Empty>
            : member.memberNotes.map((n, i, arr) => (
              <View key={n.id} style={[styles.row, { alignItems: "flex-start" }, i === arr.length - 1 && styles.rowLast]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.noteBody}>{n.pinned ? "📌  " : ""}{n.body}</Text>
                  <Text style={styles.meta}>
                    {n.author ? `${n.author.firstName} ${n.author.lastName} · ` : ""}{formatDate(n.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
        </Card>
      </Rise>
    </>
  );
}

/* ---------------- tab 7 · overview ---------------- */

function OverviewTab({ member }: { member: MemberDetailDto }) {
  return (
    <>
      <Rise index={0}>
        <Card>
          <SectionTitle title="Contact & identity" />
          <DetailRow label="Phone" value={member.phone ?? "—"} />
          <DetailRow label="Alternate" value={member.alternatePhone ?? "—"} />
          <DetailRow label="Email" value={member.email} />
          <DetailRow label="Preferred" value={humanize(member.preferredContact) ?? "—"} />
          <DetailRow label="Date of birth" value={member.dateOfBirth ? formatDate(member.dateOfBirth) : "—"} />
          <DetailRow label="Gender" value={humanize(member.gender) ?? "—"} />
          <DetailRow label="Occupation" value={member.occupation ?? "—"} />
          <DetailRow
            label="Address"
            value={[member.addressLine, member.city, member.state, member.postalCode].filter(Boolean).join(", ") || "—"}
          />
          <DetailRow
            label="ID proof"
            value={member.idProofLast4 ? `${humanize(member.idProofType)} ····${member.idProofLast4}` : "—"}
          />
          <DetailRow label="Access card" value={member.accessCardNumber ?? "—"} last />
        </Card>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="Training" />
          <DetailRow label="Goal" value={humanize(member.primaryGoal) ?? "—"} />
          <DetailRow label="Experience" value={humanize(member.experienceLevel) ?? "—"} />
          <DetailRow
            label="Trainer"
            value={member.assignedTrainer ? `${member.assignedTrainer.firstName} ${member.assignedTrainer.lastName}` : "Unassigned"}
          />
          <DetailRow label="PT sessions" value={`${member.ptSummary.remaining} of ${member.ptSummary.purchased} left`} last />
        </Card>
      </Rise>
    </>
  );
}

/* ---------------- record payment ---------------- */

function RecordPaymentSheet({
  visible, member, onClose, onRecorded,
}: {
  visible: boolean; member: MemberDetailDto;
  onClose: () => void; onRecorded: (msg: string) => void;
}) {
  const outstanding = Math.round(member.outstandingCents / 100);
  const [amount, setAmount] = useState(String(outstanding));
  const [method, setMethod] = useState("UPI");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (visible) setAmount(String(outstanding)); }, [visible, outstanding]);

  const amt = Number(amount) || 0;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.recordPayment({
        memberId: member.id,
        amountCents: Math.round(amt * 100),
        method,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onRecorded(
        `₹${amt.toLocaleString("en-IN")} recorded · ${res.invoiceNumber}${res.balanceCleared ? " · balance cleared" : ""}`,
      );
      setNote("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Record payment"
      subtitle={`${member.firstName} ${member.lastName} · ${formatCurrency(member.outstandingCents)} outstanding`}
      footer={
        <>
          {error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton label={`Record ₹${amt.toLocaleString("en-IN")}`} onPress={submit} disabled={amt <= 0} loading={saving} />
        </>
      }
    >
      <Field label="Amount ₹" value={amount} onChange={setAmount} keyboardType="numeric" />

      <View style={{ flexDirection: "row", gap: 7, marginBottom: 16 }}>
        {[
          { label: "Full", v: outstanding },
          { label: "Half", v: Math.round(outstanding / 2) },
          { label: "₹1,000", v: 1000 },
        ].map((q) => (
          <Tap key={q.label} onPress={() => setAmount(String(q.v))}>
            <View style={styles.quick}><Text style={styles.quickText}>{q.label}</Text></View>
          </Tap>
        ))}
      </View>

      <ChipSelect
        label="Method"
        value={method}
        onChange={setMethod}
        options={[
          { value: "UPI", label: "UPI" }, { value: "CARD", label: "Card" },
          { value: "CASH", label: "Cash" }, { value: "BANK_TRANSFER", label: "Bank transfer" },
        ]}
      />
      <Field label="Note" value={note} onChange={setNote} placeholder="Optional reference" />
    </Sheet>
  );
}

/* ---------------- timeline ---------------- */

function TimelineRow({ event, index, last }: { event: TimelineEvent; index: number; last: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 360, delay: 200 + index * 45,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  }, []);

  const dot =
    event.status === "good" ? palette.statusGood
    : event.status === "critical" ? palette.statusCritical
    : event.status === "warning" ? palette.statusWarning
    : palette.inkMuted;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        flexDirection: "row", gap: 12,
      }}
    >
      {/* The gutter draws the rail, so the dots read as one continuous thread. */}
      <View style={styles.gutter}>
        <View style={[styles.dot, { backgroundColor: dot }]} />
        {!last && <View style={styles.rail} />}
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingBottom: last ? 0 : 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>{event.title}</Text>
          {event.amountCents !== undefined && (
            <Text style={styles.rowTitle}>{formatCurrency(event.amountCents)}</Text>
          )}
        </View>
        <Text style={styles.meta}>
          {formatDate(event.at)}{new Date(event.at) > new Date() ? " · upcoming" : ""}
        </Text>
      </View>
    </Animated.View>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: palette.overlay },
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, top: 40,
    backgroundColor: palette.page,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderTopWidth: 1, borderColor: palette.hairlineStrong, paddingTop: 10,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: palette.baseline },
  loading: { paddingVertical: 70, alignItems: "center" },

  headWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: palette.hairline },
  head: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: { fontSize: 20, fontWeight: "700", color: palette.ink, letterSpacing: -0.4 },
  meta: { fontSize: 12, color: palette.inkMuted, marginTop: 2 },
  metaWarn: { fontSize: 12, color: palette.statusWarning, marginTop: 2 },

  payBtn: {
    marginTop: 12, backgroundColor: palette.brand, borderRadius: 999,
    paddingVertical: 12, alignItems: "center",
  },
  payBtnText: { color: palette.brandInk, fontSize: 13.5, fontWeight: "700" },

  body: { padding: 16, paddingBottom: 36, gap: 12 },

  planName: { fontSize: 19, fontWeight: "700", color: palette.ink, letterSpacing: -0.4, marginTop: 4 },
  moneyRow: {
    flexDirection: "row", gap: 10, marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: palette.hairline,
  },
  moneyLabel: { color: palette.inkMuted, fontSize: 11 },
  moneyValue: { color: palette.ink, fontSize: 15, fontWeight: "800", marginTop: 3, letterSpacing: -0.3 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
  rowLast: { borderBottomWidth: 0 },
  rowTitle: { color: palette.ink, fontSize: 13.5, fontWeight: "600" },
  count: { color: palette.inkMuted, fontSize: 13, fontWeight: "600" },
  subLabel: { color: palette.inkSecondary, fontSize: 11.5, fontWeight: "700" },
  noteBody: { color: palette.inkSecondary, fontSize: 13, lineHeight: 19 },

  ringValue: { fontSize: 22, fontWeight: "800", color: palette.ink, letterSpacing: -0.6 },
  ringUnit: { fontSize: 10, color: palette.inkMuted },

  sessionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mealRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dateChip: { backgroundColor: palette.brandSoft, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  dateChipText: { color: palette.brandOnTint, fontSize: 11, fontWeight: "700" },
  timeChip: { backgroundColor: palette.surfaceRaised, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, minWidth: 62, alignItems: "center" },
  timeChipText: { color: palette.inkSecondary, fontSize: 11, fontWeight: "700" },

  macroRow: {
    flexDirection: "row", gap: 8, marginTop: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: palette.hairline,
  },
  macro: { flex: 1, minWidth: 0, alignItems: "center" },
  macroValue: { color: palette.ink, fontSize: 16, fontWeight: "800" },
  macroLabel: { color: palette.inkMuted, fontSize: 10.5, marginTop: 3 },

  callout: {
    borderRadius: 18, borderWidth: 1,
    borderColor: withAlpha(palette.statusWarning, 0.3),
    backgroundColor: withAlpha(palette.statusWarning, 0.07), padding: 16,
  },
  calloutTitle: { color: palette.statusWarning, fontSize: 13, fontWeight: "700", marginBottom: 4 },
  calloutBody: { color: palette.inkSecondary, fontSize: 13, lineHeight: 19 },

  warnBanner: {
    marginTop: 12, borderRadius: 12, padding: 12,
    backgroundColor: withAlpha(palette.statusWarning, 0.1),
  },
  warnText: { color: palette.statusWarning, fontSize: 12.5, lineHeight: 18 },

  safetyCard: {
    borderRadius: 18, borderWidth: 1,
    borderColor: withAlpha(palette.statusCritical, 0.25),
    backgroundColor: withAlpha(palette.statusCritical, 0.06), padding: 16, gap: 3,
  },
  safetyTitle: { fontSize: 13, fontWeight: "700", color: palette.statusCritical, marginBottom: 4 },
  safetyText: { fontSize: 13, color: palette.inkSecondary, lineHeight: 19 },

  gutter: { width: 14, alignItems: "center" },
  dot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  rail: { flex: 1, width: 1.5, backgroundColor: palette.hairlineStrong, marginTop: 4 },

  quick: {
    borderWidth: 1, borderColor: palette.hairlineStrong, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  quickText: { color: palette.inkSecondary, fontSize: 12.5, fontWeight: "600" },

  toast: {
    color: palette.statusGood, fontSize: 13, textAlign: "center",
    backgroundColor: withAlpha(palette.statusGood, 0.1), borderRadius: 12, padding: 12,
  },
  error: { color: palette.statusCritical, fontSize: 13, marginBottom: 10 },

  closeBtn: {
    marginTop: 4, borderRadius: 999, borderWidth: 1, borderColor: palette.hairlineStrong,
    paddingVertical: 14, alignItems: "center", backgroundColor: palette.surface,
  },
  closeText: { fontSize: 14, fontWeight: "700", color: palette.inkSecondary },
});
