import pdfParse from "pdf-parse";
import { categorizeTransaction } from "./categorize";
import { parseResultSchema, type ParsedTransaction } from "./schemas";

const DATE_RE = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;
const AMOUNT_RE = /-?\$?\s*([\d,]+\.\d{2})\b|\b(-?[\d,]+\.\d{2})\s*(?:CR|DR)?\b/i;

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(s: string): Date | null {
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const d = new Date(y, Number(m[1]) - 1, Number(m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Heuristic row parser from PDF text; structured for future LLM swap-in. */
export async function parseBankStatementPdf(buffer: Buffer): Promise<{
  result: ReturnType<typeof parseResultSchema.parse>;
  rawTextLength: number;
}> {
  const data = await pdfParse(buffer);
  const text = data.text ?? "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const transactions: ParsedTransaction[] = [];
  let usedOcrFallback = false;

  for (const line of lines) {
    const dateMatch = line.match(DATE_RE);
    if (!dateMatch) continue;
    const date = parseDate(dateMatch[1]);
    if (!date) continue;

    const amounts = [...line.matchAll(/\$?\s*-?[\d,]+\.\d{2}/g)];
    if (amounts.length === 0) continue;

    const lastAmtStr = amounts[amounts.length - 1][0];
    const amount = parseAmount(lastAmtStr.replace("$", ""));
    if (amount === null || amount === 0) continue;

    const descEnd = line.indexOf(dateMatch[0]);
    const afterDate = line.slice(descEnd + dateMatch[0].length);
    const descPart = afterDate.replace(/\$?\s*-?[\d,]+\.\d{2}/g, " ").replace(/\s+/g, " ").trim();
    const description = (descPart || line.replace(DATE_RE, "").replace(AMOUNT_RE, "").trim()).slice(0, 500) || "Transaction";

    const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
    const normalizedAmount = Math.abs(amount);

    transactions.push({
      date,
      description: description || "Transaction",
      amount: normalizedAmount,
      type,
    });
  }

  let confidence = transactions.length > 0 ? 0.85 : 0;
  if (transactions.length === 0 && text.length > 80) {
    usedOcrFallback = true;
    confidence = 0.4;
    for (const line of lines) {
      const nums = line.match(/-?\$?\s*[\d,]+\.\d{2}/g);
      if (!nums?.length) continue;
      const amt = parseAmount(nums[nums.length - 1]);
      if (amt === null || amt === 0) continue;
      const type: "income" | "expense" = amt >= 0 ? "income" : "expense";
      transactions.push({
        date: new Date(),
        description: line.slice(0, 120),
        amount: Math.abs(amt),
        type,
      });
      if (transactions.length >= 40) break;
    }
    if (transactions.length > 0) confidence = 0.55;
  }

  const validated = parseResultSchema.parse({
    transactions,
    confidence,
    usedOcrFallback,
  });

  return { result: validated, rawTextLength: text.length };
}

export function applyCategories(rows: ParsedTransaction[]) {
  return rows.map((t) => ({
    ...t,
    category: categorizeTransaction(t.description, t.type),
  }));
}
