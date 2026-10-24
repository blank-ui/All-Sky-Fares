// Provider credentials live Fernet-encrypted in the app_secrets table; APP_SECRETS_KEY decrypts them.
// The format is compatible with Python's cryptography.fernet, so existing rows keep working.
const crypto = require("crypto");
const db = require("./db");
const { utcNow } = require("./util");
const { storedControlSync } = require("./settings");

const SECRET_NAMES = [
  "DUFFEL_TEST_API_KEY", "DUFFEL_LIVE_API_KEY", "DUFFEL_API_KEY", "DUFFEL_WEBHOOK_SECRET", "DUFFEL_PAYMENTS", "RESEND_API_KEY", "SENDER_EMAIL",
  "CRM_WEBHOOK_URL", "CRM_WEBHOOK_SECRET", "HOTELS_PROVIDER_KEY", "CARS_PROVIDER_KEY",
];
const secrets = new Map();

const b64urlDecode = (s) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const b64urlEncode = (b) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");

class Fernet {
  constructor(key) {
    const raw = b64urlDecode(key);
    if (raw.length !== 32) throw new Error("APP_SECRETS_KEY must be a 32-byte url-safe base64 key");
    this.signKey = raw.subarray(0, 16);
    this.encKey = raw.subarray(16);
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const ts = Buffer.alloc(8);
    ts.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)));
    const cipher = crypto.createCipheriv("aes-128-cbc", this.encKey, iv);
    const body = Buffer.concat([Buffer.from([0x80]), ts, iv, cipher.update(text, "utf8"), cipher.final()]);
    const mac = crypto.createHmac("sha256", this.signKey).update(body).digest();
    return b64urlEncode(Buffer.concat([body, mac]));
  }

  decrypt(token) {
    const data = b64urlDecode(token);
    if (data.length < 57 || data[0] !== 0x80) throw new Error("InvalidToken");
    const body = data.subarray(0, data.length - 32);
    const mac = data.subarray(data.length - 32);
    const expected = crypto.createHmac("sha256", this.signKey).update(body).digest();
    if (!crypto.timingSafeEqual(mac, expected)) throw new Error("InvalidToken");
    const decipher = crypto.createDecipheriv("aes-128-cbc", this.encKey, body.subarray(9, 25));
    return Buffer.concat([decipher.update(body.subarray(25)), decipher.final()]).toString("utf8");
  }
}

function cipher() {
  const key = (process.env.APP_SECRETS_KEY || "").trim();
  return key ? new Fernet(key) : null;
}

/** A provider setting: the database value wins, the environment is the fallback. */
function cfg(name, fallback = "") {
  // SECRETS_PREFER_ENV=true (local testing only) lets .env values override the stored ones.
  if (process.env.SECRETS_PREFER_ENV === "true" && process.env[name]) return String(process.env[name]).trim();
  return String(secrets.get(name) || process.env[name] || fallback || "").trim();
}

async function loadSecrets(logger) {
  const c = cipher();
  if (!c) {
    logger.warn("APP_SECRETS_KEY not set; provider credentials are read from environment variables only");
    return 0;
  }
  const loaded = new Map();
  for (const row of await db.fetchAll("SELECT name, value_encrypted FROM app_secrets")) {
    try {
      loaded.set(row.name, c.decrypt(row.value_encrypted));
    } catch {
      logger.error(`Could not decrypt secret ${row.name}; check APP_SECRETS_KEY`);
    }
  }
  secrets.clear();
  for (const [k, v] of loaded) secrets.set(k, v);
  return loaded.size;
}

async function storeSecret(name, value, actorId = null) {
  const c = cipher();
  if (!c) throw new Error("APP_SECRETS_KEY is not configured");
  await db.upsert("app_secrets", { name, value_encrypted: c.encrypt(value), updated_at: utcNow(), updated_by: actorId }, ["name"]);
  secrets.set(name, value);
}

const crmWebhookReady = () => Boolean(cfg("CRM_WEBHOOK_URL") && cfg("CRM_WEBHOOK_SECRET"));

/** The Duffel key for the environment an admin picked (test or live). The older single DUFFEL_API_KEY
 * still works: alone when no environment is picked, or for the picked one when it's that kind of key. */
// shortcut: a booking started under one key is followed up with whichever key is active now, so don't switch
// mid-checkout; pass booking.live_mode through duffelCall if switching while bookings are in flight becomes common.
function duffelKey(env = storedControlSync("duffel_environment")) {
  const legacy = cfg("DUFFEL_API_KEY");
  if (!env) return legacy;
  return cfg(`DUFFEL_${env.toUpperCase()}_API_KEY`) || (legacy.startsWith(`duffel_${env}_`) ? legacy : "");
}

function duffelMode() {
  const key = duffelKey();
  if (!key) return "missing";
  return key.startsWith("duffel_live_") ? "live" : "test";
}

/** Card checkout through Duffel Payments is used once it's switched on (DUFFEL_PAYMENTS=enabled).
 * Otherwise bookings are held with the airline (real PNR, pay later) or sent as requests. */
const cardPaymentsEnabled = () => {
  const ctrl = storedControlSync("duffel_payments"); // unset: the DUFFEL_PAYMENTS credential decides
  if (ctrl === "disabled") return false;
  if (ctrl === "enabled") return true;
  return cfg("DUFFEL_PAYMENTS").toLowerCase() === "enabled";
};

function bookingMode() {
  return cardPaymentsEnabled() ? "card" : "hold";
}

module.exports = { SECRET_NAMES, secrets, Fernet, cipher, cfg, loadSecrets, storeSecret, crmWebhookReady, duffelKey, duffelMode, bookingMode, cardPaymentsEnabled };
