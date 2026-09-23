import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDepositSchema,
  reviewDepositSchema,
} from "../src/validators/deposit.validator.js";
import { currencyConversionQuerySchema } from "../src/validators/currency.validator.js";
import { createClientInvestmentSchema } from "../src/validators/client-investment.validator.js";
import {
  completeClientPaymentMethodQrUploadSchema,
  createClientPaymentMethodSchema,
  updateClientPaymentMethodSchema,
} from "../src/validators/client-payment-method.validator.js";
import {
  createInvestmentPlanSchema,
  deleteInvestmentPlansSchema,
  investmentPlanQuerySchema,
} from "../src/validators/investment-plan.validator.js";
import {
  completePaymentMethodQrUploadSchema,
  deletePaymentMethodsSchema,
  paymentMethodQuerySchema,
  updatePaymentMethodSchema,
} from "../src/validators/payment-method.validator.js";
import {
  deleteTransactionsSchema,
  transactionQuerySchema,
} from "../src/validators/transaction.validator.js";

describe("deposit validation", () => {
  it("accepts a complete cryptocurrency deposit submission", () => {
    const result = createDepositSchema.safeParse({
      amount: 125.5,
      notes: "TRC20 transfer",
      paymentMethodId: "507f1f77bcf86cd799439011",
      senderWalletAddress: "TSenderWalletAddress123",
      transactionHash: "abc123456789def",
    });

    assert.equal(result.success, true);
  });

  it("requires a reason when a deposit is rejected", () => {
    const result = reviewDepositSchema.safeParse({ action: "reject", notes: "" });
    assert.equal(result.success, false);
  });

  it("validates currency conversion queries", () => {
    const validResult = currencyConversionQuerySchema.safeParse({
      amount: "250",
      from: "usd",
      to: "btc",
    });
    const invalidResult = currencyConversionQuerySchema.safeParse({
      amount: 0,
      from: "USD",
      to: "BTC",
    });

    assert.equal(validResult.success, true);
    assert.equal(validResult.data?.from, "USD");
    assert.equal(validResult.data?.to, "BTC");
    assert.equal(invalidResult.success, false);
  });

  it("validates client investment creation", () => {
    const validResult = createClientInvestmentSchema.safeParse({
      amountUsd: 500,
      planId: "507f1f77bcf86cd799439011",
      requestId: "9fb0cfb9-70b4-4fc4-a705-00bf71fb738f",
      walletCurrency: "btc",
    });
    const invalidResult = createClientInvestmentSchema.safeParse({
      amountUsd: 0,
      planId: "invalid",
      requestId: "invalid",
      walletCurrency: "BTC",
    });

    assert.equal(validResult.success, true);
    assert.equal(validResult.data?.walletCurrency, "BTC");
    assert.equal(invalidResult.success, false);
  });

  it("validates client wallet payment methods and QR uploads", () => {
    const method = createClientPaymentMethodSchema.safeParse({
      asset: "eth",
      isDefault: true,
      label: "My primary wallet",
      network: "Ethereum",
      walletAddress: "0x1234567890abcdef",
    });
    const update = updateClientPaymentMethodSchema.safeParse({ label: "Cold wallet" });
    const upload = completeClientPaymentMethodQrUploadSchema.safeParse({
      bytes: 128000,
      format: "png",
      height: 512,
      publicId: "tradeuply/client-payment-methods/client/method/qr-code/wallet-qr",
      signature: "cloudinary-response-signature",
      version: 1800000000,
      width: 512,
    });

    assert.equal(method.success, true);
    assert.equal(method.data?.asset, "ETH");
    assert.equal(update.success, true);
    assert.equal(upload.success, true);
  });

  it("allows a super-admin to configure a cryptocurrency wallet", () => {
    const result = updatePaymentMethodSchema.safeParse({
      network: "TRC20",
      status: "active",
      walletAddress: "TReceivingWalletAddress123",
    });

    assert.equal(result.success, true);
  });

  it("validates a bulk payment-method deletion request", () => {
    const validResult = deletePaymentMethodsSchema.safeParse({
      ids: ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"],
    });
    const invalidResult = deletePaymentMethodsSchema.safeParse({ ids: [] });

    assert.equal(validResult.success, true);
    assert.equal(invalidResult.success, false);
  });

  it("validates a completed direct Cloudinary QR upload", () => {
    const validResult = completePaymentMethodQrUploadSchema.safeParse({
      bytes: 128_000,
      format: "png",
      height: 512,
      publicId: "tradeuply/payment-methods/bitcoin/qr-code/receiving-wallet-qr",
      signature: "cloudinary-response-signature",
      version: 1_800_000_000,
      width: 512,
    });
    const oversizedResult = completePaymentMethodQrUploadSchema.safeParse({
      bytes: 5 * 1024 * 1024,
      format: "png",
      height: 512,
      publicId: "tradeuply/payment-methods/bitcoin/qr-code/receiving-wallet-qr",
      signature: "cloudinary-response-signature",
      version: 1_800_000_000,
      width: 512,
    });

    assert.equal(validResult.success, true);
    assert.equal(oversizedResult.success, false);
  });

  it("validates payment-method API filters", () => {
    const validResult = paymentMethodQuerySchema.safeParse({
      category: "crypto",
      q: "bitcoin",
      sort: "name-asc",
      status: "active",
    });
    const invalidResult = paymentMethodQuerySchema.safeParse({
      category: "unsupported",
      sort: "newest",
    });

    assert.equal(validResult.success, true);
    assert.equal(invalidResult.success, false);
  });

  it("validates transaction filters and bulk deletion", () => {
    const filters = transactionQuerySchema.safeParse({
      direction: "credit",
      q: "client@example.com",
      type: "deposit",
    });
    const deletion = deleteTransactionsSchema.safeParse({
      ids: ["507f1f77bcf86cd799439011"],
    });
    const invalidDeletion = deleteTransactionsSchema.safeParse({ ids: [] });

    assert.equal(filters.success, true);
    assert.equal(deletion.success, true);
    assert.equal(invalidDeletion.success, false);
  });

  it("validates investment-plan CRUD and filters", () => {
    const plan = createInvestmentPlanSchema.safeParse({
      allocation: "Global equities · Bonds",
      dailyObjective: 7,
      description: "A diversified plan for balanced market exposure.",
      displayOrder: 10,
      features: ["Diversified assets"],
      horizonDays: 7,
      icon: "chart",
      isFeatured: true,
      minimumInvestment: 250,
      name: "Balanced",
      risk: "Moderate",
      slug: "balanced",
      status: "active",
    });
    const filters = investmentPlanQuerySchema.safeParse({
      featured: "true",
      q: "balanced",
      sort: "minimum-asc",
      status: "active",
    });
    const deletion = deleteInvestmentPlansSchema.safeParse({
      ids: ["507f1f77bcf86cd799439011"],
    });

    assert.equal(plan.success, true);
    assert.equal(filters.success, true);
    assert.equal(deletion.success, true);
  });
});
