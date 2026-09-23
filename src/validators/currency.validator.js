import { z } from "zod";

const currencyCode = z.string().trim().toUpperCase().min(2).max(20).regex(/^[A-Z0-9-]+$/);

export const currencyConversionQuerySchema = z
  .object({
    amount: z.coerce.number().finite().positive().max(100000000),
    from: currencyCode,
    to: currencyCode,
  })
  .strict();
