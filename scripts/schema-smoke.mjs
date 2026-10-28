// Safe schema verification retains its isolated databases.
process.argv.push("--schema-only");
await import("./college-integration.mjs");
