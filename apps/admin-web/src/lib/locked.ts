/**
 * Sections switched off for now.
 *
 * These are gated, not removed: the routes, pages and API all still exist, so
 * unlocking one is deleting its line here. Nothing else needs to change.
 *
 * The gate is applied in two places, because a greyed-out menu item is a hint
 * rather than a lock — someone typing the URL would walk straight in:
 *   1. the sidebar, which renders these with a padlock and no link
 *   2. the page itself, via <LockedSection />
 */
export const LOCKED_PATHS = ["/training", "/diet", "/invoices", "/branches"] as const;

export type LockedPath = (typeof LOCKED_PATHS)[number];

export function isLocked(pathname: string): boolean {
  return LOCKED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Shown on the locked page itself, so the reason is specific rather than generic. */
export const LOCK_REASON: Record<LockedPath, string> = {
  "/training": "Personal training scheduling is being finalised.",
  "/diet": "Diet planning is being finalised.",
  "/invoices": "Invoicing is being finalised.",
  "/branches": "Multi-branch management is being finalised.",
};
