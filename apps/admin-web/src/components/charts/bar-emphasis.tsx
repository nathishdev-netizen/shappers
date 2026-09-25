"use client";

import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Props {
  data: { label: string; value: number }[];
  /** Index to highlight in the brand colour; the rest stay muted (the emphasis form). */
  highlight?: number;
  format?: (v: number) => string;
  height?: number;
}

function ChartTooltip({ active, payload, format }: { active?: boolean; payload?: { payload: { label: string; value: number } }[]; format: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--hairline-strong)", backgroundColor: "var(--surface-raised)" }}>
      <p className="text-xs text-ink-secondary">{p.label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{format(p.value)}</p>
    </div>
  );
}

/**
 * Muted bars with one brand-coloured highlight — the reference's registrations chart.
 * Highlight defaults to the max, which is also the honest thing to draw attention to.
 */
export function BarEmphasis({ data, highlight, format = (v) => String(v), height = 220 }: Props) {
  const hi = highlight ?? data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }} barCategoryGap="30%">
          <defs>
            <linearGradient id="barMuted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-muted-hover)" />
              <stop offset="100%" stopColor="var(--series-muted)" />
            </linearGradient>
            <linearGradient id="barBrand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-hover)" />
              <stop offset="100%" stopColor="var(--brand)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--gridline)" strokeWidth={1} vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--baseline)" }} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--ink-muted)", fontSize: 11 }} width={40} allowDecimals={false} />
          <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === hi ? "url(#barBrand)" : "url(#barMuted)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
