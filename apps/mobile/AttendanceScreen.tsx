import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, type AttendanceEventDto, type MemberDto } from "./api";
import {
  Avatar, Card, CountUp, Empty, Field, Rise, ScreenHeader, SectionTitle,
  Skeleton, StatCard, Tap, screenBody,
} from "./components";
import { formatTime, humanize, palette, withAlpha } from "./theme";

/** The turnstile speaks in enum values; the front desk reads plain English. */
const SOURCE_LABEL: Record<string, string> = {
  QR: "QR scan",
  RFID: "RFID tap",
  BIOMETRIC: "Biometric",
  MANUAL: "Front desk",
};

/** The roster is long — the list stays short and the search does the narrowing. */
const ROSTER_LIMIT = 8;

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

/**
 * `onOpenMember` is part of the shared screen contract. Check-in is a one-tap action
 * rather than a way into a profile, so nothing here calls it.
 */
export function AttendanceScreen({ onBack }: { onOpenMember?: (id: string) => void; onBack?: () => void }) {
  const [members, setMembers] = useState<MemberDto[]>([]);
  const [events, setEvents] = useState<AttendanceEventDto[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [memberList, eventList] = await Promise.all([api.getMembers(), api.getTodayAttendance()]);
      setMembers(memberList);
      setEvents(eventList);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  async function checkIn(member: MemberDto) {
    setError(null);
    setPendingId(member.id);
    try {
      await api.checkIn(member.id);
      await load();
      setNotice(`${member.firstName} checked in`);
      setTimeout(() => setNotice(null), 2200);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPendingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => !q || `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q))
      .slice(0, ROSTER_LIMIT);
  }, [members, query]);

  if (loading) {
    return (
      <ScrollView contentContainerStyle={screenBody} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title="Attendance" eyebrow="Front desk" subtitle="Check-in and today's activity" />
        <Skeleton height={86} />
        <Skeleton height={220} />
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
      <ScreenHeader onBack={onBack} title="Attendance" eyebrow="Front desk" subtitle="Check-in and today's activity" />

      {/* A failed check-in has to say so — the row simply stopping spinning explains nothing. */}
      {error && <Text style={styles.error}>{error}</Text>}
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Rise index={0}>
        <View style={styles.statRow}>
          <StatCard label="Checked in today" value={String(events.length)} tone={events.length > 0 ? "good" : undefined} />
          <StatCard label="Total members" value={String(members.length)} hint="on the books" />
        </View>
      </Rise>

      <Rise index={1}>
        <Card>
          <SectionTitle title="Check a member in" />
          <Text style={styles.cardSub}>
            Search the roster, or let members scan their own QR code.
          </Text>

          <Field
            label="Find a member"
            value={query}
            onChange={setQuery}
            placeholder="Name or email"
            autoCapitalize="none"
          />

          {filtered.length === 0 ? (
            <Empty>No members match that search.</Empty>
          ) : (
            filtered.map((member, i) => (
              <Rise key={member.id} index={Math.min(i, 8)}>
                <View style={[styles.row, i === filtered.length - 1 && styles.rowLast]}>
                  <Avatar first={member.firstName} last={member.lastName} size={38} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {member.firstName} {member.lastName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>{member.email}</Text>
                  </View>
                  <Tap onPress={() => checkIn(member)} disabled={pendingId === member.id} scaleTo={0.92}>
                    <View style={styles.checkInBtn}>
                      {pendingId === member.id
                        ? <ActivityIndicator size="small" color={palette.brand} />
                        : <Text style={styles.checkInText}>Check in</Text>}
                    </View>
                  </Tap>
                </View>
              </Rise>
            ))
          )}
        </Card>
      </Rise>

      <Rise index={2}>
        <Card>
          <SectionTitle
            title="Today's check-ins"
            action={<CountUp value={events.length} style={styles.count} />}
          />
          {events.length === 0 ? (
            <Empty>No check-ins yet today.</Empty>
          ) : (
            events.map((event, i) => (
              <View key={event.id} style={[styles.row, i === events.length - 1 && styles.rowLast]}>
                <View style={styles.sourceChip}>
                  <Text style={styles.sourceChipText}>{event.source.slice(0, 2)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {event.member.firstName} {event.member.lastName}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {SOURCE_LABEL[event.source] ?? humanize(event.source) ?? event.source}
                  </Text>
                </View>
                <Text style={styles.time}>{formatTime(event.checkedInAt)}</Text>
              </View>
            ))
          )}
        </Card>
      </Rise>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  error: { color: palette.statusCritical, fontSize: 13, fontWeight: "500" },
  notice: { color: palette.statusGood, fontSize: 13, fontWeight: "500" },

  statRow: { flexDirection: "row", gap: 12 },
  cardSub: { color: palette.inkSecondary, fontSize: 12.5, marginBottom: 14, marginTop: -4 },
  count: { color: palette.inkMuted, fontSize: 13, fontWeight: "600" },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
  rowLast: { borderBottomWidth: 0 },
  rowTitle: { color: palette.ink, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: palette.inkMuted, fontSize: 12, marginTop: 2 },
  time: { color: palette.inkSecondary, fontSize: 12, fontWeight: "600" },

  checkInBtn: {
    borderWidth: 1, borderColor: withAlpha(palette.brand, 0.45), borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8, minWidth: 84, alignItems: "center",
  },
  checkInText: { color: palette.brandOnTint, fontSize: 12, fontWeight: "700" },

  sourceChip: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: palette.surfaceRaised, alignItems: "center", justifyContent: "center",
  },
  sourceChipText: { color: palette.inkSecondary, fontSize: 10, fontWeight: "700" },
});
