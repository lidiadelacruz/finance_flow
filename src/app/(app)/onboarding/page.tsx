import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const uploads = await prisma.statementUpload.findMany({
    where: { userId: session.user.id, status: "complete" },
    take: 1,
  });
  if (uploads.length > 0) redirect("/dashboard");

  return <OnboardingClient />;
}
