import { writeFile } from "node:fs/promises";
import { mongoModels } from "../database/mongodb/model.mjs";
const header="// Generated from model.mjs by node scripts/export-mongo-setup.mjs.\n// Run with mongosh; MONGODB_DATABASE defaults to campus_lost_found.\n";
const code="db = db.getSiblingDB(process.env.MONGODB_DATABASE || \"campus_lost_found\");\nconst models = "+JSON.stringify(mongoModels,null,2)+";\nfor (const [name, model] of Object.entries(models)) {\n const options={validator:{$jsonSchema:model.schema},validationLevel:\"strict\",validationAction:\"error\"};\n if(db.getCollectionNames().includes(name)) db.runCommand({collMod:name,...options});\n else db.createCollection(name,options);\n for(const [keys,options] of model.indexes) db.getCollection(name).createIndex(keys,options);\n}\n";
await writeFile("database/mongodb/setup.js",header+code);
console.log("Exported mongosh setup from canonical validators and indexes.");

