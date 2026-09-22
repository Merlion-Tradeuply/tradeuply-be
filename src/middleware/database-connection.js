import { connectDatabase } from "../config/database.js";
import { env } from "../config/env.js";

export async function ensureDatabaseConnection(_request, _response, next) {
  if (env.nodeEnv === "test") {
    next();
    return;
  }

  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
}
