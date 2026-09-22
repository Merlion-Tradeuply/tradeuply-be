import mongoose from "mongoose";

export const internalRoles = ["super-admin", "admin", "hr"];

const userSchema = new mongoose.Schema(
  {
    email: {
      lowercase: true,
      maxlength: 254,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
    firstName: { maxlength: 60, required: true, trim: true, type: String },
    lastLoginAt: { default: null, type: Date },
    lastName: { maxlength: 60, required: true, trim: true, type: String },
    passwordHash: { required: true, select: false, type: String },
    roles: {
      enum: internalRoles,
      required: true,
      set: (roles) => [...new Set(roles)],
      type: [String],
      validate: {
        message: "At least one internal role is required.",
        validator: (roles) => roles.length > 0,
      },
    },
    status: {
      default: "active",
      enum: ["active", "suspended"],
      index: true,
      type: String,
    },
  },
  { timestamps: true, versionKey: false },
);

userSchema.set("toJSON", {
  transform(_document, returnedObject) {
    delete returnedObject.passwordHash;
    return returnedObject;
  },
});

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
