import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildUploadFolder,
  getUploadResourceType,
} from "../src/services/upload.service.js";

describe("upload service", () => {
  it("builds a safe dynamic Cloudinary folder", () => {
    assert.equal(
      buildUploadFolder("Payment Methods", "USDT", "QR Code"),
      "tradeuply/payment-methods/usdt/qr-code",
    );
    assert.equal(
      buildUploadFolder("../../Payment Methods", "../USDT"),
      "tradeuply/payment-methods/usdt",
    );
  });

  it("recognizes supported image and document resource types", () => {
    assert.equal(getUploadResourceType("image/png"), "image");
    assert.equal(getUploadResourceType("application/pdf"), "raw");
  });

  it("rejects unsupported file types", () => {
    assert.throws(
      () => getUploadResourceType("application/javascript"),
      (error) => error.code === "UNSUPPORTED_FILE_TYPE" && error.statusCode === 415,
    );
  });
});
