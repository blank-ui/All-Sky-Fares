const express = require("express");
const db = require("../db");
const v = require("../validate");
const { USER_COLUMNS, STAFF_ROLES, hashPassword, verifyPassword, publicUser, requirePermission, audit, rateLimit } = require("../auth");
const { HttpError, ah, utcNow, digest, tokenUrlsafe, uuid } = require("../util");
const bk = require("../bookings");
const documents = require("../documents");
const pdf = require("../pdf");

function customerBooking(doc) {
  const iso = (v) => (v instanceof Date ? v.toISOString() : v ?? null);
  return {
    booking_reference: doc.booking_reference ?? null,
    airline_pnr: doc.airline_pnr ?? null,
    status: doc.status ?? null,
    booking_mode: doc.booking_mode || "instant",
    created_at: iso(doc.created_at),
    passengers: (doc.passengers || []).map((p) => ({ given_name: p.given_name || "", family_name: p.family_name || "", type: p.type || "adult" })),
    tickets: doc.tickets || [],
    slices: doc.slices || [],
    airline: doc.airline || null,
    customer_total: doc.customer_total ?? null,
    currency: doc.currency || "USD",
    payment_status: doc.payment_status ?? null,
    payment_method: doc.payment_method ?? null,
    paid_at: iso(doc.paid_at),
    payment_required_by: iso(doc.payment_required_by),
    cancelled_at: iso(doc.cancelled_at),
    refund_amount: doc.refund_amount ?? null,
    refund_status: doc.refund_status ?? null,
    airline_change: Boolean(doc.airline_change),
    can_cancel: bk.canCancel(doc),
    has_documents: !["PROCESSING", "AWAITING_PAYMENT", "PAYING"].includes(doc.status),
  };
}

function router(logger = console) {
  const r = express.Router();

  r.get("/my/profile", requirePermission("profile.read"), (req, res) => res.json({ user: publicUser(req.user) }));

  r.patch("/my/profile", requirePermission("profile.write"), ah(async (req, res) => {
    const b = v.body(req);
    const updates = {};
    if (b.first_name != null) updates.first_name = v.str(b, "first_name", { min: 1, max: 80, label: "First name" }).trim();
    if (b.last_name != null) updates.last_name = v.str(b, "last_name", { min: 1, max: 80, label: "Last name" }).trim();
    if (b.phone != null) updates.phone = (v.str(b, "phone", { required: false, max: 40, label: "Phone" }) || "").trim();
    const keys = Object.keys(updates);
    if (keys.length) {
      await db.execute(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, ...keys.map((k) => updates[k]), utcNow(), req.user.id);
      await audit(req.user.id, "customer.profile_updated", { fields: keys.sort() });
    }
    res.json({ user: publicUser(await db.fetchOne(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, req.user.id)) });
  }));

  r.post("/my/change-password", requirePermission("profile.write"), ah(async (req, res) => {
    const b = v.body(req);
    const next = v.password(b, "new_password");
    const record = await db.fetchOne("SELECT password_hash, password_set FROM users WHERE id = ?", req.user.id);
    if (!record) throw new HttpError(400, "Your current password is incorrect.");
    // Accounts made at guest checkout (signed in with an email code) set their first password here.
    if (record.password_set) {
      const current = v.str(b, "current_password", { label: "Current password", max: 200 });
      if (!(await verifyPassword(current, record.password_hash))) throw new HttpError(400, "Your current password is incorrect.");
    }
    await db.execute("UPDATE users SET password_hash = ?, password_set = 1, updated_at = ? WHERE id = ?", await hashPassword(next), utcNow(), req.user.id);
    // Keep this session, revoke every other one.
    await db.execute("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", req.user.id, digest(req.cookies.access_token || ""));
    await audit(req.user.id, "customer.password_changed");
    res.json({ message: "Password updated." });
  }));

  // Everything we hold about the signed-in customer (GDPR/CCPA access request).
  r.get("/my/data", requirePermission("profile.read"), ah(async (req, res) => {
    await rateLimit(`export:${req.user.id}`, 10, 60);
    const bookings = await db.fetchAll("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at", req.user.id);
    for (const b of bookings) for (const k of ["idempotency_key", "applied_rule", "crm_last_error", "crm_booking_id"]) delete b[k];
    res.json({
      exported_at: utcNow().toISOString(),
      profile: { ...publicUser(req.user), created_at: req.user.created_at },
      bookings,
      support_requests: await db.fetchAll("SELECT id, subject, message, booking_reference, status, created_at FROM support_requests WHERE user_id = ?", req.user.id),
    });
  }));

  // Erases the account; booking records are kept (anonymised login) where tax and aviation law require it.
  r.post("/my/delete-account", requirePermission("profile.write"), ah(async (req, res) => {
    const b = v.body(req);
    const user = req.user;
    const record = await db.fetchOne("SELECT password_hash, password_set FROM users WHERE id = ?", user.id);
    if (!record) throw new HttpError(400, "Your password is incorrect.");
    if (record.password_set) {
      if (!(await verifyPassword(v.str(b, "password", { label: "Password", max: 200 }), record.password_hash))) throw new HttpError(400, "Your password is incorrect.");
    } else if (String(b.confirm || "").toUpperCase() !== "DELETE") {
      throw new HttpError(400, 'Type DELETE to confirm.');
    }
    if (STAFF_ROLES.has(user.role)) throw new HttpError(400, "Staff accounts are removed by a super admin.");
    const hasBookings = await db.fetchOne("SELECT 1 AS x FROM bookings WHERE user_id = ? LIMIT 1", user.id);
    for (const table of ["support_requests", "sessions", "password_resets", "login_codes"]) await db.execute(`DELETE FROM ${table} WHERE user_id = ?`, user.id);
    if (hasBookings) {
      await db.execute(
        "UPDATE users SET email = ?, first_name = 'Deleted', last_name = 'User', phone = '', status = 'deleted', password_hash = ?, updated_at = ? WHERE id = ?",
        `deleted-${user.id}@deleted.invalid`, await hashPassword(tokenUrlsafe(32)), utcNow(), user.id,
      );
    } else {
      await db.execute("DELETE FROM users WHERE id = ?", user.id);
    }
    await audit(null, "customer.account_deleted", { user_id: user.id, kept_bookings: Boolean(hasBookings) });
    res.clearCookie("access_token", { path: "/" });
    res.json({ deleted: true });
  }));

  r.get("/my/bookings", requirePermission("bookings.own"), ah(async (req, res) => {
    const docs = await db.fetchAll("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 200", req.user.id);
    res.json({ bookings: docs.map(customerBooking) });
  }));

  r.get("/my/bookings/:reference", requirePermission("bookings.own"), ah(async (req, res) => {
    const doc = await db.fetchOne("SELECT * FROM bookings WHERE booking_reference = ? AND user_id = ?", req.params.reference, req.user.id);
    if (!doc) throw new HttpError(404, "Booking not found");
    res.json({ booking: customerBooking(doc) });
  }));

  const ownBooking = async (req) => {
    const doc = await db.fetchOne("SELECT * FROM bookings WHERE booking_reference = ? AND user_id = ?", req.params.reference, req.user.id);
    if (!doc) throw new HttpError(404, "Booking not found");
    return doc;
  };

  r.get("/my/bookings/:reference/:doc(eticket|invoice)", requirePermission("bookings.own"), ah(async (req, res) => {
    const doc = await ownBooking(req);
    if (req.query.format === "pdf") {
      const buf = req.params.doc === "eticket" ? await pdf.eticketPdf(doc) : await pdf.invoicePdf(doc);
      return res.type("application/pdf")
        .set({
          "Content-Disposition": `attachment; filename="${req.params.doc === "eticket" ? "E-ticket" : "Invoice"}-${doc.booking_reference}.pdf"`,
          "Cache-Control": "no-store",
        })
        .send(buf);
    }
    res.type("html").set("Cache-Control", "no-store").send(req.params.doc === "eticket" ? documents.renderEticket(doc) : documents.renderInvoice(doc));
  }));

  r.post("/my/bookings/:reference/cancel/quote", requirePermission("bookings.own"), ah(async (req, res) => {
    res.json({ quote: await bk.cancellationQuote(await ownBooking(req), logger) });
  }));

  r.post("/my/bookings/:reference/cancel/confirm", requirePermission("bookings.own"), ah(async (req, res) => {
    const updated = await bk.confirmCancellation(await ownBooking(req), req.user.id, logger);
    await audit(req.user.id, "customer.booking_cancelled", { booking_reference: updated.booking_reference, refund: updated.refund_amount });
    res.json({ booking: customerBooking(updated) });
  }));

  r.post("/support", requirePermission("support.create"), ah(async (req, res) => {
    const b = v.body(req);
    const ticket = {
      id: uuid(), user_id: req.user.id, email: req.user.email,
      subject: v.str(b, "subject", { min: 1, max: 140, label: "Subject" }).trim(),
      message: v.str(b, "message", { min: 1, max: 4000, label: "Message" }).trim(),
      booking_reference: (v.str(b, "booking_reference", { required: false, max: 40 }) || "").trim() || null,
      status: "open", created_at: utcNow(),
    };
    await db.insert("support_requests", ticket);
    await audit(req.user.id, "customer.support_created", { support_id: ticket.id });
    res.json({ id: ticket.id, status: ticket.status, created_at: ticket.created_at.toISOString() });
  }));

  r.get("/support", requirePermission("support.create"), ah(async (req, res) => {
    res.json({ tickets: await db.fetchAll("SELECT id, subject, message, booking_reference, status, created_at FROM support_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", req.user.id) });
  }));

  return r;
}

module.exports = { router, customerBooking };
