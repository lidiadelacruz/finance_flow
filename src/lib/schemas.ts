import { z } from "zod";

export const parsedTransactionSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1).max(500),
  amount: z.number(),
  balance: z.number().optional(),
  type: z.enum(["income", "expense"]),
});

export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;

export const parseResultSchema = z.object({
  transactions: z.array(parsedTransactionSchema),
  confidence: z.number().min(0).max(1),
  usedOcrFallback: z.boolean(),
});

export type ParseResult = z.infer<typeof parseResultSchema>;
