import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Balance } from "../models/balance.model.js";
import { ClientPaymentMethod } from "../models/client-payment-method.model.js";
import { Client } from "../models/client.model.js";
import { WithdrawalActivity } from "../models/withdrawal-activity.model.js";
import { Withdrawal } from "../models/withdrawal.model.js";
import { AppError } from "../utils/app-error.js";
import { sendWithdrawalReviewedEmail, sendWithdrawalSubmittedEmails } from "./email.service.js";

const precision = 8;
function toUnits(value) {
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(`${whole}${fraction.padEnd(precision, "0").slice(0, precision)}`);
}
function fromUnits(value) {
  const negative = value < 0n;
  const raw = (negative ? -value : value).toString().padStart(precision + 1, "0");
  const whole = raw.slice(0, -precision);
  const fraction = raw.slice(-precision).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}
function decimal(value) {
  return mongoose.Types.Decimal128.fromString(fromUnits(value));
}
function context(request) {
  return { ipAddress: request.ip ?? "", userAgent: request.get("user-agent") ?? "" };
}
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
export function serializeWithdrawal(withdrawal, activities = []) {
  const client = withdrawal.client?.email ? {
    email: withdrawal.client.email,
    firstName: withdrawal.client.firstName,
    id: withdrawal.client.id,
    lastName: withdrawal.client.lastName,
  } : undefined;
  return {
    activities: activities.map(serializeActivity),
    amount: withdrawal.amount.toString(),
    asset: withdrawal.asset,
    client,
    createdAt: withdrawal.createdAt,
    destinationLabel: withdrawal.destinationLabel,
    destinationNetwork: withdrawal.destinationNetwork,
    destinationWalletAddress: withdrawal.destinationWalletAddress,
    id: withdrawal.id,
    paymentMethodId: withdrawal.paymentMethod.toString(),
    reviewNotes: withdrawal.reviewNotes,
    reviewedAt: withdrawal.reviewedAt,
    status: withdrawal.status,
    updatedAt: withdrawal.updatedAt,
  };
}

export async function submitWithdrawal(client, payload, request) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const method = await ClientPaymentMethod.findOne({ _id: payload.paymentMethodId, client: client._id }).session(session);
      if (!method) throw new AppError("Select one of your saved payment methods.", { code: "PAYMENT_METHOD_NOT_FOUND", statusCode: 404 });

      const asset = method.asset.trim().toUpperCase();
      const balance = await Balance.findOne({ client: client._id, currency: asset }).session(session);
      const requested = toUnits(payload.amount.toFixed(8));
      const available = toUnits(balance?.availableBalance?.toString() ?? "0");
      if (!balance || requested > available) {
        throw new AppError(`Your available ${asset} balance is insufficient.`, { code: "INSUFFICIENT_BALANCE", statusCode: 422 });
      }

      const [withdrawal] = await Withdrawal.create([{
        amount: decimal(requested),
        asset,
        client: client._id,
        destinationLabel: method.label,
        destinationNetwork: method.network,
        destinationWalletAddress: method.walletAddress,
        paymentMethod: method._id,
        requestId: payload.requestId,
      }], { session });

      balance.availableBalance = decimal(available - requested);
      balance.lockedBalance = decimal(toUnits(balance.lockedBalance?.toString() ?? "0") + requested);
      await balance.save({ session });

      await WithdrawalActivity.create([
        { actorId: client._id, actorLabel: `${client.firstName} ${client.lastName}`, actorType: "client", event: "submitted", newStatus: "pending", withdrawal: withdrawal._id, ...context(request) },
        { actorType: "system", event: "balance_reserved", metadata: { amount: withdrawal.amount.toString(), asset }, newStatus: "pending", withdrawal: withdrawal._id },
      ], { session });
      result = withdrawal;
    });
  } catch (error) {
    if (error?.code === 11000) throw new AppError("This withdrawal request was already submitted.", { code: "DUPLICATE_WITHDRAWAL", statusCode: 409 });
    throw error;
  } finally {
    await session.endSession();
  }

  const serialized = serializeWithdrawal(result);
  await sendWithdrawalSubmittedEmails({ client, withdrawal: serialized }).catch((error) => console.error("Withdrawal notifications could not be sent.", { message: error.message, withdrawalId: result.id }));
  return serialized;
}

export async function listClientWithdrawals(clientId) {
  const rows = await Withdrawal.find({ client: clientId }).sort({ createdAt: -1 });
  return rows.map((row) => serializeWithdrawal(row));
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
export async function listAdminWithdrawals({ limit = 10, page = 1, q = "", status = "all" } = {}) {
  const filter = {};
  if (status !== "all") filter.status = status;
  if (q) {
    const expression = new RegExp(escapeRegex(q), "i");
    const clients = await Client.find({ $or: [{ email: expression }, { firstName: expression }, { lastName: expression }] }).select("_id").lean();
    filter.$or = [{ asset: expression }, { destinationLabel: expression }, { destinationNetwork: expression }, { destinationWalletAddress: expression }, { client: { $in: clients.map((item) => item._id) } }];
  }
  const [rows, counts, total] = await Promise.all([
    Withdrawal.find(filter).populate("client", "firstName lastName email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Withdrawal.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Withdrawal.countDocuments(filter),
  ]);
  const summary = { all: 0, approved: 0, pending: 0, rejected: 0 };
  counts.forEach((item) => { if (item._id in summary) summary[item._id] = item.count; summary.all += item.count; });
  return { withdrawals: rows.map((row) => serializeWithdrawal(row)), pagination: { limit, page, pages: Math.max(1, Math.ceil(total / limit)), total }, summary };
}

export async function getAdminWithdrawal(id) {
  const row = await Withdrawal.findById(id).populate("client", "firstName lastName email");
  if (!row) throw new AppError("The withdrawal could not be found.", { code: "WITHDRAWAL_NOT_FOUND", statusCode: 404 });
  const activities = await WithdrawalActivity.find({ withdrawal: row._id }).sort({ createdAt: 1 });
  return serializeWithdrawal(row, activities);
}

export async function reviewWithdrawal(id, payload, user, request) {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const withdrawal = await Withdrawal.findOne({ _id: id, status: "pending" }).session(session);
      if (!withdrawal) {
        const existing = await Withdrawal.findById(id).session(session);
        throw new AppError(existing ? "This withdrawal has already been reviewed." : "The withdrawal could not be found.", { code: existing ? "WITHDRAWAL_ALREADY_REVIEWED" : "WITHDRAWAL_NOT_FOUND", statusCode: existing ? 409 : 404 });
      }
      const balance = await Balance.findOne({ client: withdrawal.client, currency: withdrawal.asset }).session(session);
      const amount = toUnits(withdrawal.amount.toString());
      const locked = toUnits(balance?.lockedBalance?.toString() ?? "0");
      if (!balance || locked < amount) throw new AppError("The reserved withdrawal balance is unavailable.", { code: "WITHDRAWAL_RESERVATION_MISSING", statusCode: 409 });

      const nextStatus = payload.action === "approve" ? "approved" : "rejected";
      withdrawal.status = nextStatus;
      withdrawal.reviewNotes = payload.notes;
      withdrawal.reviewedAt = new Date();
      withdrawal.reviewedBy = user._id;
      await withdrawal.save({ session });

      if (nextStatus === "approved") {
        const available = toUnits(balance.availableBalance.toString());
        const totalBefore = available + locked;
        balance.lockedBalance = decimal(locked - amount);
        balance.totalWithdrawn = decimal(toUnits(balance.totalWithdrawn?.toString() ?? "0") + amount);
        balance.lastTransactionAt = new Date();
        await balance.save({ session });
        await BalanceTransaction.create([{ amount: decimal(amount), balance: balance._id, balanceAfter: decimal(totalBefore - amount), balanceBefore: decimal(totalBefore), client: withdrawal.client, currency: withdrawal.asset, description: `Withdrawal to ${withdrawal.destinationLabel}`, direction: "debit", type: "withdrawal", withdrawal: withdrawal._id }], { session });
      } else {
        balance.lockedBalance = decimal(locked - amount);
        balance.availableBalance = decimal(toUnits(balance.availableBalance.toString()) + amount);
        await balance.save({ session });
      }

      await WithdrawalActivity.create([{ actorId: user._id, actorLabel: `${user.firstName} ${user.lastName}`, actorType: "internal", event: nextStatus, metadata: { notes: payload.notes }, newStatus: nextStatus, previousStatus: "pending", withdrawal: withdrawal._id, ...context(request) }, { actorType: "system", event: nextStatus === "approved" ? "balance_debited" : "balance_released", metadata: { amount: withdrawal.amount.toString(), asset: withdrawal.asset }, newStatus: nextStatus, withdrawal: withdrawal._id }], { session });
      result = withdrawal;
    });
  } finally { await session.endSession(); }

  const client = await Client.findById(result.client);
  const serialized = serializeWithdrawal(result);
  if (client) await sendWithdrawalReviewedEmail({ client, withdrawal: serialized }).catch((error) => console.error("Withdrawal review email could not be sent.", { message: error.message, withdrawalId: result.id }));
  return serialized;
}
