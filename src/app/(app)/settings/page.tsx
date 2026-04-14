"use client";

import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [hc, setHc] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.highContrast === "boolean") setHc(d.highContrast);
      })
      .catch(() => {});
  }, []);

  async function toggleHc() {
    const next = !hc;
    setHc(next);
    document.documentElement.classList.toggle("high-contrast", next);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highContrast: next }),
    });
  }

  async function subscribe() {
    setStripeMsg(null);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setStripeMsg(data.message ?? "Checkout unavailable.");
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Appearance, accessibility, and subscription.</p>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Theme</h2>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
                theme === t ? "bg-brand-600 text-white" : "bg-zinc-100 dark:bg-zinc-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Accessibility</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hc} onChange={toggleHc} />
          High contrast
        </label>
      </div>

      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Subscription</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">FinanceFlow is $5/month after you connect billing.</p>
        <button
          type="button"
          onClick={subscribe}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Start checkout
        </button>
        {stripeMsg && <p className="text-sm text-amber-700 dark:text-amber-400">{stripeMsg}</p>}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400">
        Data deletion requests: contact support@financeflow.example (30-day SLA). Audit logs retained per policy.
      </div>
    </div>
  );
}
