import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authorizeRoles } from "../src/middleware/authorize-roles.js";

describe("internal role authorization", () => {
  it("allows a user when any assigned role is authorized", () => {
    let nextError;
    authorizeRoles("admin", "super-admin")(
      { user: { roles: ["hr", "admin"] } },
      {},
      (error) => {
        nextError = error;
      },
    );

    assert.equal(nextError, undefined);
  });

  it("returns a forbidden error when no role is authorized", () => {
    let nextError;
    authorizeRoles("super-admin")(
      { user: { roles: ["hr"] } },
      {},
      (error) => {
        nextError = error;
      },
    );

    assert.equal(nextError.code, "FORBIDDEN");
    assert.equal(nextError.statusCode, 403);
  });
});
