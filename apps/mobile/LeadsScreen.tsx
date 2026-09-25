import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  api,
  type LeadDto,
  type LeadStatus,
  type MembershipPlanDto,
  type StaffDto,
} from "./api";
import {
  Avatar, Bar, Card, ChipSelect, CountUp, DetailRow, Empty, Eyebrow, Field, PickerField,
  Pill, PillTabs, PrimaryButton, Rise, ScreenHeader, SectionTitle, Sheet, Skeleton,
  StatCard, Tap, screenBody,
} from "./components";
import { formatCompact, formatCurrency, formatDate, humanize, palette, withAlpha } from "./theme";

/**
 * The funnel in order. `tone` colours the status Pill; `stat` colours the stat card,
 * which only speaks in good/warning/critical — brand and muted have no stat equivalent.
 */
const STAGES: {
  value: LeadStatus;
  label: string;
  tone: "brand" | "warning" | "good" | "muted";
  stat?: "good" | "warning" | "critical";
}[] = [
  { value: "NEW", label: "New", tone: "brand" },
  { value: "CONTACTED", label: "Contacted", tone: "warning", stat: "warning" },
  { value: "TRIAL", label: "Trial", tone: "good", stat: "good" },
  { value: "CONVERTED", label: "Converted", tone: "good", stat: "good" },
  { value: "LOST", label: "Lost", tone: "muted" },
];

/** Stages 0-2 still move forward; CONVERTED and LOST are terminal. */
const ADVANCEABLE = 3;

type LeadSource = "WALK_IN" | "WEBSITE" | "INSTAGRAM" | "REFERRAL" | "PHONE" | "OTHER";

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "WALK_IN", label: "Walk in" },
  { value: "WEBSITE", label: "Website" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "REFERRAL", label: "Referral" },
  { value: "PHONE", label: "Phone" },
  { value: "OTHER", label: "Other" },
];

const EMPTY_FORM = {
  firstName: "", lastName: "", phone: "", email: "",
  source: "WALK_IN" as LeadSource,
  interestedPlanId: "", assignedTrainerId: "", notes: "", followUpAt: "",
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/**
 * Leads never carry a member id — they haven't joined yet — so `onOpenMember` goes
 * unused here. It stays on the signature so every screen mounts the same way.
 */
export function LeadsScreen(_props: { onOpenMember?: (id: string) => void }) {
  const [leads, setLeads] = useState<LeadDto[]>([]);
  const [funnel, setFunnel] = useState<{ status: LeadStatus; count: number }[]>([]);
  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [tab, setTab] = useState<LeadStatus | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { bootstrap(); }, []);

  async function bootstrap() {
    try {
      const [res, planList, staffList] = await Promise.all([
        api.getLeads(), api.getPlans(), api.getStaff(),
      ]);
      setLeads(res.leads);
      setFunnel(res.funnel);
      setPlans(planList);
      setStaff(staffList);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  /** Plans and staff never change under us, so a refresh only re-pulls the funnel. */
  async function reload() {
    try {
      const res = await api.getLeads();
      setLeads(res.leads);
      setFunnel(res.funnel);
    } catch (e) {
      setError(errorText(e));
    }
  }

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(null), 2200);
  }

  async function advance(lead: LeadDto, status: LeadStatus) {
    setError(null);
    setMovingId(lead.id);
    try {
      await api.updateLead(lead.id, { status });
      await reload();
      flash(`${lead.firstName} moved to ${humanize(status) ?? status}`);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setMovingId(null);
    }
  }

  async function create() {
    setError(null);
    // A typed date is worth checking before the API rejects the whole payload.
    const typed = form.followUpAt.trim();
    const followUp = typed ? new Date(typed) : null;
    if (followUp && Number.isNaN(followUp.getTime())) {
      setError("Follow-up date needs to look like 2026-03-14.");
      return;
    }

    setSaving(true);
    try {
      await api.createLead({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        source: form.source,
        interestedPlanId: form.interestedPlanId || undefined,
        assignedTrainerId: form.assignedTrainerId || undefined,
        notes: form.notes.trim() || undefined,
        followUpAt: followUp?.toISOString(),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      await reload();
      flash("Lead saved");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  const visible = useMemo(
    () => (tab === "ALL" ? leads : leads.filter((l) => l.status === tab)),
    [leads, tab],
  );

  const total = funnel.reduce((sum, f) => sum + f.count, 0);
  const converted = funnel.find((f) => f.status === "CONVERTED")?.count ?? 0;
  const rate = total ? Math.round((converted / total) * 100) : 0;
  const countOf = (status: LeadStatus) => funnel.find((f) => f.status === status)?.count ?? 0;
  const canSave = Boolean(form.firstName.trim() && form.lastName.trim() && form.phone.trim());

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  if (loading) {
    return (
      <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Leads" eyebrow="Pipeline" subtitle="Everyone who has enquired but not yet joined" />
        <Skeleton height={128} />
        <Skeleton height={86} />
        <Skeleton height={86} />
        <Skeleton height={44} />
        <Skeleton height={180} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={screenBody}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenHeader
        title="Leads"
        eyebrow="Pipeline"
        subtitle="Everyone who has enquired but not yet joined"
        action={
          <Tap onPress={() => { setError(null); setOpen(true); }} scaleTo={0.93}>
            <View style={styles.addBtn}><Text style={styles.addText}>+ Add lead</Text></View>
          </Tap>
        }
      />

      {/* A failed write has to land somewhere the user actually looks. */}
      {!open && error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Rise index={0}>
        <Card tone="hero">
          <Eyebrow>Conversion rate</Eyebrow>
          <CountUp value={rate} format={(v) => `${Math.round(v)}%`} style={styles.heroValue} />
          <Text style={styles.rowMeta}>
            {converted} of {total} {total === 1 ? "enquiry" : "enquiries"} joined
          </Text>
          <View style={{ marginTop: 14 }}>
            <Bar value={total ? converted / total : 0} />
          </View>
        </Card>
      </Rise>

      {/* Stat cards double as filters — tapping one is the same as picking its tab. */}
      {[STAGES.slice(0, 2), STAGES.slice(2, 4), STAGES.slice(4)].map((row, i) => (
        <Rise key={i} index={1 + i}>
          <View style={styles.statRow}>
            {row.map((s) => (
              <StatCard
                key={s.value}
                label={s.label}
                value={String(countOf(s.value))}
                tone={s.stat}
                selected={tab === s.value}
                onPress={() => setTab(tab === s.value ? "ALL" : s.value)}
              />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        </Rise>
      ))}

      <Rise index={4}>
        <PillTabs
          tabs={[{ key: "ALL" as const, label: "All" }, ...STAGES.map((s) => ({ key: s.value, label: s.label }))]}
          active={tab}
          onChange={setTab}
        />
      </Rise>

      <SectionTitle
        title={tab === "ALL" ? "All leads" : `${STAGES.find((s) => s.value === tab)?.label} leads`}
        action={<Text style={styles.count}>{visible.length}</Text>}
      />

      {visible.length === 0 ? (
        <Card><Empty>No leads in this stage.</Empty></Card>
      ) : (
        visible.map((lead, i) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            index={i}
            pending={movingId === lead.id}
            onAdvance={(status) => advance(lead, status)}
          />
        ))
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Add a lead"
        subtitle="Capture the enquiry now, convert later"
        footer={
          <>
            {error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton label="Save lead" onPress={create} disabled={!canSave} loading={saving} />
            <PrimaryButton label="Cancel" tone="ghost" onPress={() => setOpen(false)} />
          </>
        }
      >
        <Field label="First name" required value={form.firstName} onChange={(v) => set({ firstName: v })} placeholder="Priya" autoCapitalize="words" />
        <Field label="Last name" required value={form.lastName} onChange={(v) => set({ lastName: v })} placeholder="Sharma" autoCapitalize="words" />
        <Field label="Phone" required value={form.phone} onChange={(v) => set({ phone: v })} placeholder="98765 43210" keyboardType="phone-pad" />
        <Field label="Email" value={form.email} onChange={(v) => set({ email: v })} placeholder="priya@example.com" keyboardType="email-address" autoCapitalize="none" />

        <ChipSelect label="Source" value={form.source} options={SOURCES} onChange={(v) => set({ source: v })} />

        <Field
          label="Follow-up date"
          value={form.followUpAt}
          onChange={(v) => set({ followUpAt: v })}
          placeholder="2026-03-14"
          hint="Leave blank if there's nothing booked yet."
          autoCapitalize="none"
        />

        <PickerField
          label="Interested plan"
          items={plans}
          value={form.interestedPlanId}
          onChange={(id) => set({ interestedPlanId: id })}
          labelOf={(p) => p.name}
          subtitleOf={(p) => `${formatCurrency(p.priceCents)} · ${humanize(p.billingCycle) ?? p.billingCycle}`}
          placeholder="Not sure yet"
        />

        <PickerField
          label="Assign to"
          items={staff}
          value={form.assignedTrainerId}
          onChange={(id) => set({ assignedTrainerId: id })}
          labelOf={(s) => `${s.firstName} ${s.lastName}`}
          subtitleOf={(s) => humanize(s.role) ?? s.role}
          placeholder="Unassigned"
        />

        <Field label="Notes" value={form.notes} onChange={(v) => set({ notes: v })} placeholder="What are they after?" multiline />
      </Sheet>
    </ScrollView>
  );
}

function LeadCard({
  lead, index, pending, onAdvance,
}: {
  lead: LeadDto; index: number; pending: boolean;
  onAdvance: (status: LeadStatus) => void;
}) {
  const idx = STAGES.findIndex((s) => s.value === lead.status);
  const stage = STAGES[idx];
  const next = idx >= 0 && idx < ADVANCEABLE ? STAGES[idx + 1] : null;

  return (
    <Rise index={Math.min(index, 8)}>
      <Card>
        <View style={styles.leadHead}>
          <Avatar first={lead.firstName} last={lead.lastName} size={42} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>{lead.firstName} {lead.lastName}</Text>
            <Text style={styles.rowMeta} numberOfLines={1}>
              {lead.branch?.name ?? "No branch"} · {formatDate(lead.createdAt)}
            </Text>
          </View>
          <Pill label={humanize(lead.status) ?? lead.status} tone={stage?.tone ?? "muted"} />
        </View>

        <View style={{ marginTop: 6 }}>
          <DetailRow label="Phone" value={lead.phone} />
          <DetailRow label="Source" value={humanize(lead.source) ?? lead.source} />
          <DetailRow
            label="Interested in"
            value={lead.interestedPlan
              ? `${lead.interestedPlan.name} · ${formatCompact(lead.interestedPlan.priceCents)}`
              : "Not sure yet"}
          />
          <DetailRow
            label="Trainer"
            value={lead.assignedTrainer
              ? `${lead.assignedTrainer.firstName} ${lead.assignedTrainer.lastName}`
              : "Unassigned"}
          />
          <DetailRow label="Follow-up" value={lead.followUpAt ? formatDate(lead.followUpAt) : "None set"} last />
        </View>

        <View style={styles.leadActions}>
          {pending ? (
            <ActivityIndicator size="small" color={palette.brand} />
          ) : next ? (
            <>
              <Tap onPress={() => onAdvance(next.value)} scaleTo={0.92}>
                <View style={styles.moveBtn}><Text style={styles.moveText}>{next.label} →</Text></View>
              </Tap>
              <Tap onPress={() => onAdvance("LOST")} scaleTo={0.92}>
                <View style={styles.lostBtn}><Text style={styles.lostText}>Lost</Text></View>
              </Tap>
            </>
          ) : (
            <Text style={styles.closed}>Closed</Text>
          )}
        </View>
      </Card>
    </Rise>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: palette.brand, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  addText: { color: palette.brandInk, fontSize: 12.5, fontWeight: "700" },

  error: { color: palette.statusCritical, fontSize: 13, fontWeight: "500" },
  notice: { color: palette.statusGood, fontSize: 13, fontWeight: "500" },

  heroValue: { color: palette.ink, fontSize: 40, fontWeight: "800", letterSpacing: -1.2, marginVertical: 4 },
  statRow: { flexDirection: "row", gap: 12 },
  count: { color: palette.inkMuted, fontSize: 13, fontWeight: "600" },

  leadHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { color: palette.ink, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: palette.inkMuted, fontSize: 12, marginTop: 2 },

  leadActions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, minHeight: 32 },
  moveBtn: {
    borderWidth: 1, borderColor: withAlpha(palette.brand, 0.45), borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  moveText: { color: palette.brandOnTint, fontSize: 12, fontWeight: "700" },
  lostBtn: {
    borderWidth: 1, borderColor: palette.hairlineStrong, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  lostText: { color: palette.inkSecondary, fontSize: 12, fontWeight: "600" },
  closed: { color: palette.inkMuted, fontSize: 12, fontWeight: "600" },
});
