import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.OTP_HASH_SECRET = "test-only-otp-secret-that-is-longer-than-32-characters";

const {
  createOtpSchedule,
  generateOtpCode,
  getRetryAfterSeconds,
  hashOtpCode,
  verifyOtpCode,
} = await import("../src/utils/otp.js");

describe("OTP utilities", () => {
  it("generates a six-digit numeric code", () => {
    assert.match(generateOtpCode(), /^\d{6}$/);
  });

  it("hashes and verifies a code without storing the raw value", () => {
    const parameters = {
      code: "123456",
      email: "investor@example.com",
      purpose: "email_verification",
    };
    const codeHash = hashOtpCode(parameters);

    assert.notEqual(codeHash, parameters.code);
    assert.equal(verifyOtpCode({ ...parameters, codeHash }), true);
    assert.equal(
      verifyOtpCode({ ...parameters, code: "654321", codeHash }),
      false,
    );
  });

  it("creates a two-minute expiry and resend schedule", () => {
    const now = new Date("2026-08-26T12:00:00.000Z");
    const schedule = createOtpSchedule(now);

    assert.equal(schedule.expiresAt.toISOString(), "2026-08-26T12:02:00.000Z");
    assert.equal(
      schedule.resendAvailableAt.toISOString(),
      "2026-08-26T12:02:00.000Z",
    );
    assert.equal(getRetryAfterSeconds(schedule.resendAvailableAt, now), 120);
  });
});
