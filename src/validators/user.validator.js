import { z } from "zod";

import { normalizeEmail } from "../utils/normalizers.js";

export const userLoginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(254)
      .transform(normalizeEmail),
    password: z.string().min(1, "Enter your password.").max(128),
  })
  .strict();

export const userRefreshTokenSchema = z
  .object({
    refreshToken: z.string().trim().min(1, "A refresh token is required."),
  })
  .strict();
