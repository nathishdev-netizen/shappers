"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDay } from "@/lib/format";

interface Props {
  data: { date: string; checkIns: number }[];
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { date: string; checkIns: number } }[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 shadow-sm">
      <p className="text-xs text-ink-secondary">{formatShortDay(point.date)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-ink">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--series-1)" }} />
        {point.checkIns} check-ins
      </p>
    </div>
  );
}

export function AttendanceChart({ data }: Props) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.14} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="var(--gridline)" strokeWidth={1} vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={formatShortDay}
            tickLine={false}
            axisLine={{ stroke: "var(--baseline)", strokeWidth: 1 }}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
            width={44}
            allowDecimals={false}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
          />

          <Area
            type="monotone"
            dataKey="checkIns"
            stroke="var(--series-1)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="url(#attendanceFill)"
            activeDot={{
              r: 4.5,
              fill: "var(--series-1)",
              stroke: "var(--surface)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
