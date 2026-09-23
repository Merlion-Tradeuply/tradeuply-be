import mongoose from "mongoose";

const withdrawalActivitySchema = new mongoose.Schema(
  {
    actorId: { default: null, type: mongoose.Schema.Types.ObjectId },
    actorLabel: { default: "System", maxlength: 150, trim: true, type: String },
    actorType: { enum: ["client", "internal", "system"], required: true, type: String },
    event: {
      enum: ["submitted", "approved", "rejected", "balance_reserved", "balance_released", "balance_debited"],
      required: true,
      type: String,
    },
    ipAddress: { default: "", maxlength: 100, trim: true, type: String },
    metadata: { default: {}, type: mongoose.Schema.Types.Mixed },
    newStatus: { default: null, type: String },
    previousStatus: { default: null, type: String },
    userAgent: { default: "", maxlength: 500, trim: true, type: String },
    withdrawal: { index: true, ref: "Withdrawal", required: true, type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
);

withdrawalActivitySchema.index({ withdrawal: 1, createdAt: 1 });

export const WithdrawalActivity =
  mongoose.models.WithdrawalActivity ??
  mongoose.model("WithdrawalActivity", withdrawalActivitySchema);
