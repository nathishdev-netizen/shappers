interface Props {
  data: { name: string; count: number }[];
}

/**
 * Nominal categories, so every bar takes the same hue — a darker-where-bigger ramp
 * would double-encode the length the bar already shows.
 */
export function PlanDistribution({ data }: Props) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3.5 py-1">
      {data.map((plan) => (
        <div key={plan.name}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-ink-secondary">{plan.name}</span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink">
              {plan.count}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-page">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((plan.count / max) * 100, 2)}%`,
                backgroundColor: "var(--series-1)",
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">No active plans yet.</p>}
    </div>
  );
}
