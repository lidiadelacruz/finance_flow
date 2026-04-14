import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseBankStatementPdf, applyCategories } from "@/lib/parse-statement";
import { suggestDebtsFromTransactions } from "@/lib/auto-debt";
import { computeDisposableIncome, detectSpendingSpikes } from "@/lib/analytics";
import { materialExtraChange } from "@/lib/debt-strategy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Please upload a PDF bank statement." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await prisma.statementUpload.create({
    data: {
      userId,
      fileName: file.name,
      status: "parsing",
      parsePct: 10,
    },
  });

  try {
    const { result, rawTextLength } = await parseBankStatementPdf(buffer);
    await prisma.statementUpload.update({
      where: { id: upload.id },
      data: { parsePct: 70 },
    });

    if (result.transactions.length === 0 || rawTextLength < 20) {
      await prisma.statementUpload.update({
        where: { id: upload.id },
        data: {
          status: "failed",
          parsePct: 100,
          errorMessage:
            "Could not read transactions from this PDF. Try exporting from your bank as a digital PDF or rescanning a clearer copy.",
        },
      });
      return NextResponse.json({
        ok: false,
        uploadId: upload.id,
        error:
          "Parsing found no transactions. If this is a scanned statement, ensure the scan is sharp and well-lit.",
      });
    }

    const withCats = applyCategories(result.transactions);
    for (const t of withCats) {
      await prisma.transaction.create({
        data: {
          userId,
          uploadId: upload.id,
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.type,
          needsReview: result.usedOcrFallback || result.confidence < 0.7,
        },
      });
    }

    await prisma.statementUpload.update({
      where: { id: upload.id },
      data: { status: "complete", parsePct: 100 },
    });

    const suggested = suggestDebtsFromTransactions(withCats);

    const allTx = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    });

    const spikes = detectSpendingSpikes(
      allTx.map((x) => ({
        date: x.date,
        amount: x.amount,
        category: x.category,
        type: x.type,
      }))
    );
    for (const s of spikes) {
      await prisma.alert.create({
        data: {
          userId,
          type: "spending_spike",
          title: `Spending spike: ${s.category}`,
          body: s.message,
        },
      });
    }

    const debts = await prisma.debt.findMany({
      where: { userId, rejected: false },
    });
    const minSum = debts.filter((d) => !d.rejected).reduce((s, d) => s + d.minimumPayment, 0);

    const disposable = computeDisposableIncome(
      allTx.map((x) => ({
        date: x.date,
        amount: x.amount,
        category: x.category,
        type: x.type,
      })),
      3,
      minSum
    );

    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (settings) {
      const suggestedExtra = Math.max(0, disposable);
      const prev = settings.previousExtraPayment ?? settings.extraPaymentMonthly;
      if (debts.length > 0 && materialExtraChange(prev, suggestedExtra)) {
        await prisma.alert.create({
          data: {
            userId,
            type: disposable < 0 ? "negative_income" : "info",
            title: disposable < 0 ? "Negative disposable income" : "Extra payment changed",
            body:
              disposable < 0
                ? `Disposable income is negative (${disposable.toFixed(0)}). Your payoff timeline will stretch; review expenses or minimums.`
                : `Suggested extra payment is about $${suggestedExtra.toFixed(0)}/mo (previously ~$${prev.toFixed(0)}). Open Plan to confirm or adjust, and choose stretch vs. re-optimize if needed.`,
          },
        });
      }
      await prisma.userSettings.update({
        where: { userId },
        data: {
          lastDisposableIncome: disposable,
          previousExtraPayment: settings.extraPaymentMonthly,
          extraPaymentMonthly: suggestedExtra,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: "statement_upload",
        meta: JSON.stringify({ uploadId: upload.id, count: withCats.length }),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingComplete: true },
    });

    return NextResponse.json({
      ok: true,
      uploadId: upload.id,
      count: withCats.length,
      confidence: result.confidence,
      usedOcrFallback: result.usedOcrFallback,
      suggestedDebts: suggested,
    });
  } catch (e) {
    await prisma.statementUpload.update({
      where: { id: upload.id },
      data: {
        status: "failed",
        parsePct: 100,
        errorMessage: e instanceof Error ? e.message : "Parse error",
      },
    });
    return NextResponse.json({ ok: false, error: "Failed to parse PDF." }, { status: 500 });
  }
}
