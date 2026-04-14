import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const onboardingComplete = Boolean(body.onboardingComplete);
  const skippedDebtOnboarding = Boolean(body.skippedDebtOnboarding);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      onboardingComplete,
      skippedDebtOnboarding,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "onboarding",
      meta: JSON.stringify({ onboardingComplete, skippedDebtOnboarding }),
    },
  });

  return NextResponse.json({ ok: true });
}
