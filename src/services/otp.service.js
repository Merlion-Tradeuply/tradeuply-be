import { securityConfig } from "../config/security.js";
import { OtpVerification } from "../models/otp-verification.model.js";
import { AppError } from "../utils/app-error.js";
import { maskEmail, normalizeEmail } from "../utils/normalizers.js";
import {
  createOtpSchedule,
  generateOtpCode,
  getRetryAfterSeconds,
  hashOtpCode,
  verifyOtpCode,
} from "../utils/otp.js";
import { sendVerificationOtpEmail } from "./email.service.js";

function toOtpResponse(verification) {
  return {
    email: maskEmail(verification.email),
    expiresAt: verification.expiresAt.toISOString(),
    resendAvailableAt: verification.resendAvailableAt.toISOString(),
  };
}

export async function getActiveOtpState({ email, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const verification = await OtpVerification.findOne({
    consumedAt: null,
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  if (!verification || verification.expiresAt <= now) return null;
  return toOtpResponse(verification);
}

export async function issueOtp({ email, firstName, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const existingVerification = await OtpVerification.findOne({
    consumedAt: null,
    email: normalizedEmail,
    purpose,
  }).sort({ createdAt: -1 });

  if (existingVerification?.resendAvailableAt > now) {
    throw new AppError("A new verification code can be requested after the cooldown.", {
      code: "OTP_RESEND_TOO_EARLY",
      details: {
        resendAvailableAt: existingVerification.resendAvailableAt.toISOString(),
        retryAfterSeconds: getRetryAfterSeconds(existingVerification.resendAvailableAt, now),
      },
      statusCode: 429,
    });
  }

  await OtpVerification.deleteMany({
    consumedAt: null,
    email: normalizedEmail,
    purpose,
  });

  const otp = generateOtpCode();
  const { expiresAt, resendAvailableAt } = createOtpSchedule(now);
  const verification = await OtpVerification.create({
    codeHash: hashOtpCode({ code: otp, email: normalizedEmail, purpose }),
    email: normalizedEmail,
    expiresAt,
    maxAttempts: securityConfig.otp.maxAttempts,
    purpose,
    resendAvailableAt,
  });

  try {
    const deliveryId = await sendVerificationOtpEmail({
      email: normalizedEmail,
      firstName,
      otp,
    });

    if (deliveryId) {
      await OtpVerification.updateOne({ _id: verification._id }, { deliveryId });
    }
  } catch (error) {
    await OtpVerification.deleteOne({ _id: verification._id });
    throw error;
  }

  return toOtpResponse(verification);
}

export async function verifyOtp({ email, otp, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();
  const verification = await OtpVerification.findOne({
    consumedAt: null,
    email: normalizedEmail,
    purpose,
  })
    .select("+codeHash")
    .sort({ createdAt: -1 });

  if (!verification) {
    throw new AppError("No active verification code was found.", {
      code: "OTP_NOT_FOUND",
      statusCode: 404,
    });
  }

  if (verification.expiresAt <= now) {
    throw new AppError("The verification code has expired. Request a new code.", {
      code: "OTP_EXPIRED",
      details: { canResend: true },
      statusCode: 410,
    });
  }

  if (verification.attempts >= verification.maxAttempts) {
    throw new AppError("Too many incorrect attempts. Request a new code.", {
      code: "OTP_ATTEMPTS_EXCEEDED",
      details: { canResend: verification.resendAvailableAt <= now },
      statusCode: 429,
    });
  }

  const isValid = verifyOtpCode({
    code: otp,
    codeHash: verification.codeHash,
    email: normalizedEmail,
    purpose,
  });

  if (!isValid) {
    const attempts = verification.attempts + 1;
    await OtpVerification.updateOne(
      { _id: verification._id, consumedAt: null },
      { $inc: { attempts: 1 } },
    );

    throw new AppError(
      attempts >= verification.maxAttempts
        ? "Too many incorrect attempts. Request a new code."
        : "The verification code is incorrect.",
      {
        code:
          attempts >= verification.maxAttempts
            ? "OTP_ATTEMPTS_EXCEEDED"
            : "OTP_INVALID",
        details: {
          attemptsRemaining: Math.max(0, verification.maxAttempts - attempts),
          canResend: verification.resendAvailableAt <= now,
        },
        statusCode: attempts >= verification.maxAttempts ? 429 : 400,
      },
    );
  }

  const consumedVerification = await OtpVerification.findOneAndUpdate(
    {
      _id: verification._id,
      attempts: { $lt: verification.maxAttempts },
      consumedAt: null,
      expiresAt: { $gt: now },
    },
    { $set: { consumedAt: now } },
    { new: true },
  );

  if (!consumedVerification) {
    throw new AppError("The verification code is no longer valid.", {
      code: "OTP_INVALIDATED",
      statusCode: 409,
    });
  }

  return {
    email: normalizedEmail,
    purpose,
    verifiedAt: now,
  };
}
