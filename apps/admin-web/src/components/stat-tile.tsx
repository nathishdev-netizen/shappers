import { ArrowDownRight, ArrowUpRight, MoreHorizontal } from "lucide-react";

interface StatTileProps {
  label: string;
  value: string;
  delta?: { value: number; period: string; upIsGood?: boolean };
  /** Plain context line, for when the number isn't a percentage change. */
  hint?: string;
  sparkline?: number[];
  status?: "good" | "warning" | "critical";
  icon?: React.ReactNode;
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 72, height = 26;
  const max = Math.max(...points), min = Math.min(...points), span = max - min || 1;
  const coords = points.map((p, i) => ({
    x: (i / (points.length - 1)) * width,
    y: height - ((p - min) / span) * (height - 4) - 2,
  }));
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <path d={path} fill="none" stroke="var(--baseline)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={3.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  );
}

/** The reference's stat card: label + "…" top row, an oversized figure, a green/red delta with period. */
export function StatTile({ label, value, delta, hint, sparkline, status, icon }: StatTileProps) {
  const statusColor =
    status === "critical" ? "var(--status-critical)"
    : status === "warning" ? "var(--status-warning)"
    : status === "good" ? "var(--status-good)"
    : undefined;

  const upIsGood = delta?.upIsGood ?? true;
  const isZero = (delta?.value ?? 0) === 0;
  const isPositive = (delta?.value ?? 0) >= 0;
  const deltaIsGood = isPositive === upIsGood;
  const DeltaIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}>
              {icon}
            </span>
          )}
          <p className="text-[13px] text-ink-secondary">{label}</p>
        </div>
        {statusColor ? (
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
        ) : (
          <MoreHorizontal size={16} className="shrink-0 text-ink-muted" />
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="stat-figure text-[36px] font-semibold leading-none text-ink">{value}</p>
          {delta && (
            <p className="mt-2.5 flex items-center gap-1 whitespace-nowrap text-xs" style={{ color: isZero ? "var(--ink-muted)" : deltaIsGood ? "var(--status-good-text)" : "var(--status-critical)" }}>
              {!isZero && <DeltaIcon size={13} strokeWidth={2.4} className="shrink-0" />}
              {!isZero && <span className="font-medium">{isPositive ? "+" : ""}{delta.value}%</span>}
              <span className="text-ink-muted">{delta.period}</span>
            </p>
          )}
          {!delta && hint && <p className="mt-2.5 whitespace-nowrap text-xs text-ink-muted">{hint}</p>}
        </div>
        {sparkline && <div className="shrink-0"><Sparkline points={sparkline} /></div>}
      </div>
    </div>
  );
}
