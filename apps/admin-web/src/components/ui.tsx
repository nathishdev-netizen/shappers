"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { initials } from "@/lib/format";

export function Avatar({ first, last, size = 36, tone = "brand" }: { first: string; last: string; size?: number; tone?: "brand" | "muted" }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size, height: size, fontSize: size * 0.32,
        backgroundColor: tone === "brand" ? "var(--brand-soft)" : "var(--surface-raised)",
        color: tone === "brand" ? "var(--brand-on-tint)" : "var(--ink-secondary)",
      }}
    >
      {initials(first, last)}
    </span>
  );
}

const TONES = {
  good: "var(--status-good)", warning: "var(--status-warning)", critical: "var(--status-critical)",
  brand: "var(--brand)", muted: "var(--ink-muted)",
} as const;

export function Pill({ tone = "muted", children, icon }: { tone?: keyof typeof TONES; children: ReactNode; icon?: ReactNode }) {
  const c = TONES[tone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 12%, transparent)` }}>
      {icon}{children}
    </span>
  );
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-ink-muted">{children}</p>;
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return <th className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted ${right ? "text-right" : "text-left"}`}>{children}</th>;
}
export function Td({ children, right, className = "" }: { children: ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-4 py-3 text-[13px] text-ink ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}

export function PillTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="pill-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className="pill-tab" onClick={() => onChange(t.value)}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Right-hand drawer with a spring slide; used for every "add X" flow. */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 480 }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            initial={{ x: width }} animate={{ x: 0 }} exit={{ x: width }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="relative flex h-full w-full flex-col"
            style={{ maxWidth: width, backgroundColor: "var(--page)", boxShadow: "var(--shadow-raised)", borderLeft: "1px solid var(--hairline)" }}
          >
            <header className="flex items-start justify-between border-b px-6 py-5" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface)" }}>
              <div>
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-white/5"><X size={18} /></button>
            </header>
            <div className="flex-1 overflow-auto p-6">{children}</div>
            {footer && <footer className="border-t px-6 py-4" style={{ borderColor: "var(--hairline)", backgroundColor: "var(--surface)" }}>{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Labelled({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-secondary">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: "var(--ink)", color: "var(--page)", boxShadow: "var(--shadow-raised)" }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
