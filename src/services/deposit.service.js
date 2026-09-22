import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { DepositActivity } from "../models/deposit-activity.model.js";
import { Deposit } from "../models/deposit.model.js";
import { AppError } from "../utils/app-error.js";
import { creditDepositBalance } from "./balance.service.js";
import { getActivePaymentMethod } from "./payment-method.service.js";
import {
  buildUploadFolder,
  deleteUploadedFile,
  getUploadResourceType,
  uploadFile,
} from "./upload.service.js";

function serializeActivity(activity) {
  return {
    actorLabel: activity.actorLabel,
    actorType: activity.actorType,
    createdAt: activity.createdAt,
    event: activity.event,
    id: activity.id,
    metadata: activity.metadata,
    newStatus: activity.newStatus,
    previousStatus: activity.previousStatus,
  };
}

function serializeDeposit(deposit, activities = []) {
  const client = deposit.client && deposit.client.email
    ? {
        email: deposit.client.email,
        firstName: deposit.client.firstName,
        id: deposit.client.id,
        lastName: deposit.client.lastName,
      }
    : undefined;

  return {
    activities: activities.map(serializeActivity),
    amount: deposit.amount.toString(),
    client,
    clientNotes: deposit.clientNotes,
    createdAt: deposit.createdAt,
    destinationWalletAddress: deposit.destinationWalletAddress,
    id: deposit.id,
    methodCode: deposit.methodCode,
    methodName: deposit.methodName,
    network: deposit.network,
    paymentProofUrl: deposit.paymentProofUrl ?? null,
    reviewNotes: deposit.reviewNotes,
    reviewedAt: deposit.reviewedAt,
    senderWalletAddress: deposit.senderWalletAddress,
    status: deposit.status,
    transactionHash: deposit.transactionHash,
    updatedAt: deposit.updatedAt,
  };
}

function requestContext(request) {
  return {
    ipAddress: request.ip ?? "",
    userAgent: request.get("user-agent") ?? "",
  };
}

export async function submitDeposit(client, payload, request, paymentProof) {
  const method = await getActivePaymentMethod(payload.paymentMethodId);

  if (method.code !== "usdt") {
    throw new AppError("Only USDT deposits are currently accepted.", {
      code: "PAYMENT_METHOD_NOT_ACCEPTED",
      statusCode: 400,
    });
  }

  if (method.minimumAmount !== null && payload.amount < method.minimumAmount) {
    throw new AppError(`The minimum deposit is ${method.minimumAmount} USDT.`, {
      code: "DEPOSIT_BELOW_MINIMUM",
      statusCode: 422,
    });
  }

  if (method.maximumAmount !== null && payload.amount > method.maximumAmount) {
    throw new AppError(`The maximum deposit is ${method.maximumAmount} USDT.`, {
      code: "DEPOSIT_ABOVE_MAXIMUM",
      statusCode: 422,
    });
  }

  if (!paymentProof) {
    throw new AppError("Upload a screenshot of the completed payment.", {
      code: "PAYMENT_PROOF_REQUIRED",
      statusCode: 422,
    });
  }

  if (getUploadResourceType(paymentProof.mimetype) !== "image") {
    throw new AppError("The payment screenshot must be a PNG, JPEG, or WebP image.", {
      code: "PAYMENT_PROOF_IMAGE_REQUIRED",
      statusCode: 415,
    });
  }

  const depositId = new mongoose.Types.ObjectId();
  const proofAsset = await uploadFile({
    buffer: paymentProof.buffer,
    folder: buildUploadFolder("deposits", client.id, depositId.toString(), "payment-proof"),
    mimeType: paymentProof.mimetype,
    publicId: "transaction-screenshot",
  });

  try {
    const deposit = await Deposit.create({
      _id: depositId,
      amount: payload.amount.toFixed(8),
      client: client._id,
      clientNotes: payload.notes,
      destinationWalletAddress: method.walletAddress,
      methodCode: method.code,
      methodName: method.name,
      network: method.network,
      paymentMethod: method._id,
      paymentProofPublicId: proofAsset.publicId,
      paymentProofUrl: proofAsset.secureUrl,
      senderWalletAddress: payload.senderWalletAddress,
      transactionHash: payload.transactionHash,
    });

    const activity = await DepositActivity.create({
      actorId: client._id,
      actorLabel: `${client.firstName} ${client.lastName}`,
      actorType: "client",
      deposit: deposit._id,
      event: "submitted",
      newStatus: "pending",
      ...requestContext(request),
    });

    return serializeDeposit(deposit, [activity]);
  } catch (error) {
    await deleteUploadedFile(proofAsset.publicId).catch(() => undefined);

    if (error?.code === 11000) {
      throw new AppError("This transaction hash has already been submitted.", {
        code: "DUPLICATE_TRANSACTION_HASH",
        statusCode: 409,
      });
    }
    throw error;
  }
}

export async function listClientDeposits(clientId) {
  const deposits = await Deposit.find({ client: clientId }).sort({ createdAt: -1 });
  return deposits.map((deposit) => serializeDeposit(deposit));
}

export async function getClientDeposit(clientId, depositId) {
  const deposit = await Deposit.findOne({ _id: depositId, client: clientId });

  if (!deposit) {
    throw new AppError("The deposit could not be found.", {
      code: "DEPOSIT_NOT_FOUND",
      statusCode: 404,
    });
  }

  const activities = await DepositActivity.find({ deposit: deposit._id }).sort({ createdAt: 1 });
  return serializeDeposit(deposit, activities);
}

export async function listAdminDeposits(status) {
  const filter = status && status !== "all" ? { status } : {};
  const deposits = await Deposit.find(filter)
    .populate("client", "firstName lastName email")
    .sort({ createdAt: -1 });
  return deposits.map((deposit) => serializeDeposit(deposit));
}

export async function getAdminDeposit(depositId) {
  const deposit = await Deposit.findById(depositId).populate(
    "client",
    "firstName lastName email",
  );

  if (!deposit) {
    throw new AppError("The deposit could not be found.", {
      code: "DEPOSIT_NOT_FOUND",
      statusCode: 404,
    });
  }

  const activities = await DepositActivity.find({ deposit: deposit._id }).sort({ createdAt: 1 });
  return serializeDeposit(deposit, activities);
}

export async function reviewDeposit(depositId, payload, user, request) {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const deposit = await Deposit.findOne({ _id: depositId, status: "pending" }).session(session);

      if (!deposit) {
        const existing = await Deposit.findById(depositId).session(session);
        throw new AppError(
          existing ? "This deposit has already been reviewed." : "The deposit could not be found.",
          {
            code: existing ? "DEPOSIT_ALREADY_REVIEWED" : "DEPOSIT_NOT_FOUND",
            statusCode: existing ? 409 : 404,
          },
        );
      }

      const nextStatus = payload.action === "approve" ? "approved" : "rejected";
      deposit.status = nextStatus;
      deposit.reviewNotes = payload.notes;
      deposit.reviewedAt = new Date();
      deposit.reviewedBy = user._id;
      await deposit.save({ session });

      await DepositActivity.create(
        [
          {
            actorId: user._id,
            actorLabel: `${user.firstName} ${user.lastName}`,
            actorType: "internal",
            deposit: deposit._id,
            event: nextStatus,
            metadata: { notes: payload.notes },
            newStatus: nextStatus,
            previousStatus: "pending",
            ...requestContext(request),
          },
        ],
        { session },
      );

      if (nextStatus === "approved") {
        await creditDepositBalance(deposit, session);
        await DepositActivity.create(
          [
            {
              actorId: user._id,
              actorLabel: `${user.firstName} ${user.lastName}`,
              actorType: "internal",
              deposit: deposit._id,
              event: "balance_credited",
              metadata: { amount: deposit.amount.toString(), currency: "USDT" },
              newStatus: "approved",
            },
          ],
          { session },
        );
      }

      result = deposit;
    });
  } finally {
    await session.endSession();
  }

  return serializeDeposit(result);
}

export async function getClientLedger(clientId) {
  const transactions = await BalanceTransaction.find({
    client: clientId,
    deletedAt: null,
  }).sort({ createdAt: -1 });
  return transactions.map((transaction) => ({
    amount: transaction.amount.toString(),
    balanceAfter: transaction.balanceAfter.toString(),
    balanceBefore: transaction.balanceBefore.toString(),
    createdAt: transaction.createdAt,
    currency: transaction.currency,
    description: transaction.description,
    direction: transaction.direction,
    id: transaction.id,
    type: transaction.type,
  }));
}
