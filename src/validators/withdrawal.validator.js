import { z } from "zod";

export const createWithdrawalSchema = z.object({
  amount: z.number().finite().positive().max(100000000),
  paymentMethodId: z.string().trim().regex(/^[a-f\d]{24}$/i, "Invalid payment method."),
  requestId: z.string().trim().uuid(),
});

export const adminWithdrawalQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  page: z.coerce.number().int().min(1).default(1),
  q: z.string().trim().max(100).default(""),
  status: z.enum(["all", "pending", "approved", "rejected"]).default("all"),
}).strict();

export const reviewWithdrawalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(1000).optional().default(""),
}).superRefine((payload, context) => {
  if (payload.action === "reject" && !payload.notes) {
    context.addIssue({ code: "custom", message: "A rejection reason is required.", path: ["notes"] });
  }
});
