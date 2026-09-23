import { Router } from "express";

import { getCurrencyConversion } from "../controllers/currency.controller.js";
import { authenticateClient } from "../middleware/client-authentication.js";
import { validateQuery } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import { currencyConversionQuerySchema } from "../validators/currency.validator.js";

export const currencyRouter = Router();

currencyRouter.get(
  "/convert",
  asyncHandler(authenticateClient),
  validateQuery(currencyConversionQuerySchema),
  asyncHandler(getCurrencyConversion),
);
