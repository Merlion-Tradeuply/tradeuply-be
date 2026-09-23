import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Client } from "../models/client.model.js";
import { DepositActivity } from "../models/deposit-activity.model.js";
import { Deposit } from "../models/deposit.model.js";
import { AppError } from "../utils/app-error.js";
import { creditDepositBalance } from "./balance.service.js";
import { convertCurrency } from "./currency.service.js";
import { getActivePaymentMethod } from "./payment-method.service.js";
import {
  sendDepositReviewedEmail,
  sendDepositSubmittedEmails,
} from "./email.service.js";

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
    asset: deposit.asset,
    client,
    clientNotes: deposit.clientNotes,
    convertedAmount: deposit.convertedAmount?.toString() ?? null,
    convertedAsset: deposit.convertedAsset ?? null,
    createdAt: deposit.createdAt,
    destinationWalletAddress: deposit.destinationWalletAddress,
    id: deposit.id,
    methodCode: deposit.methodCode,
    methodName: deposit.methodName,
    network: deposit.network,
    paymentCategory: deposit.paymentCategory ?? "crypto",
    exchangeRate: deposit.exchangeRate?.toString() ?? null,
    quoteExpiresAt: deposit.quoteExpiresAt,
    rateQuotedAt: deposit.rateQuotedAt,
    rateSource: deposit.rateSource ?? null,
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

export async function submitDeposit(client, payload, request) {
  const method = await getActivePaymentMethod(payload.paymentMethodId);
  const asset = method.asset.trim().toUpperCase();

  if (method.minimumAmount !== null && payload.amount < method.minimumAmount) {
    throw new AppError(`The minimum deposit is ${method.minimumAmount} ${asset}.`, {
      code: "DEPOSIT_BELOW_MINIMUM",
      statusCode: 422,
    });
  }

  if (method.maximumAmount !== null && payload.amount > method.maximumAmount) {
    throw new AppError(`The maximum deposit is ${method.maximumAmount} ${asset}.`, {
      code: "DEPOSIT_ABOVE_MAXIMUM",
      statusCode: 422,
    });
  }

  const depositId = new mongoose.Types.ObjectId();

  try {
    const deposit = await Deposit.create({
      _id: depositId,
      amount: payload.amount.toFixed(8),
      asset,
      client: client._id,
      clientNotes: payload.notes,
      destinationWalletAddress: method.walletAddress,
      methodCode: method.code,
      methodName: method.name,
      network: method.network,
      paymentCategory: method.category,
      paymentMethod: method._id,
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

    const serializedDeposit = serializeDeposit(deposit, [activity]);
    await sendDepositSubmittedEmails({
      client,
      deposit: serializedDeposit,
    }).catch((error) => {
      console.error("Deposit notifications could not be sent.", {
        depositId: deposit.id,
        message: error.message,
      });
    });

    return serializedDeposit;
  } catch (error) {
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

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getAdminDepositSearchFilter(query) {
  if (!query) return null;

  const expression = new RegExp(escapeRegularExpression(query), "i");
  const clients = await Client.find({
    $or: [
      { email: expression },
      { firstName: expression },
      { lastName: expression },
    ],
  })
    .select("_id")
    .lean();
  const options = [
    { asset: expression },
    { client: { $in: clients.map((client) => client._id) } },
    { methodName: expression },
    { network: expression },
    { senderWalletAddress: expression },
    { transactionHash: expression },
  ];

  if (/^\d+(\.\d+)?$/.test(query)) {
    options.push({ amount: mongoose.Types.Decimal128.fromString(query) });
  }

  return { $or: options };
}

export async function listAdminDeposits({
  limit = 10,
  page = 1,
  q = "",
  status = "all",
} = {}) {
  const filter = {};
  const skip = (page - 1) * limit;

  if (status !== "all") filter.status = status;
  const searchFilter = await getAdminDepositSearchFilter(q);
  if (searchFilter) Object.assign(filter, searchFilter);

  const [deposits, statusCounts, total] = await Promise.all([
    Deposit.find(filter)
      .populate("client", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Deposit.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Deposit.countDocuments(filter),
  ]);
  const summary = { all: 0, approved: 0, pending: 0, rejected: 0 };

  for (const item of statusCounts) {
    if (item._id in summary) summary[item._id] = item.count;
    summary.all += item.count;
  }

  return {
    deposits: deposits.map((deposit) => serializeDeposit(deposit)),
    pagination: {
      limit,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    },
    summary,
  };
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

async function getDepositConversion(deposit, paymentMethodId) {
  if ((deposit.paymentCategory ?? "crypto") !== "wallet") {
    throw new AppError("Only digital wallet deposits require conversion.", {
      code: "DEPOSIT_CONVERSION_NOT_REQUIRED",
      statusCode: 409,
    });
  }

  const targetMethod = await getActivePaymentMethod(paymentMethodId);
  if (targetMethod.category !== "crypto" || !targetMethod.asset) {
    throw new AppError("Select an active cryptocurrency payment method.", {
      code: "CRYPTO_PAYMENT_METHOD_REQUIRED",
      statusCode: 422,
    });
  }

  const conversion = await convertCurrency(
    deposit.asset,
    targetMethod.asset,
    Number(deposit.amount.toString()),
  );
  return { conversion, targetMethod };
}

export async function getAdminDepositConversionQuote(depositId, paymentMethodId) {
  const deposit = await Deposit.findOne({ _id: depositId, status: "pending" });
  if (!deposit) {
    throw new AppError("The pending deposit could not be found.", {
      code: "DEPOSIT_NOT_FOUND",
      statusCode: 404,
    });
  }
  const { conversion, targetMethod } = await getDepositConversion(
    deposit,
    paymentMethodId,
  );
  return {
    ...conversion,
    paymentMethod: {
      asset: targetMethod.asset,
      id: targetMethod.id,
      name: targetMethod.name,
      network: targetMethod.network,
    },
  };
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
      let conversion = null;
      if (nextStatus === "approved" && (deposit.paymentCategory ?? "crypto") === "wallet") {
        if (!payload.creditPaymentMethodId) {
          throw new AppError("Select the cryptocurrency wallet to credit.", {
            code: "CREDIT_PAYMENT_METHOD_REQUIRED",
            statusCode: 422,
          });
        }
        ({ conversion } = await getDepositConversion(
          deposit,
          payload.creditPaymentMethodId,
        ));
        deposit.convertedAmount = mongoose.Types.Decimal128.fromString(
          String(conversion.convertedAmount),
        );
        deposit.convertedAsset = conversion.to.code;
        deposit.exchangeRate = mongoose.Types.Decimal128.fromString(
          String(conversion.rate),
        );
        deposit.quoteExpiresAt = new Date(conversion.quoteExpiresAt);
        deposit.rateQuotedAt = new Date(conversion.lastUpdated);
        deposit.rateSource = conversion.source;
      }
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
        await creditDepositBalance(deposit, session, conversion);
        await DepositActivity.create(
          [
            {
              actorId: user._id,
              actorLabel: `${user.firstName} ${user.lastName}`,
              actorType: "internal",
              deposit: deposit._id,
              event: "balance_credited",
              metadata: {
                amount: String(conversion?.convertedAmount ?? deposit.amount.toString()),
                currency: conversion?.to.code ?? deposit.asset,
                ...(conversion && {
                  exchangeRate: String(conversion.rate),
                  sourceAmount: deposit.amount.toString(),
                  sourceCurrency: deposit.asset,
                }),
              },
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

  const client = await Client.findById(result.client).lean();
  if (client) {
    await sendDepositReviewedEmail({
      client,
      deposit: serializeDeposit(result),
    }).catch((error) => {
      console.error("Deposit review notification could not be sent.", {
        depositId: result.id,
        message: error.message,
      });
    });
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
