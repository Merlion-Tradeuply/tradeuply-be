import { z } from "zod";

import { otpPurposes } from "../models/otp-verification.model.js";
import { normalizeEmail } from "../utils/normalizers.js";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254)
  .transform(normalizeEmail);

export const verifyOtpSchema = z
  .object({
    email: emailSchema,
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit verification code."),
    purpose: z.enum(otpPurposes).default("email_verification"),
  })
  .strict();

export const resendOtpSchema = z
  .object({
    email: emailSchema,
    purpose: z.enum(otpPurposes).default("email_verification"),
  })
  .strict();
