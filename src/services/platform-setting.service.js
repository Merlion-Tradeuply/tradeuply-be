import { PaymentMethod } from "../models/payment-method.model.js";
import { PlatformSetting } from "../models/platform-setting.model.js";
import { AppError } from "../utils/app-error.js";

const legacyFields = {
  allowDeposits: "", allowInvestments: "", allowWithdrawals: "", defaultCurrency: "",
  maintenanceMode: "", notificationEmail: "", platformName: "", supportEmail: "", timezone: "",
};

function serializeSettings(settings) {
  return {
    signupBonusAmountUsd: settings.signupBonusAmountUsd?.toString() ?? "0",
    signupBonusAsset: settings.signupBonusAsset,
    signupBonusEnabled: settings.signupBonusEnabled,
    updatedAt: settings.updatedAt,
  };
}

async function findOrCreateSettings() {
  await PlatformSetting.collection.updateOne(
    { singletonKey: "platform" },
    { $unset: legacyFields },
  );
  return PlatformSetting.findOneAndUpdate(
    { singletonKey: "platform" },
    { $setOnInsert: { singletonKey: "platform" } },
    { returnDocument: "after", setDefaultsOnInsert: true, upsert: true },
  );
}

async function assertAvailableBonusAsset(asset) {
  if (!asset) return;
  const method = await PaymentMethod.exists({ asset, category: "crypto", deletedAt: null, status: "active" });
  if (!method) {
    throw new AppError("Select a cryptocurrency from an active payment method.", {
      code: "BONUS_ASSET_UNAVAILABLE", statusCode: 422,
    });
  }
}

export async function getPlatformSettings() {
  return serializeSettings(await findOrCreateSettings());
}

export async function updatePlatformSettings(payload, userId) {
  if (payload.signupBonusEnabled) await assertAvailableBonusAsset(payload.signupBonusAsset);
  await PlatformSetting.collection.updateOne(
    { singletonKey: "platform" },
    { $unset: legacyFields },
  );
  const settings = await PlatformSetting.findOneAndUpdate(
    { singletonKey: "platform" },
    {
      $set: {
        signupBonusAmountUsd: payload.signupBonusAmountUsd,
        signupBonusAsset: payload.signupBonusAsset,
        signupBonusEnabled: payload.signupBonusEnabled,
        updatedBy: userId,
      },
      $setOnInsert: { singletonKey: "platform" },
    },
    { returnDocument: "after", runValidators: true, setDefaultsOnInsert: true, upsert: true },
  );
  return serializeSettings(settings);
}

export async function getSignupBonusOffer() {
  const settings = await findOrCreateSettings();
  const amountUsd = Number(settings.signupBonusAmountUsd?.toString() ?? 0);
  if (!settings.signupBonusEnabled || amountUsd < 0.01 || !settings.signupBonusAsset) return null;
  const available = await PaymentMethod.exists({
    asset: settings.signupBonusAsset,
    category: "crypto",
    deletedAt: null,
    status: "active",
  });
  if (!available) return null;
  return { amountUsd, asset: settings.signupBonusAsset, configuredAt: new Date() };
}
