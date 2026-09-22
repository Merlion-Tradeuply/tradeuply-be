import bcrypt from "bcryptjs";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { securityConfig } from "../config/security.js";
import { User } from "../models/user.model.js";

function validateSeedConfig() {
  if (
    !env.superAdminEmail ||
    !env.superAdminFirstName ||
    !env.superAdminLastName ||
    env.superAdminPassword.length < 6
  ) {
    throw new Error(
      "SUPER_ADMIN_FIRST_NAME, SUPER_ADMIN_LAST_NAME, SUPER_ADMIN_EMAIL, and a SUPER_ADMIN_PASSWORD of at least 6 characters are required.",
    );
  }
}

async function seedSuperAdmin() {
  validateSeedConfig();
  await connectDatabase();

  const passwordHash = await bcrypt.hash(
    env.superAdminPassword,
    securityConfig.passwordHashRounds,
  );

  const user = await User.findOneAndUpdate(
    { email: env.superAdminEmail },
    {
      $set: {
        firstName: env.superAdminFirstName,
        lastName: env.superAdminLastName,
        passwordHash,
        roles: ["super-admin"],
        status: "active",
      },
      $setOnInsert: { email: env.superAdminEmail },
    },
    { returnDocument: "after", runValidators: true, upsert: true },
  );

  console.log(`Super-admin ready: ${user.email}`);
}

seedSuperAdmin()
  .catch((error) => {
    console.error("Unable to seed the super-admin.", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
