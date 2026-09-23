import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Balance } from "../models/balance.model.js";
import { ClientInvestment } from "../models/client-investment.model.js";
import { InvestmentPlan } from "../models/investment-plan.model.js";
import { AppError } from "../utils/app-error.js";
import { convertCurrency } from "./currency.service.js";

const decimalPrecision = 8;

function decimalToUnits(value) {
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(`${whole}${fraction.padEnd(decimalPrecision, "0").slice(0, decimalPrecision)}`);
}

function unitsToDecimal(units) {
  const padded = units.toString().padStart(decimalPrecision + 1, "0");
  const whole = padded.slice(0, -decimalPrecision);
  const fraction = padded.slice(-decimalPrecision).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function serializeInvestment(investment) {
  return {
    amountUsd: investment.amountUsd.toString(),
    createdAt: investment.createdAt,
    exchangeRate: investment.exchangeRate.toString(),
    id: investment.id,
    maturesAt: investment.maturesAt,
    plan: investment.planSnapshot,
    projectedProfitUsd: investment.projectedProfitUsd.toString(),
    projectedTotalUsd: investment.projectedTotalUsd.toString(),
    quoteExpiresAt: investment.quoteExpiresAt,
    rateQuotedAt: investment.rateQuotedAt,
    rateSource: investment.rateSource,
    startsAt: investment.startsAt,
    status: investment.status,
    walletAmount: investment.walletAmount.toString(),
    walletCurrency: investment.walletCurrency,
  };
}

export async function createClientInvestment(clientId, payload) {
  const existingInvestment = await ClientInvestment.findOne({
    client: clientId,
    requestId: payload.requestId,
  });
  if (existingInvestment) return serializeInvestment(existingInvestment);

  const plan = await InvestmentPlan.findOne({
    _id: payload.planId,
    deletedAt: null,
    status: "active",
  });

  if (!plan) {
    throw new AppError("This investment plan is not available.", {
      code: "INVESTMENT_PLAN_NOT_AVAILABLE",
      statusCode: 404,
    });
  }
  if (payload.amountUsd < plan.minimumInvestment) {
    throw new AppError(
      `The minimum investment for ${plan.name} is $${plan.minimumInvestment}.`,
      { code: "INVESTMENT_MINIMUM_NOT_MET", statusCode: 422 },
    );
  }

  const quote = await convertCurrency("USD", payload.walletCurrency, payload.amountUsd);
  const session = await mongoose.startSession();
  let createdInvestment;

  try {
    await session.withTransaction(async () => {
      const balance = await Balance.findOne({
        client: clientId,
        currency: payload.walletCurrency,
      }).session(session);
      const balanceBefore = balance?.availableBalance?.toString() ?? "0";
      const balanceUnits = decimalToUnits(balanceBefore);
      const debitUnits = decimalToUnits(quote.convertedAmount);

      if (!balance || debitUnits > balanceUnits) {
        throw new AppError(
          `Your ${payload.walletCurrency} wallet does not have enough available balance.`,
          { code: "INSUFFICIENT_WALLET_BALANCE", statusCode: 409 },
        );
      }

      const now = new Date();
      const maturesAt = new Date(now);
      maturesAt.setUTCDate(maturesAt.getUTCDate() + plan.horizonDays);
      const projectedProfit =
        payload.amountUsd * (plan.dailyObjective / 100) * plan.horizonDays;
      const projectedTotal = payload.amountUsd + projectedProfit;
      const [investment] = await ClientInvestment.create(
        [
          {
            amountUsd: mongoose.Types.Decimal128.fromString(payload.amountUsd.toFixed(2)),
            client: clientId,
            exchangeRate: mongoose.Types.Decimal128.fromString(String(quote.rate)),
            maturesAt,
            plan: plan._id,
            planSnapshot: {
              allocation: plan.allocation,
              dailyObjective: plan.dailyObjective,
              horizonDays: plan.horizonDays,
              name: plan.name,
              risk: plan.risk,
              slug: plan.slug,
            },
            projectedProfitUsd: mongoose.Types.Decimal128.fromString(
              projectedProfit.toFixed(2),
            ),
            projectedTotalUsd: mongoose.Types.Decimal128.fromString(
              projectedTotal.toFixed(2),
            ),
            quoteExpiresAt: new Date(quote.quoteExpiresAt),
            requestId: payload.requestId,
            rateQuotedAt: new Date(quote.lastUpdated),
            rateSource: quote.source,
            startsAt: now,
            walletAmount: mongoose.Types.Decimal128.fromString(
              String(quote.convertedAmount),
            ),
            walletCurrency: payload.walletCurrency,
          },
        ],
        { session },
      );
      const balanceAfter = unitsToDecimal(balanceUnits - debitUnits);

      balance.availableBalance = mongoose.Types.Decimal128.fromString(balanceAfter);
      balance.lastTransactionAt = now;
      await balance.save({ session });
      await BalanceTransaction.create(
        [
          {
            amount: mongoose.Types.Decimal128.fromString(String(quote.convertedAmount)),
            balance: balance._id,
            balanceAfter: mongoose.Types.Decimal128.fromString(balanceAfter),
            balanceBefore: mongoose.Types.Decimal128.fromString(balanceBefore),
            client: clientId,
            currency: payload.walletCurrency,
            description: `Investment in ${plan.name}`,
            direction: "debit",
            investment: investment._id,
            type: "investment",
          },
        ],
        { session },
      );
      createdInvestment = investment;
    });
  } finally {
    await session.endSession();
  }

  return serializeInvestment(createdInvestment);
}

export async function listClientInvestments(clientId) {
  const investments = await ClientInvestment.find({ client: clientId }).sort({
    createdAt: -1,
  });
  return investments.map(serializeInvestment);
}
