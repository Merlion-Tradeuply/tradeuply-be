import { getClientBalances } from "./balance.service.js";
import { listClientPaymentMethods } from "./client-payment-method.service.js";
import { getCurrentClient } from "./client.service.js";
import { listClientDeposits } from "./deposit.service.js";
import { getClientPaymentMethods } from "./payment-method.service.js";
import { listClientWithdrawals } from "./withdrawal.service.js";

export async function getClientDashboard(clientId) {
  const [client, balances, deposits, methods, withdrawalMethods, withdrawals] =
    await Promise.all([
      getCurrentClient(clientId),
      getClientBalances(clientId),
      listClientDeposits(clientId),
      getClientPaymentMethods(),
      listClientPaymentMethods(clientId),
      listClientWithdrawals(clientId),
    ]);

  return {
    balances,
    client,
    deposits,
    methods,
    withdrawalMethods,
    withdrawals,
  };
}
