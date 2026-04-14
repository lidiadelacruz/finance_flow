import { startOfMonth, subMonths, endOfMonth, isWithinInterval } from "date-fns";

export type Tx = { date: Date; amount: number; category: string; type: string };

export function filterByRange(txs: Tx[], monthsBack: number, custom?: { from: Date; to: Date }) {
  if (custom) {
    return txs.filter((t) => isWithinInterval(t.date, { start: custom.from, end: custom.to }));
  }
  const end = endOfMonth(new Date());
  const start = startOfMonth(subMonths(end, monthsBack - 1));
  return txs.filter((t) => isWithinInterval(t.date, { start, end }));
}

export function sumIncome(txs: Tx[]) {
  return txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
}

export function sumExpenses(txs: Tx[]) {
  return txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
}

export function byCategory(txs: Tx[]) {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function monthBuckets(txs: Tx[], count: number) {
  const end = endOfMonth(new Date());
  const buckets: { label: string; income: number; expense: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = subMonths(end, i);
    const s = startOfMonth(m);
    const e = endOfMonth(m);
    const inMonth = txs.filter((t) => isWithinInterval(t.date, { start: s, end: e }));
    buckets.push({
      label: s.toLocaleString("default", { month: "short" }),
      income: sumIncome(inMonth),
      expense: sumExpenses(inMonth),
    });
  }
  return buckets;
}

/** Simple spike: current month category spend > 130% of trailing average for that category. */
export function detectSpendingSpikes(txs: Tx[]): { category: string; message: string }[] {
  const end = endOfMonth(new Date());
  const curStart = startOfMonth(end);
  const current = txs.filter((t) => isWithinInterval(t.date, { start: curStart, end }));

  const curByCat = new Map<string, number>();
  for (const t of current) {
    if (t.type !== "expense") continue;
    curByCat.set(t.category, (curByCat.get(t.category) ?? 0) + t.amount);
  }

  const baseByCat = new Map<string, number>();
  const months = 3;
  for (let i = 1; i <= months; i++) {
    const s = startOfMonth(subMonths(curStart, i));
    const e = endOfMonth(subMonths(curStart, i));
    const slice = txs.filter((t) => t.type === "expense" && isWithinInterval(t.date, { start: s, end: e }));
    for (const t of slice) {
      baseByCat.set(t.category, (baseByCat.get(t.category) ?? 0) + t.amount);
    }
  }

  const alerts: { category: string; message: string }[] = [];
  for (const [cat, cur] of curByCat) {
    const base = (baseByCat.get(cat) ?? 0) / months;
    if (base < 50) continue;
    if (cur > base * 1.3) {
      alerts.push({
        category: cat,
        message: `Spending in ${cat} is about ${Math.round((cur / base) * 100)}% of your recent average.`,
      });
    }
  }
  return alerts;
}

export function computeDisposableIncome(
  txs: Tx[],
  monthsForAvg: number,
  minimumDebtPayments: number
): number {
  const end = endOfMonth(new Date());
  const start = startOfMonth(subMonths(end, monthsForAvg - 1));
  const slice = txs.filter((t) => isWithinInterval(t.date, { start, end }));
  const income = sumIncome(slice) / monthsForAvg;
  const expenses = sumExpenses(slice) / monthsForAvg;
  return income - expenses - minimumDebtPayments;
}
