import { listTransactions } from "../services/transaction.service.js";

export async function getTransactions(_request, response) {
  const transactions = await listTransactions();

  response.status(200).json({ data: { transactions }, success: true });
}
