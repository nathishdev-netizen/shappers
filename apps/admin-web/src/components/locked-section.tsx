"use client";

import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { LOCK_REASON, type LockedPath } from "@/lib/locked";

/**
 * Stands in for a locked page's contents. The sidebar already refuses to link
 * here, so this catches anyone arriving by typed URL, bookmark or back button.
 */
export function LockedSection({ path, title }: { path: LockedPath; title: string }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <div
          className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
          style={{ backgroundColor: "var(--surface-raised)" }}
        >
          <Lock size={22} style={{ color: "var(--brand)" }} strokeWidth={2.2} />
        </div>

        <h1 className="mt-5 text-xl font-semibold text-ink">{title} is locked</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          {LOCK_REASON[path]} Your data is untouched — this section will switch back on
          without anything being lost.
        </p>

        <Link
          href="/dashboard"
          className="btn-ghost mt-6 inline-flex items-center gap-2"
        >
          <ArrowLeft size={15} strokeWidth={2.2} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
