"use client";

import { useState } from "react";
import Link from "next/link";

export function OnboardingClient() {
  const [open, setOpen] = useState(true);

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Welcome to FinanceFlow</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We never ask for bank logins. Upload PDF statements; we parse them and delete the raw files—only structured
          transactions are stored.
        </p>
      </div>

      {open && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="font-semibold text-zinc-900 dark:text-white">Security & privacy</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <li>Password-protected account; sessions expire after 15 minutes of inactivity.</li>
            <li>Bank PDFs are processed in memory and not retained after parsing.</li>
            <li>You can add debt details manually—debt tracking is optional.</li>
          </ul>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 text-sm font-medium text-brand-700 dark:text-brand-400"
          >
            Got it
          </button>
        </div>
      )}

      <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/50 p-6 dark:border-brand-800 dark:bg-brand-950/20">
        <h2 className="font-semibold text-zinc-900 dark:text-white">Next: upload statements</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Upload 1–3 months of PDF bank statements to generate your dashboard.
        </p>
        <Link
          href="/upload"
          className="mt-4 inline-flex rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Go to upload
        </Link>
      </div>
    </div>
  );
}
