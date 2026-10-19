import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import { createSqlConnection, createMongoClient, sqlDatabase, mongoDatabase } from "./db-config.mjs";

// Reads the configured databases. --copy-local inserts only missing documents
// from the original local MongoDB; existing target documents are never replaced.
const copyLocal = process.argv.includes("--copy-local");
const checkLocal = copyLocal || process.argv.includes("--check-local");
const saveEvidence = process.argv.includes("--write-evidence");
const expectedHost = process.argv.find(arg => arg.startsWith("--expected-host="))?.split("=", 2)[1];
const expectedDatabase = process.argv.find(arg => arg.startsWith("--expected-database="))?.split("=", 2)[1];
const domainTables = ["CAMPUS", "DEPARTMENT", "USER", "CATEGORY", "LOCATION", "LOST_ITEM", "FOUND_ITEM", "MATCH", "CLAIM", "NOTIFICATION"];
const links = [
  { collection: "lost_item_details", table: "LOST_ITEM", key: "lost_id" },
  { collection: "found_item_details", table: "FOUND_ITEM", key: "found_id" },
  { collection: "match_evidence", table: "MATCH", key: "match_id" }
];
const sql = await createSqlConnection();
const target = createMongoClient();
let local;
const result = {
  verifiedAt: new Date().toISOString(),
  sqlDatabase,
  mongoDatabase,
  status: "PASS",
  sql: {},
  mongo: {},
  linkedDocuments: {},
  localMigration: { requested: copyLocal, checked: checkLocal, collections: [] }
};
try {
  if (copyLocal) {
    assert(expectedHost && expectedDatabase, "Copying requires an explicitly selected destination host and database.");
    assert.equal(new URL(process.env.MONGODB_URI).hostname, expectedHost, "Configured destination changed.");
    assert.equal(mongoDatabase, expectedDatabase, "Configured destination database changed.");
  }
  await target.connect();
  const db = target.db(mongoDatabase);
  await db.command({ ping: 1 });
  for (const table of domainTables) {
    const [[row]] = await sql.query("SELECT COUNT(*) AS n FROM " + String.fromCharCode(96) + table + String.fromCharCode(96));
    result.sql[table] = Number(row.n);
  }
  const [[pending]] = await sql.query("SELECT COUNT(*) AS n FROM MONGO_OUTBOX WHERE processed_at IS NULL");
  result.pendingMongoWrites = Number(pending.n);
  const ids = {};
  for (const link of links) {
    const [rows] = await sql.query("SELECT " + link.key + " AS id FROM " + String.fromCharCode(96) + link.table + String.fromCharCode(96));
    ids[link.collection] = rows.map(row => Number(row.id));
  }

  if (checkLocal) {
    const targetUri = new URL(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
    const sameLocalDatabase = ["127.0.0.1", "localhost", "[::1]"].includes(targetUri.hostname)
      && (!targetUri.port || targetUri.port === "27017");
    result.localMigration.sameLocalDatabase = sameLocalDatabase;
    if (!sameLocalDatabase) {
      local = new MongoClient("mongodb://127.0.0.1:27017", {
        serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 10000
      });
      await local.connect();
      const source = local.db(mongoDatabase);
      const [users] = await sql.query("SELECT user_id FROM " + String.fromCharCode(96) + "USER" + String.fromCharCode(96));
      const definitions = [
        ...links.map(link => ({ ...link, filter: { [link.key]: { $in: ids[link.collection] } } })),
        { collection: "audit_events", key: "_id", filter: { user_id: { $in: users.map(user => Number(user.user_id)) } } }
      ];
      for (const definition of definitions) {
        const sourceDocuments = await source.collection(definition.collection).find(definition.filter).toArray();
        let missing = 0, inserted = 0;
        for (const document of sourceDocuments) {
          const filter = { [definition.key]: document[definition.key] };
          if (await db.collection(definition.collection).findOne(filter, { projection: { _id: 1 } })) continue;
          missing++;
          if (copyLocal) {
            const update = await db.collection(definition.collection).updateOne(
              filter, { $setOnInsert: document }, { upsert: true }
            );
            inserted += update.upsertedCount;
          }
        }
        result.localMigration.collections.push({
          collection: definition.collection,
          sourceDocuments: sourceDocuments.length,
          missingBeforeCopy: missing,
          inserted,
          existingTargetDocumentsPreserved: true
        });
      }
    }
  }

  for (const collection of ["lost_item_details", "found_item_details", "match_evidence", "audit_events"]) {
    result.mongo[collection] = await db.collection(collection).countDocuments();
  }
  for (const link of links) {
    const documents = await db.collection(link.collection).find(
      { [link.key]: { $in: ids[link.collection] } },
      { projection: { _id: 0, [link.key]: 1 } }
    ).toArray();
    const present = new Set(documents.map(doc => Number(doc[link.key])));
    result.linkedDocuments[link.collection] = {
      sqlRecords: ids[link.collection].length,
      linkedDocuments: present.size,
      missingSqlIds: ids[link.collection].filter(id => !present.has(id))
    };
  }
  // Linked details may legitimately be explicitly removed through the API;
  // assert the supplied persistent demonstration pairs and explanations.
  for (const link of links) {
    const sqlText = link.table === "MATCH"
      ? "SELECT m.match_id AS id FROM " + String.fromCharCode(96) + "MATCH" + String.fromCharCode(96) + " m JOIN LOST_ITEM li ON li.lost_id=m.lost_id WHERE li.remarks IN ('DEMO_WALLET','DEMO_HEADPHONES')"
      : "SELECT " + link.key + " AS id FROM " + link.table + " WHERE remarks IN ('DEMO_WALLET','DEMO_HEADPHONES')";
    const [demoRows] = await sql.query(sqlText);
    const missing = [];
    for (const row of demoRows) {
      if (!await db.collection(link.collection).findOne({ [link.key]: Number(row.id) }, { projection: { _id: 1 } })) missing.push(Number(row.id));
    }
    result.linkedDocuments[link.collection].missingDemoSqlIds = missing;
    if (missing.length) result.status = "INCOMPLETE";
  }
  if (result.pendingMongoWrites) result.status = "INCOMPLETE";
  if (saveEvidence) {
    await mkdir("docs/testing/results", { recursive: true });
    await writeFile("docs/testing/results/database-storage.json", JSON.stringify(result, null, 2) + "\n");
  }
  console.log(JSON.stringify(result, null, 2));
  assert.equal(result.status, "PASS", "Configured database storage is incomplete; synchronize or restore the missing linked documents.");
} catch (error) {
  // Do not log connection URLs, credentials or document contents.
  console.error("Database storage verification failed:", error.name, error.code || "");
  process.exitCode = 1;
} finally {
  await sql.end();
  await target.close();
  if (local) await local.close();
}
