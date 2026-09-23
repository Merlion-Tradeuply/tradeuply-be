import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Balance } from "../models/balance.model.js";

function decimalToString(value) {
  return value?.toString() ?? "0";
}

function addDecimalStrings(left, right) {
  const precision = 8;
  const toUnits = (value) => {
    const [whole, fraction = ""] = String(value).split(".");
    return BigInt(`${whole}${fraction.padEnd(precision, "0").slice(0, precision)}`);
  };
  const units = toUnits(left) + toUnits(right);
  const padded = units.toString().padStart(precision + 1, "0");
  const whole = padded.slice(0, -precision);
  const fraction = padded.slice(-precision).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function serializeBalance(balance) {
  return {
    availableBalance: decimalToString(balance?.availableBalance),
    currency: balance.currency,
    lastTransactionAt: balance?.lastTransactionAt ?? null,
    lockedBalance: decimalToString(balance?.lockedBalance),
    totalDeposited: decimalToString(balance?.totalDeposited),
    totalWithdrawn: decimalToString(balance?.totalWithdrawn),
  };
}

export async function getClientBalances(clientId) {
  const balances = await Balance.find({ client: clientId }).sort({ currency: 1 });
  return balances.map(serializeBalance);
}

export async function creditDepositBalance(deposit, session) {
  const currency = deposit.asset.trim().toUpperCase();
  let balance = await Balance.findOne({ client: deposit.client, currency }).session(session);

  if (!balance) {
    [balance] = await Balance.create(
      [{ client: deposit.client, currency }],
      { session },
    );
  }

  const balanceBefore = mongoose.Types.Decimal128.fromString(
    decimalToString(balance.availableBalance),
  );
  const amount = mongoose.Types.Decimal128.fromString(deposit.amount.toString());
  const balanceAfter = mongoose.Types.Decimal128.fromString(
    addDecimalStrings(balanceBefore.toString(), amount.toString()),
  );
  const now = new Date();

  balance.availableBalance = balanceAfter;
  balance.totalDeposited = mongoose.Types.Decimal128.fromString(
    addDecimalStrings(decimalToString(balance.totalDeposited), amount.toString()),
  );
  balance.lastTransactionAt = now;
  await balance.save({ session });

  await BalanceTransaction.create(
    [
      {
        amount,
        balance: balance._id,
        balanceAfter,
        balanceBefore,
        client: deposit.client,
        currency,
        deposit: deposit._id,
        description: `Approved ${currency} deposit ${deposit.transactionHash}`,
        direction: "credit",
        type: "deposit",
      },
    ],
    { session },
  );

  return balance;
}
