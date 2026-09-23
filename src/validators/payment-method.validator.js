import { z } from "zod";

const nullableAmount = z.number().finite().positive().nullable().optional();
const nullableText = (maximum) => z.string().trim().max(maximum).nullable().optional();

export const paymentMethodQuerySchema = z
  .object({
    category: z.enum(["bank", "card", "crypto", "wallet"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    page: z.coerce.number().int().min(1).default(1),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(["display-order", "name-asc", "name-desc"]).default("display-order"),
    status: z.enum(["active", "coming_soon", "disabled"]).optional(),
  })
  .strict();

export const createPaymentMethodSchema = z.object({
  asset: nullableText(20),
  category: z.enum(["card", "wallet", "bank", "crypto"]),
  code: z.string().trim().toLowerCase().min(2).max(40).regex(/^[a-z0-9-]+$/),
  displayOrder: z.number().int().min(0).optional(),
  instructions: z.string().trim().max(1000).optional(),
  maximumAmount: nullableAmount,
  minimumAmount: nullableAmount,
  name: z.string().trim().min(2).max(80),
  network: nullableText(40),
  status: z.enum(["active", "coming_soon", "disabled"]).optional(),
  walletAddress: nullableText(200),
});

export const updatePaymentMethodSchema = createPaymentMethodSchema
  .omit({ code: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Submit at least one field to update.",
  });

export const deletePaymentMethodsSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Each payment method ID must be valid."))
    .min(1, "Select at least one payment method.")
    .max(100, "A maximum of 100 payment methods can be deleted at once."),
});

export const completePaymentMethodQrUploadSchema = z
  .object({
    bytes: z.number().int().positive().max(4 * 1024 * 1024),
    format: z.enum(["jpg", "jpeg", "png", "webp"]),
    height: z.number().int().positive(),
    publicId: z.string().trim().min(1).max(300),
    signature: z.string().trim().min(1).max(200),
    version: z.number().int().positive(),
    width: z.number().int().positive(),
  })
  .strict();
