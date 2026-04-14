import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const debts = await prisma.debt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ debts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const balance = Number(body.balance);
  const interestRateApr = Number(body.interestRateApr);
  const minimumPayment = Number(body.minimumPayment);
  const dueDayOfMonth = body.dueDayOfMonth != null ? Number(body.dueDayOfMonth) : null;
  const autoExtracted = Boolean(body.autoExtracted);

  if (!name || !Number.isFinite(balance) || !Number.isFinite(interestRateApr) || !Number.isFinite(minimumPayment)) {
    return NextResponse.json({ error: "Invalid debt payload" }, { status: 400 });
  }

  const debt = await prisma.debt.create({
    data: {
      userId: session.user.id,
      name,
      balance,
      interestRateApr,
      minimumPayment,
      dueDayOfMonth: dueDayOfMonth && dueDayOfMonth >= 1 && dueDayOfMonth <= 28 ? dueDayOfMonth : null,
      autoExtracted,
      verified: !autoExtracted,
    },
  });

  await prisma.auditLog.create({
    data: { userId: session.user.id, action: "debt_create", meta: JSON.stringify({ id: debt.id }) },
  });

  return NextResponse.json({ debt });
}
