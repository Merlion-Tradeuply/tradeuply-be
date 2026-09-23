import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    amount: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    asset: { maxlength: 20, required: true, trim: true, type: String },
    client: { index: true, ref: "Client", required: true, type: mongoose.Schema.Types.ObjectId },
    destinationLabel: { maxlength: 80, required: true, trim: true, type: String },
    destinationNetwork: { maxlength: 40, required: true, trim: true, type: String },
    destinationWalletAddress: { maxlength: 200, required: true, trim: true, type: String },
    paymentMethod: { ref: "ClientPaymentMethod", required: true, type: mongoose.Schema.Types.ObjectId },
    requestId: { maxlength: 80, required: true, trim: true, type: String },
    reviewNotes: { default: "", maxlength: 1000, trim: true, type: String },
    reviewedAt: { default: null, type: Date },
    reviewedBy: { default: null, ref: "User", type: mongoose.Schema.Types.ObjectId },
    status: {
      default: "pending",
      enum: ["pending", "approved", "rejected"],
      index: true,
      type: String,
    },
  },
  { timestamps: true, versionKey: false },
);

withdrawalSchema.index({ client: 1, createdAt: -1 });
withdrawalSchema.index({ client: 1, requestId: 1 }, { unique: true });

export const Withdrawal =
  mongoose.models.Withdrawal ?? mongoose.model("Withdrawal", withdrawalSchema);
