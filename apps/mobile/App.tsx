import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  api,
  apiBaseUrl,
  ApiError,
  setSessionExpiredHandler,
  setToken,
  type AnalyticsOverview,
  type AttendanceEventDto,
  type AuthUser,
  type MemberDto,
  type SubscriptionDto,
  type TenantDto,
} from "./api";
import { MemberSheet } from "./MemberSheet";
import { OnboardWizard } from "./OnboardWizard";
import { BottomNav, type TabKey } from "./BottomNav";
import { LeadsScreen } from "./LeadsScreen";
import { AttendanceScreen } from "./AttendanceScreen";
import { TrainingScreen } from "./TrainingScreen";
import { DietScreen } from "./DietScreen";
import { PlansScreen, InvoicesScreen, StaffScreen, BranchesScreen } from "./BusinessScreens";
import {
  Avatar, Card, CountUp, Empty, Eyebrow, Pill, PillTabs, Ring, RingStack,
  Rise, ScreenHeader, SectionTitle, Skeleton, Tap, Toast, screenBody,
} from "./components";
import { AreaChart, BarChart, PlanLegend, Sparkline } from "./charts";
import {
  formatCompact, formatCurrency, formatMonth, formatShortDay, formatTime,
  humanize, palette, withAlpha,
} from "./theme";

interface Session {
  tenant: TenantDto;
  user: AuthUser;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [expired, setExpired] = useState(false);

  // A dead token must land the user on sign-in, not on a screen that silently
  // renders empty — the same rule the web console follows.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setSession(null);
      setExpired(true);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  return session ? (
    <Shell
      session={session}
      onLogout={() => { setToken(null); setSession(null); }}
    />
  ) : (
    <LoginScreen expired={expired} onLoggedIn={(s) => { setExpired(false); setSession(s); }} />
  );
}

/* ---------------- login ---------------- */

function LoginScreen({ expired, onLoggedIn }: { expired: boolean; onLoggedIn: (s: Session) => void }) {
  const [subdomain, setSubdomain] = useState("shaper");
  const [email, setEmail] = useState("owner@shaper.fit");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    try {
      const auth = await api.login(subdomain.trim(), email.trim(), password);
      setToken(auth.accessToken);
      const tenant = await api.getMyTenant();
      onLoggedIn({ tenant, user: auth.user });
    } catch (e) {
      // A rejected password and an unreachable server are different problems, and
      // blaming the credentials for a network fault sends staff hunting the wrong one.
      const unreachable = !(e instanceof ApiError);
      setError(
        unreachable
          ? `Can't reach the club server at ${apiBaseUrl}. Check this device is on the same network.`
          : "Those credentials didn't work. Check the subdomain and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.page }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
            <Rise index={0}>
              <Image source={require("./assets/brand/lockup.png")} style={styles.loginLockup} />
            </Rise>

            <Rise index={1}>
              <Text style={styles.loginTitle}>Front desk</Text>
              <Text style={styles.loginSub}>Run the whole club from your phone</Text>
            </Rise>

            <Rise index={2} style={{ width: "100%", maxWidth: 420 }}>
              <Card style={{ marginTop: 26 }}>
                {expired && <Text style={styles.expired}>Your session expired. Please sign in again.</Text>}
                <LoginField label="Gym subdomain" value={subdomain} onChangeValue={setSubdomain} autoCapitalize="none" />
                <LoginField label="Email" value={email} onChangeValue={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <LoginField label="Password" value={password} onChangeValue={setPassword} secureTextEntry />

                {error && <Text style={styles.error}>{error}</Text>}

                <Tap onPress={handleLogin} disabled={loading}>
                  <View style={[styles.primaryBtn, loading && { opacity: 0.75 }]}>
                    {loading ? <ActivityIndicator color={palette.brandInk} />
                      : <Text style={styles.primaryBtnText}>Sign in</Text>}
                  </View>
                </Tap>
              </Card>
            </Rise>

            <Text style={styles.loginFoot}>Same build runs on Android and in the browser</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function LoginField({
  label, value, onChangeValue, ...rest
}: { label: string; value: string; onChangeValue: (v: string) => void }
  & Omit<React.ComponentProps<typeof TextInput>, "onChange">) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, focused && { borderColor: palette.brand }]}
        value={value}
        onChangeText={onChangeValue}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={palette.inkMuted}
        {...rest}
      />
    </View>
  );
}

/* ---------------- shell ---------------- */

/** Screens reachable from the More hub rather than the tab bar. */
type MoreRoute = "attendance" | "diet" | "plans" | "invoices" | "staff" | "branches" | "account";

function Shell({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<TabKey>("home");
  const [route, setRoute] = useState<MoreRoute | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  function goTab(t: TabKey) {
    setRoute(null);
    setTab(t);
  }

  const onOpenMember = (id: string) => setOpenMemberId(id);
  const back = () => setRoute(null);

  return (
    <View style={{ flex: 1, backgroundColor: palette.page }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        {route === null && tab === "home" && <HomeScreen session={session} onOpenMember={onOpenMember} />}
        {route === null && tab === "members" && <MembersScreen session={session} onOpenMember={onOpenMember} onToast={flash} />}
        {route === null && tab === "training" && <TrainingScreen onOpenMember={onOpenMember} />}
        {route === null && tab === "leads" && <LeadsScreen onOpenMember={onOpenMember} />}
        {route === null && tab === "more" && <MoreScreen session={session} onGo={setRoute} />}

        {route === "attendance" && <AttendanceScreen onOpenMember={onOpenMember} onBack={back} />}
        {route === "diet" && <DietScreen onOpenMember={onOpenMember} onBack={back} />}
        {route === "plans" && <PlansScreen onBack={back} onOpenMember={onOpenMember} />}
        {route === "invoices" && <InvoicesScreen onBack={back} onOpenMember={onOpenMember} />}
        {route === "staff" && <StaffScreen onBack={back} onOpenMember={onOpenMember} />}
        {route === "branches" && <BranchesScreen onBack={back} onOpenMember={onOpenMember} />}
        {route === "account" && <AccountScreen session={session} onBack={back} onLogout={onLogout} />}
      </SafeAreaView>

      <BottomNav active={tab} onChange={goTab} />
      <Toast message={toast} />

      <MemberSheet memberId={openMemberId} onClose={() => setOpenMemberId(null)} />
    </View>
  );
}

/* ---------------- home ---------------- */

/** Week-over-week change in check-ins, the same maths the web dashboard shows. */
function weekOverWeek(points: { checkIns: number }[]) {
  if (points.length < 14) return 0;
  const sum = (a: { checkIns: number }[]) => a.reduce((t, p) => t + p.checkIns, 0);
  const prior = sum(points.slice(-14, -7));
  const recent = sum(points.slice(-7));
  return prior === 0 ? 0 : Math.round(((recent - prior) / prior) * 100);
}

function HomeScreen({ session, onOpenMember }: { session: Session; onOpenMember: (id: string) => void }) {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [events, setEvents] = useState<AttendanceEventDto[]>([]);
  const [dues, setDues] = useState<SubscriptionDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  function load() {
    setError(null);
    Promise.all([api.getAnalytics(), api.getTodayAttendance(), api.getDuesOverview()])
      .then(([a, e, d]) => { setAnalytics(a); setEvents(e); setDues(d); })
      // Swallowing this left the packaged app on a loading skeleton forever
      // whenever the phone could not reach the club's server.
      .catch((e) => setError(e instanceof Error ? e.message : "Could not reach the server."));
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (error && !analytics) {
    return (
      <ScrollView contentContainerStyle={screenBody}>
        <ClubHeader tenant={session.tenant} eyebrow="Today" />
        <Card>
          <Text style={styles.errorTitle}>Can&apos;t reach the club server</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Text style={styles.errorHint}>
            Check that this device is on the same network as the server, then try again.
          </Text>
          <Tap onPress={load}>
            <View style={styles.retryBtn}><Text style={styles.retryText}>Try again</Text></View>
          </Tap>
        </Card>
      </ScrollView>
    );
  }

  if (!analytics) {
    return (
      <ScrollView contentContainerStyle={screenBody}>
        <ClubHeader tenant={session.tenant} eyebrow="Today" />
        <Skeleton height={210} /><Skeleton height={96} /><Skeleton height={170} />
      </ScrollView>
    );
  }

  const t = analytics.totals;
  const capacity = Math.max(1, t.activeSubscriptions);
  // Each ring is a rate, so the gauge reads the same whatever the club's size.
  const attendanceRate = Math.min(1, t.checkedInToday / Math.max(1, Math.round(capacity * 0.6)));
  const collectionRate = t.activeSubscriptions / Math.max(1, t.activeSubscriptions + t.overdueSubscriptions);
  const ptUtil = Math.min(1, t.sessionsToday / Math.max(1, t.trainersAvailable * 6));

  const wow = weekOverWeek(analytics.attendanceTrend);
  const sessions = analytics.sessionsToday.slice(0, 5);
  const expiring = analytics.expiringSoon.slice(0, 4);
  const recent = events.slice(0, 6);

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ClubHeader tenant={session.tenant} eyebrow="Today" subtitle={`${greeting}, ${session.user.firstName}`} />

      {/* KPI row — the web console's four tiles, two-up on a phone. */}
      <Rise index={0}>
        <View style={styles.statRow}>
          <Stat label="Active members" value={t.activeSubscriptions} hint="+6% vs last month" hintTone={palette.statusGood} />
          <Stat label="Trainers available" value={t.trainersAvailable} hint="on shift today" />
        </View>
      </Rise>

      <Rise index={1}>
        <View style={styles.statRow}>
          <Stat
            label="Outstanding dues"
            value={t.outstandingCents}
            money
            critical={t.outstandingCents > 0}
            hint={`${t.outstandingInvoices} unpaid invoice${t.outstandingInvoices === 1 ? "" : "s"}`}
          />
          <Stat
            label="Revenue (MRR)"
            value={t.mrrCents}
            money
            hint="+10% MoM"
            hintTone={palette.statusGood}
            spark={analytics.revenueByMonth.map((r) => r.amountCents)}
          />
        </View>
      </Rise>

      <Rise index={2}>
        <Card tone="hero">
          <Eyebrow>Today&apos;s pulse</Eyebrow>
          <View style={styles.pulseRow}>
            <RingStack
              size={138}
              rings={[
                { value: attendanceRate, color: palette.brand },
                { value: collectionRate, color: palette.statusGood },
                { value: ptUtil, color: "#60a5fa" },
              ]}
            />
            <View style={{ flex: 1, gap: 16, minWidth: 0 }}>
              <Legend color={palette.brand} label="Check-ins" value={t.checkedInToday} unit="today" />
              <Legend color={palette.statusGood} label="Paid up" value={Math.round(collectionRate * 100)} unit="%" />
              <Legend color="#60a5fa" label="PT sessions" value={t.sessionsToday} unit="booked" />
            </View>
          </View>
          <View style={styles.pulseFoot}>
            <View>
              <Text style={styles.statLabel}>Open leads</Text>
              <CountUp value={t.openLeads} style={styles.statValue} />
            </View>
            <Pill label="Pipeline ↗" tone="brand" />
          </View>
        </Card>
      </Rise>

      <Rise index={3}>
        <Card>
          <SectionTitle title="Members registrations" action={<Text style={styles.count}>7 days</Text>} />
          <Text style={styles.cardSub}>New sign-ups, last 7 days</Text>
          <BarChart data={analytics.registrations.map((r) => ({ label: formatShortDay(r.date), value: r.count }))} height={170} />
        </Card>
      </Rise>

      <Rise index={4}>
        <Card>
          <SectionTitle title="Revenue growth" />
          <Text style={styles.cardSub}>Collected per month</Text>
          <AreaChart
            data={analytics.revenueByMonth.map((r) => ({ label: formatMonth(r.month), value: r.amountCents }))}
            height={180}
            formatY={(v) => formatCompact(v)}
            labelEvery={1}
          />
        </Card>
      </Rise>

      <Rise index={5}>
        <Card>
          <SectionTitle
            title="Attendance"
            action={<Pill label={`${wow >= 0 ? "+" : ""}${wow}% wk/wk`} tone={wow >= 0 ? "good" : "critical"} />}
          />
          <Text style={styles.cardSub}>Daily check-ins, last 14 days</Text>
          <AreaChart
            data={analytics.attendanceTrend.map((a) => ({ label: formatShortDay(a.date), value: a.checkIns }))}
            height={180}
            formatY={(v) => String(Math.round(v))}
            labelEvery={4}
          />
        </Card>
      </Rise>

      <Rise index={6}>
        <Card>
          <SectionTitle title="Members by plan" />
          <Text style={styles.cardSub}>Active subscriptions</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18, marginTop: 6 }}>
            <Ring
              value={analytics.planDistribution[0] ? analytics.planDistribution[0].count / capacity : 0}
              size={104}
              stroke={10}
            >
              <CountUp value={capacity} style={styles.ringFigure} />
              <Text style={styles.ringUnit}>active</Text>
            </Ring>
            <PlanLegend items={analytics.planDistribution} total={capacity} />
          </View>
        </Card>
      </Rise>

      <Rise index={7}>
        <Card>
          <SectionTitle title="PT sessions today" action={<Text style={styles.count}>{analytics.sessionsToday.length}</Text>} />
          {sessions.length === 0 ? <Empty>Nothing booked today.</Empty> : sessions.map((s, i) => (
            <View key={s.id} style={[styles.row, i === sessions.length - 1 && styles.rowLast]}>
              <View style={styles.timeChip}><Text style={styles.timeChipText}>{formatTime(s.scheduledAt)}</Text></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{s.member.firstName} {s.member.lastName}</Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {s.focus ?? "Session"}{s.trainer ? ` · ${s.trainer.firstName}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      </Rise>

      <Rise index={8}>
        <Card>
          <SectionTitle title="Expiring this week" />
          <Text style={styles.cardSub}>Renewals to chase</Text>
          {expiring.length === 0 ? <Empty>Nothing expiring.</Empty> : expiring.map((e, i) => (
            <Tap key={e.id} onPress={() => onOpenMember(e.member.id)}>
              <View style={[styles.row, i === expiring.length - 1 && styles.rowLast]}>
                <Avatar first={e.member.firstName} last={e.member.lastName} size={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{e.member.firstName} {e.member.lastName}</Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>{e.membershipPlan.name}</Text>
                </View>
                <DaysLeftPill endsAt={e.currentPeriodEnd} />
              </View>
            </Tap>
          ))}
        </Card>
      </Rise>

      <Rise index={9}>
        <Card>
          <SectionTitle
            title="Payments to follow up"
            action={<Text style={[styles.count, { color: palette.statusCritical }]}>{dues.length}</Text>}
          />
          <Text style={styles.cardSub}>{dues.length} overdue</Text>
          {dues.length === 0 ? <Empty>Everyone is paid up.</Empty> : dues.slice(0, 5).map((d, i, arr) => (
            <Tap key={d.id} onPress={() => d.member && onOpenMember(d.member.id)}>
              <View style={[styles.row, i === arr.length - 1 && styles.rowLast]}>
                <Avatar first={d.member?.firstName ?? "?"} last={d.member?.lastName ?? ""} size={38} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {d.member?.firstName} {d.member?.lastName}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>{d.membershipPlan.name}</Text>
                </View>
                <Text style={styles.dueAmount}>{formatCurrency(d.membershipPlan.priceCents)}</Text>
              </View>
            </Tap>
          ))}
        </Card>
      </Rise>

      <Rise index={10}>
        <Card>
          <SectionTitle title="Recent check-ins" action={<Text style={styles.count}>{events.length}</Text>} />
          {recent.length === 0 ? <Empty>No check-ins yet today.</Empty> : recent.map((e, i) => (
            <View key={e.id} style={[styles.row, i === recent.length - 1 && styles.rowLast]}>
              <View style={styles.sourceChip}><Text style={styles.sourceChipText}>{e.source.slice(0, 2)}</Text></View>
              <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                {e.member.firstName} {e.member.lastName}
              </Text>
              <Text style={styles.rowMeta}>{formatTime(e.checkedInAt)}</Text>
            </View>
          ))}
        </Card>
      </Rise>
    </ScrollView>
  );
}

function ClubHeader({ tenant, eyebrow, subtitle }: { tenant: TenantDto; eyebrow: string; subtitle?: string }) {
  return (
    <View>
      <View style={styles.headerRow}>
        <Image source={require("./assets/brand/mark.png")} style={styles.headerMark} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerClub} numberOfLines={1}>{tenant.name}</Text>
          <Eyebrow>{eyebrow}</Eyebrow>
        </View>
      </View>
      {subtitle && <Text style={styles.headerSub}>{subtitle}</Text>}
    </View>
  );
}

function DaysLeftPill({ endsAt }: { endsAt: string }) {
  const days = Math.round((new Date(endsAt).getTime() - Date.now()) / 86_400_000);
  return <Pill label={days <= 0 ? "Today" : `${days}d`} tone={days <= 2 ? "critical" : "warning"} />;
}

function Legend({ color, label, value, unit }: { color: string; label: string; value: number; unit: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.legendLabel}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <CountUp value={value} style={styles.legendValue} />
          <Text style={styles.legendUnit}>{unit}</Text>
        </View>
      </View>
    </View>
  );
}

function Stat({
  label, value, money, critical, hint, hintTone, spark,
}: {
  label: string; value: number; money?: boolean; critical?: boolean;
  hint?: string; hintTone?: string; spark?: number[];
}) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      <CountUp
        value={value}
        format={(v) => (money ? formatCompact(v) : String(Math.round(v)))}
        style={[styles.statValue, critical && value > 0 ? { color: palette.statusCritical } : null]}
      />
      <View style={styles.statFoot}>
        {hint && (
          <Text style={[styles.statHint, hintTone ? { color: hintTone } : null]} numberOfLines={1}>
            {hint}
          </Text>
        )}
        {spark && spark.length > 1 && <Sparkline values={spark} width={52} height={18} />}
      </View>
    </Card>
  );
}

/* ---------------- members ---------------- */

type MemberFilter = "all" | "active" | "expiring" | "overdue" | "risk";

function MembersScreen({
  session, onOpenMember, onToast,
}: { session: Session; onOpenMember: (id: string) => void; onToast: (m: string) => void }) {
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setMembers(await api.getMembers());
    } finally {
      setLoading(false);
    }
  }

  async function checkIn(m: MemberDto) {
    setPendingId(m.id);
    try {
      await api.checkIn(m.id);
      onToast(`${m.firstName} checked in`);
      await load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setPendingId(null);
    }
  }

  const counts = useMemo(() => ({
    all: members.length,
    active: members.filter((m) => m.access.allowed).length,
    expiring: members.filter((m) => m.access.allowed && (m.access.daysRemaining ?? 99) <= 7).length,
    overdue: members.filter((m) => !m.access.allowed).length,
    risk: members.filter((m) => m.churnRisk === "HIGH").length,
  }), [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => !q || `${m.firstName} ${m.lastName} ${m.email} ${m.phone ?? ""}`.toLowerCase().includes(q))
      .filter((m) => {
        if (filter === "active") return m.access.allowed;
        if (filter === "expiring") return m.access.allowed && (m.access.daysRemaining ?? 99) <= 7;
        if (filter === "overdue") return !m.access.allowed;
        if (filter === "risk") return m.churnRisk === "HIGH";
        return true;
      })
      .slice(0, 60);
  }, [members, query, filter]);

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ClubHeader tenant={session.tenant} eyebrow="Members" subtitle={`${members.length} clients on the books`} />

      <Rise index={0}>
        <Tap onPress={() => setOnboarding(true)}>
          <View style={styles.onboardBtn}>
            <Text style={styles.onboardText}>＋  Onboard a client</Text>
          </View>
        </Tap>
      </Rise>

      <TextInput
        style={styles.input}
        placeholder="Search name, email or phone"
        placeholderTextColor={palette.inkMuted}
        value={query}
        onChangeText={setQuery}
      />

      <PillTabs
        active={filter}
        onChange={setFilter}
        tabs={[
          { key: "all", label: `All ${counts.all}` },
          { key: "active", label: `Active ${counts.active}` },
          { key: "expiring", label: `Expiring ${counts.expiring}` },
          { key: "overdue", label: `Overdue ${counts.overdue}` },
          { key: "risk", label: `At risk ${counts.risk}` },
        ]}
      />

      {loading ? (
        <><Skeleton height={76} /><Skeleton height={76} /><Skeleton height={76} /></>
      ) : (
        <Card style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
          {filtered.map((m, i) => (
            <MemberRow
              key={m.id}
              member={m}
              index={i}
              last={i === filtered.length - 1}
              pending={pendingId === m.id}
              onOpen={() => onOpenMember(m.id)}
              onCheckIn={() => checkIn(m)}
            />
          ))}
          {filtered.length === 0 && <Empty>No members match that search.</Empty>}
        </Card>
      )}

      <OnboardWizard
        visible={onboarding}
        onClose={() => setOnboarding(false)}
        onCreated={(name) => { onToast(`${name} added`); load(); }}
      />
    </ScrollView>
  );
}

function MemberRow({
  member, index, last, pending, onOpen, onCheckIn,
}: {
  member: MemberDto; index: number; last: boolean; pending: boolean;
  onOpen: () => void; onCheckIn: () => void;
}) {
  const days = member.access.daysRemaining;

  // Text and colour are derived together — otherwise an expiring member's line
  // renders in warning amber while saying something reassuring.
  const { subtitle, tint } = !member.access.allowed
    ? { subtitle: humanize(member.access.reason) ?? "No plan", tint: palette.statusCritical }
    : days !== null && days <= 7
      ? { subtitle: `Expires in ${days} ${days === 1 ? "day" : "days"}`, tint: palette.statusWarning }
      : { subtitle: member.email, tint: palette.inkMuted };

  return (
    <Rise index={Math.min(index, 8)}>
      <Tap onPress={onOpen}>
        <View style={[styles.memberRow, last && styles.rowLast]}>
          <Avatar first={member.firstName} last={member.lastName} size={42} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>{member.firstName} {member.lastName}</Text>
            <Text style={[styles.rowMeta, { color: tint }]} numberOfLines={1}>{subtitle}</Text>
          </View>
          <Tap onPress={onCheckIn} disabled={pending} scaleTo={0.92}>
            <View style={styles.checkInBtn}>
              {pending
                ? <ActivityIndicator size="small" color={palette.brand} />
                : <Text style={styles.checkInText}>Check in</Text>}
            </View>
          </Tap>
        </View>
      </Tap>
    </Rise>
  );
}

/* ---------------- more hub ---------------- */

const MORE_LINKS: { key: MoreRoute; label: string; hint: string; group: string }[] = [
  { key: "attendance", label: "Attendance", hint: "Check members in", group: "Clients" },
  { key: "diet", label: "Diet plans", hint: "Nutrition programmes", group: "Coaching" },
  { key: "plans", label: "Membership plans", hint: "Pricing and cycles", group: "Business" },
  { key: "invoices", label: "Invoices", hint: "Payments and dues", group: "Business" },
  { key: "staff", label: "Staff", hint: "Trainers and front desk", group: "Business" },
  { key: "branches", label: "Branches", hint: "Locations in the network", group: "Business" },
  { key: "account", label: "Account", hint: "Your profile and sign out", group: "You" },
];

function MoreScreen({ session, onGo }: { session: Session; onGo: (r: MoreRoute) => void }) {
  const groups = ["Clients", "Coaching", "Business", "You"];
  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ClubHeader tenant={session.tenant} eyebrow="More" subtitle="Everything else in the club" />

      {groups.map((g, gi) => (
        <Rise key={g} index={gi}>
          <Text style={styles.groupLabel}>{g}</Text>
          <Card style={{ paddingVertical: 4 }}>
            {MORE_LINKS.filter((l) => l.group === g).map((l, i, arr) => (
              <Tap key={l.key} onPress={() => onGo(l.key)}>
                <View style={[styles.linkRow, i === arr.length - 1 && styles.rowLast]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle}>{l.label}</Text>
                    <Text style={styles.rowMeta}>{l.hint}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </Tap>
            ))}
          </Card>
        </Rise>
      ))}
    </ScrollView>
  );
}

/* ---------------- account ---------------- */

function AccountScreen({
  session, onBack, onLogout,
}: { session: Session; onBack: () => void; onLogout: () => void }) {
  const u = session.user;
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

  return (
    <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="Account" onBack={onBack} />

      <Rise index={0}>
        <Card tone="hero" style={{ alignItems: "center", paddingVertical: 28 }}>
          <Ring value={1} size={104} stroke={3} color={palette.brand}>
            <Avatar first={u.firstName || u.email} last={u.lastName} size={80} />
          </Ring>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.rowMeta}>{humanize(u.role)}</Text>
          <View style={{ marginTop: 12 }}><Pill label={session.tenant.name} tone="brand" /></View>
        </Card>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="Signed in as" />
          <View style={styles.row}>
            <Text style={[styles.rowMeta, { width: 92 }]}>Email</Text>
            <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{u.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowMeta, { width: 92 }]}>Club</Text>
            <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{session.tenant.name}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={[styles.rowMeta, { width: 92 }]}>Subdomain</Text>
            <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{session.tenant.subdomain}</Text>
          </View>
        </Card>
      </Rise>

      <Rise index={2}>
        <Tap onPress={onLogout}>
          <View style={styles.logoutBtn}><Text style={styles.logoutText}>Log out</Text></View>
        </Tap>
      </Rise>
    </ScrollView>
  );
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  loginScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loginLockup: { width: 156, height: 156, resizeMode: "contain" },
  loginTitle: { fontSize: 30, fontWeight: "800", color: palette.ink, letterSpacing: -0.6, textAlign: "center" },
  loginSub: { fontSize: 14, color: palette.inkSecondary, marginTop: 6, textAlign: "center" },
  loginFoot: { color: palette.inkMuted, fontSize: 12, marginTop: 22, textAlign: "center" },
  expired: { color: palette.statusWarning, fontSize: 13, marginBottom: 14 },

  fieldLabel: { fontSize: 12, fontWeight: "600", color: palette.inkSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: palette.hairline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: palette.ink, backgroundColor: palette.surfaceSunken,
  },
  error: { color: palette.statusCritical, fontSize: 13, marginBottom: 12 },
  primaryBtn: { backgroundColor: palette.brand, borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  primaryBtnText: { color: palette.brandInk, fontWeight: "700", fontSize: 15 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerMark: { width: 40, height: 40, resizeMode: "contain" },
  headerClub: { color: palette.ink, fontSize: 17, fontWeight: "700", marginBottom: 3 },
  headerSub: { color: palette.inkSecondary, fontSize: 13, marginTop: 10 },

  pulseRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 16 },
  legendLabel: { color: palette.inkMuted, fontSize: 11 },
  legendValue: { color: palette.ink, fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  legendUnit: { color: palette.inkMuted, fontSize: 11 },

  statRow: { flexDirection: "row", gap: 12 },
  statLabel: { color: palette.inkSecondary, fontSize: 12 },
  statValue: { color: palette.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.8, marginTop: 6 },
  statFoot: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6, marginTop: 5, minHeight: 18 },
  statHint: { color: palette.inkMuted, fontSize: 11, flex: 1 },
  cardSub: { color: palette.inkMuted, fontSize: 12, marginTop: -6, marginBottom: 10 },
  pulseFoot: {
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
    marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: palette.hairline,
  },
  ringFigure: { color: palette.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.6 },
  ringUnit: { color: palette.inkMuted, fontSize: 10, marginTop: 1 },
  dueAmount: { color: palette.statusCritical, fontSize: 13.5, fontWeight: "700" },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
  memberRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 13, paddingHorizontal: 2,
    borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
  rowLast: { borderBottomWidth: 0 },
  rowTitle: { color: palette.ink, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  count: { color: palette.inkMuted, fontSize: 13, fontWeight: "600" },
  chevron: { color: palette.inkMuted, fontSize: 20, fontWeight: "300" },
  groupLabel: {
    color: palette.inkMuted, fontSize: 11, fontWeight: "700",
    letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, marginLeft: 4,
  },

  timeChip: { width: 62, paddingVertical: 7, borderRadius: 10, backgroundColor: palette.brandSoft, alignItems: "center" },
  timeChipText: { color: palette.brandOnTint, fontSize: 11, fontWeight: "700" },

  sourceChip: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: palette.surfaceRaised, alignItems: "center", justifyContent: "center",
  },
  sourceChipText: { color: palette.inkSecondary, fontSize: 10, fontWeight: "700" },

  onboardBtn: { backgroundColor: palette.brand, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  onboardText: { color: palette.brandInk, fontSize: 14.5, fontWeight: "700" },

  checkInBtn: {
    borderWidth: 1, borderColor: withAlpha(palette.brand, 0.45), borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 84, alignItems: "center",
  },
  checkInText: { color: palette.brandOnTint, fontSize: 12, fontWeight: "700" },

  profileName: { color: palette.ink, fontSize: 20, fontWeight: "700", marginTop: 14 },
  logoutBtn: {
    borderWidth: 1, borderColor: palette.hairlineStrong, borderRadius: 999,
    paddingVertical: 15, alignItems: "center", backgroundColor: palette.surface,
  },
  logoutText: { color: palette.statusCritical, fontSize: 14, fontWeight: "700" },

  errorTitle: { color: palette.statusCritical, fontSize: 15, fontWeight: "700" },
  errorBody: { color: palette.inkSecondary, fontSize: 13, marginTop: 6, lineHeight: 19 },
  errorHint: { color: palette.inkMuted, fontSize: 12, marginTop: 10, lineHeight: 18 },
  retryBtn: {
    marginTop: 16, backgroundColor: palette.brand, borderRadius: 999,
    paddingVertical: 13, alignItems: "center",
  },
  retryText: { color: palette.brandInk, fontSize: 14, fontWeight: "700" },
});
