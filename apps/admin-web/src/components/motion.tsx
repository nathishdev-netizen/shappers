"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type Variants } from "motion/react";

/* ---------- Staggered reveal ---------- */

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 26 } },
};

/** Wrap a grid of cards; each direct <Item> child rises in sequence. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

export function Item({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <motion.div variants={rise} className={className} style={style}>
      {children}
    </motion.div>
  );
}

/* ---------- Hover lift ---------- */

/** Spring lift on hover — the tactile cue that a card is interactive. */
export function Lift({ children, className, onClick, style }: { children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Count-up number ---------- */

/**
 * Animates to `value` on mount and whenever it changes. Deliberately not gated on
 * scroll position — a figure that sits below the fold must never read as zero.
 */
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString("en-IN"), duration = 1.1, className }: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const [text, setText] = useState(format(0));

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    const unsub = mv.on("change", (v) => setText(format(v)));
    return () => { controls.stop(); unsub(); };
  }, [value]);

  return <span className={className}>{text}</span>;
}

/* ---------- Ring gauge ---------- */

/**
 * SVG ring that draws itself in. `segments` stacks concentric rings (the Whoop look);
 * a single value draws one ring. Colour defaults to brand; pass status colours for meaning.
 */
export function Ring({
  value, size = 120, stroke = 10, color = "var(--brand)", track = "var(--baseline)", children, delay = 0.1,
}: {
  value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} opacity={0.5} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function RingStack({ rings, size = 150 }: { rings: { value: number; color: string }[]; size?: number }) {
  const stroke = 9, gap = 5;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {rings.map((ring, i) => {
          const r = (size - stroke) / 2 - i * (stroke + gap);
          const c = 2 * Math.PI * r;
          const pct = Math.max(0, Math.min(1, ring.value));
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--baseline)" strokeWidth={stroke} opacity={0.45} />
              <motion.circle
                cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ring.color} strokeWidth={stroke} strokeLinecap="round"
                strokeDasharray={c}
                initial={{ strokeDashoffset: c }}
                animate={{ strokeDashoffset: c * (1 - pct) }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.12 }}
                style={{ filter: `drop-shadow(0 0 5px ${ring.color})` }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- Spotlight card ---------- */

/** Tracks the pointer so the CSS `.spotlight` glow follows it. */
export function Spotlight({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }
  return (
    <div ref={ref} onMouseMove={onMove} className={`spotlight ${className}`} style={style}>
      {children}
    </div>
  );
}

/* ---------- Progress bar ---------- */

export function Bar({ value, color = "var(--brand)", height = 6, delay = 0.2 }: { value: number; color?: string; height?: number; delay?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height, backgroundColor: "var(--baseline)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
      />
    </div>
  );
}

/* ---------- Page transition ---------- */

export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export { motion, useMotionValue, useTransform };
