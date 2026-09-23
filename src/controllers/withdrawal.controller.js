import { Client } from "../models/client.model.js";
import { AppError } from "../utils/app-error.js";
import { getAdminWithdrawal, listAdminWithdrawals, listClientWithdrawals, reviewWithdrawal, submitWithdrawal } from "../services/withdrawal.service.js";

export async function createClientWithdrawal(request, response) {
  const client = await Client.findOne({ _id: request.clientAuth.sub, status: "active" });
  if (!client) throw new AppError("This client account is not available.", { code: "CLIENT_NOT_FOUND", statusCode: 404 });
  const withdrawal = await submitWithdrawal(client, request.validatedBody, request);
  response.status(201).json({ data: { withdrawal }, message: "Your withdrawal was submitted for approval.", success: true });
}
export async function clientWithdrawals(request, response) {
  const withdrawals = await listClientWithdrawals(request.clientAuth.sub);
  response.status(200).json({ data: { withdrawals }, success: true });
}
export async function getWithdrawals(request, response) {
  response.status(200).json({ data: await listAdminWithdrawals(request.validatedQuery), success: true });
}
export async function getWithdrawalDetails(request, response) {
  response.status(200).json({ data: { withdrawal: await getAdminWithdrawal(request.params.withdrawalId) }, success: true });
}
export async function updateWithdrawalReview(request, response) {
  const withdrawal = await reviewWithdrawal(request.params.withdrawalId, request.validatedBody, request.user, request);
  response.status(200).json({ data: { withdrawal }, message: `The withdrawal was ${withdrawal.status}.`, success: true });
}
