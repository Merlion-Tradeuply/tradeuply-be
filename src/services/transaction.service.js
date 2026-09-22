import { BalanceTransaction } from "../models/balance-transaction.model.js";

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

export async function listTransactions() {
  const transactions = await BalanceTransaction.find()
    .populate("client", "firstName lastName email")
    .populate("deposit", "methodName network status transactionHash")
    .sort({ createdAt: -1 });

  return transactions.map(serializeTransaction);
}
