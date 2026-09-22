import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clientLoginSchema,
  clientRegistrationSchema,
} from "../src/validators/client.validator.js";

const validClientRegistration = {
  ageConfirmed: true,
  confirmPassword: "SecurePass1",
  email: " Investor@Example.com ",
  experience: "New investor",
  firstName: "Demo",
  investmentRange: "$100–$999",
  lastName: "Investor",
  objective: "Portfolio diversification",
  password: "SecurePass1",
  phone: "+91 98765 43210",
  riskAccepted: true,
  termsAccepted: true,
};

describe("client registration validation", () => {
  it("normalizes valid email and phone fields", () => {
    const result = clientRegistrationSchema.parse(validClientRegistration);

    assert.equal(result.email, "investor@example.com");
    assert.equal(result.phone, "+919876543210");
  });

  it("rejects mismatched passwords", () => {
    const result = clientRegistrationSchema.safeParse({
      ...validClientRegistration,
      confirmPassword: "DifferentPass1",
    });

    assert.equal(result.success, false);
    assert.ok(
      result.error.issues.some((issue) => issue.path.includes("confirmPassword")),
    );
  });

  it("requires all registration acknowledgements", () => {
    const result = clientRegistrationSchema.safeParse({
      ...validClientRegistration,
      riskAccepted: false,
    });

    assert.equal(result.success, false);
  });
});

describe("client login validation", () => {
  it("normalizes a valid client login", () => {
    const result = clientLoginSchema.safeParse({
      email: "  CLIENT@Example.com ",
      password: "Password123",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.email, "client@example.com");
  });

  it("rejects a missing password", () => {
    const result = clientLoginSchema.safeParse({
      email: "client@example.com",
      password: "",
    });

    assert.equal(result.success, false);
  });
});
