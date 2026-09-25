import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  api,
  type MemberDto,
  type PtPackageDto,
  type PtSessionDto,
  type StaffDto,
} from "./api";
import {
  Avatar, Bar, Card, ChipSelect, CountUp, Empty, Eyebrow, Field, FieldRow, PickerField,
  Pill, PillTabs, PrimaryButton, Rise, ScreenHeader, SectionTitle, Sheet, Skeleton,
  StatCard, Tap, screenBody,
} from "./components";
import { formatCurrency, formatDate, formatTime, humanize, palette, withAlpha } from "./theme";

type Tab = "agenda" | "packages";

/** Local calendar day — `toISOString` would bucket a 11pm IST session into tomorrow. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

const statusTone = (s: PtSessionDto["status"]) =>
  s === "COMPLETED" ? "good" : s === "NO_SHOW" ? "critical" : s === "CANCELLED" ? "muted" : "brand";

const statusLabel = (s: PtSessionDto["status"]) => (s === "NO_SHOW" ? "No-show" : humanize(s) ?? s);

export function TrainingScreen({ onOpenMember }: { onOpenMember?: (id: string) => void }) {
  const [view, setView] = useState<Tab>("agenda");
  const [sessions, setSessions] = useState<PtSessionDto[]>([]);
  const [packages, setPackages] = useState<PtPackageDto[]>([]);
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [trainerFilter, setTrainerFilter] = useState("");

  const [openPkg, setOpenPkg] = useState(false);
  const [openSess, setOpenSess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pkgForm, setPkgForm] = useState({ memberId: "", trainerId: "", sessions: "8", price: "6400" });
  const [sessForm, setSessForm] = useState({ packageId: "", date: "", time: "07:00", focus: "", duration: "60" });

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    try {
      const [s, p, st, m] = await Promise.all([
        api.getPtSessions(), api.getPtPackages(), api.getStaff(), api.getMembers(),
      ]);
      setSessions(s); setPackages(p); setStaff(st); setMembers(m);
      setError(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }

  /** After a write only the two PT lists can have moved — staff and members stay put. */
  async function reload() {
    const [s, p] = await Promise.all([api.getPtSessions(), api.getPtPackages()]);
    setSessions(s); setPackages(p);
  }

  const trainers = useMemo(() => staff.filter((s) => s.role === "TRAINER"), [staff]);

  const filtered = useMemo(
    () => (trainerFilter ? sessions.filter((s) => s.trainer?.id === trainerFilter) : sessions),
    [sessions, trainerFilter],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, PtSessionDto[]>();
    for (const s of filtered) {
      const k = dayKey(new Date(s.scheduledAt));
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // The next 14 days as chips — a phone has no <input type="date">.
  const dayOptions = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          value: dayKey(d),
          label: i === 0 ? "Today" : i === 1 ? "Tomorrow"
            : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        };
      }),
    [],
  );

  const todayKey = dayKey(new Date());
  // Counts every status, so this matches the "Today · n sessions" heading on the
  // agenda below it — filtering to SCHEDULED here made the two disagree.
  const todayCount = sessions.filter(
    (s) => dayKey(new Date(s.scheduledAt)) === todayKey,
  ).length;
  const upcoming = sessions.filter((s) => s.status === "SCHEDULED").length;
  const activePackages = packages.filter((p) => p.remaining > 0).length;
  const lowPackages = packages.filter((p) => p.remaining <= 2 && p.remaining >= 0).length;

  const bookable = packages.filter((p) => p.remaining - p.scheduled > 0);

  async function mark(s: PtSessionDto, status: PtSessionDto["status"]) {
    setBusyId(s.id);
    setError(null);
    try {
      await api.updateSession(s.id, { status });
      await reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusyId(null);
    }
  }

  async function createPackage() {
    setSaving(true);
    setFormError(null);
    try {
      await api.createPtPackage({
        memberId: pkgForm.memberId,
        trainerId: pkgForm.trainerId || undefined,
        sessionsPurchased: Number(pkgForm.sessions) || 1,
        // The API banks paise, the counter types rupees.
        priceCents: Math.round((Number(pkgForm.price) || 0) * 100),
      });
      setOpenPkg(false);
      setPkgForm({ memberId: "", trainerId: "", sessions: "8", price: "6400" });
      await reload();
    } catch (e) {
      setFormError(message(e));
    } finally {
      setSaving(false);
    }
  }

  async function schedule() {
    setSaving(true);
    setFormError(null);
    try {
      await api.scheduleSession({
        packageId: sessForm.packageId,
        scheduledAt: new Date(`${sessForm.date}T${sessForm.time}:00`).toISOString(),
        durationMinutes: Number(sessForm.duration) || 60,
        focus: sessForm.focus.trim() || undefined,
      });
      setOpenSess(false);
      setSessForm({ packageId: "", date: "", time: "07:00", focus: "", duration: "60" });
      await reload();
    } catch (e) {
      setFormError(message(e));
    } finally {
      setSaving(false);
    }
  }

  const perSession = Number(pkgForm.sessions) > 0
    ? Math.round((Number(pkgForm.price) || 0) / Number(pkgForm.sessions))
    : 0;

  if (loading) {
    return (
      <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Personal training" title="Training" subtitle="Who is training whom, and when" />
        <Skeleton height={86} /><Skeleton height={86} /><Skeleton height={44} /><Skeleton height={220} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="Personal training" title="Training" subtitle="Who is training whom, and when" />

      <View style={styles.actionRow}>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Sell PT package" onPress={() => { setFormError(null); setOpenPkg(true); }} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Schedule session" tone="ghost" onPress={() => { setFormError(null); setOpenSess(true); }} />
        </View>
      </View>

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      )}

      <Rise index={0}>
        <View style={styles.statRow}>
          <StatCard label="Sessions today" value={String(todayCount)} />
          <StatCard label="Upcoming" value={String(upcoming)} hint="Still scheduled" />
        </View>
      </Rise>

      <Rise index={1}>
        <View style={styles.statRow}>
          <StatCard label="Active packages" value={String(activePackages)} />
          <StatCard
            label="Running low"
            value={String(lowPackages)}
            hint="≤ 2 left — upsell moment"
            tone={lowPackages > 0 ? "warning" : undefined}
          />
        </View>
      </Rise>

      <Rise index={2}>
        <PillTabs
          tabs={[{ key: "agenda" as Tab, label: "Agenda" }, { key: "packages" as Tab, label: `Packages · ${packages.length}` }]}
          active={view}
          onChange={setView}
        />
      </Rise>

      {view === "agenda" ? (
        <>
          <Rise index={3}>
            <Card>
              <ChipSelect
                label="Trainer"
                value={trainerFilter}
                options={[
                  { value: "", label: "All" },
                  ...trainers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })),
                ]}
                onChange={setTrainerFilter}
              />
            </Card>
          </Rise>

          {byDay.length === 0 ? (
            <Card><Empty>No sessions scheduled.</Empty></Card>
          ) : (
            byDay.map(([day, list], di) => (
              <Rise key={day} index={Math.min(di + 4, 8)}>
                <Card>
                  <SectionTitle
                    title={day === todayKey ? "Today" : formatDate(day)}
                    action={<Text style={styles.count}>{list.length} session{list.length === 1 ? "" : "s"}</Text>}
                  />
                  {list.map((s, i) => (
                    <View key={s.id} style={[styles.sessionRow, i === list.length - 1 && styles.rowLast]}>
                      <View style={styles.head}>
                        <View style={[styles.timeChip, s.status !== "SCHEDULED" && styles.timeChipOff]}>
                          <Text style={[styles.timeChipText, s.status !== "SCHEDULED" && { color: palette.inkMuted }]}>
                            {formatTime(s.scheduledAt)}
                          </Text>
                          <Text style={styles.timeChipSub}>{s.durationMinutes}m</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Tap onPress={() => onOpenMember?.(s.member.id)} scaleTo={0.98}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {s.member.firstName} {s.member.lastName}
                            </Text>
                          </Tap>
                          <Text style={styles.rowMeta} numberOfLines={1}>
                            {s.focus ?? "Session"} · {s.trainer ? s.trainer.firstName : "Unassigned"}
                          </Text>
                        </View>
                        <Pill label={statusLabel(s.status)} tone={statusTone(s.status)} />
                      </View>

                      {s.status === "SCHEDULED" && (
                        <View style={styles.markRow}>
                          <Mark
                            label="Completed"
                            color={palette.statusGood}
                            disabled={busyId === s.id}
                            onPress={() => mark(s, "COMPLETED")}
                          />
                          <Mark
                            label="No-show"
                            color={palette.statusCritical}
                            disabled={busyId === s.id}
                            onPress={() => mark(s, "NO_SHOW")}
                          />
                        </View>
                      )}
                    </View>
                  ))}
                </Card>
              </Rise>
            ))
          )}
        </>
      ) : packages.length === 0 ? (
        <Card><Empty>No packages sold yet.</Empty></Card>
      ) : (
        packages.map((p, i) => (
          <Rise key={p.id} index={Math.min(i + 3, 8)}>
            <Card>
              <View style={styles.head}>
                <Avatar first={p.member.firstName} last={p.member.lastName} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Tap onPress={() => onOpenMember?.(p.member.id)} scaleTo={0.98}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {p.member.firstName} {p.member.lastName}
                    </Text>
                  </Tap>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {p.trainer ? `with ${p.trainer.firstName}` : "No trainer"} · {formatCurrency(p.priceCents)}
                  </Text>
                </View>
                {p.remaining <= 2 && <Pill label="Low" tone="warning" />}
              </View>

              <View style={styles.packageFigure}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 5 }}>
                  <CountUp value={p.remaining} style={styles.figure} />
                  <Text style={styles.figureUnit}>/ {p.sessionsPurchased} left</Text>
                </View>
                <Text style={styles.rowMeta}>{p.used} done · {p.scheduled} booked</Text>
              </View>

              <Bar value={p.sessionsPurchased ? p.used / p.sessionsPurchased : 0} />
              {p.expiresAt && <Text style={styles.expiry}>Expires {formatDate(p.expiresAt)}</Text>}
            </Card>
          </Rise>
        ))
      )}

      {/* ---------------- sell a package ---------------- */}

      <Sheet
        visible={openPkg}
        onClose={() => setOpenPkg(false)}
        title="Sell a PT package"
        subtitle="Sessions are banked up front and drawn down as they're booked"
        footer={
          <>
            {formError && <Text style={styles.errorText}>{formError}</Text>}
            <PrimaryButton
              label="Create package"
              onPress={createPackage}
              loading={saving}
              disabled={!pkgForm.memberId}
            />
          </>
        }
      >
        <PickerField
          label="Member"
          required
          items={members}
          value={pkgForm.memberId}
          onChange={(id) => setPkgForm({ ...pkgForm, memberId: id })}
          labelOf={(m) => `${m.firstName} ${m.lastName}`}
          subtitleOf={(m) => m.email}
        />

        <ChipSelect
          label="Trainer"
          value={pkgForm.trainerId}
          options={[
            { value: "", label: "Assign later" },
            ...trainers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })),
          ]}
          onChange={(id) => setPkgForm({ ...pkgForm, trainerId: id })}
        />

        <FieldRow>
          <View style={{ flex: 1 }}>
            <Field
              label="Sessions"
              value={pkgForm.sessions}
              onChange={(v) => setPkgForm({ ...pkgForm, sessions: v })}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Price (₹)"
              value={pkgForm.price}
              onChange={(v) => setPkgForm({ ...pkgForm, price: v })}
              keyboardType="numeric"
            />
          </View>
        </FieldRow>

        <Text style={styles.hint}>{formatCurrency(perSession * 100)} per session</Text>
      </Sheet>

      {/* ---------------- schedule a session ---------------- */}

      <Sheet
        visible={openSess}
        onClose={() => setOpenSess(false)}
        title="Schedule a session"
        subtitle="Only packages with sessions left to book are listed"
        footer={
          <>
            {formError && <Text style={styles.errorText}>{formError}</Text>}
            <PrimaryButton
              label="Book it"
              onPress={schedule}
              loading={saving}
              disabled={!sessForm.packageId || !sessForm.date}
            />
          </>
        }
      >
        <PickerField
          label="Package"
          required
          items={bookable}
          value={sessForm.packageId}
          onChange={(id) => setSessForm({ ...sessForm, packageId: id })}
          labelOf={(p) => `${p.member.firstName} ${p.member.lastName}`}
          subtitleOf={(p) => `${p.remaining - p.scheduled} bookable${p.trainer ? ` · ${p.trainer.firstName}` : ""}`}
        />

        <ChipSelect
          label="Date"
          required
          value={sessForm.date}
          options={dayOptions}
          onChange={(v) => setSessForm({ ...sessForm, date: v })}
        />

        <FieldRow>
          <View style={{ flex: 1 }}>
            <Field
              label="Time"
              value={sessForm.time}
              onChange={(v) => setSessForm({ ...sessForm, time: v })}
              placeholder="07:00"
              hint="24-hour"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Duration (min)"
              value={sessForm.duration}
              onChange={(v) => setSessForm({ ...sessForm, duration: v })}
              keyboardType="numeric"
            />
          </View>
        </FieldRow>

        <Field
          label="Focus"
          value={sessForm.focus}
          onChange={(v) => setSessForm({ ...sessForm, focus: v })}
          placeholder="e.g. Lower body"
        />

        <Eyebrow>Session</Eyebrow>
        <Text style={styles.hint}>
          {sessForm.date ? `${formatDate(sessForm.date)} at ${sessForm.time}` : "Pick a day to book it in"}
        </Text>
      </Sheet>
    </ScrollView>
  );
}

/** Outlined one-tap status action — reads as a verb, not another status pill. */
function Mark({
  label, color, onPress, disabled,
}: { label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Tap onPress={onPress} disabled={disabled} scaleTo={0.94}>
      <View style={[styles.mark, { borderColor: withAlpha(color, 0.45) }, disabled && { opacity: 0.45 }]}>
        <Text style={[styles.markText, { color }]}>{label}</Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: "row", gap: 10 },
  statRow: { flexDirection: "row", gap: 12 },

  errorCard: { borderColor: withAlpha(palette.statusCritical, 0.4) },
  errorText: { color: palette.statusCritical, fontSize: 13 },

  sessionRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.hairline },
  rowLast: { borderBottomWidth: 0 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { color: palette.ink, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  count: { color: palette.inkMuted, fontSize: 12, fontWeight: "600" },

  timeChip: { width: 62, paddingVertical: 6, borderRadius: 10, backgroundColor: palette.brandSoft, alignItems: "center" },
  timeChipOff: { backgroundColor: palette.surfaceRaised },
  timeChipText: { color: palette.brandOnTint, fontSize: 11, fontWeight: "700" },
  timeChipSub: { color: palette.inkMuted, fontSize: 9, marginTop: 1 },

  markRow: { flexDirection: "row", gap: 8, marginTop: 9, paddingLeft: 74 },
  mark: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  markText: { fontSize: 11.5, fontWeight: "700" },

  packageFigure: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14, marginBottom: 10 },
  figure: { color: palette.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.9 },
  figureUnit: { color: palette.inkMuted, fontSize: 12 },
  expiry: { color: palette.inkMuted, fontSize: 11.5, marginTop: 9 },

  hint: { color: palette.inkMuted, fontSize: 12, marginBottom: 4 },
});
