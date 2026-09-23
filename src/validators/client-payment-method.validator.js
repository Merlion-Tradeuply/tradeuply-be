import { z } from "zod";

const paymentMethodFields = {
  asset: z
    .string()
    .trim()
    .toUpperCase()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Enter a valid cryptocurrency symbol."),
  isDefault: z.boolean().optional(),
  label: z.string().trim().min(2).max(80),
  network: z.string().trim().min(2).max(40),
  walletAddress: z.string().trim().min(8).max(200),
};

export const createClientPaymentMethodSchema = z
  .object(paymentMethodFields)
  .strict();

export const updateClientPaymentMethodSchema = z
  .object(paymentMethodFields)
  .partial()
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Submit at least one field to update.",
  });

export const completeClientPaymentMethodQrUploadSchema = z
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
