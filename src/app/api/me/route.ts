import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      settings: true,
      uploads: { take: 1, orderBy: { createdAt: "desc" } },
      debts: { where: { rejected: false } },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    email: user.email,
    name: user.name,
    onboardingComplete: user.onboardingComplete,
    skippedDebtOnboarding: user.skippedDebtOnboarding,
    debtPromptDismissedAt: user.debtPromptDismissedAt,
    hasDebt: user.debts.length > 0,
    hasUpload: user.uploads.some((u) => u.status === "complete"),
    theme: user.settings?.theme ?? "system",
    highContrast: user.settings?.highContrast ?? false,
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.debtPromptDismissed) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { debtPromptDismissedAt: new Date() },
    });
  }

  if (body.theme === "light" || body.theme === "dark" || body.theme === "system") {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, theme: body.theme },
      update: { theme: body.theme },
    });
  }

  if (typeof body.highContrast === "boolean") {
    await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, highContrast: body.highContrast },
      update: { highContrast: body.highContrast },
    });
  }

  return NextResponse.json({ ok: true });
}
