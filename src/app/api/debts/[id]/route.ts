import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();

  const existing = await prisma.debt.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const debt = await prisma.debt.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: String(body.name) } : {}),
      ...(body.balance != null ? { balance: Number(body.balance) } : {}),
      ...(body.interestRateApr != null ? { interestRateApr: Number(body.interestRateApr) } : {}),
      ...(body.minimumPayment != null ? { minimumPayment: Number(body.minimumPayment) } : {}),
      ...(body.verified !== undefined ? { verified: Boolean(body.verified) } : {}),
      ...(body.rejected !== undefined ? { rejected: Boolean(body.rejected) } : {}),
      ...(body.rejectionReason != null ? { rejectionReason: String(body.rejectionReason) } : {}),
    },
  });

  return NextResponse.json({ debt });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await prisma.debt.findFirst({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.debt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
