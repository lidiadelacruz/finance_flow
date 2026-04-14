import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const uploads = await prisma.statementUpload.findMany({
    where: { userId: session.user.id, status: "complete" },
    take: 1,
  });
  if (uploads.length === 0) redirect("/onboarding");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      skippedDebtOnboarding: true,
      debtPromptDismissedAt: true,
      debts: { where: { rejected: false }, select: { id: true } },
    },
  });

  return (
    <DashboardClient
      showDebtBanner={(user?.debts.length ?? 0) === 0}
      debtPromptDismissed={!!user?.debtPromptDismissedAt}
    />
  );
}
