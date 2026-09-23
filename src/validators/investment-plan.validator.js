import { z } from "zod";

const planFields = {
  allocation: z.string().trim().min(2).max(250),
  badge: z.string().trim().max(40).nullable().optional(),
  dailyObjective: z.number().positive().max(100),
  description: z.string().trim().min(10).max(500),
  displayOrder: z.number().int().min(0).optional(),
  features: z.array(z.string().trim().min(2).max(120)).min(1).max(6),
  horizonDays: z.number().int().min(1).max(3650),
  icon: z.enum(["chart", "coins", "globe", "leaf", "shield", "sparkle"]),
  isFeatured: z.boolean().optional(),
  minimumInvestment: z.number().positive(),
  name: z.string().trim().min(2).max(80),
  risk: z.string().trim().min(2).max(40),
  status: z.enum(["active", "coming_soon", "disabled"]).optional(),
};

export const createInvestmentPlanSchema = z.object({
  ...planFields,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/),
});

export const updateInvestmentPlanSchema = createInvestmentPlanSchema
  .omit({ slug: true })
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Submit at least one field to update.",
  });

export const investmentPlanQuerySchema = z
  .object({
    featured: z.enum(["true", "false"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    page: z.coerce.number().int().min(1).default(1),
    q: z.string().trim().max(100).optional(),
    risk: z.string().trim().max(40).optional(),
    sort: z
      .enum(["display-order", "minimum-asc", "minimum-desc", "name-asc", "name-desc"])
      .default("display-order"),
    status: z.enum(["active", "coming_soon", "disabled"]).optional(),
  })
  .strict();

export const deleteInvestmentPlansSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Each investment plan ID must be valid."))
    .min(1, "Select at least one investment plan.")
    .max(100, "A maximum of 100 investment plans can be deleted at once."),
});
