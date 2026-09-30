"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompactCurrency, formatCurrency, formatMonth } from "@/lib/format";

interface Props {
  data: { month: string; amountCents: number }[];
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { month: string; amountCents: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 shadow-sm">
      <p className="text-xs text-ink-secondary">{formatMonth(point.month)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--series-1)" }} />
        {formatCurrency(point.amountCents)}
      </p>
    </div>
  );
}

export function RevenueChart({ data }: Props) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -6 }} barCategoryGap="28%">
          <CartesianGrid stroke="var(--gridline)" strokeWidth={1} vertical={false} />

          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tickLine={false}
            axisLine={{ stroke: "var(--baseline)", strokeWidth: 1 }}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCompactCurrency(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            width={56}
          />

          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11,11,11,0.035)" }} />

          {/* 4px rounded data-end, square at the baseline; capped thickness leaves air in the band. */}
          <Bar
            dataKey="amountCents"
            fill="var(--series-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
