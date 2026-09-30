import { ShieldCheck, ShieldX, Snowflake, Clock, Ban, CircleSlash, TriangleAlert } from "lucide-react";
import type { AccessReason, AccessStatus, ChurnRisk } from "@/lib/api";

const ACCESS_META: Record<
  AccessReason,
  { label: string; color: string; Icon: typeof ShieldCheck; hint: string }
> = {
  ACTIVE: { label: "Access allowed", color: "var(--status-good)", Icon: ShieldCheck, hint: "Can enter the gym" },
  EXPIRED: { label: "Expired", color: "var(--status-critical)", Icon: Clock, hint: "Membership period ended" },
  PAST_DUE: { label: "Payment overdue", color: "var(--status-critical)", Icon: ShieldX, hint: "Entry blocked until paid" },
  FROZEN: { label: "Frozen", color: "var(--status-warning)", Icon: Snowflake, hint: "On hold" },
  CANCELLED: { label: "Cancelled", color: "var(--ink-muted)", Icon: CircleSlash, hint: "Membership ended" },
  MANUALLY_BLOCKED: { label: "Blocked by staff", color: "var(--status-critical)", Icon: Ban, hint: "Manual block" },
  NO_SUBSCRIPTION: { label: "No plan", color: "var(--ink-muted)", Icon: CircleSlash, hint: "Never subscribed" },
};

export function accessMeta(reason: AccessReason) {
  return ACCESS_META[reason];
}

/** Compact pill for table rows — icon + label, never colour alone. */
export function AccessPill({ access }: { access: AccessStatus }) {
  const { label, color, Icon } = ACCESS_META[access.reason];

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      <Icon size={12} strokeWidth={2.4} />
      {label}
    </span>
  );
}

const RISK_META: Record<ChurnRisk, { label: string; color: string }> = {
  HIGH: { label: "High risk", color: "var(--status-critical)" },
  MEDIUM: { label: "Watch", color: "var(--status-warning)" },
  LOW: { label: "Healthy", color: "var(--status-good)" },
  UNKNOWN: { label: "No data", color: "var(--ink-muted)" },
};

export function ChurnPill({ risk, compact = false }: { risk: ChurnRisk; compact?: boolean }) {
  const { label, color } = RISK_META[risk];
  const atRisk = risk === "HIGH" || risk === "MEDIUM";

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs" style={{ color }}>
        {atRisk && <TriangleAlert size={12} strokeWidth={2.4} />}
        {label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {atRisk && <TriangleAlert size={12} strokeWidth={2.4} />}
      {label}
    </span>
  );
}
