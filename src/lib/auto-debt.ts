import type { ParsedTransaction } from "./schemas";

const DEBT_HINT = /(loan|mortgage|visa|mastercard|discover|amex|credit|student|auto loan|car payment|lender|bank of)/i;

export type SuggestedDebt = {
  name: string;
  typicalPayment: number;
  confidence: number;
};

/** Flag recurring outflows that look like debt servicing for user verification. */
export function suggestDebtsFromTransactions(
  rows: (ParsedTransaction & { category: string })[]
): SuggestedDebt[] {
  const expenses = rows.filter((r) => r.type === "expense");
  const byDesc = new Map<string, number[]>();
  for (const e of expenses) {
    if (!DEBT_HINT.test(e.description)) continue;
    const key = e.description.replace(/\d{2,}/g, "#").slice(0, 60).trim();
    if (!byDesc.has(key)) byDesc.set(key, []);
    byDesc.get(key)!.push(e.amount);
  }

  const out: SuggestedDebt[] = [];
  for (const [name, amounts] of byDesc) {
    if (amounts.length < 2) continue;
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance =
      amounts.reduce((s, x) => s + Math.abs(x - avg), 0) / amounts.length;
    if (variance / avg > 0.25) continue;
    out.push({
      name: name.slice(0, 80),
      typicalPayment: Math.round(avg * 100) / 100,
      confidence: Math.min(0.95, 0.5 + amounts.length * 0.1),
    });
  }
  return out.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}
