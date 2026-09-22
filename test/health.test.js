import assert from "node:assert/strict";
import { describe, it } from "node:test";

import request from "supertest";

process.env.NODE_ENV = "test";

const { app } = await import("../src/app.js");

describe("TradeUply API", () => {
  it("returns API health information", async () => {
    const response = await request(app).get("/api/v1/health");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, "TradeUply API is healthy.");
    assert.equal(response.body.data.database, "disconnected");
    assert.equal(typeof response.body.data.timestamp, "string");
  });

  it("returns a consistent JSON response for unknown routes", async () => {
    const response = await request(app).get("/api/v1/unknown");

    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.match(response.body.error.message, /was not found/);
  });

  it("rejects invalid client registration before accessing the database", async () => {
    const response = await request(app).post("/api/v1/client/signup").send({
      email: "invalid-email",
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.ok(Array.isArray(response.body.error.details));
  });

  it("protects the current-client endpoint without an access token", async () => {
    const response = await request(app).get("/api/v1/client/me").expect(401);

    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "ACCESS_TOKEN_REQUIRED");
  });

  it("protects the dashboard module without an access token", async () => {
    const response = await request(app).get("/api/v1/dashboard").expect(401);

    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "ACCESS_TOKEN_REQUIRED");
  });

  it("protects the transaction module without an access token", async () => {
    const response = await request(app).get("/api/v1/transactions").expect(401);

    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "ACCESS_TOKEN_REQUIRED");
  });
});
