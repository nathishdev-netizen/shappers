import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type DietPlanDto, type Meal, type MemberDto, type StaffDto } from "./api";
import {
  Avatar, Card, ChipSelect, CountUp, Empty, Eyebrow, Field, FieldRow, PickerField,
  Pill, PrimaryButton, Rise, ScreenHeader, SectionTitle, Sheet, Skeleton, StatCard,
  Tap, screenBody,
} from "./components";
import { formatDate, humanize, palette, withAlpha } from "./theme";

const GOALS = ["FAT_LOSS", "MUSCLE_GAIN", "MAINTENANCE", "PERFORMANCE"] as const;

/** Calories live as strings in the form — a TextInput has no number to give back. */
type MealDraft = { time: string; name: string; items: string; calories: string };

const TEMPLATE: MealDraft[] = [
  { time: "7:30 AM", name: "Breakfast", items: "Oats, Eggs, Fruit", calories: "500" },
  { time: "1:00 PM", name: "Lunch", items: "Rice, Protein 150g, Vegetables", calories: "650" },
  { time: "5:00 PM", name: "Pre-workout", items: "Toast + peanut butter", calories: "250" },
  { time: "8:00 PM", name: "Dinner", items: "Protein 150g, Roti, Dal, Salad", calories: "600" },
];

const BLANK = {
  memberId: "", trainerId: "", title: "", goal: "MAINTENANCE",
  dailyCalories: "2000", proteinG: "130", carbsG: "220", fatG: "65",
  notes: "", meals: TEMPLATE,
};

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

const goalTone = (goal: string) =>
  goal === "FAT_LOSS" ? "warning" : goal === "MUSCLE_GAIN" ? "brand" : "muted";

export function DietScreen({ onOpenMember, onBack }: { onOpenMember?: (id: string) => void; onBack?: () => void }) {
  const [plans, setPlans] = useState<DietPlanDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The plan outlives its sheet's exit animation, so the panel doesn't blank mid-slide.
  const [selected, setSelected] = useState<DietPlanDto | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    try {
      const [p, m, s] = await Promise.all([api.getDietPlans(), api.getMembers(), api.getStaff()]);
      setPlans(p); setMembers(m); setStaff(s);
      setError(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setSaving(true);
    setFormError(null);
    try {
      await api.createDietPlan({
        memberId: form.memberId,
        trainerId: form.trainerId || undefined,
        title: form.title.trim(),
        goal: form.goal,
        dailyCalories: Number(form.dailyCalories) || undefined,
        proteinG: Number(form.proteinG) || undefined,
        carbsG: Number(form.carbsG) || undefined,
        fatG: Number(form.fatG) || undefined,
        notes: form.notes.trim() || undefined,
        meals: form.meals
          .filter((m) => m.name.trim())
          .map<Meal>((m) => ({
            time: m.time.trim(),
            name: m.name.trim(),
            items: m.items.split(",").map((s) => s.trim()).filter(Boolean),
            calories: Number(m.calories) || undefined,
          })),
      });
      setOpen(false);
      setForm(BLANK);
      setPlans(await api.getDietPlans());
    } catch (e) {
      setFormError(message(e));
    } finally {
      setSaving(false);
    }
  }

  const setMeal = (i: number, patch: Partial<MealDraft>) =>
    setForm((f) => ({ ...f, meals: f.meals.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));

  const active = plans.filter((p) => p.isActive);
  const avgCalories = active.length
    ? Math.round(active.reduce((t, p) => t + (p.dailyCalories ?? 0), 0) / active.length)
    : 0;

  if (loading) {
    return (
      <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} eyebrow="Nutrition" title="Diet plans" subtitle="Nutrition plans your trainers have set" />
        <Skeleton height={86} /><Skeleton height={240} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ScreenHeader onBack={onBack} eyebrow="Nutrition" title="Diet plans" subtitle="Nutrition plans your trainers have set" />

      <PrimaryButton label="New plan" onPress={() => { setFormError(null); setOpen(true); }} />

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      <Rise index={0}>
        <View style={styles.statRow}>
          <StatCard label="Active plans" value={String(active.length)} />
          <StatCard label="Avg daily target" value={`${avgCalories.toLocaleString("en-IN")} kcal`} hint="Across active plans" />
        </View>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="All plans" action={<Text style={styles.count}>{plans.length}</Text>} />
          {plans.length === 0 ? <Empty>No diet plans yet.</Empty> : plans.map((p, i) => (
            // Archived plans stay visible but dimmed — history, not clutter.
            <Tap key={p.id} onPress={() => { setSelected(p); setPlanOpen(true); }}>
              <View style={[styles.row, i === plans.length - 1 && styles.rowLast, !p.isActive && { opacity: 0.6 }]}>
                <Avatar first={p.member?.firstName ?? "?"} last={p.member?.lastName ?? ""} size={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Tap onPress={() => p.member && onOpenMember?.(p.member.id)} scaleTo={0.98}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {p.member?.firstName} {p.member?.lastName}
                    </Text>
                  </Tap>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {p.title} · {p.dailyCalories ?? "—"} kcal
                  </Text>
                </View>
                <Pill label={humanize(p.goal) ?? p.goal} tone={goalTone(p.goal)} />
              </View>
            </Tap>
          ))}
        </Card>
      </Rise>

      {/* ---------------- the plan itself ---------------- */}

      <Sheet visible={planOpen} onClose={() => setPlanOpen(false)} title="Diet plan">
        {selected && (
          <>
            <View style={styles.planHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Eyebrow>{humanize(selected.goal) ?? selected.goal}</Eyebrow>
                <Text style={styles.planTitle}>{selected.title}</Text>
                <Text style={styles.planFor}>
                  For {selected.member?.firstName} {selected.member?.lastName}
                  {selected.trainer ? ` · set by ${selected.trainer.firstName} ${selected.trainer.lastName}` : ""}
                  {` · from ${formatDate(selected.startDate)}`}
                </Text>
              </View>
              <Pill label={selected.isActive ? "Active" : "Archived"} tone={selected.isActive ? "good" : "muted"} />
            </View>

            <View style={styles.macroRow}>
              <Macro label="Calories" value={selected.dailyCalories} unit="kcal" accent />
              <Macro label="Protein" value={selected.proteinG} unit="g" />
              <Macro label="Carbs" value={selected.carbsG} unit="g" />
              <Macro label="Fat" value={selected.fatG} unit="g" />
            </View>

            <Text style={styles.blockTitle}>Daily meals</Text>
            {selected.meals.length === 0 ? <Empty>No meals on this plan.</Empty> : selected.meals.map((m, i) => (
              <View key={i} style={styles.mealRow}>
                <Text style={styles.mealTime}>{m.time}</Text>
                <View style={styles.mealSpine}>
                  <View style={styles.mealDot} />
                  {i < selected.meals.length - 1 && <View style={styles.mealLine} />}
                </View>
                <View style={styles.mealCard}>
                  <View style={styles.mealCardHead}>
                    <Text style={styles.mealName} numberOfLines={1}>{m.name}</Text>
                    {!!m.calories && <Text style={styles.rowMeta}>{m.calories} kcal</Text>}
                  </View>
                  <Text style={styles.mealItems}>{m.items.join(" · ")}</Text>
                </View>
              </View>
            ))}

            {selected.notes && (
              <View style={styles.notes}>
                <Text style={styles.notesText}>{selected.notes}</Text>
              </View>
            )}
          </>
        )}
      </Sheet>

      {/* ---------------- new plan ---------------- */}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="New diet plan"
        subtitle="Replaces the member's current active plan"
        footer={
          <>
            {formError && <Text style={styles.errorText}>{formError}</Text>}
            <PrimaryButton
              label="Save plan"
              onPress={create}
              loading={saving}
              disabled={!form.memberId || !form.title.trim()}
            />
          </>
        }
      >
        <PickerField
          label="Member"
          required
          items={members}
          value={form.memberId}
          onChange={(id) => setForm({ ...form, memberId: id })}
          labelOf={(m) => `${m.firstName} ${m.lastName}`}
          subtitleOf={(m) => m.email}
        />

        <Field
          label="Title"
          required
          value={form.title}
          onChange={(v) => setForm({ ...form, title: v })}
          placeholder="e.g. Lean & Strong 8-week"
        />

        <ChipSelect
          label="Goal"
          value={form.goal}
          options={GOALS.map((g) => ({ value: g as string, label: humanize(g) ?? g }))}
          onChange={(v) => setForm({ ...form, goal: v })}
        />

        <ChipSelect
          label="Set by"
          value={form.trainerId}
          options={[
            { value: "", label: "Not set" },
            ...staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` })),
          ]}
          onChange={(id) => setForm({ ...form, trainerId: id })}
        />

        <FieldRow>
          <View style={{ flex: 1 }}>
            <Field label="Calories" value={form.dailyCalories} onChange={(v) => setForm({ ...form, dailyCalories: v })} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Protein (g)" value={form.proteinG} onChange={(v) => setForm({ ...form, proteinG: v })} keyboardType="numeric" />
          </View>
        </FieldRow>

        <FieldRow>
          <View style={{ flex: 1 }}>
            <Field label="Carbs (g)" value={form.carbsG} onChange={(v) => setForm({ ...form, carbsG: v })} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Fat (g)" value={form.fatG} onChange={(v) => setForm({ ...form, fatG: v })} keyboardType="numeric" />
          </View>
        </FieldRow>

        <Text style={styles.blockTitle}>Meals</Text>
        {form.meals.map((m, i) => (
          <View key={i} style={styles.mealDraft}>
            <FieldRow>
              <View style={{ flex: 1 }}>
                <Field label="Time" value={m.time} onChange={(v) => setMeal(i, { time: v })} placeholder="7:30 AM" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Calories" value={m.calories} onChange={(v) => setMeal(i, { calories: v })} keyboardType="numeric" />
              </View>
            </FieldRow>
            <Field label="Name" value={m.name} onChange={(v) => setMeal(i, { name: v })} placeholder="Breakfast" />
            <Field
              label="Items"
              value={m.items}
              onChange={(v) => setMeal(i, { items: v })}
              placeholder="Oats, Eggs, Fruit"
              hint="Comma separated"
            />
          </View>
        ))}

        <PrimaryButton
          label="+ Add meal"
          tone="ghost"
          onPress={() => setForm((f) => ({ ...f, meals: [...f.meals, { time: "", name: "", items: "", calories: "" }] }))}
        />

        <View style={{ height: 14 }} />
        <Field
          label="Notes"
          value={form.notes}
          onChange={(v) => setForm({ ...form, notes: v })}
          placeholder="Anything the member should know"
          multiline
        />
      </Sheet>
    </ScrollView>
  );
}

/** One macro tile. Calories lead, so they carry the brand tint. */
function Macro({ label, value, unit, accent }: { label: string; value: number | null; unit: string; accent?: boolean }) {
  return (
    <View style={[styles.macro, accent && { backgroundColor: palette.brandSoft, borderColor: withAlpha(palette.brand, 0.35) }]}>
      <Text style={styles.macroLabel} numberOfLines={1}>{label}</Text>
      {value === null ? (
        <Text style={[styles.macroValue, { color: palette.inkMuted }]}>—</Text>
      ) : (
        <CountUp value={value} style={[styles.macroValue, accent ? { color: palette.brandOnTint } : null]} />
      )}
      <Text style={styles.macroUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 12 },
  errorCard: { borderColor: withAlpha(palette.statusCritical, 0.4) },
  errorText: { color: palette.statusCritical, fontSize: 13 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.hairline },
  rowLast: { borderBottomWidth: 0 },
  rowTitle: { color: palette.ink, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  count: { color: palette.inkMuted, fontSize: 13, fontWeight: "600" },

  planHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  planTitle: { color: palette.ink, fontSize: 21, fontWeight: "700", letterSpacing: -0.5, marginTop: 5 },
  planFor: { color: palette.inkSecondary, fontSize: 12.5, marginTop: 5, lineHeight: 18 },

  macroRow: { flexDirection: "row", gap: 8 },
  macro: {
    flex: 1, minWidth: 0, borderRadius: 14, borderWidth: 1, borderColor: palette.hairline,
    backgroundColor: palette.surfaceSunken, paddingVertical: 11, paddingHorizontal: 9,
  },
  macroLabel: { color: palette.inkMuted, fontSize: 10.5 },
  macroValue: { color: palette.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.6, marginTop: 4 },
  macroUnit: { color: palette.inkMuted, fontSize: 10 },

  blockTitle: { color: palette.ink, fontSize: 14, fontWeight: "700", marginTop: 22, marginBottom: 12 },

  mealRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  mealTime: { width: 58, paddingTop: 12, textAlign: "right", color: palette.inkMuted, fontSize: 11, fontWeight: "600" },
  mealSpine: { width: 11, alignItems: "center", alignSelf: "stretch" },
  mealDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.brand, marginTop: 15 },
  mealLine: { flex: 1, width: 1, backgroundColor: palette.hairlineStrong, marginTop: 3 },
  mealCard: {
    flex: 1, minWidth: 0, borderRadius: 14, borderWidth: 1, borderColor: palette.hairline,
    backgroundColor: palette.surfaceSunken, padding: 11, marginBottom: 8,
  },
  mealCardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mealName: { color: palette.ink, fontSize: 13, fontWeight: "600", flex: 1, minWidth: 0 },
  mealItems: { color: palette.inkSecondary, fontSize: 12, marginTop: 4, lineHeight: 17 },

  notes: { marginTop: 16, borderRadius: 14, backgroundColor: palette.brandSoft, padding: 12 },
  notesText: { color: palette.inkSecondary, fontSize: 12.5, lineHeight: 18 },

  mealDraft: {
    borderRadius: 14, borderWidth: 1, borderColor: palette.hairline,
    backgroundColor: palette.surface, padding: 12, paddingBottom: 0, marginBottom: 10,
  },
});
