import bcrypt from "bcryptjs";

import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import {
  consumeRefreshToken,
  issueTokenPair,
  revokeRefreshToken,
} from "./token.service.js";

const dummyPasswordHash =
  "$2b$12$W5B6XrFBq2Y4Uyj9QAM7ze5qnS4hs5aCFsSFwKuWnRDg5YtN6K0zW";

export function getUserResponse(user) {
  return {
    email: user.email,
    firstName: user.firstName,
    id: user.id,
    lastName: user.lastName,
    roles: user.roles,
    status: user.status,
  };
}

function assertActiveUser(user) {
  if (!user) {
    throw new AppError("The email address or password is incorrect.", {
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
    });
  }

  if (user.status !== "active") {
    throw new AppError("This internal user account is suspended.", {
      code: "USER_SUSPENDED",
      statusCode: 403,
    });
  }
}

export async function loginUser({ email, password }, userAgent) {
  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    await bcrypt.compare(password, dummyPasswordHash);
    assertActiveUser(null);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) assertActiveUser(null);
  assertActiveUser(user);

  const tokens = await issueTokenPair(user, "internal", userAgent);
  user.lastLoginAt = new Date();
  await user.save();

  return { tokens, user: getUserResponse(user) };
}

export async function refreshUserTokens(refreshToken, userAgent) {
  const userId = await consumeRefreshToken(refreshToken, "internal");
  const user = await User.findById(userId);

  if (!user || user.status !== "active") {
    throw new AppError("This internal user session is no longer available.", {
      code: "USER_SESSION_UNAVAILABLE",
      statusCode: 401,
    });
  }

  return {
    tokens: await issueTokenPair(user, "internal", userAgent),
    user: getUserResponse(user),
  };
}

export async function logoutUser(refreshToken) {
  await revokeRefreshToken(refreshToken);
}
