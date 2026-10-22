// MySQL/MariaDB access: a lazy mysql2 pool and small query helpers.
// Connection settings come from the environment: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
// Times are stored as UTC DATETIME(6) and returned as ISO strings.
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const JSON_COLUMNS = new Set(["passengers", "slices", "meta", "value", "tickets", "conditions"]);
const BOOL_COLUMNS = new Set(["active", "live_mode", "used", "price_live", "airline_change"]);

let pool = null;

function connect() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: "utf8mb4",
      timezone: "Z",
      decimalNumbers: true,
      connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
      connectTimeout: 10000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      waitForConnections: true,
      maxIdle: 5,
      idleTimeout: 30000,
    });
    pool.on("connection", (conn) => conn.query("SET time_zone = '+00:00'"));
  }
  return pool;
}

async function close() {
  if (pool) {
    const p = pool;
    pool = null;
    await p.end().catch(() => {});
  }
}

function encode(value) {
  if (value === undefined) return null;
  if (value instanceof Date || value === null || Buffer.isBuffer(value)) return value;
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

function decode(row) {
  if (!row) return null;
  const out = {};
  for (const [key, raw] of Object.entries(row)) {
    let value = raw;
    if (value instanceof Date) value = value.toISOString();
    else if (JSON_COLUMNS.has(key) && typeof value === "string") {
      try { value = JSON.parse(value); } catch { /* keep text */ }
    } else if (BOOL_COLUMNS.has(key) && value !== null) value = Boolean(value);
    out[key] = value;
  }
  return out;
}

async function fetchAll(sql, ...args) {
  const [rows] = await connect().query(sql, args.map(encode));
  return rows.map(decode);
}

async function fetchOne(sql, ...args) {
  return (await fetchAll(sql, ...args))[0] || null;
}

/** Runs a write and returns the affected row count. */
async function execute(sql, ...args) {
  const [result] = await connect().query(sql, args.map(encode));
  return result.affectedRows;
}

const cols = (keys) => keys.map((k) => `\`${k}\``).join(", ");

async function insert(table, row) {
  const keys = Object.keys(row);
  await execute(`INSERT INTO \`${table}\` (${cols(keys)}) VALUES (${keys.map(() => "?").join(", ")})`, ...keys.map((k) => row[k]));
}

async function insertMany(table, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  await connect().query(`INSERT INTO \`${table}\` (${cols(keys)}) VALUES ?`, [rows.map((r) => keys.map((k) => encode(r[k])))]);
}

async function upsert(table, row, keyColumns) {
  const keys = Object.keys(row);
  const updates = keys.filter((k) => !keyColumns.includes(k)).map((k) => `\`${k}\` = VALUES(\`${k}\`)`).join(", ");
  await execute(
    `INSERT INTO \`${table}\` (${cols(keys)}) VALUES (${keys.map(() => "?").join(", ")}) ON DUPLICATE KEY UPDATE ${updates}`,
    ...keys.map((k) => row[k]),
  );
}

const isDuplicate = (err) => err && err.code === "ER_DUP_ENTRY";

async function ping() {
  await fetchOne("SELECT 1 AS ok");
}

/** Applies migrations/NNN_*.sql in order, once each, tracked in schema_migrations. */
async function runMigrations() {
  const conn = await connect().getConnection();
  const applied = [];
  try {
    await conn.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, applied_at DATETIME(6) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    const [doneRows] = await conn.query("SELECT version FROM schema_migrations");
    const done = new Set(doneRows.map((r) => r.version));
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      if (done.has(version)) continue;
      const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8")
        .split(/\r?\n/).filter((line) => !line.trim().startsWith("--")).join("\n");
      for (const statement of text.split(";").map((s) => s.trim()).filter(Boolean)) {
        await conn.query(statement);
      }
      await conn.query("INSERT INTO schema_migrations (version, applied_at) VALUES (?, UTC_TIMESTAMP(6))", [version]);
      applied.push(version);
    }
  } finally {
    conn.release();
  }
  return applied;
}

module.exports = { connect, close, fetchAll, fetchOne, execute, insert, insertMany, upsert, isDuplicate, ping, runMigrations };
