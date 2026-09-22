import { PaymentMethod } from "../models/payment-method.model.js";
import { AppError } from "../utils/app-error.js";
import {
  buildUploadFolder,
  deleteUploadedFile,
  getUploadResourceType,
  uploadFile,
} from "./upload.service.js";

const defaultPaymentMethods = [
  { category: "card", code: "debit-card", displayOrder: 10, name: "Debit Card" },
  { category: "card", code: "credit-card", displayOrder: 20, name: "Credit Card" },
  { category: "wallet", code: "google-pay", displayOrder: 30, name: "Google Pay" },
  { category: "wallet", code: "apple-pay", displayOrder: 40, name: "Apple Pay" },
  { category: "bank", code: "upi-qr", displayOrder: 50, name: "UPI QR Code" },
  { asset: "BTC", category: "crypto", code: "bitcoin", displayOrder: 60, name: "Bitcoin" },
  {
    asset: "USDT",
    category: "crypto",
    code: "usdt",
    displayOrder: 70,
    instructions: "Send only USDT using the displayed network and keep your transaction hash.",
    name: "USDT (Tether)",
    network: "TRC20",
    status: "active",
  },
];

function serializeMethod(method, includeAdminFields = false) {
  const result = {
    asset: method.asset,
    category: method.category,
    code: method.code,
    displayOrder: method.displayOrder,
    id: method.id,
    instructions: method.instructions,
    maximumAmount: method.maximumAmount,
    minimumAmount: method.minimumAmount,
    name: method.name,
    network: method.network,
    qrCodeUrl: method.qrCodeUrl,
    status: method.status,
  };

  if (includeAdminFields || method.status === "active") {
    result.walletAddress = method.walletAddress;
  }

  return result;
}

export async function ensureDefaultPaymentMethods() {
  await Promise.all(
    defaultPaymentMethods.map((method) =>
      PaymentMethod.updateOne(
        { code: method.code },
        { $setOnInsert: { status: "coming_soon", ...method } },
        { upsert: true },
      ),
    ),
  );
}

export async function getClientPaymentMethods() {
  await ensureDefaultPaymentMethods();
  const methods = await PaymentMethod.find({
    deletedAt: null,
    status: { $ne: "disabled" },
  }).sort({ displayOrder: 1 });
  return methods.map((method) => serializeMethod(method));
}

export async function getAdminPaymentMethods() {
  await ensureDefaultPaymentMethods();
  const methods = await PaymentMethod.find({ deletedAt: null }).sort({ displayOrder: 1 });
  return methods.map((method) => serializeMethod(method, true));
}

export async function createPaymentMethod(payload) {
  try {
    const deletedMethod = await PaymentMethod.findOne({
      code: payload.code,
      deletedAt: { $ne: null },
    });

    if (deletedMethod) {
      deletedMethod.set({
        ...payload,
        deletedAt: null,
        qrCodePublicId: null,
        qrCodeUrl: null,
      });
      await deletedMethod.save();
      return serializeMethod(deletedMethod, true);
    }

    const method = await PaymentMethod.create(payload);
    return serializeMethod(method, true);
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("A payment method with this code already exists.", {
        code: "PAYMENT_METHOD_EXISTS",
        statusCode: 409,
      });
    }
    throw error;
  }
}

export async function updatePaymentMethod(methodId, payload) {
  const method = await PaymentMethod.findOneAndUpdate(
    { _id: methodId, deletedAt: null },
    { $set: payload },
    { new: true, runValidators: true },
  );

  if (!method) {
    throw new AppError("The payment method could not be found.", {
      code: "PAYMENT_METHOD_NOT_FOUND",
      statusCode: 404,
    });
  }

  return serializeMethod(method, true);
}

export async function deletePaymentMethods(methodIds) {
  const methods = await PaymentMethod.find({
    _id: { $in: methodIds },
    deletedAt: null,
  });

  if (methods.length === 0) {
    throw new AppError("No payment methods were found for deletion.", {
      code: "PAYMENT_METHODS_NOT_FOUND",
      statusCode: 404,
    });
  }

  await PaymentMethod.updateMany(
    { _id: { $in: methods.map((method) => method.id) } },
    { $set: { deletedAt: new Date(), status: "disabled" } },
  );

  await Promise.allSettled(
    methods
      .filter((method) => method.qrCodePublicId)
      .map((method) => deleteUploadedFile(method.qrCodePublicId)),
  );

  return { deletedCount: methods.length };
}

export async function getActivePaymentMethod(methodId) {
  const method = await PaymentMethod.findOne({
    _id: methodId,
    deletedAt: null,
    status: "active",
  });

  if (!method) {
    throw new AppError("This payment method is not currently available.", {
      code: "PAYMENT_METHOD_UNAVAILABLE",
      statusCode: 400,
    });
  }

  if (!method.walletAddress || !method.network || !method.qrCodeUrl) {
    throw new AppError("This payment method has not been fully configured.", {
      code: "PAYMENT_METHOD_NOT_CONFIGURED",
      statusCode: 409,
    });
  }

  return method;
}

export async function uploadPaymentMethodQrCode(methodId, file) {
  const method = await PaymentMethod.findOne({ _id: methodId, deletedAt: null });

  if (!method) {
    throw new AppError("The payment method could not be found.", {
      code: "PAYMENT_METHOD_NOT_FOUND",
      statusCode: 404,
    });
  }

  if (method.code !== "usdt") {
    throw new AppError("QR image upload is currently available only for USDT.", {
      code: "QR_UPLOAD_NOT_SUPPORTED",
      statusCode: 400,
    });
  }

  if (!file) {
    throw new AppError("Select a QR code image to upload.", {
      code: "QR_IMAGE_REQUIRED",
      statusCode: 400,
    });
  }

  if (getUploadResourceType(file.mimetype) !== "image") {
    throw new AppError("The QR code must be a PNG, JPEG, or WebP image.", {
      code: "QR_IMAGE_TYPE_REQUIRED",
      statusCode: 415,
    });
  }

  const asset = await uploadFile({
    buffer: file.buffer,
    folder: buildUploadFolder("payment-methods", method.code, "qr-code"),
    mimeType: file.mimetype,
    publicId: "receiving-wallet-qr",
  });

  method.qrCodePublicId = asset.publicId;
  method.qrCodeUrl = asset.secureUrl;
  await method.save();

  return { asset, method: serializeMethod(method, true) };
}
