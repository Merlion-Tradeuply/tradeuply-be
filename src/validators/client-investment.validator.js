import { z } from "zod";

export const createClientInvestmentSchema = z
  .object({
    amountUsd: z.number().finite().positive().max(100000000),
    planId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid investment plan."),
    requestId: z.string().uuid("Invalid investment request ID."),
    walletCurrency: z
      .string()
      .trim()
      .toUpperCase()
      .min(2)
      .max(20)
      .regex(/^[A-Z0-9-]+$/),
  })
  .strict();
