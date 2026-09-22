import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-longer-than-thirty-two-characters";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-longer-than-thirty-two-characters";

const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = await import("../src/utils/jwt.js");

const client = { id: "507f1f77bcf86cd799439011", role: "client" };

describe("client JWT utilities", () => {
  it("signs and verifies an access token", () => {
    const payload = verifyAccessToken(signAccessToken(client));

    assert.equal(payload.sub, client.id);
    assert.equal(payload.type, "access");
  });

  it("signs and verifies a refresh token with its session id", () => {
    const sessionId = "507f191e810c19729de860ea";
    const payload = verifyRefreshToken(signRefreshToken(client, sessionId));

    assert.equal(payload.sid, sessionId);
    assert.equal(payload.sub, client.id);
    assert.equal(payload.type, "refresh");
  });

  it("does not accept a refresh token as an access token", () => {
    assert.throws(() => verifyAccessToken(signRefreshToken(client, "session-id")));
  });

  it("does not accept a client token in the internal user area", () => {
    assert.throws(() => verifyAccessToken(signAccessToken(client), "internal"));
  });
});
