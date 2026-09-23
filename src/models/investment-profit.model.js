import mongoose from "mongoose";

const investmentProfitSchema = new mongoose.Schema(
  {
    amountUsd: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    client: {
      index: true,
      ref: "Client",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    creditDate: { index: true, required: true, type: Date },
    creditedBy: {
      default: null,
      ref: "User",
      type: mongoose.Schema.Types.ObjectId,
    },
    creditedByLabel: { default: "", maxlength: 140, trim: true, type: String },
    dayNumber: { min: 1, required: true, type: Number },
    investment: {
      index: true,
      ref: "ClientInvestment",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    kind: {
      default: "daily",
      enum: ["daily", "bonus"],
      index: true,
      type: String,
    },
    note: { default: "", maxlength: 300, trim: true, type: String },
    status: {
      default: "available",
      enum: ["available", "withdrawn"],
      index: true,
      type: String,
    },
    walletAmount: {
      min: 0,
      required: true,
      type: mongoose.Schema.Types.Decimal128,
    },
    walletCurrency: { maxlength: 20, required: true, trim: true, type: String },
    withdrawnAt: { default: null, type: Date },
  },
  { timestamps: true, versionKey: false },
);

investmentProfitSchema.index({ investment: 1, dayNumber: 1 }, { unique: true });
investmentProfitSchema.index({ client: 1, createdAt: -1 });

export const InvestmentProfit =
  mongoose.models.InvestmentProfit ??
  mongoose.model("InvestmentProfit", investmentProfitSchema);
