import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  api,
  type BranchDto,
  type InvoiceRowDto,
  type MembershipPlanDto,
  type StaffDetailDto,
  type StaffMemberDto,
} from "./api";
import {
  Avatar, Bar, Card, ChipSelect, CountUp, DetailRow, Empty, Eyebrow, Field, FieldRow,
  PickerField, Pill, PillTabs, PrimaryButton, Ring, Rise, ScreenHeader, SectionTitle,
  Sheet, Skeleton, StatCard, Tap, screenBody,
} from "./components";
import { formatCompact, formatCurrency, formatDate, formatTime, humanize, palette } from "./theme";

/**
 * The four back-office screens the More hub links to. They all take the same props
 * so the shell can mount any of them without special-casing, and every write path
 * ends in a visible message rather than a silent no-op.
 */
export interface BusinessScreenProps {
  onBack?: () => void;
  onOpenMember?: (id: string) => void;
}

/** Errors from a write are shown where the user is looking — inside the sheet. */
function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

/* ---------------- plans ---------------- */

const CYCLES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "ONE_TIME", label: "One time" },
] as const;

type Cycle = (typeof CYCLES)[number]["value"];

/** Days of access per cycle — the divisor behind every per-day and monthly figure. */
const DAYS: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, YEARLY: 365, ONE_TIME: 30 };
const daysFor = (cycle: string) => DAYS[cycle] ?? 30;

export function PlansScreen({ onBack }: BusinessScreenProps) {
  const [plans, setPlans] = useState<MembershipPlanDto[]>([]);
  const [dist, setDist] = useState<{ name: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("1999");
  const [billingCycle, setBillingCycle] = useState<Cycle>("MONTHLY");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [p, a] = await Promise.all([api.getPlans(), api.getAnalytics()]);
      setPlans(p);
      setDist(a.planDistribution);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "Could not load plans"));
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setSaving(true);
    setFormError(null);
    try {
      await api.createPlan({
        name: name.trim(),
        description: description.trim() || undefined,
        // The API speaks paise; the form speaks rupees.
        priceCents: Math.round(Number(priceRupees || 0) * 100),
        billingCycle,
      });
      setOpen(false);
      setName(""); setDescription(""); setPriceRupees("1999"); setBillingCycle("MONTHLY");
      await load();
    } catch (e) {
      setFormError(errorMessage(e, "Could not create that plan"));
    } finally {
      setSaving(false);
    }
  }

  // The distribution comes back ranked, so the head of it is the best seller.
  const most = dist[0]?.name;

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Plans"
        eyebrow="Revenue"
        subtitle="What you sell, and how it's selling"
        onBack={onBack}
        action={<Tap onPress={() => setOpen(true)} scaleTo={0.93}>
          <View style={styles.headerBtn}><Text style={styles.headerBtnText}>New plan</Text></View>
        </Tap>}
      />

      <ErrorNote message={loadError} />

      {loading ? (
        <>
          <Skeleton height={190} /><Skeleton height={190} /><Skeleton height={190} />
        </>
      ) : plans.length === 0 ? (
        <Card><Empty>No plans yet. Create the first one.</Empty></Card>
      ) : (
        plans.map((p, i) => {
          const count = dist.find((d) => d.name === p.name)?.count ?? 0;
          const days = daysFor(p.billingCycle);
          const hero = p.name === most;
          return (
            <Rise key={p.id} index={Math.min(i, 8)}>
              <Card tone={hero ? "hero" : "default"}>
                <View style={styles.cardTop}>
                  <Pill label={humanize(p.billingCycle) ?? p.billingCycle} tone={hero ? "brand" : "muted"} />
                  {hero && <Pill label="✓ Most popular" tone="brand" />}
                </View>

                <Text style={styles.planName}>{p.name}</Text>
                <Text style={styles.planDesc} numberOfLines={2}>
                  {p.description ?? `${days} days of access`}
                </Text>

                <Text style={styles.planPrice}>{formatCurrency(p.priceCents)}</Text>
                <Text style={styles.rowMeta}>
                  ≈ {formatCurrency(Math.round(p.priceCents / days))} / day · {days} days
                </Text>

                <View style={styles.cardFoot}>
                  <View>
                    <Text style={styles.footLabel}>Active members</Text>
                    <CountUp value={count} style={styles.footValue} />
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.footLabel}>Monthly value</Text>
                    <Text style={styles.footValueSmall}>
                      {formatCurrency(Math.round((p.priceCents * count) / (days / 30)))}
                    </Text>
                  </View>
                </View>
              </Card>
            </Rise>
          );
        })
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="New membership plan"
        subtitle="Price in rupees — it's billed on the cycle you pick"
        footer={
          <>
            <ErrorNote message={formError} />
            <PrimaryButton label="Create plan" onPress={create} disabled={!name.trim()} loading={saving} />
          </>
        }
      >
        <Field label="Name" value={name} onChange={setName} required placeholder="Gold quarterly" />
        <Field label="Description" value={description} onChange={setDescription} placeholder="What's included" />
        <Field
          label="Price (₹)"
          value={priceRupees}
          onChange={(v) => setPriceRupees(v.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          hint="Charged every cycle"
        />
        <ChipSelect
          label="Billing cycle"
          value={billingCycle}
          options={CYCLES.map((c) => ({ value: c.value, label: `${c.label} · ${DAYS[c.value]}d` }))}
          onChange={setBillingCycle}
        />
      </Sheet>
    </ScrollView>
  );
}

/* ---------------- invoices ---------------- */

type InvoiceTab = "ALL" | "SUCCEEDED" | "PENDING" | "FAILED";

const INVOICE_TABS: { key: InvoiceTab; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "SUCCEEDED", label: "Paid" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
];

export function InvoicesScreen({ onBack, onOpenMember }: BusinessScreenProps) {
  const [rows, setRows] = useState<InvoiceRowDto[]>([]);
  const [tab, setTab] = useState<InvoiceTab>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setRows(await api.getInvoices());
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "Could not load invoices"));
    } finally {
      setLoading(false);
    }
  }

  // Filtering happens on the phone — the whole ledger is already in memory.
  const visible = useMemo(() => (tab === "ALL" ? rows : rows.filter((r) => r.status === tab)), [rows, tab]);

  const collected = rows.filter((r) => r.status === "SUCCEEDED").reduce((t, r) => t + r.amountCents, 0);
  const pending = rows
    .filter((r) => r.status === "PENDING" || r.status === "FAILED")
    .reduce((t, r) => t + r.amountCents, 0);
  const thisMonth = new Date().getMonth();
  const monthCollected = rows
    .filter((r) => r.status === "SUCCEEDED" && r.paidAt && new Date(r.paidAt).getMonth() === thisMonth)
    .reduce((t, r) => t + r.amountCents, 0);

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Invoices"
        eyebrow="Money"
        subtitle="Every payment, receipt and outstanding balance"
        onBack={onBack}
      />

      <ErrorNote message={loadError} />

      {loading ? (
        <>
          <Skeleton height={92} /><Skeleton height={54} /><Skeleton height={240} />
        </>
      ) : (
        <>
          <Rise index={0}>
            <View style={styles.statRow}>
              <StatCard label="This month" value={formatCompact(monthCollected)} hint="collected" />
              <StatCard
                label="Outstanding"
                value={formatCompact(pending)}
                hint="pending + failed"
                tone={pending > 0 ? "critical" : undefined}
              />
            </View>
          </Rise>

          <Rise index={1}>
            <StatCard label="All-time collected" value={formatCurrency(collected)} hint={`${rows.length} invoices`} />
          </Rise>

          <Rise index={2}>
            <PillTabs tabs={INVOICE_TABS} active={tab} onChange={setTab} />
          </Rise>

          <Rise index={3}>
            <Card>
              <SectionTitle title="Ledger" action={<Text style={styles.count}>{visible.length}</Text>} />
              {visible.length === 0 ? <Empty>Nothing here.</Empty> : visible.map((r, i) => {
                const tone = r.status === "SUCCEEDED" ? "good" : r.status === "PENDING" ? "warning" : "critical";
                const when = r.paidAt
                  ? formatDate(r.paidAt)
                  : r.dueAt ? `Due ${formatDate(r.dueAt)}` : formatDate(r.createdAt);
                const method = r.method ? (r.method === "UPI" ? "UPI" : humanize(r.method)) : "—";
                return (
                  <Tap key={r.id} onPress={() => onOpenMember?.(r.subscription.member.id)}>
                    <View style={[styles.row, i === visible.length - 1 && styles.rowLast]}>
                      <Avatar
                        first={r.subscription.member.firstName}
                        last={r.subscription.member.lastName}
                        size={38}
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {r.subscription.member.firstName} {r.subscription.member.lastName}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {r.invoiceNumber ?? "—"} · {r.subscription.membershipPlan.name}
                        </Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>{method} · {when}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <Text style={styles.amount}>{formatCurrency(r.amountCents)}</Text>
                        <Pill label={humanize(r.status) ?? r.status} tone={tone} />
                      </View>
                    </View>
                  </Tap>
                );
              })}
            </Card>
          </Rise>
        </>
      )}
    </ScrollView>
  );
}

/* ---------------- staff ---------------- */

const ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "ADMIN", label: "Admin" },
  { value: "STAFF", label: "Staff" },
  { value: "TRAINER", label: "Trainer" },
] as const;

type Role = (typeof ROLES)[number]["value"];
type StaffTab = "clients" | "sessions" | "packages" | "diet";

export function StaffScreen({ onBack, onOpenMember }: BusinessScreenProps) {
  const [staff, setStaff] = useState<StaffMemberDto[]>([]);
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("TRAINER");
  const [branchId, setBranchId] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [s, b] = await Promise.all([api.listStaff(), api.getBranches()]);
      setStaff(s);
      setBranches(b);
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "Could not load the team"));
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setSaving(true);
    setFormError(null);
    try {
      await api.createStaff({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        role,
        branchId: branchId || undefined,
        phone: phone.trim() || undefined,
        specialty: specialty.trim() || undefined,
      });
      setOpen(false);
      setFirstName(""); setLastName(""); setEmail(""); setPassword("");
      setRole("TRAINER"); setBranchId(""); setPhone(""); setSpecialty("");
      await load();
    } catch (e) {
      setFormError(errorMessage(e, "Could not add that staff member"));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: StaffMemberDto) {
    setPendingId(s.id);
    setToggleError(null);
    try {
      await api.updateStaff(s.id, { isActive: !s.isActive });
      await load();
    } catch (e) {
      setToggleError(errorMessage(e, `Could not update ${s.firstName}`));
    } finally {
      setPendingId(null);
    }
  }

  const ready = Boolean(firstName.trim() && lastName.trim() && email.trim()) && password.length >= 8;
  const trainers = staff.filter((s) => s.role === "TRAINER");
  const admins = staff.filter((s) => s.role !== "TRAINER");
  const active = staff.filter((s) => s.isActive).length;

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Staff"
        eyebrow="Team"
        subtitle={`${active} active across ${branches.length} branch${branches.length === 1 ? "" : "es"}`}
        onBack={onBack}
        action={<Tap onPress={() => setOpen(true)} scaleTo={0.93}>
          <View style={styles.headerBtn}><Text style={styles.headerBtnText}>Add staff</Text></View>
        </Tap>}
      />

      <ErrorNote message={loadError} />
      <ErrorNote message={toggleError} />

      {loading ? (
        <>
          <Skeleton height={140} /><Skeleton height={140} /><Skeleton height={140} />
        </>
      ) : (
        <>
          <View>
            <Eyebrow>Trainers</Eyebrow>
            <View style={{ gap: 12, marginTop: 10 }}>
              {trainers.length === 0 ? <Card><Empty>No trainers on the team yet.</Empty></Card>
                : trainers.map((s, i) => (
                  <StaffCard
                    key={s.id}
                    staff={s}
                    index={i}
                    pending={pendingId === s.id}
                    onOpen={() => setOpenId(s.id)}
                    onToggle={() => toggle(s)}
                  />
                ))}
            </View>
          </View>

          <View style={{ marginTop: 8 }}>
            <Eyebrow>Management &amp; front desk</Eyebrow>
            <View style={{ gap: 12, marginTop: 10 }}>
              {admins.length === 0 ? <Card><Empty>Nobody on the desk yet.</Empty></Card>
                : admins.map((s, i) => (
                  <StaffCard
                    key={s.id}
                    staff={s}
                    index={i}
                    pending={pendingId === s.id}
                    onOpen={() => setOpenId(s.id)}
                    onToggle={() => toggle(s)}
                  />
                ))}
            </View>
          </View>
        </>
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Add a staff member"
        subtitle="They'll be able to sign in immediately"
        footer={
          <>
            <ErrorNote message={formError} />
            <PrimaryButton label="Create account" onPress={create} disabled={!ready} loading={saving} />
          </>
        }
      >
        <FieldRow>
          <View style={{ flex: 1 }}>
            <Field label="First name" value={firstName} onChange={setFirstName} required autoCapitalize="words" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Last name" value={lastName} onChange={setLastName} required autoCapitalize="words" />
          </View>
        </FieldRow>
        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          required
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Temporary password"
          value={password}
          onChange={setPassword}
          required
          secureTextEntry
          hint="At least 8 characters — they can change it later"
        />
        <ChipSelect
          label="Role"
          value={role}
          options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
          onChange={setRole}
        />
        <PickerField
          label="Branch"
          items={branches}
          value={branchId}
          onChange={setBranchId}
          labelOf={(b) => b.name}
          subtitleOf={(b) => b.city ?? b.code ?? ""}
          placeholder="Any branch"
        />
        <FieldRow>
          <View style={{ flex: 1 }}>
            <Field label="Phone" value={phone} onChange={setPhone} keyboardType="phone-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Specialty" value={specialty} onChange={setSpecialty} placeholder="Strength, Yoga…" />
          </View>
        </FieldRow>
      </Sheet>

      <StaffDetailSheet
        staffId={openId}
        onClose={() => setOpenId(null)}
        onOpenMember={(id) => { setOpenId(null); onOpenMember?.(id); }}
      />
    </ScrollView>
  );
}

function StaffCard({
  staff, index, pending, onOpen, onToggle,
}: {
  staff: StaffMemberDto; index: number; pending: boolean;
  onOpen: () => void; onToggle: () => void;
}) {
  return (
    <Rise index={Math.min(index, 8)}>
      <Tap onPress={onOpen}>
        <Card style={{ opacity: staff.isActive ? 1 : 0.55 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Avatar first={staff.firstName} last={staff.lastName} size={46} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{staff.firstName} {staff.lastName}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>{staff.specialty ?? humanize(staff.role)}</Text>
              <View style={styles.pillRow}>
                <Pill label={humanize(staff.role) ?? staff.role} tone={staff.role === "TRAINER" ? "brand" : "muted"} />
                {staff.branch && <Pill label={staff.branch.name} tone="muted" />}
                {!staff.isActive && <Pill label="Inactive" tone="critical" />}
              </View>
            </View>
          </View>

          {staff.role === "TRAINER" && (
            <View style={styles.miniStatRow}>
              <MiniStat label="clients" value={staff.assignedClients} />
              <MiniStat label="sessions/wk" value={staff.sessionsThisWeek} />
              <MiniStat label="diet plans" value={staff.activeDietPlans} />
            </View>
          )}

          <View style={styles.cardActions}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {staff.phone && <Text style={styles.rowMeta} numberOfLines={1}>{staff.phone}</Text>}
              <Text style={styles.rowMeta} numberOfLines={1}>{staff.email}</Text>
            </View>
            <Tap onPress={onToggle} disabled={pending} scaleTo={0.92}>
              <View style={styles.ghostBtn}>
                <Text style={styles.ghostBtnText}>
                  {pending ? "Saving…" : staff.isActive ? "Deactivate" : "Reactivate"}
                </Text>
              </View>
            </Tap>
          </View>
        </Card>
      </Tap>
    </Rise>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.footLabel}>{label}</Text>
      <CountUp value={value} style={styles.miniStatValue} />
    </View>
  );
}

/** The phone stand-in for the web console's /staff/[id] page. */
function StaffDetailSheet({
  staffId, onClose, onOpenMember,
}: { staffId: string | null; onClose: () => void; onOpenMember: (id: string) => void }) {
  const [detail, setDetail] = useState<StaffDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<StaffTab>("clients");

  useEffect(() => {
    if (!staffId) return;
    setDetail(null);
    setError(null);
    setTab("clients");
    api.getStaffMember(staffId).then(setDetail).catch((e) => setError(errorMessage(e, "Could not load that profile")));
  }, [staffId]);

  const s = detail?.stats;
  const now = Date.now();
  const upcoming = (detail?.sessions ?? [])
    .filter((x) => x.status === "SCHEDULED" && new Date(x.scheduledAt).getTime() >= now);
  const past = (detail?.sessions ?? [])
    .filter((x) => x.status !== "SCHEDULED" || new Date(x.scheduledAt).getTime() < now);
  // No sessions on the books yet reads as a clean sheet, not a zero.
  const showRate = s && s.sessionsCompleted + s.noShows > 0
    ? s.sessionsCompleted / (s.sessionsCompleted + s.noShows)
    : 1;

  return (
    <Sheet
      visible={staffId !== null}
      onClose={onClose}
      title={detail ? `${detail.firstName} ${detail.lastName}` : "Staff"}
      subtitle={detail ? (detail.specialty ?? humanize(detail.role) ?? undefined) : undefined}
    >
      <ErrorNote message={error} />

      {!detail || !s ? (
        !error && <><Skeleton height={120} /><View style={{ height: 12 }} /><Skeleton height={220} /></>
      ) : (
        <>
          <Card tone="hero">
            <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
              <Avatar first={detail.firstName} last={detail.lastName} size={58} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sheetName} numberOfLines={1}>{detail.firstName} {detail.lastName}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {detail.specialty ?? humanize(detail.role)}
                  {detail.branch ? ` · ${detail.branch.name}` : ""}
                </Text>
                <View style={styles.pillRow}>
                  <Pill label={humanize(detail.role) ?? detail.role} tone={detail.role === "TRAINER" ? "brand" : "muted"} />
                  {!detail.isActive && <Pill label="Inactive" tone="critical" />}
                </View>
              </View>
            </View>
            <View style={{ marginTop: 14 }}>
              {detail.phone && <DetailRow label="Phone" value={detail.phone} />}
              <DetailRow label="Email" value={detail.email} last />
            </View>
          </Card>

          <View style={{ height: 12 }} />
          <View style={styles.statRow}>
            <StatCard label="Clients" value={String(s.clients)} />
            <StatCard label="Upcoming" value={String(s.sessionsUpcoming)} hint="sessions" />
          </View>
          <View style={{ height: 12 }} />
          <View style={styles.statRow}>
            <StatCard label="Completed" value={String(s.sessionsCompleted)} hint="sessions" />
            <StatCard label="No-shows" value={String(s.noShows)} tone={s.noShows > 0 ? "critical" : undefined} />
          </View>
          <View style={{ height: 12 }} />
          <StatCard label="Active diet plans" value={String(s.activeDietPlans)} hint={`${s.sessionsThisWeek} booked this week`} />

          {s.sessionsCompleted + s.noShows > 0 && (
            <>
              <View style={{ height: 12 }} />
              <Card>
                <SectionTitle
                  title="Show-up rate"
                  action={<Text style={styles.count}>{Math.round(showRate * 100)}%</Text>}
                />
                <Text style={styles.rowMeta}>
                  {s.sessionsCompleted} completed vs {s.noShows} no-show{s.noShows === 1 ? "" : "s"}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Bar value={showRate} color={showRate >= 0.8 ? palette.statusGood : palette.statusWarning} />
                </View>
              </Card>
            </>
          )}

          <View style={{ height: 14 }} />
          <PillTabs
            tabs={[
              { key: "clients" as StaffTab, label: `Clients ${detail.clients.length}` },
              { key: "sessions" as StaffTab, label: `Sessions ${detail.sessions.length}` },
              { key: "packages" as StaffTab, label: `PT packages ${detail.packages.length}` },
              { key: "diet" as StaffTab, label: `Diet plans ${detail.dietPlans.length}` },
            ]}
            active={tab}
            onChange={setTab}
          />
          <View style={{ height: 12 }} />

          {tab === "clients" && (
            <Card>
              {detail.clients.length === 0 ? <Empty>No clients assigned yet.</Empty> : detail.clients.map((c, i) => {
                const since = c.visits.daysSinceLastVisit;
                return (
                  <Tap key={c.id} onPress={() => onOpenMember(c.id)}>
                    <View style={[styles.row, i === detail.clients.length - 1 && styles.rowLast]}>
                      <Avatar first={c.firstName} last={c.lastName} size={38} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>{c.firstName} {c.lastName}</Text>
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {humanize(c.primaryGoal) ?? c.email}
                          {c.subscriptions?.[0] ? ` · ${c.subscriptions[0].membershipPlan.name}` : ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <Pill
                          label={c.access.allowed ? "Active" : humanize(c.access.reason) ?? "Blocked"}
                          tone={c.access.allowed ? "good" : "critical"}
                        />
                        <Text
                          style={[styles.rowMeta, since !== null && since >= 14 ? { color: palette.statusCritical } : null]}
                        >
                          {since === null ? "Never in" : since === 0 ? "In today" : `${since}d ago`}
                        </Text>
                      </View>
                    </View>
                  </Tap>
                );
              })}
            </Card>
          )}

          {tab === "sessions" && (
            <>
              <Card>
                <SectionTitle title="Upcoming" action={<Text style={styles.count}>{upcoming.length}</Text>} />
                {upcoming.length === 0 ? <Empty>Nothing booked.</Empty> : upcoming.slice(0, 12).map((x, i, arr) => (
                  <View key={x.id} style={[styles.row, i === arr.length - 1 && styles.rowLast]}>
                    <View style={styles.timeChip}>
                      <Text style={styles.timeChipText}>{formatDate(x.scheduledAt).slice(0, 6)}</Text>
                      <Text style={styles.timeChipSub}>{formatTime(x.scheduledAt)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{x.member.firstName} {x.member.lastName}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>{x.focus ?? "Session"} · {x.durationMinutes}m</Text>
                    </View>
                  </View>
                ))}
              </Card>

              <View style={{ height: 12 }} />
              <Card>
                <SectionTitle title="History" action={<Text style={styles.count}>{past.length}</Text>} />
                {past.length === 0 ? <Empty>No history yet.</Empty> : past.slice(0, 20).map((x, i, arr) => (
                  <View key={x.id} style={[styles.row, i === arr.length - 1 && styles.rowLast]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{x.member.firstName} {x.member.lastName}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {x.focus ?? "Session"}{x.notes ? ` · ${x.notes}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Pill
                        label={humanize(x.status) ?? x.status}
                        tone={x.status === "COMPLETED" ? "good" : x.status === "NO_SHOW" ? "critical" : "muted"}
                      />
                      <Text style={styles.rowMeta}>{formatDate(x.scheduledAt)}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

          {tab === "packages" && (
            <Card>
              {detail.packages.length === 0 ? <Empty>No PT packages.</Empty> : detail.packages.map((p, i) => (
                <View key={p.id} style={[styles.packageRow, i === detail.packages.length - 1 && styles.rowLast]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Avatar first={p.member.firstName} last={p.member.lastName} size={38} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{p.member.firstName} {p.member.lastName}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {formatCurrency(p.priceCents)} · {p.remaining} of {p.sessionsPurchased} left
                      </Text>
                    </View>
                    {p.remaining <= 2 && <Pill label="Low" tone="warning" />}
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Bar value={p.sessionsPurchased ? p.used / p.sessionsPurchased : 0} />
                  </View>
                </View>
              ))}
            </Card>
          )}

          {tab === "diet" && (
            <Card>
              {detail.dietPlans.length === 0 ? <Empty>No diet plans set.</Empty> : detail.dietPlans.map((d, i) => (
                <View
                  key={d.id}
                  style={[styles.row, { opacity: d.isActive ? 1 : 0.6 }, i === detail.dietPlans.length - 1 && styles.rowLast]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Eyebrow>{humanize(d.goal) ?? d.goal}</Eyebrow>
                    <Text style={styles.rowTitle} numberOfLines={1}>{d.title}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {d.member ? `${d.member.firstName} ${d.member.lastName} · ` : ""}
                      {d.dailyCalories ?? "—"} kcal · P{d.proteinG ?? 0} / C{d.carbsG ?? 0} / F{d.fatG ?? 0}
                    </Text>
                  </View>
                  <Pill label={d.isActive ? "Active" : "Archived"} tone={d.isActive ? "good" : "muted"} />
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ---------------- branches ---------------- */

export function BranchesScreen({ onBack }: BusinessScreenProps) {
  const [branches, setBranches] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [openingHours, setOpeningHours] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setBranches(await api.getBranches());
      setLoadError(null);
    } catch (e) {
      setLoadError(errorMessage(e, "Could not load branches"));
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    setSaving(true);
    setFormError(null);
    try {
      await api.createBranch({
        name: name.trim(),
        code: code.trim() || undefined,
        addressLine: addressLine.trim() || undefined,
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
      });
      setOpen(false);
      setName(""); setCode(""); setAddressLine(""); setCity(""); setPhone(""); setOpeningHours("");
      await load();
    } catch (e) {
      setFormError(errorMessage(e, "Could not create that branch"));
    } finally {
      setSaving(false);
    }
  }

  const totalMembers = branches.reduce((t, b) => t + b._count.members, 0);

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        title="Branches"
        eyebrow="Network"
        subtitle={`${branches.length} location${branches.length === 1 ? "" : "s"} · ${totalMembers} members across the network`}
        onBack={onBack}
        action={<Tap onPress={() => setOpen(true)} scaleTo={0.93}>
          <View style={styles.headerBtn}><Text style={styles.headerBtnText}>Add branch</Text></View>
        </Tap>}
      />

      <ErrorNote message={loadError} />

      {loading ? (
        <>
          <Skeleton height={210} /><Skeleton height={210} />
        </>
      ) : branches.length === 0 ? (
        <Card><Empty>No branches yet. Add the first location.</Empty></Card>
      ) : (
        branches.map((b, i) => {
          // Share of the network keeps the ring comparable between a flagship and a pop-up.
          const share = totalMembers ? b._count.members / totalMembers : 0;
          return (
            <Rise key={b.id} index={Math.min(i, 8)}>
              <Card tone={i === 0 ? "hero" : "default"}>
                <View style={{ flexDirection: "row", gap: 14 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.pillRow}>
                      {b.code && <Pill label={b.code} tone="muted" />}
                      {!b.isActive && <Pill label="Closed" tone="critical" />}
                    </View>
                    <Text style={styles.branchName} numberOfLines={1}>{b.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={2}>
                      {[b.addressLine, b.city].filter(Boolean).join(", ") || "Address not set"}
                    </Text>
                    {b.phone && <Text style={styles.rowMeta} numberOfLines={1}>{b.phone}</Text>}
                    {b.openingHours && <Text style={styles.rowMeta} numberOfLines={1}>{b.openingHours}</Text>}
                  </View>
                  <Ring value={share} size={84} stroke={8}>
                    <Text style={styles.ringValue}>{Math.round(share * 100)}%</Text>
                    <Text style={styles.ringLabel}>share</Text>
                  </Ring>
                </View>

                <View style={styles.miniStatRow}>
                  <MiniStat label="Members" value={b._count.members} />
                  <MiniStat label="Staff" value={b._count.users} />
                  <MiniStat label="Classes" value={b._count.classes} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.footLabel}>In today</Text>
                    <CountUp value={b.checkInsToday} style={[styles.miniStatValue, { color: palette.brandOnTint }]} />
                  </View>
                </View>
              </Card>
            </Rise>
          );
        })
      )}

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Add a branch"
        subtitle="Only the name is required — the rest can follow"
        footer={
          <>
            <ErrorNote message={formError} />
            <PrimaryButton label="Create branch" onPress={create} disabled={!name.trim()} loading={saving} />
          </>
        }
      >
        <FieldRow>
          <View style={{ flex: 2 }}>
            <Field label="Branch name" value={name} onChange={setName} required autoCapitalize="words" />
          </View>
          <View style={{ flex: 1 }}>
            {/* Codes are printed on cards and rotas, so they're stored upper-case. */}
            <Field
              label="Code"
              value={code}
              onChange={(v) => setCode(v.toUpperCase())}
              placeholder="IND"
              autoCapitalize="none"
              maxLength={8}
            />
          </View>
        </FieldRow>
        <Field label="Address" value={addressLine} onChange={setAddressLine} />
        <FieldRow>
          <View style={{ flex: 1 }}>
            <Field label="City" value={city} onChange={setCity} autoCapitalize="words" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Phone" value={phone} onChange={setPhone} keyboardType="phone-pad" />
          </View>
        </FieldRow>
        <Field label="Opening hours" value={openingHours} onChange={setOpeningHours} placeholder="6:00am – 10:00pm" />
      </Sheet>
    </ScrollView>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  headerBtn: {
    backgroundColor: palette.brand, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  headerBtnText: { color: palette.brandInk, fontSize: 13, fontWeight: "700" },

  error: { color: palette.statusCritical, fontSize: 12.5, lineHeight: 17 },

  statRow: { flexDirection: "row", gap: 12 },
  count: { color: palette.inkMuted, fontSize: 13, fontWeight: "600" },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
  rowLast: { borderBottomWidth: 0 },
  rowTitle: { color: palette.ink, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  amount: { color: palette.ink, fontSize: 14, fontWeight: "700" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 7 },

  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  planName: { color: palette.ink, fontSize: 18, fontWeight: "700", marginTop: 14 },
  planDesc: { color: palette.inkSecondary, fontSize: 12, marginTop: 4, minHeight: 32 },
  planPrice: { color: palette.ink, fontSize: 34, fontWeight: "800", letterSpacing: -1, marginTop: 12 },

  cardFoot: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.hairline,
  },
  footLabel: { color: palette.inkMuted, fontSize: 11 },
  footValue: { color: palette.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.6, marginTop: 2 },
  footValueSmall: { color: palette.ink, fontSize: 15, fontWeight: "700", marginTop: 4 },

  miniStatRow: {
    flexDirection: "row", gap: 10, marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: palette.hairline,
  },
  miniStatValue: { color: palette.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 },

  cardActions: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: palette.hairline,
  },
  ghostBtn: {
    borderWidth: 1, borderColor: palette.hairlineStrong, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  ghostBtnText: { color: palette.inkSecondary, fontSize: 12, fontWeight: "700" },

  sheetName: { color: palette.ink, fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },

  timeChip: {
    width: 62, paddingVertical: 6, borderRadius: 10,
    backgroundColor: palette.brandSoft, alignItems: "center",
  },
  timeChipText: { color: palette.brandOnTint, fontSize: 11, fontWeight: "700" },
  timeChipSub: { color: palette.brandOnTint, fontSize: 9, opacity: 0.8, marginTop: 1 },

  packageRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.hairline },

  branchName: { color: palette.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.5, marginTop: 6 },
  ringValue: { color: palette.ink, fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },
  ringLabel: { color: palette.inkMuted, fontSize: 9.5, marginTop: 1 },
});
