// Attempt limits under parallel requests: every guess must be counted before it's checked.
const test = require("node:test");
const assert = require("node:assert");
const express = require("express");
const cookieParser = require("cookie-parser");

const db = require("../src/db");
const { digest } = require("../src/util");
const { rateLimit } = require("../src/auth");

let codes;
let limits;

const tick = () => new Promise((r) => setImmediate(r)); // let parallel requests interleave like real queries

async function fakeQuery(sql, args) {
  await tick();
  const clean = sql.replace(/\s+/g, " ");
  if (clean.startsWith("INSERT INTO rate_limits")) {
    const [bucket, now, expired] = args;
    const row = limits.get(bucket);
    if (!row || row.window_start < expired) limits.set(bucket, { window_start: now, hits: 1 });
    else row.hits += 1;
    return 1;
  }
  if (clean.startsWith("SELECT hits FROM rate_limits")) return limits.has(args[0]) ? [{ hits: limits.get(args[0]).hits }] : [];
  if (clean.startsWith("SELECT * FROM login_codes WHERE email = ?")) return codes.filter((c) => c.email === args[0] && !c.used).map((c) => ({ ...c }));
  if (clean.startsWith("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ?")) {
    const c = codes.find((x) => x.id === args[0]);
    if (!c || c.attempts >= args[1]) return 0;
    c.attempts += 1;
    return 1;
  }
  if (clean.startsWith("UPDATE login_codes SET used = 1")) {
    const c = codes.find((x) => x.id === args[0] && !x.used);
    if (!c) return 0;
    c.used = true;
    return 1;
  }
  if (clean.startsWith("SELECT * FROM users WHERE id = ?")) return [{ id: "user-1", email: "admin@example.com", role: "SUPER_ADMIN", status: "active" }];
  throw new Error(`fake db: unhandled SQL ${clean}`);
}

db.fetchAll = (sql, ...args) => fakeQuery(sql, args);
db.fetchOne = async (sql, ...args) => (await fakeQuery(sql, args))[0] || null;
db.execute = (sql, ...args) => fakeQuery(sql, args);
db.insert = async () => {};

function reset() {
  limits = new Map();
  codes = [{ id: "code-1", user_id: "user-1", email: "admin@example.com", code_hash: digest("123456"), attempts: 0, used: false, expires_at: new Date(Date.now() + 600000).toISOString(), created_at: new Date().toISOString() }];
}

async function withApi(fn) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", require("../src/routes/auth")({ info() {}, warn() {}, error() {} }));
  app.use((err, req, res, next) => res.status(err.status || 500).json({ detail: err.detail })); // eslint-disable-line no-unused-vars
  const server = app.listen(0);
  try {
    await fn(`http://127.0.0.1:${server.address().port}/api`);
  } finally {
    server.close();
  }
}

const verify = (base, code) => fetch(`${base}/auth/login-code/verify`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@example.com", code }),
}).then((r) => r.status);

test("parallel wrong sign-in codes all count, so the right code is refused after 5", async () => {
  reset();
  await withApi(async (base) => {
    const statuses = await Promise.all(Array.from({ length: 20 }, (_, i) => verify(base, String(100000 + i))));
    assert.ok(statuses.every((s) => s === 400));
    assert.equal(codes[0].attempts, 5, "attempts never pass the limit");
    assert.equal(await verify(base, "123456"), 400, "the code is dead after 5 guesses");
  });
});

test("the right code within the limit signs in", async () => {
  reset();
  await withApi(async (base) => assert.equal(await verify(base, "123456"), 200));
});

test("rate limit: never more than `limit` through in parallel, exactly `limit` one at a time", async () => {
  reset();
  const parallel = await Promise.allSettled(Array.from({ length: 12 }, () => rateLimit("burst", 5, 60)));
  assert.ok(parallel.filter((r) => r.status === "fulfilled").length <= 5);
  let passed = 0;
  for (let i = 0; i < 7; i += 1) passed += await rateLimit("steady", 5, 60).then(() => 1, () => 0);
  assert.equal(passed, 5);
});
