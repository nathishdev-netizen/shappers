import { LockedSection } from "@/components/locked-section";

// The original implementation is preserved in page.unlocked.tsx. To switch this
// section back on: restore that file over this one and drop "/invoices" from
// LOCKED_PATHS in src/lib/locked.ts.
export default function Page() {
  return <LockedSection path="/invoices" title="Invoices" />;
}
