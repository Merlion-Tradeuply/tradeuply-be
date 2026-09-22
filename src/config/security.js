export const securityConfig = Object.freeze({
  jwt: {
    accessTokenTtlSeconds: 15 * 60,
    audience: "tradeuply-client",
    issuer: "tradeuply-api",
    refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
  },
  passwordHashRounds: 12,
  otp: {
    length: 6,
    maxAttempts: 5,
    ttlMs: 2 * 60 * 1000,
  },
});
