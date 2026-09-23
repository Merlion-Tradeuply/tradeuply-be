import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Client } from "../models/client.model.js";
import { Deposit } from "../models/deposit.model.js";
import { AppError } from "../utils/app-error.js";

function serializeTransaction(transaction) {
  const client = transaction.client?.email
    ? {
        email: transaction.client.email,
        firstName: transaction.client.firstName,
        id: transaction.client.id,
        lastName: transaction.client.lastName,
      }
    : undefined;
  const deposit = transaction.deposit?.transactionHash
    ? {
        id: transaction.deposit.id,
        methodName: transaction.deposit.methodName,
        network: transaction.deposit.network,
        status: transaction.deposit.status,
        transactionHash: transaction.deposit.transactionHash,
      }
    : undefined;

  return {
    amount: transaction.amount.toString(),
    balanceAfter: transaction.balanceAfter.toString(),
    balanceBefore: transaction.balanceBefore.toString(),
    client,
    createdAt: transaction.createdAt,
    currency: transaction.currency,
    deposit,
    description: transaction.description,
    direction: transaction.direction,
    id: transaction.id,
    type: transaction.type,
  };
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getSearchFilter(query) {
  if (!query) return null;

  const expression = new RegExp(escapeRegularExpression(query), "i");
  const [clients, deposits] = await Promise.all([
    Client.find({
      $or: [
        { email: expression },
        { firstName: expression },
        { lastName: expression },
      ],
    })
      .select("_id")
      .lean(),
    Deposit.find({ transactionHash: expression }).select("_id").lean(),
  ]);
  const searchOptions = [
    { client: { $in: clients.map((client) => client._id) } },
    { deposit: { $in: deposits.map((deposit) => deposit._id) } },
    { description: expression },
    { currency: expression },
  ];

  if (/^\d+(\.\d+)?$/.test(query)) {
    const amount = mongoose.Types.Decimal128.fromString(query);
    searchOptions.push({ amount }, { balanceBefore: amount }, { balanceAfter: amount });
  }

  return { $or: searchOptions };
}

export async function listTransactions({ direction, q, type } = {}) {
  const filter = { deletedAt: null };

  if (direction) filter.direction = direction;
  if (type) filter.type = type;
  const searchFilter = await getSearchFilter(q);
  if (searchFilter) Object.assign(filter, searchFilter);

  const [transactions, summaryResult, depositedVolumes] = await Promise.all([
    BalanceTransaction.find(filter)
    .populate("client", "firstName lastName email")
    .populate("deposit", "methodName network status transactionHash")
      .sort({ createdAt: -1 }),
    BalanceTransaction.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          all: { $sum: 1 },
          credit: { $sum: { $cond: [{ $eq: ["$direction", "credit"] }, 1, 0] } },
          debit: { $sum: { $cond: [{ $eq: ["$direction", "debit"] }, 1, 0] } },
        },
      },
    ]),
    BalanceTransaction.aggregate([
      { $match: { $and: [filter, { type: "deposit" }] } },
      { $group: { _id: "$currency", total: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const totals = summaryResult[0];

  return {
    summary: {
      all: totals?.all ?? 0,
      credit: totals?.credit ?? 0,
      debit: totals?.debit ?? 0,
      depositedVolumes: depositedVolumes.map((item) => ({
        currency: item._id,
        total: item.total.toString(),
      })),
    },
    transactions: transactions.map(serializeTransaction),
  };
}

export async function deleteTransactions(transactionIds) {
  const result = await BalanceTransaction.updateMany(
    { _id: { $in: transactionIds }, deletedAt: null },
    { $set: { deletedAt: new Date() } },
  );

  if (result.modifiedCount === 0) {
    throw new AppError("No transactions were found for deletion.", {
      code: "TRANSACTIONS_NOT_FOUND",
      statusCode: 404,
    });
  }

  return { deletedCount: result.modifiedCount };
}
