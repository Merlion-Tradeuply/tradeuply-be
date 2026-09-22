import { Router } from "express";

import { resendEmailOtp, verifyEmailOtp } from "../controllers/otp.controller.js";
import {
  otpResendRateLimiter,
  otpVerificationRateLimiter,
} from "../middleware/rate-limiters.js";
import { validateRequest } from "../middleware/validate-request.js";
import { resendOtpSchema, verifyOtpSchema } from "../validators/otp.validator.js";
import { asyncHandler } from "../utils/async-handler.js";

export const otpRouter = Router();

otpRouter.post(
  "/verify",
  otpVerificationRateLimiter,
  validateRequest(verifyOtpSchema),
  asyncHandler(verifyEmailOtp),
);
otpRouter.post(
  "/resend",
  otpResendRateLimiter,
  validateRequest(resendOtpSchema),
  asyncHandler(resendEmailOtp),
);
