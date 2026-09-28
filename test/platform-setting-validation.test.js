import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { updatePlatformSettingsSchema } from "../src/validators/platform-setting.validator.js";

describe("bonus configuration validation", () => {
  it("accepts a complete enabled signup bonus", () => {
    const result = updatePlatformSettingsSchema.safeParse({ signupBonusAmountUsd: 25, signupBonusAsset: "ETH", signupBonusEnabled: true });
    assert.equal(result.success, true);
  });

  it("requires an amount and asset while enabled", () => {
    const result = updatePlatformSettingsSchema.safeParse({ signupBonusAmountUsd: 0, signupBonusAsset: null, signupBonusEnabled: true });
    assert.equal(result.success, false);
  });

  it("allows the signup bonus to be disabled", () => {
    const result = updatePlatformSettingsSchema.safeParse({ signupBonusAmountUsd: 0, signupBonusAsset: null, signupBonusEnabled: false });
    assert.equal(result.success, true);
  });
});
