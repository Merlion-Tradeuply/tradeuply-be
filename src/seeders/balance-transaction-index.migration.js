import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { BalanceTransaction } from "../models/balance-transaction.model.js";

const obsoleteIndexes = ["deposit_1", "investment_1"];

async function dropIndexIfPresent(indexName) {
  const indexes = await BalanceTransaction.collection.indexes();

  if (indexes.some((index) => index.name === indexName)) {
    await BalanceTransaction.collection.dropIndex(indexName);
    console.log(`Dropped obsolete index: ${indexName}`);
  }
}

async function migrateBalanceTransactionIndexes() {
  await connectDatabase();

  for (const indexName of obsoleteIndexes) {
    await dropIndexIfPresent(indexName);
  }

  await BalanceTransaction.collection.createIndex(
    { deposit: 1 },
    {
      name: "deposit_unique_when_present",
      partialFilterExpression: { deposit: { $type: "objectId" } },
      unique: true,
    },
  );
  await BalanceTransaction.collection.createIndex(
    { investment: 1 },
    {
      name: "investment_unique_when_present",
      partialFilterExpression: { investment: { $type: "objectId" } },
      unique: true,
    },
  );

  console.log("Balance transaction indexes migrated successfully.");
}

migrateBalanceTransactionIndexes()
  .catch((error) => {
    console.error("Balance transaction index migration failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => disconnectDatabase());
