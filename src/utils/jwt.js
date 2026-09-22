import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { securityConfig } from "../config/security.js";
import { AppError } from "./app-error.js";

function requireSecret(secret, name) {
  if (secret.length < 32) {
    throw new Error(`${name} must contain at least 32 characters.`);
  }

  return secret;
}

function signToken(payload, secret, expiresIn) {
  return jwt.sign(payload, secret, {
    audience: securityConfig.jwt.audience,
    expiresIn,
    issuer: securityConfig.jwt.issuer,
  });
}

function verifyToken(token, secret, expectedType) {
  try {
    const payload = jwt.verify(token, secret, {
      audience: securityConfig.jwt.audience,
      issuer: securityConfig.jwt.issuer,
    });

    if (typeof payload !== "object" || payload.type !== expectedType || !payload.sub) {
      throw new Error("Unexpected token claims.");
    }

    return payload;
  } catch {
    throw new AppError("Your session is invalid or has expired.", {
      code: "INVALID_SESSION",
      statusCode: 401,
    });
  }
}

export function signAccessToken(account, accountType = "client") {
  return signToken(
    {
      accountType,
      roles: account.roles ?? [account.role],
      sub: account.id,
      type: "access",
    },
    requireSecret(env.jwtAccessSecret, "JWT_ACCESS_SECRET"),
    securityConfig.jwt.accessTokenTtlSeconds,
  );
}

export function signRefreshToken(account, sessionId, accountType = "client") {
  return signToken(
    {
      accountType,
      sid: sessionId,
      sub: account.id,
      type: "refresh",
    },
    requireSecret(env.jwtRefreshSecret, "JWT_REFRESH_SECRET"),
    securityConfig.jwt.refreshTokenTtlSeconds,
  );
}

export function verifyAccessToken(token, accountType) {
  const payload = verifyToken(
    token,
    requireSecret(env.jwtAccessSecret, "JWT_ACCESS_SECRET"),
    "access",
  );

  if (accountType && payload.accountType !== accountType) {
    throw new AppError("This token cannot access the requested account area.", {
      code: "INVALID_ACCOUNT_TOKEN",
      statusCode: 401,
    });
  }

  return payload;
}

export function verifyRefreshToken(token, accountType) {
  const payload = verifyToken(
    token,
    requireSecret(env.jwtRefreshSecret, "JWT_REFRESH_SECRET"),
    "refresh",
  );

  if (accountType && payload.accountType !== accountType) {
    throw new AppError("This refresh token cannot access the requested account area.", {
      code: "INVALID_ACCOUNT_TOKEN",
      statusCode: 401,
    });
  }

  return payload;
}
