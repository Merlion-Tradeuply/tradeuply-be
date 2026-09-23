import mongoose from "mongoose";

const balanceTransactionSchema = new mongoose.Schema(
  {
    amount: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    amountUsd: { min: 0, type: mongoose.Schema.Types.Decimal128 },
    balance: {
      ref: "Balance",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    balanceAfter: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    balanceBefore: { min: 0, required: true, type: mongoose.Schema.Types.Decimal128 },
    client: {
      index: true,
      ref: "Client",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    currency: { maxlength: 20, required: true, trim: true, type: String },
    deposit: {
      ref: "Deposit",
      type: mongoose.Schema.Types.ObjectId,
    },
    investment: {
      ref: "ClientInvestment",
      type: mongoose.Schema.Types.ObjectId,
    },
    withdrawal: {
      ref: "Withdrawal",
      type: mongoose.Schema.Types.ObjectId,
    },
    description: { maxlength: 250, required: true, trim: true, type: String },
    deletedAt: { default: null, index: true, type: Date },
    direction: { enum: ["credit", "debit"], required: true, type: String },
    exchangeRate: { min: 0, type: mongoose.Schema.Types.Decimal128 },
    investmentProfits: [
      { ref: "InvestmentProfit", type: mongoose.Schema.Types.ObjectId },
    ],
    quoteExpiresAt: { type: Date },
    rateQuotedAt: { type: Date },
    rateSource: { maxlength: 80, trim: true, type: String },
    requestId: { maxlength: 80, trim: true, type: String },
    type: {
      enum: [
        "deposit",
        "withdrawal",
        "adjustment",
        "investment",
        "capital_return",
        "profit_withdrawal",
      ],
      required: true,
      type: String,
    },
  },
  { timestamps: true, versionKey: false },
);

balanceTransactionSchema.index({ client: 1, createdAt: -1 });
balanceTransactionSchema.index(
  { client: 1, requestId: 1 },
  {
    name: "client_request_unique_when_present",
    partialFilterExpression: { requestId: { $type: "string" } },
    unique: true,
  },
);
balanceTransactionSchema.index(
  { deposit: 1 },
  {
    name: "deposit_unique_when_present",
    partialFilterExpression: { deposit: { $type: "objectId" } },
    unique: true,
  },
);
balanceTransactionSchema.index(
  { investment: 1, type: 1 },
  {
    name: "investment_type_unique_when_present",
    partialFilterExpression: { investment: { $type: "objectId" } },
    unique: true,
  },
);
balanceTransactionSchema.index(
  { withdrawal: 1 },
  {
    name: "withdrawal_unique_when_present",
    partialFilterExpression: { withdrawal: { $type: "objectId" } },
    unique: true,
  },
);

export const BalanceTransaction =
  mongoose.models.BalanceTransaction ??
  mongoose.model("BalanceTransaction", balanceTransactionSchema);
