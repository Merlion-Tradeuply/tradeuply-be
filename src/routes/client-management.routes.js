import { Router } from "express";

import {
  editClient,
  getClientDetails,
  getClients,
  removeClients,
} from "../controllers/client-management.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import {
  validateQuery,
  validateRequest,
} from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  deleteManagedClientsSchema,
  managedClientQuerySchema,
  updateManagedClientSchema,
} from "../validators/client-management.validator.js";

export const clientManagementRouter = Router();

clientManagementRouter.use(asyncHandler(authenticateUser));
clientManagementRouter.use(authorizeRoles("super-admin", "admin"));
clientManagementRouter.get(
  "/",
  validateQuery(managedClientQuerySchema),
  asyncHandler(getClients),
);
clientManagementRouter.delete(
  "/",
  validateRequest(deleteManagedClientsSchema),
  asyncHandler(removeClients),
);
clientManagementRouter.get("/:clientId", asyncHandler(getClientDetails));
clientManagementRouter.patch(
  "/:clientId",
  validateRequest(updateManagedClientSchema),
  asyncHandler(editClient),
);
