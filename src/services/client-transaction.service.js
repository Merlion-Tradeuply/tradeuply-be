import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Deposit } from "../models/deposit.model.js";

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function transactionRoute(transaction) {
  const currencyWallet = `${transaction.currency} wallet`;
  const planName = transaction.investment?.planSnapshot?.name;

  if (transaction.type === "deposit") {
    return {
      destination: currencyWallet,
      source:
        transaction.deposit?.paymentCategory === "wallet"
          ? `${transaction.sourceCurrency ?? transaction.deposit.asset} UPI payment`
          : "External crypto wallet",
    };
  }
  if (transaction.type === "investment") {
    return {
      destination: planName ? `Investment · ${planName}` : "Investment fund",
      source: currencyWallet,
    };
  }
  if (transaction.type === "profit_withdrawal") {
    return { destination: currencyWallet, source: "Investment profit" };
  }
  if (transaction.type === "capital_return") {
    return {
      destination: currencyWallet,
      source: planName ? `Matured investment · ${planName}` : "Matured investment",
    };
  }
  if (transaction.type === "withdrawal") {
    return { destination: "External crypto wallet", source: currencyWallet };
  }
  return transaction.direction === "credit"
    ? { destination: currencyWallet, source: "Account adjustment" }
    : { destination: "Account adjustment", source: currencyWallet };
}

function serializeClientTransaction(transaction) {
  const route = transactionRoute(transaction);
  return {
    amount: transaction.amount.toString(),
    amountUsd: transaction.amountUsd?.toString() ?? null,
    balanceAfter: transaction.balanceAfter.toString(),
    balanceBefore: transaction.balanceBefore.toString(),
    createdAt: transaction.createdAt,
    currency: transaction.currency,
    description: transaction.description,
    destination: route.destination,
    direction: transaction.direction,
    exchangeRate: transaction.exchangeRate?.toString() ?? null,
    id: transaction.id,
    reference:
      transaction.deposit?.transactionHash ??
      transaction.requestId ??
      transaction.investment?.id ??
      transaction.id,
    source: route.source,
    sourceAmount: transaction.sourceAmount?.toString() ?? null,
    sourceCurrency: transaction.sourceCurrency ?? null,
    type: transaction.type,
  };
}

async function searchFilter(clientId, query) {
  if (!query) return null;
  const expression = new RegExp(escapeRegularExpression(query), "i");
  const deposits = await Deposit.find({
    client: clientId,
    transactionHash: expression,
  })
    .select("_id")
    .lean();
  return {
    $or: [
      { currency: expression },
      { description: expression },
      { deposit: { $in: deposits.map((deposit) => deposit._id) } },
      { requestId: expression },
    ],
  };
}

export async function listClientTransactions(clientId, filters) {
  const query = { client: clientId, deletedAt: null };
  if (filters.currency) query.currency = filters.currency;
  if (filters.direction) query.direction = filters.direction;
  if (filters.type) query.type = filters.type;
  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = new Date(`${filters.from}T00:00:00.000Z`);
    if (filters.to) query.createdAt.$lte = new Date(`${filters.to}T23:59:59.999Z`);
  }
  const textFilter = await searchFilter(clientId, filters.q);
  if (textFilter) Object.assign(query, textFilter);

  const skip = (filters.page - 1) * filters.limit;
  const [transactions, total, currencies, summary] = await Promise.all([
    BalanceTransaction.find(query)
      .populate("deposit", "asset paymentCategory transactionHash")
      .populate("investment", "planSnapshot")
      .sort({ createdAt: filters.sort === "oldest" ? 1 : -1 })
      .skip(skip)
      .limit(filters.limit),
    BalanceTransaction.countDocuments(query),
    BalanceTransaction.distinct("currency", {
      client: clientId,
      deletedAt: null,
    }),
    BalanceTransaction.aggregate([
      {
        $match: {
          client: new mongoose.Types.ObjectId(clientId),
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: null,
          credits: { $sum: { $cond: [{ $eq: ["$direction", "credit"] }, 1, 0] } },
          debits: { $sum: { $cond: [{ $eq: ["$direction", "debit"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);
  const totals = summary[0];

  return {
    currencies: currencies.sort(),
    pagination: {
      limit: filters.limit,
      page: filters.page,
      pages: Math.max(1, Math.ceil(total / filters.limit)),
      total,
    },
    summary: {
      credits: totals?.credits ?? 0,
      debits: totals?.debits ?? 0,
      total: totals?.total ?? 0,
    },
    transactions: transactions.map(serializeClientTransaction),
  };
}
