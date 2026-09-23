import { PaymentMethod } from "../models/payment-method.model.js";
import { AppError } from "../utils/app-error.js";
import {
  buildUploadFolder,
  createSignedImageUpload,
  deleteUploadedFile,
  getUploadResourceType,
  uploadFile,
  verifySignedImageUpload,
} from "./upload.service.js";

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

export async function getClientPaymentMethods() {
  const methods = await PaymentMethod.find({
    category: { $in: ["crypto", "wallet"] },
    deletedAt: null,
    status: { $ne: "disabled" },
  }).sort({ displayOrder: 1 });
  return methods.map((method) => serializeMethod(method));
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getAdminPaymentMethods({
  category,
  limit = 10,
  page = 1,
  q,
  sort,
  status,
} = {}) {
  const filter = { deletedAt: null };
  const skip = (page - 1) * limit;

  if (category) filter.category = category;
  if (status) filter.status = status;
  if (q) {
    const searchExpression = new RegExp(escapeRegularExpression(q), "i");
    filter.$or = ["name", "code", "asset", "network"].map((field) => ({
      [field]: searchExpression,
    }));
  }

  const sortOptions = {
    "display-order": { displayOrder: 1, name: 1 },
    "name-asc": { name: 1 },
    "name-desc": { name: -1 },
  };
  const [methods, statusCounts, total] = await Promise.all([
    PaymentMethod.find(filter)
      .sort(sortOptions[sort] ?? sortOptions["display-order"])
      .skip(skip)
      .limit(limit),
    PaymentMethod.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    PaymentMethod.countDocuments(filter),
  ]);
  const summary = { active: 0, all: 0, coming_soon: 0, disabled: 0 };

  for (const item of statusCounts) {
    if (item._id in summary) summary[item._id] = item.count;
    summary.all += item.count;
  }

  return {
    methods: methods.map((method) => serializeMethod(method, true)),
    pagination: {
      limit,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    },
    summary,
  };
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

  if (
    !["crypto", "wallet"].includes(method.category) ||
    !method.asset ||
    !method.walletAddress ||
    !method.network ||
    !method.qrCodeUrl
  ) {
    throw new AppError("This payment method has not been fully configured.", {
      code: "PAYMENT_METHOD_NOT_CONFIGURED",
      statusCode: 409,
    });
  }

  return method;
}

async function getQrPaymentMethod(methodId) {
  const method = await PaymentMethod.findOne({ _id: methodId, deletedAt: null });

  if (!method) {
    throw new AppError("The payment method could not be found.", {
      code: "PAYMENT_METHOD_NOT_FOUND",
      statusCode: 404,
    });
  }

  if (!["crypto", "wallet"].includes(method.category)) {
    throw new AppError(
      "QR image upload is available only for cryptocurrency and digital wallet payment methods.",
      {
        code: "QR_UPLOAD_NOT_SUPPORTED",
        statusCode: 400,
      },
    );
  }

  return method;
}

export async function createPaymentMethodQrUploadSignature(methodId) {
  const method = await getQrPaymentMethod(methodId);

  return createSignedImageUpload({
    folder: buildUploadFolder("payment-methods", method.code, "qr-code"),
    publicId: "receiving-wallet-qr",
  });
}

export async function completePaymentMethodQrUpload(methodId, uploadResponse) {
  const method = await getQrPaymentMethod(methodId);
  const folder = buildUploadFolder("payment-methods", method.code, "qr-code");
  const asset = verifySignedImageUpload({
    ...uploadResponse,
    expectedPublicId: `${folder}/receiving-wallet-qr`,
  });

  method.qrCodePublicId = asset.publicId;
  method.qrCodeUrl = asset.secureUrl;
  await method.save();

  return { asset, method: serializeMethod(method, true) };
}

export async function uploadPaymentMethodQrCode(methodId, file) {
  const method = await getQrPaymentMethod(methodId);

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
