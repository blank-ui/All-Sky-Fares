const crypto = require("crypto");
const express = require("express");
const db = require("../db");
const v = require("../validate");
const { renderResetEmail, renderLoginCodeEmail, sendEmail } = require("../email");
const { hashPassword, verifyPassword, publicUser, newSession, currentUser, audit, rateLimit, clearRateLimit, clientIp } = require("../auth");
const { HttpError, ah, utcNow, addMs, MINUTE, digest, tokenUrlsafe, uuid, parseIso, timingSafeEqualStr } = require("../util");

const OTP_MAX_ATTEMPTS = 5;
const APP_URL = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

module.exports = (logger) => {
  const r = express.Router();

  r.post("/auth/register", ah(async (req, res) => {
    await rateLimit(`register:${clientIp(req)}`, 10, 60, "Too many sign-ups from this network. Please try again in an hour.");
    const b = v.body(req);
    const email = v.email(b, "email").toLowerCase();
    const password = v.password(b, "password");
    const firstName = v.str(b, "first_name", { min: 1, max: 80, label: "First name" });
    const lastName = v.str(b, "last_name", { min: 1, max: 80, label: "Last name" });
    const phone = v.str(b, "phone", { required: false, max: 40, label: "Phone" }) || "";
    const existsMsg = "An account with this email may already exist. Try signing in or resetting your password.";
    if (await db.fetchOne("SELECT id FROM users WHERE email = ?", email)) throw new HttpError(409, existsMsg);
    const doc = {
      id: uuid(), email, password_hash: await hashPassword(password),
      first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(),
      role: "CUSTOMER", status: "active", created_at: utcNow(),
    };
    try {
      await db.insert("users", doc);
    } catch (exc) {
      if (db.isDuplicate(exc)) throw new HttpError(409, existsMsg);
      throw exc;
    }
    await db.insert("sessions", newSession(res, doc.id));
    await audit(doc.id, "customer.signup", { email });
    res.json({ user: publicUser(doc), message: "Account created" });
  }));

  r.post("/auth/login", ah(async (req, res) => {
    const b = v.body(req);
    const email = v.email(b, "email").toLowerCase();
    const password = v.str(b, "password", { label: "Password", max: 200 });
    // Each try is counted before the password is checked: 5 per network and email, 20 per email from anywhere.
    const locked = "Unable to sign in right now. Try again later.";
    const buckets = [`login:${clientIp(req)}:${email}`, `login:${email}`];
    await rateLimit(buckets[0], 5, 15, locked);
    await rateLimit(buckets[1], 20, 60, locked);
    const user = await db.fetchOne("SELECT * FROM users WHERE email = ?", email);
    if (!user || (user.status || "active") !== "active" || !(await verifyPassword(password, user.password_hash))) {
      await audit(user ? user.id : null, "auth.login_failed", { email });
      throw new HttpError(401, "Unable to sign in. Please check your credentials.");
    }
    for (const bucket of buckets) await clearRateLimit(bucket);
    await db.insert("sessions", newSession(res, user.id));
    await audit(user.id, "auth.login");
    res.json({ user: publicUser(user) });
  }));

  r.get("/auth/me", currentUser, (req, res) => res.json({ user: publicUser(req.user) }));

  r.post("/auth/logout", ah(async (req, res) => {
    const raw = req.cookies && req.cookies.access_token;
    if (raw) await db.execute("DELETE FROM sessions WHERE token_hash = ?", digest(raw));
    res.clearCookie("access_token", { path: "/" });
    res.json({ message: "Signed out" });
  }));

  r.post("/auth/forgot-password", ah(async (req, res) => {
    const email = v.email(v.body(req), "email").toLowerCase();
    await rateLimit(`forgot:${clientIp(req)}`, 10, 60);
    await rateLimit(`forgot:${email}`, 3, 60, "We've already sent reset instructions. Please check your inbox or try again later.");
    const user = await db.fetchOne("SELECT id, first_name FROM users WHERE email = ?", email);
    if (user) {
      const rawToken = tokenUrlsafe(32);
      const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
      await db.execute("DELETE FROM password_resets WHERE user_id = ?", user.id);
      await db.insert("password_resets", {
        id: uuid(), user_id: user.id, email, token_hash: digest(rawToken), otp_hash: digest(otp),
        expires_at: addMs(utcNow(), 30 * MINUTE), used: false, created_at: utcNow(),
      });
      const link = `${APP_URL()}/reset-password?token=${rawToken}`;
      await sendEmail(email, "Reset your All Sky Fares password", renderResetEmail(user.first_name || "", link, otp), logger);
      await audit(user.id, "auth.password_reset_requested", { email });
    }
    res.json({ message: "If an account exists for that email, we've sent reset instructions." });
  }));

  r.post("/auth/reset-password", ah(async (req, res) => {
    await rateLimit(`reset:${clientIp(req)}`, 20, 60);
    const b = v.body(req);
    const newPassword = v.password(b, "new_password");
    const token = v.str(b, "token", { required: false, max: 200 });
    const email = b.email ? v.email(b, "email").toLowerCase() : null;
    const otp = v.str(b, "otp", { required: false, max: 12 });
    let record = null;
    if (token) {
      record = await db.fetchOne("SELECT * FROM password_resets WHERE token_hash = ? AND used = 0", digest(token));
    } else if (email && otp) {
      // Look up by email and count guesses so the 6-digit code can't be brute-forced.
      const candidate = await db.fetchOne("SELECT * FROM password_resets WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1", email);
      // The guess is counted before it's compared, in one statement, so parallel guesses can't exceed the limit.
      if (candidate && (await db.execute("UPDATE password_resets SET otp_attempts = otp_attempts + 1 WHERE id = ? AND otp_attempts < ?", candidate.id, OTP_MAX_ATTEMPTS))
        && timingSafeEqualStr(candidate.otp_hash || "", digest(otp.trim()))) record = candidate;
    }
    const invalid = "This reset link or code is invalid or has expired.";
    const expiresAt = parseIso(record && record.expires_at);
    if (!record || !expiresAt || expiresAt <= utcNow()) throw new HttpError(400, invalid);
    const user = await db.fetchOne("SELECT id FROM users WHERE id = ?", record.user_id);
    if (!user) throw new HttpError(400, invalid);
    // Mark it used first (conditionally) so the same link can't be replayed concurrently.
    if (!(await db.execute("UPDATE password_resets SET used = 1, used_at = ? WHERE id = ? AND used = 0", utcNow(), record.id))) throw new HttpError(400, invalid);
    await db.execute("UPDATE users SET password_hash = ?, password_set = 1, updated_at = ? WHERE id = ?", await hashPassword(newPassword), utcNow(), user.id);
    await db.execute("DELETE FROM sessions WHERE user_id = ?", user.id);
    await audit(user.id, "auth.password_reset_completed");
    res.json({ message: "Password updated. Please sign in with your new password." });
  }));

  // Passwordless sign-in, step 1: email a 6-digit code. Same reply whether or not the account exists.
  r.post("/auth/login-code/request", ah(async (req, res) => {
    const email = v.email(v.body(req), "email").toLowerCase();
    await rateLimit(`login-code:${clientIp(req)}`, 15, 60);
    await rateLimit(`login-code:${email}`, 5, 60, "We've already sent several codes. Please check your inbox or try again later.");
    const user = await db.fetchOne("SELECT id, first_name, status FROM users WHERE email = ?", email);
    if (user && (user.status || "active") === "active") {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
      await db.execute("DELETE FROM login_codes WHERE user_id = ?", user.id);
      await db.insert("login_codes", { id: uuid(), user_id: user.id, email, code_hash: digest(code), attempts: 0, expires_at: addMs(utcNow(), 10 * MINUTE), used: false, created_at: utcNow() });
      await sendEmail(email, `${code} is your All Sky Fares sign-in code`, renderLoginCodeEmail(user.first_name || "", code), logger);
      await audit(user.id, "auth.login_code_requested", { email });
    }
    res.json({ message: "If an account exists for that email, we've sent a sign-in code. It expires in 10 minutes." });
  }));

  // Step 2: check the code (5 tries) and start a session.
  r.post("/auth/login-code/verify", ah(async (req, res) => {
    await rateLimit(`login-code-verify:${clientIp(req)}`, 30, 60);
    const b = v.body(req);
    const email = v.email(b, "email").toLowerCase();
    const code = v.str(b, "code", { min: 4, max: 12, label: "Code" }).replace(/\s/g, "");
    const invalid = "That code is incorrect or has expired. Request a new one.";
    const row = await db.fetchOne("SELECT * FROM login_codes WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1", email);
    const expiresAt = parseIso(row && row.expires_at);
    if (!row || !expiresAt || expiresAt <= utcNow()) throw new HttpError(400, invalid);
    // Count the guess before comparing, in one statement, so parallel guesses can't exceed the limit.
    if (!(await db.execute("UPDATE login_codes SET attempts = attempts + 1 WHERE id = ? AND attempts < ?", row.id, OTP_MAX_ATTEMPTS))) throw new HttpError(400, invalid);
    if (!timingSafeEqualStr(row.code_hash, digest(code))) throw new HttpError(400, invalid);
    if (!(await db.execute("UPDATE login_codes SET used = 1 WHERE id = ? AND used = 0", row.id))) throw new HttpError(400, invalid);
    const user = await db.fetchOne("SELECT * FROM users WHERE id = ?", row.user_id);
    if (!user || (user.status || "active") !== "active") throw new HttpError(400, invalid);
    await db.insert("sessions", newSession(res, user.id));
    await audit(user.id, "auth.login", { method: "email_code" });
    res.json({ user: publicUser(user) });
  }));

  return r;
};
