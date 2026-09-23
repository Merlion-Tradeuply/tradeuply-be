import mongoose from "mongoose";

import { BalanceTransaction } from "../models/balance-transaction.model.js";
import { Balance } from "../models/balance.model.js";
import { ClientInvestment } from "../models/client-investment.model.js";
import { InvestmentPlan } from "../models/investment-plan.model.js";
import { InvestmentProfit } from "../models/investment-profit.model.js";
import { AppError } from "../utils/app-error.js";
import { convertCurrency } from "./currency.service.js";

const decimalPrecision = 8;
const dayInMilliseconds = 24 * 60 * 60 * 1000;

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

function addDecimals(left, right) {
  return unitsToDecimal(decimalToUnits(left) + decimalToUnits(right));
}

function sumDecimals(values) {
  return unitsToDecimal(
    values.reduce((total, value) => total + decimalToUnits(value), 0n),
  );
}

export function getCompletedProfitDays(investment, now = new Date()) {
  const elapsed = Math.max(0, now.getTime() - investment.startsAt.getTime());
  return Math.min(
    investment.planSnapshot.horizonDays,
    Math.floor(elapsed / dayInMilliseconds),
  );
}

function getDailyProfit(investment) {
  const amountUsd = Number(investment.amountUsd.toString());
  const rate = Number(investment.exchangeRate.toString());
  const dailyUsd = amountUsd * (investment.planSnapshot.dailyObjective / 100);

  return {
    amountUsd: dailyUsd.toFixed(2),
    walletAmount: (dailyUsd * rate).toFixed(decimalPrecision),
  };
}

async function syncInvestmentLifecycle(investment, now = new Date()) {
  const accruedDays = getCompletedProfitDays(investment, now);
  const dailyProfit = getDailyProfit(investment);

  if (accruedDays > 0 && investment.status !== "cancelled") {
    const operations = Array.from({ length: accruedDays }, (_, index) => {
      const dayNumber = index + 1;
      return {
        updateOne: {
          filter: { dayNumber, investment: investment._id },
          update: {
            $setOnInsert: {
              amountUsd: mongoose.Types.Decimal128.fromString(dailyProfit.amountUsd),
              client: investment.client,
              creditDate: new Date(
                investment.startsAt.getTime() + dayNumber * dayInMilliseconds,
              ),
              dayNumber,
              investment: investment._id,
              status: "available",
              walletAmount: mongoose.Types.Decimal128.fromString(
                dailyProfit.walletAmount,
              ),
              walletCurrency: investment.walletCurrency,
            },
          },
          upsert: true,
        },
      };
    });

    try {
      await InvestmentProfit.bulkWrite(operations, { ordered: false });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  if (investment.status === "active" && now >= investment.maturesAt) {
    await ClientInvestment.updateOne(
      { _id: investment._id, status: "active" },
      { $set: { status: "matured" } },
    );
    investment.status = "matured";
  }

  return InvestmentProfit.find({ investment: investment._id }).sort({ dayNumber: 1 });
}

function serializeProfit(profit) {
  return {
    amountUsd: profit.amountUsd.toString(),
    creditDate: profit.creditDate,
    dayNumber: profit.dayNumber,
    id: profit.id,
    status: profit.status,
    walletAmount: profit.walletAmount.toString(),
    walletCurrency: profit.walletCurrency,
    withdrawnAt: profit.withdrawnAt,
  };
}

function serializeInvestment(investment, profits = [], includeHistory = false) {
  const now = new Date();
  const accruedDays = getCompletedProfitDays(investment, now);
  const horizonDays = investment.planSnapshot.horizonDays;
  const availableProfits = profits.filter((profit) => profit.status === "available");
  const withdrawnProfits = profits.filter((profit) => profit.status === "withdrawn");
  const dailyProfit = getDailyProfit(investment);
  const elapsed = Math.max(0, now.getTime() - investment.startsAt.getTime());
  const duration = Math.max(
    1,
    investment.maturesAt.getTime() - investment.startsAt.getTime(),
  );

  return {
    amountUsd: investment.amountUsd.toString(),
    capitalReturnedAt: investment.capitalReturnedAt,
    createdAt: investment.createdAt,
    daysCompleted: accruedDays,
    daysRemaining: Math.max(0, horizonDays - accruedDays),
    exchangeRate: investment.exchangeRate.toString(),
    id: investment.id,
    maturesAt: investment.maturesAt,
    plan: investment.planSnapshot,
    profit: {
      accruedDays: profits.length,
      availableUsd: sumDecimals(
        availableProfits.map((profit) => profit.amountUsd.toString()),
      ),
      availableWalletAmount: sumDecimals(
        availableProfits.map((profit) => profit.walletAmount.toString()),
      ),
      dailyUsd: dailyProfit.amountUsd,
      dailyWalletAmount: dailyProfit.walletAmount,
      ...(includeHistory ? { entries: profits.map(serializeProfit) } : {}),
      totalAccruedUsd: sumDecimals(
        profits.map((profit) => profit.amountUsd.toString()),
      ),
      totalAccruedWalletAmount: sumDecimals(
        profits.map((profit) => profit.walletAmount.toString()),
      ),
      withdrawnUsd: sumDecimals(
        withdrawnProfits.map((profit) => profit.amountUsd.toString()),
      ),
      withdrawnWalletAmount: sumDecimals(
        withdrawnProfits.map((profit) => profit.walletAmount.toString()),
      ),
    },
    progressPercent: Math.min(100, Math.round((elapsed / duration) * 100)),
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

async function findOwnedInvestment(clientId, investmentId, session) {
  if (!mongoose.isValidObjectId(investmentId)) {
    throw new AppError("The investment could not be found.", {
      code: "INVESTMENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  const query = ClientInvestment.findOne({ _id: investmentId, client: clientId });
  if (session) query.session(session);
  const investment = await query;

  if (!investment) {
    throw new AppError("The investment could not be found.", {
      code: "INVESTMENT_NOT_FOUND",
      statusCode: 404,
    });
  }

  return investment;
}

export async function createClientInvestment(clientId, payload) {
  const existingInvestment = await ClientInvestment.findOne({
    client: clientId,
    requestId: payload.requestId,
  });
  if (existingInvestment) {
    const profits = await syncInvestmentLifecycle(existingInvestment);
    return serializeInvestment(existingInvestment, profits);
  }

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

  return Promise.all(
    investments.map(async (investment) => {
      const profits = await syncInvestmentLifecycle(investment);
      return serializeInvestment(investment, profits);
    }),
  );
}

export async function getClientInvestment(clientId, investmentId) {
  const investment = await findOwnedInvestment(clientId, investmentId);
  const profits = await syncInvestmentLifecycle(investment);
  return serializeInvestment(investment, profits, true);
}

export async function transferInvestmentCapital(clientId, investmentId) {
  const session = await mongoose.startSession();
  let investment;

  try {
    await session.withTransaction(async () => {
      investment = await findOwnedInvestment(clientId, investmentId, session);

      if (investment.capitalReturnedAt || investment.status === "completed") return;
      if (new Date() < investment.maturesAt) {
        throw new AppError("Capital is available only after the investment matures.", {
          code: "INVESTMENT_NOT_MATURED",
          statusCode: 409,
        });
      }

      let balance = await Balance.findOne({
        client: clientId,
        currency: investment.walletCurrency,
      }).session(session);
      if (!balance) {
        [balance] = await Balance.create(
          [{ client: clientId, currency: investment.walletCurrency }],
          { session },
        );
      }

      const balanceBefore = balance.availableBalance.toString();
      const balanceAfter = addDecimals(
        balanceBefore,
        investment.walletAmount.toString(),
      );
      const now = new Date();

      balance.availableBalance = mongoose.Types.Decimal128.fromString(balanceAfter);
      balance.lastTransactionAt = now;
      await balance.save({ session });

      investment.capitalReturnedAt = now;
      investment.status = "completed";
      await investment.save({ session });

      await BalanceTransaction.create(
        [
          {
            amount: investment.walletAmount,
            balance: balance._id,
            balanceAfter: mongoose.Types.Decimal128.fromString(balanceAfter),
            balanceBefore: mongoose.Types.Decimal128.fromString(balanceBefore),
            client: clientId,
            currency: investment.walletCurrency,
            description: `Capital returned from ${investment.planSnapshot.name}`,
            direction: "credit",
            investment: investment._id,
            type: "capital_return",
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  const profits = await syncInvestmentLifecycle(investment);
  return serializeInvestment(investment, profits, true);
}
