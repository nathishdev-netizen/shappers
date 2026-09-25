/**
 * Dark only, matching the web console token-for-token.
 * Surfaces climb in luminance with elevation — shadows carry no contrast here.
 */
export const palette = {
  page: "#0a0a0a",
  surface: "#141414",
  surfaceRaised: "#1c1c1c",
  surfaceSunken: "#0f0f0f",

  ink: "#f5f5f5",
  inkSecondary: "#a3a3a3",
  inkMuted: "#6b6b6b",

  hairline: "rgba(255,255,255,0.07)",
  hairlineStrong: "rgba(255,255,255,0.14)",
  baseline: "#2c2c2c",

  /** SHAPER brand red, sampled from the logo. */
  brand: "#f00000",
  brandHover: "#ff2419",
  brandInk: "#ffffff",
  brandSoft: "rgba(240,0,0,0.13)",
  brandGlow: "rgba(240,0,0,0.38)",
  brandOnTint: "#ff6b6b",

  statusGood: "#22c55e",
  statusWarning: "#f59e0b",
  statusCritical: "#ff7a7a",

  overlay: "rgba(0,0,0,0.65)",
};

export type Palette = typeof palette;

/** Brand-colored surfaces pick white or ink text by luminance, so any hex stays legible. */
export function readableInk(hex: string): string {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.55 ? "#0b0b0b" : "#ffffff";
}

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Brand used as text on a pale brand tint — lightened so it reads on dark. */
export function brandOnTint(brand: string): string {
  const value = brand.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  const blend = (c: number) => Math.round(c + (255 - c) * 0.42);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

export function formatCurrency(cents: number): string {
  return `₹${Math.round(cents / 100).toLocaleString("en-IN")}`;
}

export function formatCompact(cents: number): string {
  const r = cents / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000) return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${Math.round(r)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export const humanize = (v: string | null | undefined) =>
  v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") : null;

/**
 * Chart axis labels. Both parse the ISO date by parts rather than via `new Date(iso)`,
 * which would read a bare "YYYY-MM-DD" as UTC and shift every label a day earlier
 * east of Greenwich.
 */
export function formatShortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function formatMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}
