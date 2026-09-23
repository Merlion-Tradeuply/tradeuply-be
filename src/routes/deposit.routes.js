import { Router } from "express";

import {
  getDepositDetails,
  getDepositConversionQuote,
  getDeposits,
  updateDepositReview,
} from "../controllers/deposit.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import {
  validateQuery,
  validateRequest,
} from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  adminDepositQuerySchema,
  depositConversionQuoteQuerySchema,
  reviewDepositSchema,
} from "../validators/deposit.validator.js";

export const depositRouter = Router();

depositRouter.use(asyncHandler(authenticateUser));
depositRouter.use(authorizeRoles("super-admin", "admin"));
depositRouter.get(
  "/",
  validateQuery(adminDepositQuerySchema),
  asyncHandler(getDeposits),
);
depositRouter.get("/:depositId", asyncHandler(getDepositDetails));
depositRouter.get(
  "/:depositId/conversion-quote",
  validateQuery(depositConversionQuoteQuerySchema),
  asyncHandler(getDepositConversionQuote),
);
depositRouter.patch(
  "/:depositId/review",
  validateRequest(reviewDepositSchema),
  asyncHandler(updateDepositReview),
);
