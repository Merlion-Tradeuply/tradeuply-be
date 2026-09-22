import { Router } from "express";

import {
  addInvestmentPlan,
  editInvestmentPlan,
  getInvestmentPlans,
  publicInvestmentPlans,
  removeInvestmentPlans,
} from "../controllers/investment-plan.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { validateQuery, validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  createInvestmentPlanSchema,
  deleteInvestmentPlansSchema,
  investmentPlanQuerySchema,
  updateInvestmentPlanSchema,
} from "../validators/investment-plan.validator.js";

export const investmentPlanRouter = Router();

investmentPlanRouter.get("/public", asyncHandler(publicInvestmentPlans));
investmentPlanRouter.use(asyncHandler(authenticateUser));
investmentPlanRouter.use(authorizeRoles("super-admin", "admin"));
investmentPlanRouter.get(
  "/",
  validateQuery(investmentPlanQuerySchema),
  asyncHandler(getInvestmentPlans),
);
investmentPlanRouter.post(
  "/",
  validateRequest(createInvestmentPlanSchema),
  asyncHandler(addInvestmentPlan),
);
investmentPlanRouter.delete(
  "/",
  validateRequest(deleteInvestmentPlansSchema),
  asyncHandler(removeInvestmentPlans),
);
investmentPlanRouter.patch(
  "/:planId",
  validateRequest(updateInvestmentPlanSchema),
  asyncHandler(editInvestmentPlan),
);
