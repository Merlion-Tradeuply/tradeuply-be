import mongoose from "mongoose";

const depositActivitySchema = new mongoose.Schema(
  {
    actorId: { default: null, type: mongoose.Schema.Types.ObjectId },
    actorLabel: { default: "System", maxlength: 150, trim: true, type: String },
    actorType: {
      enum: ["client", "internal", "system"],
      required: true,
      type: String,
    },
    deposit: {
      index: true,
      ref: "Deposit",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    event: {
      enum: ["submitted", "approved", "rejected", "balance_credited", "note_added"],
      index: true,
      required: true,
      type: String,
    },
    ipAddress: { default: "", maxlength: 100, trim: true, type: String },
    metadata: { default: {}, type: mongoose.Schema.Types.Mixed },
    newStatus: { default: null, type: String },
    previousStatus: { default: null, type: String },
    userAgent: { default: "", maxlength: 500, trim: true, type: String },
  },
  { timestamps: true, versionKey: false },
);

depositActivitySchema.index({ deposit: 1, createdAt: 1 });

export const DepositActivity =
  mongoose.models.DepositActivity ??
  mongoose.model("DepositActivity", depositActivitySchema);
