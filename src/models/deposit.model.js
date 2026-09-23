import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    amount: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    asset: { maxlength: 20, required: true, trim: true, type: String },
    client: {
      index: true,
      ref: "Client",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    clientNotes: { default: "", maxlength: 1000, trim: true, type: String },
    destinationWalletAddress: { maxlength: 200, required: true, trim: true, type: String },
    methodCode: { maxlength: 40, required: true, trim: true, type: String },
    methodName: { maxlength: 80, required: true, trim: true, type: String },
    network: { maxlength: 40, required: true, trim: true, type: String },
    paymentMethod: {
      ref: "PaymentMethod",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    paymentProofPublicId: { maxlength: 300, required: true, trim: true, type: String },
    paymentProofUrl: { maxlength: 500, required: true, trim: true, type: String },
    reviewNotes: { default: "", maxlength: 1000, trim: true, type: String },
    reviewedAt: { default: null, type: Date },
    reviewedBy: { default: null, ref: "User", type: mongoose.Schema.Types.ObjectId },
    senderWalletAddress: { maxlength: 200, required: true, trim: true, type: String },
    status: {
      default: "pending",
      enum: ["pending", "approved", "rejected"],
      index: true,
      type: String,
    },
    transactionHash: {
      index: true,
      maxlength: 200,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
  },
  { timestamps: true, versionKey: false },
);

depositSchema.index({ client: 1, createdAt: -1 });

export const Deposit = mongoose.models.Deposit ?? mongoose.model("Deposit", depositSchema);
