import { Router } from "express";

import {
  clientLogin,
  clientLogout,
  clientRegistration,
  clientTokenRefresh,
  currentClient,
} from "../controllers/client.controller.js";
import { authenticateClient } from "../middleware/client-authentication.js";
import { uploadSingleFile } from "../middleware/upload.js";
import {
  clientLoginRateLimiter,
  clientRefreshRateLimiter,
  clientRegistrationRateLimiter,
} from "../middleware/rate-limiters.js";
import { validateJsonField, validateRequest } from "../middleware/validate-request.js";
import {
  clientLoginSchema,
  clientRefreshTokenSchema,
  clientRegistrationSchema,
} from "../validators/client.validator.js";
import { asyncHandler } from "../utils/async-handler.js";
import { otpRouter } from "./otp.routes.js";
import {
  clientBalance,
  clientDepositDetails,
  clientDeposits,
  createClientDeposit,
} from "../controllers/deposit.controller.js";
import { clientPaymentMethods } from "../controllers/payment-method.controller.js";
import {
  addClientInvestment,
  getClientInvestmentDetails,
  getClientInvestments,
  returnClientInvestmentCapital,
} from "../controllers/client-investment.controller.js";
import { createDepositSchema } from "../validators/deposit.validator.js";
import { createClientInvestmentSchema } from "../validators/client-investment.validator.js";
import {
  completeClientPaymentMethodQrUploadSchema,
  createClientPaymentMethodSchema,
  updateClientPaymentMethodSchema,
} from "../validators/client-payment-method.validator.js";
import {
  addClientWalletPaymentMethod,
  completeClientWalletQrUpload,
  editClientWalletPaymentMethod,
  getClientWalletPaymentMethods,
  getClientWalletQrUploadSignature,
  removeClientWalletPaymentMethod,
} from "../controllers/client-payment-method.controller.js";

export const clientRouter = Router();

clientRouter.post(
  "/signup",
  clientRegistrationRateLimiter,
  validateRequest(clientRegistrationSchema),
  asyncHandler(clientRegistration),
);
clientRouter.post(
  "/login",
  clientLoginRateLimiter,
  validateRequest(clientLoginSchema),
  asyncHandler(clientLogin),
);
clientRouter.post(
  "/token/refresh",
  clientRefreshRateLimiter,
  validateRequest(clientRefreshTokenSchema),
  asyncHandler(clientTokenRefresh),
);
clientRouter.post(
  "/logout",
  validateRequest(clientRefreshTokenSchema),
  asyncHandler(clientLogout),
);
clientRouter.get("/me", authenticateClient, asyncHandler(currentClient));
clientRouter.get("/payment-methods", authenticateClient, asyncHandler(clientPaymentMethods));
clientRouter.get("/balance", authenticateClient, asyncHandler(clientBalance));
clientRouter.get(
  "/wallets",
  authenticateClient,
  asyncHandler(getClientWalletPaymentMethods),
);
clientRouter.post(
  "/wallets",
  authenticateClient,
  validateRequest(createClientPaymentMethodSchema),
  asyncHandler(addClientWalletPaymentMethod),
);
clientRouter.patch(
  "/wallets/:methodId",
  authenticateClient,
  validateRequest(updateClientPaymentMethodSchema),
  asyncHandler(editClientWalletPaymentMethod),
);
clientRouter.delete(
  "/wallets/:methodId",
  authenticateClient,
  asyncHandler(removeClientWalletPaymentMethod),
);
clientRouter.post(
  "/wallets/:methodId/qr-code/signature",
  authenticateClient,
  asyncHandler(getClientWalletQrUploadSignature),
);
clientRouter.post(
  "/wallets/:methodId/qr-code/complete",
  authenticateClient,
  validateRequest(completeClientPaymentMethodQrUploadSchema),
  asyncHandler(completeClientWalletQrUpload),
);
clientRouter.get(
  "/investments",
  authenticateClient,
  asyncHandler(getClientInvestments),
);
clientRouter.post(
  "/investments",
  authenticateClient,
  validateRequest(createClientInvestmentSchema),
  asyncHandler(addClientInvestment),
);
clientRouter.get(
  "/investments/:investmentId",
  authenticateClient,
  asyncHandler(getClientInvestmentDetails),
);
clientRouter.post(
  "/investments/:investmentId/capital-transfer",
  authenticateClient,
  asyncHandler(returnClientInvestmentCapital),
);
clientRouter.get("/deposits", authenticateClient, asyncHandler(clientDeposits));
clientRouter.post(
  "/deposits",
  authenticateClient,
  uploadSingleFile("paymentProof"),
  validateJsonField("payload", createDepositSchema),
  asyncHandler(createClientDeposit),
);
clientRouter.get(
  "/deposits/:depositId",
  authenticateClient,
  asyncHandler(clientDepositDetails),
);
clientRouter.use("/otp", otpRouter);
