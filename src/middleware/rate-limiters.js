import { rateLimit } from "express-rate-limit";

function createClientRateLimiter({ limit, message, windowMs }) {
  return rateLimit({
    handler(_request, response, _next, options) {
      response.status(options.statusCode).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message,
        },
        success: false,
      });
    },
    legacyHeaders: false,
    limit,
    standardHeaders: "draft-8",
    windowMs,
  });
}

export const clientRegistrationRateLimiter = createClientRateLimiter({
  limit: 5,
  message: "Too many client registration attempts. Please try again later.",
  windowMs: 15 * 60 * 1000,
});

export const clientLoginRateLimiter = createClientRateLimiter({
  limit: 10,
  message: "Too many login attempts. Please try again later.",
  windowMs: 15 * 60 * 1000,
});

export const clientRefreshRateLimiter = createClientRateLimiter({
  limit: 30,
  message: "Too many session refresh attempts. Please log in again.",
  windowMs: 15 * 60 * 1000,
});

export const otpVerificationRateLimiter = createClientRateLimiter({
  limit: 15,
  message: "Too many OTP verification attempts. Please try again later.",
  windowMs: 15 * 60 * 1000,
});

export const otpResendRateLimiter = createClientRateLimiter({
  limit: 5,
  message: "Too many OTP resend requests. Please try again later.",
  windowMs: 15 * 60 * 1000,
});

export const passwordResetRequestRateLimiter = createClientRateLimiter({
  limit: 5,
  message: "Too many password reset requests. Please try again later.",
  windowMs: 15 * 60 * 1000,
});

export const passwordResetCompletionRateLimiter = createClientRateLimiter({
  limit: 10,
  message: "Too many password reset attempts. Please try again later.",
  windowMs: 15 * 60 * 1000,
});
