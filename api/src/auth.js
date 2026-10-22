const bcrypt = require("bcryptjs");
const db = require("./db");
const { HttpError, utcNow, addMs, HOUR, MINUTE, digest, tokenUrlsafe, uuid } = require("./util");

const ROLE_PERMISSIONS = {
  CUSTOMER: ["flights.search", "bookings.own", "profile.read", "profile.write", "support.create", "hotels.search", "cars.search"],
  SALES_AGENT: ["flights.search", "bookings.own", "bookings.read", "bookings.manage", "customers.read", "customers.manage", "payments.manage", "pricing.read"],
  ADMIN: ["flights.search", "bookings.own", "bookings.read", "bookings.manage", "customers.read", "customers.manage", "payments.read", "pricing.read", "pricing.manage", "crm.read", "audit.read", "settings.read", "settings.write"],
  SUPER_ADMIN: ["*"],
};
const STAFF_ROLES = new Set(["SALES_AGENT", "ADMIN", "SUPER_ADMIN"]);
const USER_COLUMNS = "id, email, first_name, last_name, phone, role, status, password_set, created_at";
const SESSION_HOURS = 8;

const hashPassword = (pw) => bcrypt.hash(pw, 12);
const verifyPassword = (pw, hash) => bcrypt.compare(String(pw || ""), String(hash || "")).catch(() => false);

function publicUser(doc) {
  const role = doc.role || "CUSTOMER";
  return {
    id: doc.id, email: doc.email,
    first_name: doc.first_name || "", last_name: doc.last_name || "",
    phone: doc.phone || "", role,
    status: doc.status || "active",
    permissions: [...(ROLE_PERMISSIONS[role] || [])].sort(),
    is_staff: STAFF_ROLES.has(role),
    // Accounts made at guest checkout have no password until the customer sets one.
    password_set: doc.password_set === undefined ? true : Boolean(doc.password_set),
  };
}

/** Sets the HttpOnly session cookie and returns the sessions row to insert. */
function newSession(res, userId) {
  const raw = tokenUrlsafe(48);
  res.cookie("access_token", raw, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: SESSION_HOURS * HOUR,
    path: "/",
  });
  return { token_hash: digest(raw), user_id: userId, expires_at: addMs(utcNow(), SESSION_HOURS * HOUR), created_at: utcNow() };
}

async function loadUser(req) {
  const raw = req.cookies && req.cookies.access_token;
  if (!raw) throw new HttpError(401, "Authentication required");
  const session = await db.fetchOne("SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?", digest(raw), utcNow());
  if (!session) throw new HttpError(401, "Session expired or invalid");
  const user = await db.fetchOne(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, session.user_id);
  if (!user || (user.status || "active") !== "active") throw new HttpError(401, "Account unavailable");
  return user;
}

const currentUser = (req, res, next) => loadUser(req).then((u) => { req.user = u; next(); }).catch(next);

/** Signed-in user if there is one, otherwise req.user = null (guest checkout). */
const optionalUser = (req, res, next) => loadUser(req)
  .then((u) => { req.user = u; }, (exc) => {
    if (exc.status !== 401) throw exc;
    req.user = null;
  })
  .then(() => next(), next);

const requireRoles = (...roles) => (req, res, next) =>
  loadUser(req).then((u) => {
    if (!roles.includes(u.role)) throw new HttpError(403, "You do not have permission for this area");
    req.user = u;
    next();
  }).catch(next);

const requirePermission = (permission) => (req, res, next) =>
  loadUser(req).then((u) => {
    const allowed = ROLE_PERMISSIONS[u.role] || [];
    if (!allowed.includes("*") && !allowed.includes(permission)) throw new HttpError(403, "You do not have permission for this action");
    req.user = u;
    next();
  }).catch(next);

async function audit(actorId, action, meta = {}) {
  await db.insert("audit_log", { id: uuid(), actor_id: actorId || null, action, meta, at: utcNow() });
}

/** Fixed-window limiter backed by the rate_limits table. The hit is counted in one statement before
 * the check, so parallel requests can't all read the same old count. */
async function rateLimit(bucket, limit, windowMinutes, message = "Too many requests. Please try again later.") {
  const now = utcNow();
  const expired = addMs(now, -windowMinutes * MINUTE);
  await db.execute(
    "INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE " +
    "hits = IF(window_start < ?, 1, hits + 1), window_start = IF(window_start < ?, VALUES(window_start), window_start)",
    bucket, now, expired, expired,
  );
  const row = await db.fetchOne("SELECT hits FROM rate_limits WHERE bucket = ?", bucket);
  if (row && row.hits > limit) throw new HttpError(429, message);
}

const clearRateLimit = (bucket) => db.execute("DELETE FROM rate_limits WHERE bucket = ?", bucket);

// Express's req.ip honours "trust proxy" (set to the one reverse proxy in front of the app).
const clientIp = (req) => req.ip || "unknown";

module.exports = {
  ROLE_PERMISSIONS, STAFF_ROLES, USER_COLUMNS, hashPassword, verifyPassword, publicUser, newSession,
  currentUser, optionalUser, requireRoles, requirePermission, audit, rateLimit, clearRateLimit, clientIp,
};
