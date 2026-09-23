import { z } from "zod";

const transactionTypes = [
  "deposit",
  "withdrawal",
  "adjustment",
  "investment",
  "capital_return",
  "profit_withdrawal",
];
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const clientTransactionQuerySchema = z
  .object({
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .max(20)
      .regex(/^[A-Z0-9-]+$/)
      .optional(),
    direction: z.enum(["credit", "debit"]).optional(),
    from: dateField.optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    page: z.coerce.number().int().min(1).default(1),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(["newest", "oldest"]).default("newest"),
    to: dateField.optional(),
    type: z.enum(transactionTypes).optional(),
  })
  .strict()
  .refine(
    ({ from, to }) => !from || !to || new Date(from) <= new Date(to),
    { message: "The start date must be before the end date.", path: ["from"] },
  );
