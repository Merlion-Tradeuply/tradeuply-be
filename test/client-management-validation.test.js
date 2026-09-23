import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deleteManagedClientsSchema,
  managedClientQuerySchema,
  updateManagedClientSchema,
} from "../src/validators/client-management.validator.js";

describe("client management validation", () => {
  it("validates client filters and pagination", () => {
    const result = managedClientQuerySchema.safeParse({
      limit: "20",
      page: "2",
      query: "client@example.com",
      status: "active",
    });

    assert.equal(result.success, true);
    assert.equal(result.data.limit, 20);
    assert.equal(result.data.page, 2);
  });

  it("accepts editable client profile fields", () => {
    const result = updateManagedClientSchema.safeParse({
      experience: "Experienced",
      firstName: "Aarav",
      investmentRange: "$5,000–$24,999",
      lastName: "Sharma",
      objective: "Capital growth",
      phone: "+919876543210",
      status: "active",
    });

    assert.equal(result.success, true);
  });

  it("rejects an empty client update", () => {
    assert.equal(updateManagedClientSchema.safeParse({}).success, false);
  });

  it("validates single and bulk client deletion IDs", () => {
    const result = deleteManagedClientsSchema.safeParse({
      ids: ["507f1f77bcf86cd799439011", "507f191e810c19729de860ea"],
    });

    assert.equal(result.success, true);
    assert.equal(deleteManagedClientsSchema.safeParse({ ids: [] }).success, false);
  });
});
