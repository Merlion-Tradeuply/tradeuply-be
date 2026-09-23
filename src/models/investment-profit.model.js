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
    dayNumber: { min: 1, required: true, type: Number },
    investment: {
      index: true,
      ref: "ClientInvestment",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
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
