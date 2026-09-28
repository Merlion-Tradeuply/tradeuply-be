import { Router } from "express";

import {
  editPlatformSettings,
  readPlatformSettings,
} from "../controllers/platform-setting.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import { updatePlatformSettingsSchema } from "../validators/platform-setting.validator.js";

export const platformSettingRouter = Router();

platformSettingRouter.use(asyncHandler(authenticateUser));
platformSettingRouter.get(
  "/",
  authorizeRoles("super-admin", "admin"),
  asyncHandler(readPlatformSettings),
);
platformSettingRouter.patch(
  "/",
  authorizeRoles("super-admin"),
  validateRequest(updatePlatformSettingsSchema),
  asyncHandler(editPlatformSettings),
);
