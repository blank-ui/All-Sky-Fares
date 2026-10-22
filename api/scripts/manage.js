// Operational commands:
//   node scripts/manage.js migrate          create/upgrade tables
//   node scripts/manage.js import-secrets   copy provider credentials from .env into app_secrets (encrypted)
//   node scripts/manage.js gen-secrets-key  print a new APP_SECRETS_KEY
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const db = require("../src/db");
const secrets = require("../src/secrets");
const { loadLocalPricingRules } = require("../src/pricing");
const { utcNow, uuid } = require("../src/util");

async function migrate() {
  const applied = await db.runMigrations();
  console.log("Applied:", applied.length ? applied.join(", ") : "nothing (schema is up to date)");
  if (!(await db.fetchOne("SELECT id FROM route_markups LIMIT 1"))) {
    const rules = loadLocalPricingRules();
    await db.insertMany("route_markups", rules.map((r) => ({
      id: uuid(), origin: r.origin, destination: r.destination,
      markup_amount: r.markup_amount || 0, markup_percent: r.markup_percent || 0, created_at: utcNow(), updated_at: utcNow(),
    })));
    console.log(`Seeded ${rules.length} route markup(s) from pricing_rules.json`);
  }
  const tables = (await db.fetchAll("SHOW TABLES")).map((r) => Object.values(r)[0]).sort();
  console.log("Tables:", tables.join(", "));
}

async function importSecrets() {
  if (!secrets.cipher()) throw new Error("APP_SECRETS_KEY is not set in .env (run: node scripts/manage.js gen-secrets-key)");
  await db.runMigrations();
  const imported = [];
  for (const name of secrets.SECRET_NAMES) {
    const value = (process.env[name] || "").trim();
    if (value) {
      await secrets.storeSecret(name, value);
      imported.push(name);
    }
  }
  console.log("Imported:", imported.length ? imported.join(", ") : "nothing (no provider values in the environment)");
}

async function main() {
  const command = process.argv[2];
  if (command === "gen-secrets-key") {
    console.log(crypto.randomBytes(32).toString("base64url") + "=");
    return;
  }
  try {
    if (command === "migrate") await migrate();
    else if (command === "import-secrets") await importSecrets();
    else console.log("usage: node scripts/manage.js migrate | import-secrets | gen-secrets-key");
  } finally {
    await db.close();
  }
}

main().catch((exc) => {
  console.error(exc.message);
  process.exit(1);
});
