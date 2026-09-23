import mongoose from "mongoose";

const passwordResetSessionSchema = new mongoose.Schema(
  {
    client: {
      ref: "Client",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    consumedAt: { default: null, index: true, type: Date },
    expiresAt: { index: { expireAfterSeconds: 0 }, required: true, type: Date },
    tokenHash: { required: true, select: false, type: String, unique: true },
  },
  { timestamps: true, versionKey: false },
);

passwordResetSessionSchema.index(
  { client: 1 },
  { partialFilterExpression: { consumedAt: null }, unique: true },
);

export const PasswordResetSession =
  mongoose.models.PasswordResetSession ??
  mongoose.model("PasswordResetSession", passwordResetSessionSchema);
