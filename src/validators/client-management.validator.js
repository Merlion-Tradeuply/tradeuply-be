import { z } from "zod";

import { normalizeInternationalPhone } from "../utils/normalizers.js";

const investmentRanges = ["$100–$999", "$1,000–$4,999", "$5,000–$24,999", "$25,000+"];
const investmentExperiences = ["New investor", "Some experience", "Experienced"];
const investmentObjectives = [
  "Short-term opportunity",
  "Portfolio diversification",
  "Income generation",
  "Capital growth",
];

export const managedClientQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    page: z.coerce.number().int().min(1).default(1),
    query: z.string().trim().max(100).default(""),
    status: z
      .enum(["all", "pending_verification", "active", "suspended"])
      .default("all"),
  })
  .strict();

export const updateManagedClientSchema = z
  .object({
    experience: z.enum(investmentExperiences).optional(),
    firstName: z.string().trim().min(2).max(60).optional(),
    investmentRange: z.enum(investmentRanges).optional(),
    lastName: z.string().trim().min(2).max(60).optional(),
    objective: z.enum(investmentObjectives).optional(),
    phone: z
      .string()
      .transform(normalizeInternationalPhone)
      .refine(
        (phone) => /^\+[1-9]\d{7,14}$/.test(phone),
        "Enter a valid international phone number.",
      )
      .optional(),
    status: z.enum(["pending_verification", "active", "suspended"]).optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Submit at least one field to update.",
  });

export const deleteManagedClientsSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Each client ID must be valid."))
    .min(1, "Select at least one client.")
    .max(100, "A maximum of 100 clients can be deleted at once."),
});
