import mongoose from "mongoose";

const clientInvestmentSchema = new mongoose.Schema(
  {
    client: {
      index: true,
      ref: "Client",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    plan: {
      ref: "InvestmentPlan",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    planSnapshot: {
      allocation: { required: true, type: String },
      dailyObjective: { required: true, type: Number },
      horizonDays: { required: true, type: Number },
      name: { required: true, type: String },
      risk: { required: true, type: String },
      slug: { required: true, type: String },
    },
    amountUsd: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    projectedProfitUsd: {
      min: 0,
      required: true,
      type: mongoose.Schema.Types.Decimal128,
    },
    projectedTotalUsd: {
      min: 0,
      required: true,
      type: mongoose.Schema.Types.Decimal128,
    },
    walletCurrency: { maxlength: 20, required: true, trim: true, type: String },
    walletAmount: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    exchangeRate: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    rateSource: { maxlength: 40, required: true, trim: true, type: String },
    rateQuotedAt: { required: true, type: Date },
    quoteExpiresAt: { required: true, type: Date },
    requestId: { required: true, type: String },
    startsAt: { required: true, type: Date },
    maturesAt: { required: true, type: Date },
    capitalReturnedAt: { default: null, type: Date },
    status: {
      default: "active",
      enum: ["active", "matured", "completed", "cancelled"],
      index: true,
      type: String,
    },
  },
  { timestamps: true, versionKey: false },
);

clientInvestmentSchema.index({ client: 1, createdAt: -1 });
clientInvestmentSchema.index({ client: 1, requestId: 1 }, { unique: true });

export const ClientInvestment =
  mongoose.models.ClientInvestment ??
  mongoose.model("ClientInvestment", clientInvestmentSchema);
