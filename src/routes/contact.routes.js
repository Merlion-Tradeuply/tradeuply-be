import { Router } from "express";

import { createContactEnquiry } from "../controllers/contact.controller.js";
import { contactSubmissionRateLimiter } from "../middleware/rate-limiters.js";
import { validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import { contactEnquirySchema } from "../validators/contact.validator.js";

export const contactRouter = Router();

contactRouter.post(
  "/",
  contactSubmissionRateLimiter,
  validateRequest(contactEnquirySchema),
  asyncHandler(createContactEnquiry),
);
