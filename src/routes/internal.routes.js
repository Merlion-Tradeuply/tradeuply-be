import { Router } from "express";

import {
  currentUser,
  userLogin,
  userLogout,
  userTokenRefresh,
} from "../controllers/user.controller.js";
import { clientLoginRateLimiter, clientRefreshRateLimiter } from "../middleware/rate-limiters.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import { userLoginSchema, userRefreshTokenSchema } from "../validators/user.validator.js";

export const internalRouter = Router();

internalRouter.post(
  "/login",
  clientLoginRateLimiter,
  validateRequest(userLoginSchema),
  asyncHandler(userLogin),
);
internalRouter.post(
  "/token/refresh",
  clientRefreshRateLimiter,
  validateRequest(userRefreshTokenSchema),
  asyncHandler(userTokenRefresh),
);
internalRouter.post(
  "/logout",
  validateRequest(userRefreshTokenSchema),
  asyncHandler(userLogout),
);
internalRouter.get("/me", asyncHandler(authenticateUser), currentUser);
