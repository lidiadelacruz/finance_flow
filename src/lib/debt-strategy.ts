export type DebtInput = {
  id: string;
  name: string;
  balance: number;
  interestRateApr: number;
  minimumPayment: number;
};

export type StrategyKind = "snowball" | "avalanche";

export type PayoffProjection = {
  months: number;
  totalInterestPaid: number;
  firstPayoffDate: Date;
  /** Approximate remaining balance trajectory for charting (one point per month). */
  balanceSnapshots: { month: number; byDebt: Record<string, number> }[];
};

const MAX_MONTHS = 600;

function monthlyRate(apr: number) {
  return apr / 100 / 12;
}

function sortDebts(debts: DebtInput[], strategy: StrategyKind): DebtInput[] {
  const copy = [...debts].filter((d) => d.balance > 0.01);
  if (strategy === "snowball") {
    return copy.sort((a, b) => a.balance - b.balance);
  }
  return copy.sort((a, b) => b.interestRateApr - a.interestRateApr);
}

/** Month-by-month: accrue interest, pay all minimums, then snowball/avalanche extra on priority. */
export function projectPayoff(
  debts: DebtInput[],
  strategy: StrategyKind,
  extraMonthly: number
): PayoffProjection {
  const order = sortDebts(debts, strategy);
  const balances: Record<string, number> = {};
  for (const d of order) balances[d.id] = d.balance;

  let month = 0;
  let totalInterest = 0;
  const balanceSnapshots: PayoffProjection["balanceSnapshots"] = [];
  let firstPayoffMonth: number | null = null;

  const start = new Date();

  while (month < MAX_MONTHS) {
    const active = order.filter((d) => balances[d.id] > 0.01);
    if (active.length === 0) break;

    month += 1;

    for (const d of active) {
      const r = monthlyRate(d.interestRateApr);
      const interest = balances[d.id] * r;
      totalInterest += interest;
      balances[d.id] += interest;
    }

    for (const d of active) {
      const min = Math.min(d.minimumPayment, balances[d.id]);
      balances[d.id] -= min;
    }

    let extra = Math.max(0, extraMonthly);
    for (const d of order) {
      if (extra <= 0) break;
      if (balances[d.id] <= 0.01) continue;
      const pay = Math.min(balances[d.id], extra);
      balances[d.id] -= pay;
      extra -= pay;
    }

    const snap: Record<string, number> = {};
    for (const d of order) snap[d.id] = Math.max(0, balances[d.id]);
    balanceSnapshots.push({ month, byDebt: snap });

    if (firstPayoffMonth === null) {
      const anyPaid = order.some((d) => d.balance > 100 && snap[d.id] <= 0.01);
      if (anyPaid) firstPayoffMonth = month;
    }

    if (order.every((d) => balances[d.id] <= 0.01)) break;
  }

  const firstPayoffDate = new Date(start.getFullYear(), start.getMonth() + (firstPayoffMonth ?? month), start.getDate());

  return {
    months: month,
    totalInterestPaid: Math.round(totalInterest * 100) / 100,
    firstPayoffDate,
    balanceSnapshots: balanceSnapshots.slice(0, 120),
  };
}

export function recommendStrategy(debts: DebtInput[]): StrategyKind {
  const high = debts.some((d) => d.interestRateApr >= 15);
  if (high) return "avalanche";
  const small = debts.filter((d) => d.balance < 2000).length >= 2;
  if (small) return "snowball";
  return "avalanche";
}

export function materialExtraChange(prev: number, next: number): boolean {
  if (prev <= 0) return next > 25;
  const ratio = Math.abs(next - prev) / prev;
  return ratio >= 0.15 || Math.abs(next - prev) >= 75;
}
