// Customer emails about a booking: confirmation with the e-ticket and invoice attached as PDFs.
const db = require("./db");
const { renderBookingEmail, sendEmail } = require("./email");
const { eticketPdf, invoicePdf } = require("./pdf");
const { utcNow, addMs, HOUR, digest, tokenUrlsafe, uuid } = require("./util");
const { getControlSync } = require("./settings");

const APP_URL = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

/** Booking email to the account's address; accounts without a password get a link to set one (valid 7 days). */
async function emailBooking(booking, logger = console) {
  const mode = getControlSync("email_notifications");
  if (mode === "disabled") {
    logger.info(`[TEST MODE] Customer email suppressed for booking ${booking.booking_reference}`);
    return true;
  }
  const user = await db.fetchOne("SELECT id, email, password_set FROM users WHERE id = ?", booking.user_id);
  if (!user) return false;
  let account = { signInLink: `${APP_URL()}/login?next=bookings` };
  if (!user.password_set) {
    const raw = tokenUrlsafe(32);
    await db.execute("DELETE FROM password_resets WHERE user_id = ?", user.id);
    await db.insert("password_resets", {
      id: uuid(), user_id: user.id, email: user.email, token_hash: digest(raw), otp_hash: digest(tokenUrlsafe(16)),
      expires_at: addMs(utcNow(), 7 * 24 * HOUR), used: false, created_at: utcNow(),
    });
    account = { setupLink: `${APP_URL()}/reset-password?token=${raw}&welcome=1` };
  }
  // Paid and held bookings get their e-ticket and invoice as PDFs; requests have no documents yet.
  let attachments;
  if (["CONFIRMED", "ON_HOLD"].includes(booking.status)) {
    const ref = booking.booking_reference;
    attachments = [
      { filename: `E-ticket-${ref}.pdf`, content: await eticketPdf(booking) },
      { filename: `Invoice-INV-${ref}.pdf`, content: await invoicePdf(booking) },
    ];
    account.attached = true;
  }
  const subject = booking.status === "CONFIRMED"
    ? `Your e-ticket and invoice · Booking ${booking.booking_reference}`
    : `Booking ${booking.booking_reference} · All Sky Fares`;
  return sendEmail(user.email, subject, renderBookingEmail(booking, account), logger, attachments);
}

/** Fire and forget: a failed email never fails the booking. */
function emailBookingInBackground(booking, logger = console) {
  emailBooking(booking, logger).catch((exc) => logger.warn(`Booking email for ${booking.booking_reference} failed: ${exc.message}`));
}

module.exports = { emailBooking, emailBookingInBackground };
