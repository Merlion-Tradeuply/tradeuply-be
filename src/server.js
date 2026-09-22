import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

let server;

async function startServer() {
  await connectDatabase();

  server = app.listen(env.port, () => {
    console.log(
      `TradeUply API running in ${env.nodeEnv} mode at http://localhost:${env.port}${env.apiPrefix}`,
    );
  });
}

async function shutdown(signal) {
  console.log(`${signal} received. Closing the HTTP server...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }

    await disconnectDatabase();
  } catch (error) {
    console.error("Failed to shut down cleanly.", error);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  void shutdown("unhandledRejection");
});

startServer().catch((error) => {
  console.error("Unable to start the TradeUply API.", error.message);
  process.exitCode = 1;
});
