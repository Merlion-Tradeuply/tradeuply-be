import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Balance } from "../models/balance.model.js";
import { Client } from "../models/client.model.js";
import { PaymentMethod } from "../models/payment-method.model.js";
import { AppError } from "../utils/app-error.js";
import { serializeBalance } from "./balance.service.js";
import { convertCurrency } from "./currency.service.js";
import { sendWalletBonusEmail } from "./email.service.js";

const precision = 8;

function toUnits(value) {
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(`${whole}${fraction.padEnd(precision, "0").slice(0, precision)}`);
}

function fromUnits(value) {
  const raw = value.toString().padStart(precision + 1, "0");
  const whole = raw.slice(0, -precision);
  const fraction = raw.slice(-precision).replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}

function decimal(value) {
  return mongoose.Types.Decimal128.fromString(String(value));
}

function serializeBonus(transaction) {
  return {
    amount: transaction.amount.toString(),
    amountUsd: transaction.amountUsd.toString(),
    asset: transaction.currency,
    createdAt: transaction.createdAt,
    exchangeRate: transaction.exchangeRate.toString(),
    id: transaction.id,
    rateSource: transaction.rateSource,
    source: transaction.bonusSource,
  };
}

async function assertBonusAsset(asset) {
  const available = await PaymentMethod.exists({
    asset,
    category: "crypto",
    deletedAt: null,
    status: "active",
  });
  if (!available) {
    throw new AppError("The selected cryptocurrency is not currently available.", {
      code: "BONUS_ASSET_UNAVAILABLE",
      statusCode: 422,
    });
  }
}

export async function creditWalletBonus({
  amountUsd,
  asset,
  clientId,
  createdBy = null,
  note = "",
  requestId,
  source,
}) {
  const normalizedAsset = asset.trim().toUpperCase();
  const client = await Client.findOne({ _id: clientId, deletedAt: null, status: "active" });
  if (!client) {
    throw new AppError("The active client account could not be found.", {
      code: "CLIENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  if (source === "signup" && client.signupBonusCreditedAt) {
    const transaction = await BalanceTransaction.findOne({ client: client._id, requestId });
    return transaction ? { bonus: serializeBonus(transaction), credited: false } : null;
  }

  await assertBonusAsset(normalizedAsset);
  const quote = await convertCurrency("USD", normalizedAsset, amountUsd);
  const session = await mongoose.startSession();
  let balance;
  let transaction;
  let credited = false;

  try {
    await session.withTransaction(async () => {
      transaction = await BalanceTransaction.findOne({ client: client._id, requestId }).session(session);
      if (transaction) {
        balance = await Balance.findById(transaction.balance).session(session);
        return;
      }

      balance = await Balance.findOne({ client: client._id, currency: normalizedAsset }).session(session);
      if (!balance) [balance] = await Balance.create([{ client: client._id, currency: normalizedAsset }], { session });

      const beforeUnits = toUnits(balance.availableBalance?.toString() ?? "0");
      const bonusUnits = toUnits(quote.convertedAmount);
      const balanceBefore = decimal(fromUnits(beforeUnits));
      const amount = decimal(fromUnits(bonusUnits));
      const balanceAfter = decimal(fromUnits(beforeUnits + bonusUnits));
      const description = source === "signup"
        ? `Signup bonus converted from $${Number(amountUsd).toFixed(2)}`
        : `Wallet bonus${note ? ` · ${note}` : ""}`;

      balance.availableBalance = balanceAfter;
      balance.lastTransactionAt = new Date();
      await balance.save({ session });

      [transaction] = await BalanceTransaction.create([{
        amount,
        amountUsd: decimal(Number(amountUsd).toFixed(2)),
        balance: balance._id,
        balanceAfter,
        balanceBefore,
        bonusSource: source,
        client: client._id,
        createdBy,
        currency: normalizedAsset,
        description,
        direction: "credit",
        exchangeRate: decimal(quote.rate),
        quoteExpiresAt: quote.quoteExpiresAt,
        rateQuotedAt: quote.lastUpdated,
        rateSource: quote.source,
        requestId,
        sourceAmount: decimal(Number(amountUsd).toFixed(2)),
        sourceCurrency: "USD",
        type: "bonus",
      }], { session });

      if (source === "signup") {
        await Client.updateOne(
          { _id: client._id, signupBonusCreditedAt: null },
          { $set: { signupBonusCreditedAt: new Date() } },
          { session },
        );
      }
      credited = true;
    });
  } catch (error) {
    if (error?.code === 11000) {
      transaction = await BalanceTransaction.findOne({ client: client._id, requestId });
      balance = transaction ? await Balance.findById(transaction.balance) : null;
    } else {
      throw error;
    }
  } finally {
    await session.endSession();
  }

  if (!transaction || !balance) throw new AppError("The wallet bonus could not be credited.", { code: "BONUS_CREDIT_FAILED", statusCode: 500 });
  const bonus = serializeBonus(transaction);
  if (credited) {
    await sendWalletBonusEmail({ bonus, client }).catch((error) => {
      console.error("Wallet bonus notification could not be sent.", { clientId: client.id, message: error.message });
    });
  }
  return { balance: serializeBalance(balance), bonus, credited };
}

export async function creditSignupBonus(client) {
  const offer = client.signupBonusOffer;
  if (!offer?.asset || !offer?.amountUsd || client.signupBonusCreditedAt) return null;
  return creditWalletBonus({
    amountUsd: Number(offer.amountUsd.toString()),
    asset: offer.asset,
    clientId: client._id,
    requestId: `signup-bonus:${client.id}`,
    source: "signup",
  });
}
