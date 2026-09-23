import { z } from "zod";

import { normalizeEmail } from "../utils/normalizers.js";

const contactSubjects = [
  "Account Access",
  "Investment Plans",
  "Deposits and Withdrawals",
  "General Support",
];

export const contactEnquirySchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(254)
      .transform(normalizeEmail),
    fullName: z.string().trim().min(2, "Enter your full name.").max(100),
    message: z
      .string()
      .trim()
      .min(20, "Enter at least 20 characters.")
      .max(1200),
    subject: z.enum(contactSubjects),
  })
  .strict();
