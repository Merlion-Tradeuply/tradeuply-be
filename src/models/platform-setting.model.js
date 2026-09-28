import mongoose from "mongoose";

const platformSettingSchema = new mongoose.Schema(
  {
    singletonKey: { default: "platform", enum: ["platform"], immutable: true, type: String, unique: true },
    signupBonusAmountUsd: { default: 0, min: 0, type: mongoose.Schema.Types.Decimal128 },
    signupBonusAsset: { default: null, maxlength: 20, trim: true, type: String, uppercase: true },
    signupBonusEnabled: { default: false, type: Boolean },
    updatedBy: { default: null, ref: "User", type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false },
);

export const PlatformSetting = mongoose.models.PlatformSetting ?? mongoose.model("PlatformSetting", platformSettingSchema);
