import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPasswordResetEmails } from "../src/templates/password-reset.email.js";
import { createVerificationOtpEmail } from "../src/templates/verification-otp.email.js";

describe("password reset emails", () => {
  it("labels a password reset OTP separately from registration", () => {
    const content = createVerificationOtpEmail({
      firstName: "Demo",
      otp: "123456",
      purpose: "password_reset",
    });

    assert.match(content.subject, /password reset/i);
    assert.match(content.text, /123456/);
    assert.doesNotMatch(content.text, /registration/i);
  });

  it("notifies the client and admin without exposing the password", () => {
    const content = createPasswordResetEmails({
      client: {
        email: "client@example.com",
        firstName: "Demo",
        lastName: "Investor",
      },
      resetAt: new Date("2026-09-24T12:00:00.000Z"),
    });

    assert.match(content.client.text, /password was changed/i);
    assert.match(content.admin.text, /client@example\.com/);
    assert.match(content.admin.text, /password is not included/i);
    assert.doesNotMatch(content.admin.text, /NewSecure1/);
  });
});
