const crypto = require("crypto");

class HttpError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

const utcNow = () => new Date();
const addMs = (date, ms) => new Date(date.getTime() + ms);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const digest = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
const tokenUrlsafe = (bytes) => crypto.randomBytes(bytes).toString("base64url");
const uuid = () => crypto.randomUUID();

function parseIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function timingSafeEqualStr(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Wraps an async route so thrown errors reach the error handler. */
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, utcNow, addMs, MINUTE, HOUR, DAY, digest, tokenUrlsafe, uuid, parseIso, timingSafeEqualStr, round2, ah };
