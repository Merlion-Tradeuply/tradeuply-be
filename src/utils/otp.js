import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

import { env } from "../config/env.js";
import { securityConfig } from "../config/security.js";

function getOtpHashSecret() {
  if (
    env.otpHashSecret.length < 32 ||
    env.otpHashSecret === "replace-with-a-long-random-secret"
  ) {
    throw new Error("OTP_HASH_SECRET must be a private random value of at least 32 characters.");
  }

  return env.otpHashSecret;
}

export function generateOtpCode() {
  const upperBound = 10 ** securityConfig.otp.length;
  return randomInt(0, upperBound)
    .toString()
    .padStart(securityConfig.otp.length, "0");
}

export function hashOtpCode({ code, email, purpose }) {
  return createHmac("sha256", getOtpHashSecret())
    .update(`${email}:${purpose}:${code}`)
    .digest("hex");
}

export function verifyOtpCode({ code, codeHash, email, purpose }) {
  const candidateHash = hashOtpCode({ code, email, purpose });
  const candidateBuffer = Buffer.from(candidateHash, "hex");
  const storedBuffer = Buffer.from(codeHash, "hex");

  return (
    candidateBuffer.length === storedBuffer.length &&
    timingSafeEqual(candidateBuffer, storedBuffer)
  );
}

export function createOtpSchedule(now = new Date()) {
  const expiresAt = new Date(now.getTime() + securityConfig.otp.ttlMs);

  return {
    expiresAt,
    resendAvailableAt: new Date(expiresAt),
  };
}

export function getRetryAfterSeconds(availableAt, now = new Date()) {
  return Math.max(0, Math.ceil((availableAt.getTime() - now.getTime()) / 1000));
}
