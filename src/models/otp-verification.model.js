import mongoose from "mongoose";

export const otpPurposes = ["email_verification"];

const otpVerificationSchema = new mongoose.Schema(
  {
    attempts: { default: 0, min: 0, type: Number },
    codeHash: { required: true, select: false, type: String },
    consumedAt: { default: null, type: Date },
    deliveryId: { default: null, type: String },
    email: { index: true, lowercase: true, required: true, trim: true, type: String },
    expiresAt: { index: { expireAfterSeconds: 0 }, required: true, type: Date },
    maxAttempts: { required: true, type: Number },
    purpose: { enum: otpPurposes, index: true, required: true, type: String },
    resendAvailableAt: { required: true, type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

otpVerificationSchema.index(
  { email: 1, purpose: 1 },
  {
    partialFilterExpression: { consumedAt: null },
    unique: true,
  },
);
otpVerificationSchema.index({ createdAt: -1, email: 1, purpose: 1 });

export const OtpVerification =
  mongoose.models.OtpVerification ??
  mongoose.model("OtpVerification", otpVerificationSchema);
