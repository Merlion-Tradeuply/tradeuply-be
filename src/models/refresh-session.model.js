import mongoose from "mongoose";

const refreshSessionSchema = new mongoose.Schema(
  {
    accountId: {
      index: true,
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    accountType: {
      enum: ["client", "internal"],
      index: true,
      required: true,
      type: String,
    },
    expiresAt: { required: true, type: Date },
    revokedAt: { default: null, index: true, type: Date },
    tokenHash: { required: true, select: false, type: String, unique: true },
    userAgent: { default: "", maxlength: 512, trim: true, type: String },
  },
  { timestamps: true, versionKey: false },
);

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshSession =
  mongoose.models.RefreshSession ??
  mongoose.model("RefreshSession", refreshSessionSchema);
