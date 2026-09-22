import { Router } from "express";

import { dashboardOverview } from "../controllers/dashboard.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { asyncHandler } from "../utils/async-handler.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(authenticateUser),
  authorizeRoles("super-admin", "admin", "hr"),
  asyncHandler(dashboardOverview),
);
