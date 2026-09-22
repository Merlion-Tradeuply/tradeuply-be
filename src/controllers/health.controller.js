import { env } from "../config/env.js";
import { getDatabaseStatus } from "../config/database.js";

export function getHealth(_request, response) {
  response.status(200).json({
    data: {
      database: getDatabaseStatus(),
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
    message: "TradeUply API is healthy.",
    success: true,
  });
}
