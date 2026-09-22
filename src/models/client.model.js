import mongoose from "mongoose";

const investmentRanges = ["$100–$999", "$1,000–$4,999", "$5,000–$24,999", "$25,000+"];
const investmentExperiences = ["New investor", "Some experience", "Experienced"];
const investmentObjectives = [
  "Short-term opportunity",
  "Portfolio diversification",
  "Income generation",
  "Capital growth",
];

const clientSchema = new mongoose.Schema(
  {
    consents: {
      ageConfirmed: { required: true, type: Boolean },
      riskAcceptedAt: { required: true, type: Date },
      termsAcceptedAt: { required: true, type: Date },
    },
    email: {
      lowercase: true,
      maxlength: 254,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
    emailVerifiedAt: { default: null, type: Date },
    deletedAt: { default: null, index: true, type: Date },
    firstName: { maxlength: 60, required: true, trim: true, type: String },
    investmentProfile: {
      experience: { enum: investmentExperiences, required: true, type: String },
      investmentRange: { enum: investmentRanges, required: true, type: String },
      objective: { enum: investmentObjectives, required: true, type: String },
    },
    lastName: { maxlength: 60, required: true, trim: true, type: String },
    passwordHash: { required: true, select: false, type: String },
    phone: {
      maxlength: 16,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
    role: { default: "client", enum: ["client"], type: String },
    status: {
      default: "pending_verification",
      enum: ["pending_verification", "active", "suspended"],
      index: true,
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

clientSchema.set("toJSON", {
  transform(_document, returnedObject) {
    delete returnedObject.passwordHash;
    return returnedObject;
  },
});

export const Client = mongoose.models.Client ?? mongoose.model("Client", clientSchema);
