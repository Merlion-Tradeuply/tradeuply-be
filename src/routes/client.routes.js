import { Router } from "express";

import {
  clientForgotPassword,
  clientLogin,
  clientLogout,
  clientPasswordReset,
  clientPasswordResetOtpVerification,
  clientRegistration,
  clientTokenRefresh,
  currentClient,
} from "../controllers/client.controller.js";
import { authenticateClient } from "../middleware/client-authentication.js";
import {
  clientLoginRateLimiter,
  clientRefreshRateLimiter,
  clientRegistrationRateLimiter,
  otpVerificationRateLimiter,
  passwordResetCompletionRateLimiter,
  passwordResetRequestRateLimiter,
} from "../middleware/rate-limiters.js";
import { validateQuery, validateRequest } from "../middleware/validate-request.js";
import {
  clientLoginSchema,
  clientRefreshTokenSchema,
  clientRegistrationSchema,
  requestClientPasswordResetSchema,
  resetClientPasswordSchema,
  verifyClientPasswordResetOtpSchema,
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
  withdrawClientInvestmentProfit,
} from "../controllers/client-investment.controller.js";
import { createDepositSchema } from "../validators/deposit.validator.js";
import {
  createClientInvestmentSchema,
  withdrawClientInvestmentProfitSchema,
} from "../validators/client-investment.validator.js";
import {
  createClientPaymentMethodSchema,
  updateClientPaymentMethodSchema,
} from "../validators/client-payment-method.validator.js";
import {
  addClientWalletPaymentMethod,
  editClientWalletPaymentMethod,
  getClientWalletPaymentMethods,
  removeClientWalletPaymentMethod,
} from "../controllers/client-payment-method.controller.js";
import { getClientTransactions } from "../controllers/client-transaction.controller.js";
import { clientTransactionQuerySchema } from "../validators/client-transaction.validator.js";
import { clientWithdrawals, createClientWithdrawal } from "../controllers/withdrawal.controller.js";
import { createWithdrawalSchema } from "../validators/withdrawal.validator.js";

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
  "/password/forgot",
  passwordResetRequestRateLimiter,
  validateRequest(requestClientPasswordResetSchema),
  asyncHandler(clientForgotPassword),
);
clientRouter.post(
  "/password/verify-otp",
  otpVerificationRateLimiter,
  validateRequest(verifyClientPasswordResetOtpSchema),
  asyncHandler(clientPasswordResetOtpVerification),
);
clientRouter.post(
  "/password/reset",
  passwordResetCompletionRateLimiter,
  validateRequest(resetClientPasswordSchema),
  asyncHandler(clientPasswordReset),
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
  "/transactions",
  authenticateClient,
  validateQuery(clientTransactionQuerySchema),
  asyncHandler(getClientTransactions),
);
clientRouter.get(
  "/wallets",
  authenticateClient,
  asyncHandler(getClientWalletPaymentMethods),
);
clientRouter.get(
  "/withdrawals",
  authenticateClient,
  asyncHandler(clientWithdrawals),
);
clientRouter.post(
  "/withdrawals",
  authenticateClient,
  validateRequest(createWithdrawalSchema),
  asyncHandler(createClientWithdrawal),
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
clientRouter.post(
  "/investments/:investmentId/profit-withdrawal",
  authenticateClient,
  validateRequest(withdrawClientInvestmentProfitSchema),
  asyncHandler(withdrawClientInvestmentProfit),
);
clientRouter.get("/deposits", authenticateClient, asyncHandler(clientDeposits));
clientRouter.post(
  "/deposits",
  authenticateClient,
  validateRequest(createDepositSchema),
  asyncHandler(createClientDeposit),
);
clientRouter.get(
  "/deposits/:depositId",
  authenticateClient,
  asyncHandler(clientDepositDetails),
);
clientRouter.use("/otp", otpRouter);
