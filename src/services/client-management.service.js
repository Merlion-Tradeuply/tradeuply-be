import { Balance } from "../models/balance.model.js";
import { Client } from "../models/client.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../utils/app-error.js";
import { getClientBalances, serializeBalance } from "./balance.service.js";
import {
  getClientLedger,
  listClientDeposits,
} from "./deposit.service.js";

function serializeClient(client, balances = []) {
  return {
    balances,
    createdAt: client.createdAt,
    email: client.email,
    emailVerifiedAt: client.emailVerifiedAt,
    firstName: client.firstName,
    id: client.id,
    investmentProfile: client.investmentProfile,
    lastName: client.lastName,
    phone: client.phone,
    status: client.status,
    updatedAt: client.updatedAt,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listManagedClients({
  limit = 10,
  page = 1,
  query = "",
  status = "all",
} = {}) {
  const filter = { deletedAt: null };
  const normalizedQuery = query.trim();
  const skip = (page - 1) * limit;

  if (["pending_verification", "active", "suspended"].includes(status)) {
    filter.status = status;
  }

  if (normalizedQuery) {
    const searchPattern = new RegExp(escapeRegex(normalizedQuery), "i");
    filter.$or = [
      { email: searchPattern },
      { firstName: searchPattern },
      { lastName: searchPattern },
      { phone: searchPattern },
    ];
  }

  const [clients, summaryResult, total] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Client.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
          all: { $sum: 1 },
          pendingVerification: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending_verification"] }, 1, 0],
            },
          },
          suspended: {
            $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
          },
        },
      },
    ]),
    Client.countDocuments(filter),
  ]);
  const balances = await Balance.find({
    client: { $in: clients.map((client) => client._id) },
  }).sort({ currency: 1 });
  const balancesByClient = new Map();

  for (const balance of balances) {
    const clientId = balance.client.toString();
    const clientBalances = balancesByClient.get(clientId) ?? [];
    clientBalances.push(serializeBalance(balance));
    balancesByClient.set(clientId, clientBalances);
  }

  const summary = summaryResult[0];

  return {
    clients: clients.map((client) =>
      serializeClient(client, balancesByClient.get(client.id) ?? []),
    ),
    pagination: {
      limit,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    },
    summary: {
      active: summary?.active ?? 0,
      all: summary?.all ?? 0,
      pending_verification: summary?.pendingVerification ?? 0,
      suspended: summary?.suspended ?? 0,
    },
  };
}

export async function getManagedClient(clientId) {
  const client = await Client.findOne({ _id: clientId, deletedAt: null });

  if (!client) {
    throw new AppError("The client could not be found.", {
      code: "CLIENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  const [balances, deposits, transactions] = await Promise.all([
    getClientBalances(client._id),
    listClientDeposits(client._id),
    getClientLedger(client._id),
  ]);

  return {
    balances,
    client: serializeClient(client, balances),
    deposits,
    transactions,
  };
}

export async function updateManagedClient(clientId, payload) {
  const profileFields = ["experience", "investmentRange", "objective"];
  const update = {};

  for (const [key, value] of Object.entries(payload)) {
    update[profileFields.includes(key) ? `investmentProfile.${key}` : key] = value;
  }

  try {
    const client = await Client.findOneAndUpdate(
      { _id: clientId, deletedAt: null },
      { $set: update },
      { new: true, runValidators: true },
    );

    if (!client) {
      throw new AppError("The client could not be found.", {
        code: "CLIENT_NOT_FOUND",
        statusCode: 404,
      });
    }

    if (payload.status && payload.status !== "active") {
      await RefreshSession.updateMany(
        { accountId: client._id, accountType: "client", revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
    }

    const balances = await getClientBalances(client._id);
    return serializeClient(client, balances);
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("Another client already uses this phone number.", {
        code: "CLIENT_PHONE_EXISTS",
        statusCode: 409,
      });
    }
    throw error;
  }
}

export async function deleteManagedClients(clientIds) {
  const clients = await Client.find({
    _id: { $in: clientIds },
    deletedAt: null,
  }).select("_id");

  if (clients.length === 0) {
    throw new AppError("No clients were found for deletion.", {
      code: "CLIENTS_NOT_FOUND",
      statusCode: 404,
    });
  }

  const ids = clients.map((client) => client._id);
  const now = new Date();

  await Promise.all([
    Client.updateMany(
      { _id: { $in: ids } },
      { $set: { deletedAt: now, status: "suspended" } },
    ),
    RefreshSession.updateMany(
      { accountId: { $in: ids }, accountType: "client", revokedAt: null },
      { $set: { revokedAt: now } },
    ),
  ]);

  return { deletedCount: clients.length };
}
