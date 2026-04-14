"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Debt = {
  id: string;
  name: string;
  balance: number;
  interestRateApr: number;
  minimumPayment: number;
  dueDayOfMonth: number | null;
  autoExtracted: boolean;
  verified: boolean;
  rejected: boolean;
};

function DebtsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const isNew = sp.get("new") === "1";

  const [debts, setDebts] = useState<Debt[]>([]);
  const [form, setForm] = useState({
    name: "",
    balance: "",
    interestRateApr: "",
    minimumPayment: "",
    dueDayOfMonth: "",
  });

  async function load() {
    const res = await fetch("/api/debts");
    if (res.ok) {
      const d = await res.json();
      setDebts(d.debts);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addDebt(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/debts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        balance: Number(form.balance),
        interestRateApr: Number(form.interestRateApr),
        minimumPayment: Number(form.minimumPayment),
        dueDayOfMonth: form.dueDayOfMonth ? Number(form.dueDayOfMonth) : null,
        autoExtracted: false,
      }),
    });
    if (res.ok) {
      setForm({ name: "", balance: "", interestRateApr: "", minimumPayment: "", dueDayOfMonth: "" });
      load();
    }
  }

  async function skip() {
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true, skippedDebtOnboarding: true }),
    });
    router.push("/dashboard");
  }

  async function verify(id: string, verified: boolean, rejected?: boolean) {
    await fetch(`/api/debts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        verified,
        rejected: rejected ?? false,
        rejectionReason: rejected ? "User rejected auto-suggestion" : undefined,
      }),
    });
    load();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Debts</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Optional: add balances manually. Recurring debt-like payments from statements may appear for confirmation.
          </p>
        </div>
        <div className="flex gap-2">
          {isNew && (
            <button
              type="button"
              onClick={skip}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
            >
              Skip to dashboard
            </button>
          )}
          <Link
            href="/plan"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Payoff plan
          </Link>
        </div>
      </div>

      <form onSubmit={addDebt} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50 sm:grid-cols-2">
        <h2 className="sm:col-span-2 text-sm font-semibold text-zinc-900 dark:text-white">Add debt manually</h2>
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          required
          placeholder="Balance"
          type="number"
          step="0.01"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          required
          placeholder="APR %"
          type="number"
          step="0.01"
          value={form.interestRateApr}
          onChange={(e) => setForm({ ...form, interestRateApr: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          required
          placeholder="Minimum payment"
          type="number"
          step="0.01"
          value={form.minimumPayment}
          onChange={(e) => setForm({ ...form, minimumPayment: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          placeholder="Due day (1–28)"
          type="number"
          min={1}
          max={28}
          value={form.dueDayOfMonth}
          onChange={(e) => setForm({ ...form, dueDayOfMonth: e.target.value })}
          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" className="rounded-lg bg-brand-600 py-2 text-sm font-medium text-white sm:col-span-2">
          Add debt
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Your debts</h2>
        {debts.length === 0 && <p className="text-sm text-zinc-500">No debts yet.</p>}
        <ul className="space-y-2">
          {debts.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">{d.name}</p>
                <p className="text-xs text-zinc-500">
                  Balance ${d.balance.toFixed(2)} · {d.interestRateApr}% APR · Min ${d.minimumPayment.toFixed(2)}
                  {d.autoExtracted && " · Auto-suggested"}
                </p>
              </div>
              {d.autoExtracted && !d.verified && !d.rejected && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => verify(d.id, true)}
                    className="rounded bg-brand-600 px-3 py-1 text-xs text-white"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => verify(d.id, false, true)}
                    className="rounded border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-600"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function DebtsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading…</div>}>
      <DebtsInner />
    </Suspense>
  );
}
