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
