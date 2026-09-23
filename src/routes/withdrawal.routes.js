import { Router } from "express";
import { getWithdrawalDetails, getWithdrawals, updateWithdrawalReview } from "../controllers/withdrawal.controller.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { validateQuery, validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import { adminWithdrawalQuerySchema, reviewWithdrawalSchema } from "../validators/withdrawal.validator.js";

export const withdrawalRouter = Router();
withdrawalRouter.use(asyncHandler(authenticateUser));
withdrawalRouter.use(authorizeRoles("super-admin", "admin"));
withdrawalRouter.get("/", validateQuery(adminWithdrawalQuerySchema), asyncHandler(getWithdrawals));
withdrawalRouter.get("/:withdrawalId", asyncHandler(getWithdrawalDetails));
withdrawalRouter.patch("/:withdrawalId/review", validateRequest(reviewWithdrawalSchema), asyncHandler(updateWithdrawalReview));
