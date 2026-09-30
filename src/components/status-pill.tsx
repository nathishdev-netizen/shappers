import { CheckCircle2, CircleSlash, PauseCircle, AlertCircle } from "lucide-react";

const STATUS = {
  ACTIVE: { label: "Active", color: "var(--status-good)", Icon: CheckCircle2 },
  PAST_DUE: { label: "Past due", color: "var(--status-critical)", Icon: AlertCircle },
  FROZEN: { label: "Frozen", color: "var(--status-warning)", Icon: PauseCircle },
  CANCELLED: { label: "Cancelled", color: "var(--ink-muted)", Icon: CircleSlash },
} as const;

/** Status never rides on color alone — every pill ships an icon and a label. */
export function StatusPill({ status }: { status: string }) {
  const entry = STATUS[status as keyof typeof STATUS];

  if (!entry) {
    return <span className="text-xs text-ink-muted">No plan</span>;
  }

  const { label, color, Icon } = entry;

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
