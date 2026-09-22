import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

process.env.OTP_HASH_SECRET = "test-only-otp-secret-that-is-longer-than-32-characters";

const { OtpVerification } = await import("../src/models/otp-verification.model.js");
const { issueOtp, verifyOtp } = await import("../src/services/otp.service.js");
const { hashOtpCode } = await import("../src/utils/otp.js");

function queryReturning(value) {
  return {
    select() {
      return this;
    },
    sort() {
      return Promise.resolve(value);
    },
  };
}

afterEach(() => mock.restoreAll());

describe("OTP service", () => {
  it("blocks resend until the stored cooldown has elapsed", async () => {
    const resendAvailableAt = new Date(Date.now() + 90_000);
    mock.method(OtpVerification, "findOne", () =>
      queryReturning({ resendAvailableAt }),
    );

    await assert.rejects(
      issueOtp({
        email: "investor@example.com",
        firstName: "Demo",
        purpose: "email_verification",
      }),
      (error) => {
        assert.equal(error.code, "OTP_RESEND_TOO_EARLY");
        assert.ok(error.details.retryAfterSeconds > 0);
        return true;
      },
    );
  });

  it("rejects an expired verification code", async () => {
    const code = "123456";
    const email = "investor@example.com";
    const purpose = "email_verification";
    mock.method(OtpVerification, "findOne", () =>
      queryReturning({
        attempts: 0,
        codeHash: hashOtpCode({ code, email, purpose }),
        expiresAt: new Date(Date.now() - 1_000),
        maxAttempts: 5,
        purpose,
      }),
    );

    await assert.rejects(
      verifyOtp({ email, otp: code, purpose }),
      (error) => {
        assert.equal(error.code, "OTP_EXPIRED");
        return true;
      },
    );
  });

  it("consumes a correct verification code exactly once", async () => {
    const code = "123456";
    const email = "investor@example.com";
    const purpose = "email_verification";
    const verification = {
      _id: "otp-id",
      attempts: 0,
      codeHash: hashOtpCode({ code, email, purpose }),
      expiresAt: new Date(Date.now() + 60_000),
      maxAttempts: 5,
      purpose,
    };
    mock.method(OtpVerification, "findOne", () => queryReturning(verification));
    const consumeMock = mock.method(
      OtpVerification,
      "findOneAndUpdate",
      async () => verification,
    );

    const result = await verifyOtp({ email, otp: code, purpose });

    assert.equal(result.email, email);
    assert.equal(result.purpose, purpose);
    assert.equal(consumeMock.mock.callCount(), 1);
  });
});
