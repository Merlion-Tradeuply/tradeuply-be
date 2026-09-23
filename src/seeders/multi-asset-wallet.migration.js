import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { Deposit } from "../models/deposit.model.js";

async function migrateMultiAssetWallets() {
  await connectDatabase();
  const result = await Deposit.updateMany(
    { $or: [{ asset: { $exists: false } }, { asset: null }, { asset: "" }] },
    { $set: { asset: "USDT" } },
  );
  console.log(`${result.modifiedCount} legacy deposits were marked as USDT.`);
}

migrateMultiAssetWallets()
  .catch((error) => {
    console.error("Unable to migrate legacy deposits.", error.message);
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
