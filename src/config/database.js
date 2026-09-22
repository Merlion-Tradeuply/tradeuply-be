import mongoose from "mongoose";

import { env } from "./env.js";

const connectionStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

let connectionPromise;

export function getDatabaseStatus() {
  return connectionStates[mongoose.connection.readyState] ?? "unknown";
}

export async function connectDatabase() {
  if (!env.mongoUri) {
    throw new Error(
      "MONGO_URI is missing. Add the MongoDB connection string to the .env file.",
    );
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    });
  }

  try {
    await connectionPromise;
  } catch (error) {
    connectionPromise = undefined;
    throw error;
  }

  console.log("MongoDB connected successfully.");
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionPromise = undefined;
    console.log("MongoDB disconnected successfully.");
  }
}
