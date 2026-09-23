import { z } from "zod";

export const adminDepositQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    page: z.coerce.number().int().min(1).default(1),
    q: z.string().trim().max(100).default(""),
    status: z
      .enum(["all", "pending", "approved", "rejected"])
      .default("all"),
  })
  .strict();

export const createDepositSchema = z.object({
  amount: z.number().finite().positive().max(100000000),
  notes: z.string().trim().max(1000).optional().default(""),
  paymentMethodId: z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid payment method."),
  senderWalletAddress: z.string().trim().min(8).max(200),
  transactionHash: z.string().trim().min(8).max(200),
});

export const reviewDepositSchema = z
  .object({
    action: z.enum(["approve", "reject"]),
    notes: z.string().trim().max(1000).optional().default(""),
  })
  .superRefine((payload, context) => {
    if (payload.action === "reject" && !payload.notes) {
      context.addIssue({
        code: "custom",
        message: "A rejection reason is required.",
        path: ["notes"],
      });
    }
  });
