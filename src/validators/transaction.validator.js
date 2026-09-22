import { z } from "zod";

export const transactionQuerySchema = z
  .object({
    direction: z.enum(["credit", "debit"]).optional(),
    q: z.string().trim().max(100).optional(),
    type: z.enum(["deposit", "withdrawal", "adjustment"]).optional(),
  })
  .strict();

export const deleteTransactionsSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Each transaction ID must be valid."))
    .min(1, "Select at least one transaction.")
    .max(100, "A maximum of 100 transactions can be deleted at once."),
});
