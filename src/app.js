import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import { ensureDatabaseConnection } from "./middleware/database-connection.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(compression());
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const isAllowed =
        !origin ||
        env.corsOrigins.length === 0 ||
        env.corsOrigins.includes(origin);

      callback(isAllowed ? null : new Error("Origin is not allowed by CORS."), isAllowed);
    },
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
}

app.get("/", (_request, response) => {
  response.status(200).json({
    message: "Welcome to the TradeUply API.",
    success: true,
  });
});

app.use(env.apiPrefix, ensureDatabaseConnection, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
