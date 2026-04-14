import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { projectPayoff, recommendStrategy, type StrategyKind } from "@/lib/debt-strategy";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [debts, settings] = await Promise.all([
    prisma.debt.findMany({ where: { userId, rejected: false } }),
    prisma.userSettings.findUnique({ where: { userId } }),
  ]);

  const inputs = debts
    .filter((d) => !d.rejected).map((d) => ({
    id: d.id,
    name: d.name,
    balance: d.balance,
    interestRateApr: d.interestRateApr,
    minimumPayment: d.minimumPayment,
  }));

  const extra = settings?.extraPaymentMonthly ?? 0;
  const rec = recommendStrategy(inputs);
  const snow = projectPayoff(inputs, "snowball", extra);
  const ava = projectPayoff(inputs, "avalanche", extra);
  const selected = (settings?.selectedStrategy as StrategyKind | null) ?? rec;
  const active = selected === "snowball" ? snow : ava;

  return NextResponse.json({
    recommended: rec,
    selectedStrategy: selected,
    extraPaymentMonthly: extra,
    lastDisposableIncome: settings?.lastDisposableIncome ?? null,
    rebalanceChoice: settings?.rebalanceChoice ?? null,
    comparison: {
      snowball: {
        months: snow.months,
        totalInterestPaid: snow.totalInterestPaid,
        firstPayoffDate: snow.firstPayoffDate,
      },
      avalanche: {
        months: ava.months,
        totalInterestPaid: ava.totalInterestPaid,
        firstPayoffDate: ava.firstPayoffDate,
      },
    },
    snapshots: active.balanceSnapshots,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const body = await req.json();

  const extra = Number(body.extraPaymentMonthly);
  const strategy = body.strategy as StrategyKind | undefined;
  const overrideReason = body.strategyOverrideReason != null ? String(body.strategyOverrideReason) : undefined;
  const rebalanceChoice = body.rebalanceChoice as "stretch" | "reoptimize" | undefined;

  if (!Number.isFinite(extra) || extra < 0) {
    return NextResponse.json({ error: "Invalid extra payment" }, { status: 400 });
  }

  const rec = recommendStrategy(
    (await prisma.debt.findMany({ where: { userId, rejected: false } })).map((d) => ({
      id: d.id,
      name: d.name,
      balance: d.balance,
      interestRateApr: d.interestRateApr,
      minimumPayment: d.minimumPayment,
    }))
  );

  const chosen = strategy === "snowball" || strategy === "avalanche" ? strategy : rec;

  await prisma.userSettings.update({
    where: { userId },
    data: {
      extraPaymentMonthly: extra,
      extraPaymentConfirmedAt: new Date(),
      selectedStrategy: chosen,
      strategyOverrideReason: chosen !== rec ? overrideReason ?? null : null,
      rebalanceChoice: rebalanceChoice ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "plan_confirm",
      meta: JSON.stringify({ extra, strategy: chosen, rebalanceChoice }),
    },
  });

  return NextResponse.json({ ok: true });
}
