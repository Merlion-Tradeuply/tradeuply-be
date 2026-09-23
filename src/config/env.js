import "dotenv/config";

function readPort(value) {
  const port = Number.parseInt(value ?? "5001", 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  return port;
}

function readApiPrefix(value) {
  const prefix = value?.trim() || "/api/v1";
  return prefix.startsWith("/") ? prefix : `/${prefix}`;
}

export const env = Object.freeze({
  apiPrefix: readApiPrefix(process.env.API_PREFIX),
  cloudinaryApiKey:
    process.env.CLOUDINARY_API_KEY?.trim() ??
    process.env.CLOUDIONARY_API_KEY?.trim() ??
    "",
  cloudinaryApiSecret:
    process.env.CLOUDINARY_API_SECRET?.trim() ??
    process.env.CLOUDIONARY_API_SECRET?.trim() ??
    "",
  cloudinaryCloudName:
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ??
    process.env.CLOUDIONARY_CLOUD_NAME?.trim() ??
    "",
  corsOrigins: (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  depositNotificationEmail:
    process.env.DEPOSIT_NOTIFICATION_EMAIL?.trim().toLowerCase() ??
    "merlionasset@gmail.com",
  mongoUri: process.env.MONGO_URI?.trim() ?? "",
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET?.trim() ?? "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET?.trim() ?? "",
  otpHashSecret: process.env.OTP_HASH_SECRET?.trim() ?? "",
  port: readPort(process.env.PORT),
  resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL?.trim() ?? "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? "",
  superAdminFirstName: process.env.SUPER_ADMIN_FIRST_NAME?.trim() ?? "",
  superAdminLastName: process.env.SUPER_ADMIN_LAST_NAME?.trim() ?? "",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "",
});
