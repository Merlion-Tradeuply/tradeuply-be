import mongoose from "mongoose";

const clientPaymentMethodSchema = new mongoose.Schema(
  {
    asset: {
      maxlength: 20,
      required: true,
      trim: true,
      type: String,
      uppercase: true,
    },
    client: {
      index: true,
      ref: "Client",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    isDefault: { default: false, type: Boolean },
    label: { maxlength: 80, required: true, trim: true, type: String },
    network: { maxlength: 40, required: true, trim: true, type: String },
    qrCodePublicId: { default: null, maxlength: 300, trim: true, type: String },
    qrCodeUrl: { default: null, maxlength: 500, trim: true, type: String },
    walletAddress: { maxlength: 200, required: true, trim: true, type: String },
  },
  { timestamps: true, versionKey: false },
);

clientPaymentMethodSchema.index(
  { client: 1, network: 1, walletAddress: 1 },
  { unique: true },
);
clientPaymentMethodSchema.index({ client: 1, createdAt: -1 });

export const ClientPaymentMethod =
  mongoose.models.ClientPaymentMethod ??
  mongoose.model("ClientPaymentMethod", clientPaymentMethodSchema);
