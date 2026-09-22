import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { userLoginSchema } from "../src/validators/user.validator.js";

describe("internal user login validation", () => {
  it("normalizes a valid email", () => {
    const result = userLoginSchema.safeParse({
      email: " ADMIN@TradeUply.com ",
      password: "AdminPassword123",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.email, "admin@tradeuply.com");
  });

  it("rejects an invalid login body", () => {
    const result = userLoginSchema.safeParse({ email: "invalid", password: "" });

    assert.equal(result.success, false);
  });
});
