"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode, Search, Fingerprint, CreditCard, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getTodayAttendance } from "@/lib/insights/attendance";
import { listMembers, checkInMember, type MemberListRow } from "@/lib/insights/members";
import { initials } from "@/lib/format";

type AttendanceEventRow = Awaited<ReturnType<typeof getTodayAttendance>>[number];
import { PageHeader } from "@/components/page-header";

const SOURCE_META: Record<string, { label: string; Icon: typeof QrCode }> = {
  QR: { label: "QR scan", Icon: QrCode },
  RFID: { label: "RFID tap", Icon: CreditCard },
  BIOMETRIC: { label: "Biometric", Icon: Fingerprint },
  MANUAL: { label: "Front desk", Icon: PenLine },
};

export default function AttendancePage() {
  const [members, setMembers] = useState<MemberListRow[]>([]);
  const [events, setEvents] = useState<AttendanceEventRow[]>([]);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const [membersRes, eventsRes] = await Promise.all([listMembers(supabase), getTodayAttendance(supabase)]);
    setMembers(membersRes);
    setEvents(eventsRes);
  }

  async function handleCheckIn(memberId: string) {
    setPendingId(memberId);
    try {
      await checkInMember(createClient(), memberId);
      await load();
    } finally {
      setPendingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members
      .filter((m) => `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [members, query]);

  return (
    <>
      <PageHeader title="Attendance" subtitle="Front-desk check-in and today's activity" />

      <div className="grid gap-5 p-6 lg:grid-cols-2 lg:p-10">
        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Check a member in</h2>
          <p className="mt-0.5 text-xs text-ink-secondary">
            Search the roster, or let members scan their own QR code in the mobile app
          </p>

          <div className="relative my-4">
            <Search
              size={15}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members"
              className="w-full rounded-lg border border-hairline bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as string]: "color-mix(in srgb, var(--brand) 35%, transparent)" }}
            />
          </div>

          <ul className="divide-y divide-hairline">
            {filtered.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page text-[11px] font-semibold text-ink-secondary">
                  {initials(member.first_name, member.last_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="truncate text-xs text-ink-muted">{member.email}</p>
                </div>
                <button
                  onClick={() => handleCheckIn(member.id)}
                  disabled={pendingId === member.id}
                  className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  style={{
                    borderColor: "color-mix(in srgb, var(--brand) 35%, transparent)",
                    color: "var(--brand-on-tint)",
                  }}
                >
                  {pendingId === member.id ? "…" : "Check in"}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="py-8 text-center text-sm text-ink-muted">No members match that search.</li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-hairline bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-ink">Today&apos;s check-ins</h2>
            <span className="text-sm font-semibold tabular-nums text-ink">{events.length}</span>
          </div>

          <ul className="mt-4 max-h-[460px] divide-y divide-hairline overflow-auto">
            {events.map((event) => {
              const meta = SOURCE_META[event.source] ?? SOURCE_META.MANUAL;
              const { Icon } = meta;
              return (
                <li key={event.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-page text-ink-secondary">
                    <Icon size={15} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {event.member.first_name} {event.member.last_name}
                    </p>
                    <p className="text-xs text-ink-muted">{meta.label}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-ink-secondary">
                    {new Date(event.checked_in_at).toLocaleTimeString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
            {events.length === 0 && (
              <li className="py-10 text-center text-sm text-ink-muted">No check-ins yet today.</li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
