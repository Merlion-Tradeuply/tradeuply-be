import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    asset: { default: null, maxlength: 20, trim: true, type: String },
    category: {
      enum: ["card", "wallet", "bank", "crypto"],
      required: true,
      type: String,
    },
    code: {
      lowercase: true,
      maxlength: 40,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
    deletedAt: { default: null, index: true, type: Date },
    displayOrder: { default: 0, min: 0, type: Number },
    instructions: { default: "", maxlength: 1000, trim: true, type: String },
    maximumAmount: { default: null, min: 0, type: Number },
    minimumAmount: { default: null, min: 0, type: Number },
    name: { maxlength: 80, required: true, trim: true, type: String },
    network: { default: null, maxlength: 40, trim: true, type: String },
    qrCodePublicId: { default: null, maxlength: 300, trim: true, type: String },
    qrCodeUrl: { default: null, maxlength: 500, trim: true, type: String },
    status: {
      default: "coming_soon",
      enum: ["active", "coming_soon", "disabled"],
      index: true,
      type: String,
    },
    walletAddress: { default: null, maxlength: 200, trim: true, type: String },
  },
  { timestamps: true, versionKey: false },
);

export const PaymentMethod =
  mongoose.models.PaymentMethod ?? mongoose.model("PaymentMethod", paymentMethodSchema);
