import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { InvestmentPlan } from "../models/investment-plan.model.js";

const plans = [
  { allocation: "Cash reserves · Short-term bonds", dailyObjective: 5, description: "A measured starting point focused on stability and lower volatility.", displayOrder: 10, features: ["Diversified defensive assets", "Quarterly portfolio review", "Simple performance reporting"], horizonDays: 7, icon: "shield", minimumInvestment: 50, name: "Essential", risk: "Lower", slug: "essential", status: "active" },
  { allocation: "Government bonds · Dividend assets", dailyObjective: 7, description: "Designed for investors seeking a steadier approach with an income focus.", displayOrder: 20, features: ["Income-oriented allocation", "Risk-aware diversification", "Quarterly portfolio review"], horizonDays: 7, icon: "coins", minimumInvestment: 500, name: "Income", risk: "Low–moderate", slug: "income", status: "active" },
  { allocation: "Global equities · Bonds · Cash", badge: "Most popular", dailyObjective: 10, description: "A diversified mix created to balance long-term growth and portfolio stability.", displayOrder: 30, features: ["Multi-asset diversification", "Monthly portfolio review", "Automatic rebalancing"], horizonDays: 7, icon: "chart", isFeatured: true, minimumInvestment: 1000, name: "Balanced", risk: "Moderate", slug: "balanced", status: "active" },
  { allocation: "International equities · Market themes", dailyObjective: 13, description: "Broader exposure to established companies and growing sectors worldwide.", displayOrder: 40, features: ["Global market allocation", "Growth-focused strategy", "Monthly portfolio review"], horizonDays: 5, icon: "globe", minimumInvestment: 5000, name: "Global Growth", risk: "Moderate–high", slug: "global-growth", status: "active" },
  { allocation: "Technology · Innovation · Digital assets", dailyObjective: 18, description: "A higher-volatility strategy focused on innovation-led markets and emerging themes.", displayOrder: 50, features: ["Innovation-led exposure", "Defined allocation limits", "Active risk monitoring"], horizonDays: 5, icon: "sparkle", minimumInvestment: 2500, name: "Future Focus", risk: "Higher", slug: "future-focus", status: "active" },
  { allocation: "Personalized multi-asset portfolio", dailyObjective: 25, description: "A tailored investment approach for larger portfolios with individualized allocation and review.", displayOrder: 60, features: ["Personalized asset mix", "Dedicated portfolio reviews", "Priority client support"], horizonDays: 3, icon: "leaf", minimumInvestment: 10000, name: "Wealth Select", risk: "Personalized", slug: "wealth-select", status: "active" },
];

async function seedInvestmentPlans() {
  await connectDatabase();
  await Promise.all(
    plans.map((plan) =>
      InvestmentPlan.updateOne(
        { slug: plan.slug },
        { $setOnInsert: plan },
        { upsert: true },
      ),
    ),
  );
  console.log(`${plans.length} investment plans are ready.`);
}

seedInvestmentPlans()
  .catch((error) => {
    console.error("Unable to seed investment plans.", error.message);
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
