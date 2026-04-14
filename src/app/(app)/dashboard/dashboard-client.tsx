"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { cn } from "@/lib/cn";

type Dash = {
  totals: { income: number; expenses: number; net: number; disposableIncome: number };
  mom: { expenseChangePct: number };
  categories: [string, number][];
  buckets: { label: string; income: number; expense: number }[];
};

const presets = [
  { label: "2 months", months: 2 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
];

export function DashboardClient({
  showDebtBanner,
  debtPromptDismissed,
}: {
  showDebtBanner: boolean;
  debtPromptDismissed: boolean;
}) {
  const [months, setMonths] = useState(3);
  const [data, setData] = useState<Dash | null>(null);
  const [dismissed, setDismissed] = useState(debtPromptDismissed);
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null);

  const load = useCallback(async () => {
    const q = custom
      ? `from=${encodeURIComponent(custom.from)}&to=${encodeURIComponent(custom.to)}`
      : `months=${months}`;
    const res = await fetch(`/api/dashboard?${q}`);
    if (res.ok) setData(await res.json());
  }, [months, custom]);

  useEffect(() => {
    load();
  }, [load]);

  async function dismissDebtPrompt() {
    setDismissed(true);
    await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ debtPromptDismissed: true }),
    });
  }

  const chartData =
    data?.buckets.map((b) => ({
      name: b.label,
      Income: Math.round(b.income),
      Expenses: Math.round(b.expense),
    })) ?? [];

  const catData =
    data?.categories.slice(0, 8).map(([name, value]) => ({
      name,
      amount: Math.round(value),
    })) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Spending dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Income, expenses, and categories from your parsed statements.
        </p>
      </div>

      {showDebtBanner && !dismissed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950/40">
          <p className="text-sm text-brand-900 dark:text-brand-100">
            Ready to tackle debt? Add your balances to unlock your payoff plan.
          </p>
          <div className="flex gap-2">
            <Link
              href="/debts"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add debts
            </Link>
            <button
              type="button"
              onClick={dismissDebtPrompt}
              className="rounded-lg px-4 py-2 text-sm text-brand-800 hover:bg-brand-100 dark:text-brand-200 dark:hover:bg-brand-900/50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.months}
            type="button"
            onClick={() => {
              setCustom(null);
              setMonths(p.months);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              !custom && months === p.months
                ? "bg-brand-600 text-white"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            )}
          >
            {p.label}
          </button>
        ))}
        <span className="text-sm text-zinc-500">Custom:</span>
        <input
          type="date"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          onChange={(e) =>
            setCustom((c) => ({ from: e.target.value, to: c?.to ?? e.target.value }))
          }
        />
        <input
          type="date"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          onChange={(e) =>
            setCustom((c) => (c?.from ? { from: c.from, to: e.target.value } : null))
          }
        />
        {custom?.from && custom?.to && (
          <button
            type="button"
            className="text-sm font-medium text-brand-700 dark:text-brand-400"
            onClick={() => load()}
          >
            Apply
          </button>
        )}
      </div>

      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-xs font-medium uppercase text-zinc-500">Income</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
              ${data.totals.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-xs font-medium uppercase text-zinc-500">Expenses</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
              ${data.totals.expenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              MoM change {(data.mom.expenseChangePct * 100).toFixed(1)}% (trailing windows)
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-xs font-medium uppercase text-zinc-500">Disposable (est.)</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-white">
              ${data.totals.disposableIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="mt-1 text-xs text-zinc-500">After avg expenses & minimum debt payments</p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Income vs expenses</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8 }}
                  formatter={(v) => [`$${Number(v ?? 0)}`, ""]}
                />
                <Legend />
                <Bar dataKey="Income" fill="oklch(0.58 0.15 170)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="oklch(0.55 0.2 25)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Top categories</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`$${Number(v ?? 0)}`, ""]} />
                <Bar dataKey="amount" fill="oklch(0.5 0.12 250)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
