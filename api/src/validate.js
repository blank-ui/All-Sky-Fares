// Request body validation. Errors are 422 with a plain-text `detail`, which the React app shows as-is.
const { HttpError } = require("./util");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PW_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;
const AIRPORT_CODE = /^([A-Z]{3}|\*)$/;

const fail = (msg) => { throw new HttpError(422, msg); };

function body(req) {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
}

function str(obj, key, { required = true, min = 0, max = 10000, label = key } = {}) {
  const v = obj[key];
  if (v === undefined || v === null || v === "") {
    if (required) fail(`${label} is required`);
    return v === "" && !required ? "" : null;
  }
  if (typeof v !== "string") fail(`${label} must be text`);
  if (v.length < min) fail(min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`);
  if (v.length > max) fail(`${label} must be at most ${max} characters`);
  return v;
}

function email(obj, key, { required = true } = {}) {
  const v = str(obj, key, { required, max: 254, label: "Email" });
  if (v && !EMAIL.test(v.trim())) fail("Enter a valid email address");
  return v ? v.trim() : v;
}

function password(obj, key) {
  const v = str(obj, key, { label: "Password", max: 200 });
  if (!PW_POLICY.test(v)) fail("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
  return v;
}

function int(obj, key, { min, max, fallback }) {
  const v = obj[key] === undefined || obj[key] === null ? fallback : Number(obj[key]);
  if (!Number.isInteger(v) || v < min || v > max) fail(`${key} must be a whole number between ${min} and ${max}`);
  return v;
}

function num(obj, key, { min, max, fallback = 0 }) {
  const v = obj[key] === undefined || obj[key] === null || obj[key] === "" ? fallback : Number(obj[key]);
  if (!Number.isFinite(v) || v < min || v > max) fail(`${key} must be a number between ${min} and ${max}`);
  return v;
}

function oneOf(obj, key, options, fallback) {
  const v = obj[key] === undefined || obj[key] === null ? fallback : obj[key];
  if (!options.includes(v)) fail(`${key} must be one of: ${options.join(", ")}`);
  return v;
}

function normalizeAirport(value) {
  const code = String(value || "").trim().toUpperCase();
  if (["", "ANY", "ALL"].includes(code)) return "*";
  if (!AIRPORT_CODE.test(code)) throw new Error(`'${value}' is not a 3-letter IATA airport code (use * for any airport)`);
  return code;
}

module.exports = { body, str, email, password, int, num, oneOf, normalizeAirport, fail, PW_POLICY };
