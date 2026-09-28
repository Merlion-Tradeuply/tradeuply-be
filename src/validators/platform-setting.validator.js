import { z } from "zod";

export const updatePlatformSettingsSchema = z
  .object({
    signupBonusAmountUsd: z.number().finite().min(0).max(1_000_000),
    signupBonusAsset: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,20}$/).nullable(),
    signupBonusEnabled: z.boolean(),
  })
  .strict()
  .superRefine((settings, context) => {
    if (!settings.signupBonusEnabled) return;
    if (settings.signupBonusAmountUsd < 0.01) {
      context.addIssue({ code: "custom", message: "Enter a signup bonus of at least $0.01.", path: ["signupBonusAmountUsd"] });
    }
    if (!settings.signupBonusAsset) {
      context.addIssue({ code: "custom", message: "Select the cryptocurrency wallet for signup bonuses.", path: ["signupBonusAsset"] });
    }
  });
