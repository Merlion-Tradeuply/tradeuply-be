import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { securityConfig } from "../config/security.js";
import { Client } from "../models/client.model.js";
import { PasswordResetSession } from "../models/password-reset-session.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../utils/app-error.js";
import { maskEmail } from "../utils/normalizers.js";
import { hashToken } from "../utils/token-hash.js";
import { getActiveOtpState, issueOtp, verifyOtp } from "./otp.service.js";
import { sendPasswordResetEmails } from "./email.service.js";
import {
  consumeRefreshToken,
  issueTokenPair,
  revokeRefreshToken,
} from "./token.service.js";

const emailVerificationPurpose = "email_verification";
const passwordResetPurpose = "password_reset";

function getClientResponse(client) {
  return {
    email: maskEmail(client.email),
    firstName: client.firstName,
    id: client.id,
    status: client.status,
  };
}

function getAuthenticatedClientResponse(client) {
  return {
    email: client.email,
    firstName: client.firstName,
    id: client.id,
    lastName: client.lastName,
    role: client.role,
    status: client.status,
  };
}

function assertActiveClient(client) {
  if (!client) {
    throw new AppError("The email address or password is incorrect.", {
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
    });
  }

  if (client.status === "pending_verification") {
    throw new AppError("Verify your email address before logging in.", {
      code: "CLIENT_EMAIL_NOT_VERIFIED",
      statusCode: 403,
    });
  }

  if (client.status !== "active") {
    throw new AppError("This account is not currently available.", {
      code: "CLIENT_ACCOUNT_UNAVAILABLE",
      statusCode: 403,
    });
  }
}

export async function loginClient({ email, password }, userAgent) {
  const client = await Client.findOne({ email, deletedAt: null }).select("+passwordHash");

  if (!client) {
    await bcrypt.compare(password, "$2b$12$W5B6XrFBq2Y4Uyj9QAM7ze5qnS4hs5aCFsSFwKuWnRDg5YtN6K0zW");
    assertActiveClient(null);
  }

  const passwordMatches = await bcrypt.compare(password, client.passwordHash);

  if (!passwordMatches) assertActiveClient(null);
  assertActiveClient(client);

  return {
    client: getAuthenticatedClientResponse(client),
    tokens: await issueTokenPair(client, "client", userAgent),
  };
}

export async function refreshClientTokens(refreshToken, userAgent) {
  const clientId = await consumeRefreshToken(refreshToken, "client");
  const client = await Client.findOne({ _id: clientId, deletedAt: null });

  if (!client || client.status !== "active") {
    throw new AppError("This client session is no longer available.", {
      code: "CLIENT_SESSION_UNAVAILABLE",
      statusCode: 401,
    });
  }

  return {
    client: getAuthenticatedClientResponse(client),
    tokens: await issueTokenPair(client, "client", userAgent),
  };
}

export async function logoutClient(refreshToken) {
  await revokeRefreshToken(refreshToken);
}

export async function getCurrentClient(clientId) {
  const client = await Client.findOne({ _id: clientId, deletedAt: null });

  if (!client || client.status !== "active") {
    throw new AppError("This client account is not available.", {
      code: "CLIENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  return getAuthenticatedClientResponse(client);
}

export async function createClientRegistration(payload) {
  const existingClient = await Client.findOne({
    $or: [{ email: payload.email }, { phone: payload.phone }],
  });

  if (existingClient) {
    const isSamePendingEmail =
      existingClient.email === payload.email &&
      existingClient.status === "pending_verification";

    if (isSamePendingEmail) {
      const activeOtp = await getActiveOtpState({
        email: existingClient.email,
        purpose: emailVerificationPurpose,
      });

      if (activeOtp) {
        return {
          client: getClientResponse(existingClient),
          otp: activeOtp,
        };
      }

      const otp = await issueOtp({
        email: existingClient.email,
        firstName: existingClient.firstName,
        purpose: emailVerificationPurpose,
      });

      return { client: getClientResponse(existingClient), otp };
    }

    throw new AppError(
      existingClient.email === payload.email
        ? "An account already exists for this email address."
        : "An account already exists for this phone number.",
      {
        code:
          existingClient.email === payload.email
            ? "EMAIL_ALREADY_REGISTERED"
            : "PHONE_ALREADY_REGISTERED",
        statusCode: 409,
      },
    );
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(
    payload.password,
    securityConfig.passwordHashRounds,
  );
  let client;

  try {
    client = await Client.create({
      consents: {
        ageConfirmed: payload.ageConfirmed,
        riskAcceptedAt: now,
        termsAcceptedAt: now,
      },
      email: payload.email,
      firstName: payload.firstName,
      investmentProfile: {
        experience: payload.experience,
        investmentRange: payload.investmentRange,
        objective: payload.objective,
      },
      lastName: payload.lastName,
      passwordHash,
      phone: payload.phone,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("An account already exists for the submitted information.", {
        code: "CLIENT_ALREADY_REGISTERED",
        statusCode: 409,
      });
    }

    throw error;
  }

  try {
    const otp = await issueOtp({
      email: client.email,
      firstName: client.firstName,
      purpose: emailVerificationPurpose,
    });

    return { client: getClientResponse(client), otp };
  } catch (error) {
    await Client.deleteOne({ _id: client._id, status: "pending_verification" });
    throw error;
  }
}

export async function activateVerifiedClient(email) {
  const client = await Client.findOneAndUpdate(
    { deletedAt: null, email, status: "pending_verification" },
    {
      $set: {
        emailVerifiedAt: new Date(),
        status: "active",
      },
    },
    { new: true },
  );

  if (!client) {
    const alreadyActiveClient = await Client.findOne({
      deletedAt: null,
      email,
      status: "active",
    });

    if (alreadyActiveClient) return getClientResponse(alreadyActiveClient);

    throw new AppError("The pending client account could not be found.", {
      code: "PENDING_CLIENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  return getClientResponse(client);
}

export async function resendClientVerificationOtp({ email, purpose }) {
  const client = await Client.findOne({
    deletedAt: null,
    email,
    status: "pending_verification",
  });

  if (!client) {
    throw new AppError("A pending registration could not be found for this email.", {
      code: "PENDING_CLIENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  return issueOtp({
    email: client.email,
    firstName: client.firstName,
    purpose,
  });
}

export async function requestClientPasswordReset({ email }) {
  const client = await Client.findOne({
    deletedAt: null,
    email,
    status: "active",
  });

  if (!client) {
    throw new AppError("No active client account was found for this email address.", {
      code: "CLIENT_EMAIL_NOT_REGISTERED",
      statusCode: 404,
    });
  }

  return issueOtp({
    email: client.email,
    firstName: client.firstName,
    purpose: passwordResetPurpose,
  });
}

export async function verifyClientPasswordResetOtp({ email, otp }) {
  const verification = await verifyOtp({
    email,
    otp,
    purpose: passwordResetPurpose,
  });
  const client = await Client.findOne({
    deletedAt: null,
    email: verification.email,
    status: "active",
  });
  if (!client) {
    throw new AppError("The password reset request is no longer available.", {
      code: "PASSWORD_RESET_NOT_AVAILABLE",
      statusCode: 404,
    });
  }

  const resetToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + securityConfig.passwordResetTokenTtlMs);
  await PasswordResetSession.deleteMany({ client: client._id, consumedAt: null });
  await PasswordResetSession.create({
    client: client._id,
    expiresAt,
    tokenHash: hashToken(resetToken),
  });

  return { expiresAt, resetToken };
}

export async function resetClientPassword({ email, password, resetToken }) {
  const passwordHash = await bcrypt.hash(
    password,
    securityConfig.passwordHashRounds,
  );
  const now = new Date();
  const session = await mongoose.startSession();
  let client;

  try {
    await session.withTransaction(async () => {
      client = await Client.findOne({
        deletedAt: null,
        email,
        status: "active",
      }).session(session);
      if (!client) {
        throw new AppError("The password reset request is invalid or expired.", {
          code: "PASSWORD_RESET_INVALID",
          statusCode: 400,
        });
      }

      const resetSession = await PasswordResetSession.findOneAndUpdate(
        {
          client: client._id,
          consumedAt: null,
          expiresAt: { $gt: now },
          tokenHash: hashToken(resetToken),
        },
        { $set: { consumedAt: now } },
        { new: true, session },
      );
      if (!resetSession) {
        throw new AppError("The password reset request is invalid or expired.", {
          code: "PASSWORD_RESET_INVALID",
          statusCode: 400,
        });
      }

      client.passwordHash = passwordHash;
      await client.save({ session });
      await RefreshSession.updateMany(
        { accountId: client._id, accountType: "client", revokedAt: null },
        { $set: { revokedAt: now } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  await sendPasswordResetEmails({ client, resetAt: now }).catch((error) => {
    console.error("Password reset notifications could not be sent.", {
      clientId: client.id,
      message: error.message,
    });
  });
}
