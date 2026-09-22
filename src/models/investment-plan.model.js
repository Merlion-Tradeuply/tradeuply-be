import mongoose from "mongoose";

const investmentPlanSchema = new mongoose.Schema(
  {
    allocation: { maxlength: 250, required: true, trim: true, type: String },
    badge: { default: null, maxlength: 40, trim: true, type: String },
    dailyObjective: { max: 100, min: 0.01, required: true, type: Number },
    deletedAt: { default: null, index: true, type: Date },
    description: { maxlength: 500, required: true, trim: true, type: String },
    displayOrder: { default: 0, min: 0, type: Number },
    features: {
      type: [{ maxlength: 120, trim: true, type: String }],
      validate: {
        message: "An investment plan requires between one and six features.",
        validator: (features) => features.length >= 1 && features.length <= 6,
      },
    },
    horizonDays: { max: 3650, min: 1, required: true, type: Number },
    icon: {
      default: "chart",
      enum: ["chart", "coins", "globe", "leaf", "shield", "sparkle"],
      type: String,
    },
    isFeatured: { default: false, type: Boolean },
    minimumInvestment: { min: 0.01, required: true, type: Number },
    name: { maxlength: 80, required: true, trim: true, type: String },
    risk: { maxlength: 40, required: true, trim: true, type: String },
    slug: {
      lowercase: true,
      maxlength: 60,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
    status: {
      default: "coming_soon",
      enum: ["active", "coming_soon", "disabled"],
      index: true,
      type: String,
    },
  },
  { timestamps: true, versionKey: false },
);

export const InvestmentPlan =
  mongoose.models.InvestmentPlan ??
  mongoose.model("InvestmentPlan", investmentPlanSchema);
