import mongoose from "mongoose";

const moneyField = { default: 0, min: 0, type: mongoose.Schema.Types.Decimal128 };

const balanceSchema = new mongoose.Schema(
  {
    availableBalance: moneyField,
    client: {
      ref: "Client",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    currency: { maxlength: 20, required: true, trim: true, type: String },
    lastTransactionAt: { default: null, type: Date },
    lockedBalance: moneyField,
    totalDeposited: moneyField,
    totalWithdrawn: moneyField,
  },
  { timestamps: true, versionKey: false },
);

balanceSchema.index({ client: 1, currency: 1 }, { unique: true });

export const Balance = mongoose.models.Balance ?? mongoose.model("Balance", balanceSchema);
