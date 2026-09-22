import { Client } from "../models/client.model.js";
import { AppError } from "../utils/app-error.js";
import { getClientBalance } from "../services/balance.service.js";
import {
  getAdminDeposit,
  getClientDeposit,
  getClientLedger,
  listAdminDeposits,
  listClientDeposits,
  reviewDeposit,
  submitDeposit,
} from "../services/deposit.service.js";

async function requireClient(clientId) {
  const client = await Client.findOne({ _id: clientId, status: "active" });

  if (!client) {
    throw new AppError("This client account is not available.", {
      code: "CLIENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  return client;
}

export async function createClientDeposit(request, response) {
  const client = await requireClient(request.clientAuth.sub);
  const deposit = await submitDeposit(client, request.validatedBody, request, request.file);
  response.status(201).json({
    data: { deposit },
    message: "Your deposit was submitted for verification.",
    success: true,
  });
}

export async function clientDeposits(request, response) {
  const deposits = await listClientDeposits(request.clientAuth.sub);
  response.status(200).json({ data: { deposits }, success: true });
}

export async function clientDepositDetails(request, response) {
  const deposit = await getClientDeposit(request.clientAuth.sub, request.params.depositId);
  response.status(200).json({ data: { deposit }, success: true });
}

export async function clientBalance(request, response) {
  const [balance, transactions] = await Promise.all([
    getClientBalance(request.clientAuth.sub),
    getClientLedger(request.clientAuth.sub),
  ]);
  response.status(200).json({ data: { balance, transactions }, success: true });
}

export async function getDeposits(request, response) {
  const deposits = await listAdminDeposits(request.query.status);
  response.status(200).json({ data: { deposits }, success: true });
}

export async function getDepositDetails(request, response) {
  const deposit = await getAdminDeposit(request.params.depositId);
  response.status(200).json({ data: { deposit }, success: true });
}

export async function updateDepositReview(request, response) {
  const deposit = await reviewDeposit(
    request.params.depositId,
    request.validatedBody,
    request.user,
    request,
  );
  response.status(200).json({
    data: { deposit },
    message: `The deposit was ${deposit.status}.`,
    success: true,
  });
}
