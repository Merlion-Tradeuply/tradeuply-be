import { Router } from "express";

import {
  addPaymentMethod,
  completePaymentMethodQr,
  editPaymentMethod,
  getPaymentMethodQrUploadSignature,
  getPaymentMethods,
  removePaymentMethods,
  uploadPaymentMethodQr,
} from "../controllers/payment-method.controller.js";
import { authorizeRoles } from "../middleware/authorize-roles.js";
import { authenticateUser } from "../middleware/user-authentication.js";
import { uploadSingleFile } from "../middleware/upload.js";
import { validateRequest } from "../middleware/validate-request.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  completePaymentMethodQrUploadSchema,
  createPaymentMethodSchema,
  deletePaymentMethodsSchema,
  updatePaymentMethodSchema,
} from "../validators/payment-method.validator.js";

export const paymentMethodRouter = Router();

paymentMethodRouter.use(asyncHandler(authenticateUser));
paymentMethodRouter.get(
  "/",
  authorizeRoles("super-admin", "admin"),
  asyncHandler(getPaymentMethods),
);
paymentMethodRouter.post(
  "/",
  authorizeRoles("super-admin"),
  validateRequest(createPaymentMethodSchema),
  asyncHandler(addPaymentMethod),
);
paymentMethodRouter.delete(
  "/",
  authorizeRoles("super-admin"),
  validateRequest(deletePaymentMethodsSchema),
  asyncHandler(removePaymentMethods),
);
paymentMethodRouter.patch(
  "/:methodId",
  authorizeRoles("super-admin"),
  validateRequest(updatePaymentMethodSchema),
  asyncHandler(editPaymentMethod),
);
paymentMethodRouter.post(
  "/:methodId/qr-code",
  authorizeRoles("super-admin"),
  uploadSingleFile("file"),
  asyncHandler(uploadPaymentMethodQr),
);
paymentMethodRouter.post(
  "/:methodId/qr-code/signature",
  authorizeRoles("super-admin"),
  asyncHandler(getPaymentMethodQrUploadSignature),
);
paymentMethodRouter.post(
  "/:methodId/qr-code/complete",
  authorizeRoles("super-admin"),
  validateRequest(completePaymentMethodQrUploadSchema),
  asyncHandler(completePaymentMethodQr),
);
