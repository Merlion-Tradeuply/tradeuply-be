import { InvestmentPlan } from "../models/investment-plan.model.js";
import { AppError } from "../utils/app-error.js";

function serializePlan(plan) {
  return {
    allocation: plan.allocation,
    badge: plan.badge,
    dailyObjective: plan.dailyObjective,
    description: plan.description,
    displayOrder: plan.displayOrder,
    features: plan.features,
    horizonDays: plan.horizonDays,
    icon: plan.icon,
    id: plan.id,
    isFeatured: plan.isFeatured,
    minimumInvestment: plan.minimumInvestment,
    name: plan.name,
    risk: plan.risk,
    slug: plan.slug,
    status: plan.status,
  };
}

function escapeRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listPublicInvestmentPlans() {
  const plans = await InvestmentPlan.find({ deletedAt: null, status: "active" }).sort({
    displayOrder: 1,
    name: 1,
  });
  return plans.map(serializePlan);
}

export async function listInvestmentPlans({
  featured,
  limit = 10,
  page = 1,
  q,
  risk,
  sort,
  status,
} = {}) {
  const filter = { deletedAt: null };
  const skip = (page - 1) * limit;
  if (featured) filter.isFeatured = featured === "true";
  if (risk) filter.risk = risk;
  if (status) filter.status = status;
  if (q) {
    const expression = new RegExp(escapeRegularExpression(q), "i");
    filter.$or = ["name", "slug", "risk", "allocation", "description"].map(
      (field) => ({ [field]: expression }),
    );
  }

  const sortOptions = {
    "display-order": { displayOrder: 1, name: 1 },
    "minimum-asc": { minimumInvestment: 1 },
    "minimum-desc": { minimumInvestment: -1 },
    "name-asc": { name: 1 },
    "name-desc": { name: -1 },
  };
  const [plans, statusCounts, risks, total] = await Promise.all([
    InvestmentPlan.find(filter)
      .sort(sortOptions[sort] ?? sortOptions["display-order"])
      .skip(skip)
      .limit(limit),
    InvestmentPlan.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          all: { $sum: 1 },
          comingSoon: {
            $sum: { $cond: [{ $eq: ["$status", "coming_soon"] }, 1, 0] },
          },
          disabled: { $sum: { $cond: [{ $eq: ["$status", "disabled"] }, 1, 0] } },
          featured: { $sum: { $cond: ["$isFeatured", 1, 0] } },
        },
      },
    ]),
    InvestmentPlan.distinct("risk", { deletedAt: null }),
    InvestmentPlan.countDocuments(filter),
  ]);
  const counts = statusCounts[0];

  return {
    pagination: {
      limit,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      total,
    },
    plans: plans.map(serializePlan),
    risks: risks.sort((a, b) => a.localeCompare(b)),
    summary: {
      active: counts?.active ?? 0,
      all: counts?.all ?? 0,
      coming_soon: counts?.comingSoon ?? 0,
      disabled: counts?.disabled ?? 0,
      featured: counts?.featured ?? 0,
    },
  };
}

export async function createInvestmentPlan(payload) {
  try {
    const deletedPlan = await InvestmentPlan.findOne({
      deletedAt: { $ne: null },
      slug: payload.slug,
    });
    if (deletedPlan) {
      deletedPlan.set({ ...payload, deletedAt: null });
      await deletedPlan.save();
      return serializePlan(deletedPlan);
    }

    return serializePlan(await InvestmentPlan.create(payload));
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("An investment plan with this slug already exists.", {
        code: "INVESTMENT_PLAN_EXISTS",
        statusCode: 409,
      });
    }
    throw error;
  }
}

export async function updateInvestmentPlan(planId, payload) {
  const plan = await InvestmentPlan.findOneAndUpdate(
    { _id: planId, deletedAt: null },
    { $set: payload },
    { new: true, runValidators: true },
  );
  if (!plan) {
    throw new AppError("The investment plan could not be found.", {
      code: "INVESTMENT_PLAN_NOT_FOUND",
      statusCode: 404,
    });
  }
  return serializePlan(plan);
}

export async function deleteInvestmentPlans(planIds) {
  const result = await InvestmentPlan.updateMany(
    { _id: { $in: planIds }, deletedAt: null },
    { $set: { deletedAt: new Date(), status: "disabled" } },
  );
  if (result.modifiedCount === 0) {
    throw new AppError("No investment plans were found for deletion.", {
      code: "INVESTMENT_PLANS_NOT_FOUND",
      statusCode: 404,
    });
  }
  return { deletedCount: result.modifiedCount };
}
