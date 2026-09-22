import { Router } from "express";

import {
  getTransactions,
  removeTransactions,
} from "../controllers/transaction.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { validateQuery, validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deleteTransactionsSchema,
  transactionQuerySchema,
} from "../validators/transaction.validator.js";

export const transactionRouter = Router();

transactionRouter.use(asyncHandler(authenticateUser));
transactionRouter.use(authorizeRoles("super-admin", "admin"));
transactionRouter.get(
  "/",
  validateQuery(transactionQuerySchema),
  asyncHandler(getTransactions),
);
transactionRouter.delete(
  "/",
  validateRequest(deleteTransactionsSchema),
  asyncHandler(removeTransactions),
);
