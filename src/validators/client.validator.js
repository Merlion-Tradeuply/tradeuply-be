import { z } from "zod";

import { normalizeEmail, normalizeInternationalPhone } from "../utils/normalizers.js";

const investmentRanges = ["$50–$249", "$250–$449", "$500–$999", "$1000+"];
const investmentExperiences = ["New investor", "Some experience", "Experienced"];
const investmentObjectives = [
  "Short-term opportunity",
  "Portfolio diversification",
  "Income generation",
  "Capital growth",
];
const clientEmailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254)
  .transform(normalizeEmail);
const clientPasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/\d/, "Password must contain a number.");

export const clientLoginSchema = z
  .object({
    email: clientEmailSchema,
    password: z.string().min(1, "Enter your password.").max(128),
  })
  .strict();

export const clientRefreshTokenSchema = z
  .object({
    refreshToken: z.string().trim().min(1, "A refresh token is required."),
  })
  .strict();

export const clientRegistrationSchema = z
  .object({
    ageConfirmed: z.literal(true, { error: "You must confirm that you are at least 18." }),
    confirmPassword: z.string(),
    email: clientEmailSchema,
    experience: z.enum(investmentExperiences),
    firstName: z.string().trim().min(2).max(60),
    investmentRange: z.enum(investmentRanges),
    lastName: z.string().trim().min(2).max(60),
    objective: z.enum(investmentObjectives),
    password: clientPasswordSchema,
    phone: z
      .string()
      .transform(normalizeInternationalPhone)
      .refine((phone) => /^\+[1-9]\d{7,14}$/.test(phone), "Enter a valid international phone number."),
    riskAccepted: z.literal(true, { error: "You must acknowledge the investment-risk statement." }),
    termsAccepted: z.literal(true, { error: "You must accept the terms and privacy policy." }),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, context) => {
    if (confirmPassword !== password) {
      context.addIssue({
        code: "custom",
        message: "The passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

export const requestClientPasswordResetSchema = z
  .object({ email: clientEmailSchema })
  .strict();

export const verifyClientPasswordResetOtpSchema = z
  .object({
    email: clientEmailSchema,
    otp: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit verification code."),
  })
  .strict();

export const resetClientPasswordSchema = z
  .object({
    confirmPassword: z.string(),
    email: clientEmailSchema,
    password: clientPasswordSchema,
    resetToken: z.string().trim().min(32).max(200),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, context) => {
    if (confirmPassword !== password) {
      context.addIssue({
        code: "custom",
        message: "The passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });
