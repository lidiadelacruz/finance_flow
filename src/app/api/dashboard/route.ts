import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  byCategory,
  computeDisposableIncome,
  filterByRange,
  monthBuckets,
  sumExpenses,
  sumIncome,
} from "@/lib/analytics";
import { endOfMonth, startOfMonth, subMonths, isWithinInterval } from "date-fns";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const months = Math.min(12, Math.max(1, Number(searchParams.get("months") ?? "3")));
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const txs = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  });

  const mapped = txs.map((t) => ({
    date: t.date,
    amount: t.amount,
    category: t.category,
    type: t.type,
  }));

  const custom = from && to ? { from: new Date(from), to: new Date(to) } : undefined;
  const filtered = custom ? filterByRange(mapped, months, custom) : filterByRange(mapped, months);

  const income = sumIncome(filtered);
  const expenses = sumExpenses(filtered);

  const end = endOfMonth(new Date());
  const lastStart = startOfMonth(subMonths(end, 1));
  const lastEnd = endOfMonth(subMonths(end, 1));
  const prevStart = startOfMonth(subMonths(end, 2));
  const prevEnd = endOfMonth(subMonths(end, 2));

  const lastMonthExp = sumExpenses(
    mapped.filter((t) => t.type === "expense" && isWithinInterval(t.date, { start: lastStart, end: lastEnd }))
  );
  const prevMonthExp = sumExpenses(
    mapped.filter((t) => t.type === "expense" && isWithinInterval(t.date, { start: prevStart, end: prevEnd }))
  );
  const momExpensePct = prevMonthExp > 0 ? (lastMonthExp - prevMonthExp) / prevMonthExp : 0;

  const debts = await prisma.debt.findMany({
    where: { userId: session.user.id, rejected: false },
  });
  const minSum = debts.reduce((s, d) => s + d.minimumPayment, 0);

  const disposable = computeDisposableIncome(mapped, months, minSum);

  return NextResponse.json({
    range: { months, custom: custom ?? null },
    totals: {
      income,
      expenses,
      net: income - expenses,
      disposableIncome: disposable,
    },
    mom: { expenseChangePct: Math.round(momExpensePct * 1000) / 1000 },
    categories: byCategory(filtered),
    buckets: monthBuckets(mapped, Math.min(months, 6)),
    transactions: filtered.slice(-200),
  });
}
