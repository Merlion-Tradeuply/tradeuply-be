import { Balance } from "../models/balance.model.js";
import { Client } from "../models/client.model.js";
import { RefreshSession } from "../models/refresh-session.model.js";
import { AppError } from "../utils/app-error.js";
import { getClientBalance } from "./balance.service.js";
import {
  getClientLedger,
  listClientDeposits,
} from "./deposit.service.js";

function serializeClient(client, balance) {
  return {
    balance: balance?.availableBalance?.toString() ?? "0",
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

export async function listManagedClients({ query = "", status = "all" }) {
  const filter = { deletedAt: null };
  const normalizedQuery = query.trim();

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

  const clients = await Client.find(filter).sort({ createdAt: -1 });
  const balances = await Balance.find({
    client: { $in: clients.map((client) => client._id) },
    currency: "USDT",
  });
  const balancesByClient = new Map(
    balances.map((balance) => [balance.client.toString(), balance]),
  );

  return clients.map((client) =>
    serializeClient(client, balancesByClient.get(client.id)),
  );
}

export async function getManagedClient(clientId) {
  const client = await Client.findOne({ _id: clientId, deletedAt: null });

  if (!client) {
    throw new AppError("The client could not be found.", {
      code: "CLIENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  const [balance, deposits, transactions] = await Promise.all([
    getClientBalance(client._id),
    listClientDeposits(client._id),
    getClientLedger(client._id),
  ]);

  return {
    balance,
    client: serializeClient(client, { availableBalance: balance.availableBalance }),
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

    const balance = await Balance.findOne({ client: client._id, currency: "USDT" });
    return serializeClient(client, balance);
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
