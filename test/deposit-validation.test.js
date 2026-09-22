import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDepositSchema,
  reviewDepositSchema,
} from "../src/validators/deposit.validator.js";
import {
  deletePaymentMethodsSchema,
  updatePaymentMethodSchema,
} from "../src/validators/payment-method.validator.js";

describe("deposit validation", () => {
  it("accepts a complete USDT deposit submission", () => {
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

  it("allows a super-admin to configure the USDT wallet", () => {
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
});
