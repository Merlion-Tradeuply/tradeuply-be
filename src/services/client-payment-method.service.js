import mongoose from "mongoose";

import { ClientPaymentMethod } from "../models/client-payment-method.model.js";
import { AppError } from "../utils/app-error.js";

function serializeClientPaymentMethod(method) {
  return {
    asset: method.asset,
    createdAt: method.createdAt,
    id: method.id,
    isDefault: method.isDefault,
    label: method.label,
    network: method.network,
    updatedAt: method.updatedAt,
    walletAddress: method.walletAddress,
  };
}

async function findOwnedPaymentMethod(clientId, methodId) {
  if (!mongoose.isValidObjectId(methodId)) {
    throw new AppError("The wallet payment method could not be found.", {
      code: "CLIENT_PAYMENT_METHOD_NOT_FOUND",
      statusCode: 404,
    });
  }

  const method = await ClientPaymentMethod.findOne({
    _id: methodId,
    client: clientId,
  });

  if (!method) {
    throw new AppError("The wallet payment method could not be found.", {
      code: "CLIENT_PAYMENT_METHOD_NOT_FOUND",
      statusCode: 404,
    });
  }

  return method;
}

async function unsetOtherDefaults(clientId, methodId) {
  await ClientPaymentMethod.updateMany(
    { _id: { $ne: methodId }, client: clientId, isDefault: true },
    { $set: { isDefault: false } },
  );
}

function throwDuplicateWallet(error) {
  if (error?.code !== 11000) throw error;
  throw new AppError("This wallet address is already saved for the selected network.", {
    code: "CLIENT_PAYMENT_METHOD_EXISTS",
    statusCode: 409,
  });
}

export async function listClientPaymentMethods(clientId) {
  const methods = await ClientPaymentMethod.find({ client: clientId }).sort({
    isDefault: -1,
    createdAt: -1,
  });
  return methods.map(serializeClientPaymentMethod);
}

export async function createClientPaymentMethod(clientId, payload) {
  try {
    const count = await ClientPaymentMethod.countDocuments({ client: clientId });
    const method = await ClientPaymentMethod.create({
      ...payload,
      client: clientId,
      isDefault: payload.isDefault ?? count === 0,
    });

    if (method.isDefault) await unsetOtherDefaults(clientId, method._id);
    return serializeClientPaymentMethod(method);
  } catch (error) {
    throwDuplicateWallet(error);
  }
}

export async function updateClientPaymentMethod(clientId, methodId, payload) {
  const method = await findOwnedPaymentMethod(clientId, methodId);

  try {
    Object.assign(method, payload);
    await method.save();
    if (method.isDefault) await unsetOtherDefaults(clientId, method._id);
    return serializeClientPaymentMethod(method);
  } catch (error) {
    throwDuplicateWallet(error);
  }
}

export async function deleteClientPaymentMethod(clientId, methodId) {
  const method = await findOwnedPaymentMethod(clientId, methodId);
  const wasDefault = method.isDefault;

  await method.deleteOne();

  if (wasDefault) {
    const replacement = await ClientPaymentMethod.findOne({ client: clientId }).sort({
      createdAt: 1,
    });
    if (replacement) {
      replacement.isDefault = true;
      await replacement.save();
    }
  }

  return { deletedId: methodId };
}
