"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

type Plan = {
  recommended: "snowball" | "avalanche";
  selectedStrategy: "snowball" | "avalanche";
  extraPaymentMonthly: number;
  lastDisposableIncome: number | null;
  comparison: {
    snowball: { months: number; totalInterestPaid: number; firstPayoffDate: string };
    avalanche: { months: number; totalInterestPaid: number; firstPayoffDate: string };
  };
  snapshots: { month: number; byDebt: Record<string, number> }[];
};

export default function PlanPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [extra, setExtra] = useState(0);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("avalanche");
  const [overrideReason, setOverrideReason] = useState("");
  const [rebalance, setRebalance] = useState<"stretch" | "reoptimize" | "">("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/plan");
    if (res.status === 401) return;
    const d = await res.json();
    if (d.comparison) {
      setPlan(d);
      setExtra(d.extraPaymentMonthly ?? 0);
      setStrategy(d.selectedStrategy ?? d.recommended);
    } else {
      setPlan(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setMsg(null);
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        extraPaymentMonthly: extra,
        strategy,
        strategyOverrideReason: strategy !== plan?.recommended ? overrideReason : undefined,
        rebalanceChoice: rebalance || undefined,
      }),
    });
    if (res.ok) {
      setMsg("Plan saved.");
      load();
    } else setMsg("Could not save.");
  }

  const chartData =
    plan?.snapshots.map((s) => {
      const row: Record<string, number | string> = { month: s.month };
      let total = 0;
      for (const v of Object.values(s.byDebt)) total += v;
      row.total = Math.round(total);
      return row;
    }) ?? [];

  if (plan && plan.comparison.snowball.months === 0 && plan.comparison.avalanche.months === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Payoff plan</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Add at least one debt with balance and minimum payment to see snowball vs avalanche projections.
        </p>
        <Link href="/debts" className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
          Add debts
        </Link>
      </div>
    );
  }

  if (!plan) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Debt payoff plan</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Compare strategies. We recommend <strong>{plan.recommended}</strong> for your profile—you can override below.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-brand-800 dark:text-brand-200">Snowball</h2>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{plan.comparison.snowball.months} mo</p>
          <p className="text-sm text-zinc-500">
            Interest paid ~${plan.comparison.snowball.totalInterestPaid.toFixed(0)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            First payoff ~{new Date(plan.comparison.snowball.firstPayoffDate).toLocaleDateString()}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-brand-800 dark:text-brand-200">Avalanche</h2>
          <p className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">{plan.comparison.avalanche.months} mo</p>
          <p className="text-sm text-zinc-500">
            Interest paid ~${plan.comparison.avalanche.totalInterestPaid.toFixed(0)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            First payoff ~{new Date(plan.comparison.avalanche.firstPayoffDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Extra monthly payment</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Disposable income estimate:{" "}
          {plan.lastDisposableIncome != null ? `$${plan.lastDisposableIncome.toFixed(0)}` : "—"} (updates after each
          statement upload).
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">Extra toward debt</label>
          <input
            type="number"
            min={0}
            step={10}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            className="w-32 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Strategy</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="strat"
              checked={strategy === "snowball"}
              onChange={() => setStrategy("snowball")}
            />
            Snowball
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="strat"
              checked={strategy === "avalanche"}
              onChange={() => setStrategy("avalanche")}
            />
            Avalanche (recommended: {plan.recommended})
          </label>
        </div>
        {strategy !== plan.recommended && (
          <div className="mt-3">
            <label className="text-xs text-zinc-500">Optional: why override? (helps refine recommendations)</label>
            <input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        )}

        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">If your extra payment changed materially</p>
          <p className="mt-1 text-xs text-zinc-500">
            (1) Stretch the current timeline while keeping payoff order, or (2) re-optimize order for the new payment
            amount.
          </p>
          <div className="mt-2 space-y-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="rebal"
                checked={rebalance === "stretch"}
                onChange={() => setRebalance("stretch")}
              />
              Stretch timeline (keep order)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="rebal"
                checked={rebalance === "reoptimize"}
                onChange={() => setRebalance("reoptimize")}
              />
              Re-optimize payoff order
            </label>
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Save plan
        </button>
        {msg && <p className="mt-2 text-sm text-green-700 dark:text-green-400">{msg}</p>}
      </div>

      {chartData.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Total debt (projected)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v) => [`$${Number(v ?? 0)}`, ""]} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="oklch(0.58 0.15 170)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
