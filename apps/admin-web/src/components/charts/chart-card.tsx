"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  chart: ReactNode;
  /** Table-view twin — every value stays reachable without relying on color. */
  table: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, chart, table, className = "" }: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section className={`rounded-2xl border border-hairline bg-surface p-5 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p>}
        </div>

        <div className="flex shrink-0 rounded-lg border border-hairline p-0.5">
          {(
            [
              ["chart", BarChart3, "Chart view"],
              ["table", Table2, "Table view"],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-label={label}
              aria-pressed={view === key}
              className="rounded-md p-1.5 transition-colors"
              style={{
                backgroundColor: view === key ? "var(--page)" : "transparent",
                color: view === key ? "var(--ink)" : "var(--ink-muted)",
              }}
            >
              <Icon size={14} strokeWidth={2} />
            </button>
          ))}
        </div>
      </div>

      {view === "chart" ? chart : <div className="max-h-[260px] overflow-auto">{table}</div>}
    </section>
  );
}

export function MiniTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-hairline text-left">
          <th className="pb-2 font-medium text-ink-secondary">{head[0]}</th>
          <th className="pb-2 text-right font-medium text-ink-secondary">{head[1]}</th>
        </tr>
      </thead>
      <tbody className="tabular-nums">
        {rows.map(([label, value]) => (
          <tr key={label} className="border-b border-hairline/60 last:border-0">
            <td className="py-2 text-ink-secondary">{label}</td>
            <td className="py-2 text-right font-medium text-ink">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
