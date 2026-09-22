import mongoose from "mongoose";

import { securityConfig } from "../config/security.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../utils/app-error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { hashToken } from "../utils/token-hash.js";

function getExpiryDate(ttlSeconds) {
  return new Date(Date.now() + ttlSeconds * 1000);
}

export async function issueTokenPair(account, accountType, userAgent = "") {
  const sessionId = new mongoose.Types.ObjectId();
  const accessToken = signAccessToken(account, accountType);
  const refreshToken = signRefreshToken(account, sessionId.toString(), accountType);

  await RefreshSession.create({
    _id: sessionId,
    accountId: account._id,
    accountType,
    expiresAt: getExpiryDate(securityConfig.jwt.refreshTokenTtlSeconds),
    tokenHash: hashToken(refreshToken),
    userAgent: userAgent.slice(0, 512),
  });

  return {
    accessToken,
    accessTokenExpiresIn: securityConfig.jwt.accessTokenTtlSeconds,
    refreshToken,
    refreshTokenExpiresIn: securityConfig.jwt.refreshTokenTtlSeconds,
  };
}

export async function consumeRefreshToken(refreshToken, accountType) {
  const payload = verifyRefreshToken(refreshToken, accountType);
  const session = await RefreshSession.findOneAndUpdate(
    {
      _id: payload.sid,
      accountId: payload.sub,
      accountType,
      expiresAt: { $gt: new Date() },
      revokedAt: null,
      tokenHash: hashToken(refreshToken),
    },
    { $set: { revokedAt: new Date() } },
    { new: true },
  );

  if (!session) {
    throw new AppError("This refresh token is invalid or has already been used.", {
      code: "INVALID_REFRESH_TOKEN",
      statusCode: 401,
    });
  }

  return payload.sub;
}

export async function revokeRefreshToken(refreshToken) {
  await RefreshSession.updateOne(
    { revokedAt: null, tokenHash: hashToken(refreshToken) },
    { $set: { revokedAt: new Date() } },
  );
}
