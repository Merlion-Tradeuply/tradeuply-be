import { Router } from "express";

import { getTransactions } from "../controllers/transaction.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { asyncHandler } from "../utils/async-handler.js";

export const transactionRouter = Router();

transactionRouter.use(asyncHandler(authenticateUser));
transactionRouter.use(authorizeRoles("super-admin", "admin"));
transactionRouter.get("/", asyncHandler(getTransactions));
