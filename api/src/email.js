const { Resend } = require("resend");
let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch {
  // optional
}
const { cfg } = require("./secrets");

function renderResetEmail(firstName, resetLink, otp) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0b1c3f">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:40px 20px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e9f2">
<tr><td style="padding:32px 40px;background:#0d1e42;color:#fff"><div style="font-size:11px;letter-spacing:.16em;font-weight:700">ALL SKY FARES</div><div style="font-size:22px;margin-top:6px">Reset your password</div></td></tr>
<tr><td style="padding:36px 40px"><p style="font-size:15px;margin:0 0 16px">Hi ${esc(firstName || "there")},</p>
<p style="font-size:14px;line-height:1.6;margin:0 0 20px">We received a request to reset the password for your All Sky Fares account. Use the button below, or the one-time code, to set a new password.</p>
<div style="margin:26px 0 22px"><a href="${esc(resetLink)}" style="display:inline-block;background:#f26b1d;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700;letter-spacing:.04em;font-size:13px">RESET PASSWORD</a></div>
<p style="font-size:13px;margin:0 0 8px;color:#5a6a8a">Or enter this one-time code:</p>
<div style="font-family:'Courier New',monospace;font-size:26px;letter-spacing:.4em;font-weight:700;background:#f5f7fb;border:1px dashed #cfd7e6;padding:16px;text-align:center;margin:0 0 24px">${esc(otp)}</div>
<p style="font-size:12px;color:#5a6a8a;line-height:1.6;margin:0 0 4px">This link and code expire in 30 minutes.</p>
<p style="font-size:12px;color:#5a6a8a;line-height:1.6;margin:0">If you didn't request this, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:20px 40px;background:#f5f7fb;font-size:11px;color:#7a8aa5">All Sky Fares · Thoughtful journeys, beautifully booked. Need help? Contact support@allskyfares.com</td></tr>
</table></td></tr></table></body></html>`;
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Shared frame for transactional emails; `body` is trusted HTML built from escaped values. */
function layout(title, body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#0b1c3f">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;padding:40px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e5e9f2">
<tr><td style="padding:32px 40px;background:#0d1e42;color:#fff"><div style="font-size:11px;letter-spacing:.16em;font-weight:700">ALL SKY FARES</div><div style="font-size:22px;margin-top:6px">${esc(title)}</div></td></tr>
<tr><td style="padding:36px 40px">${body}</td></tr>
<tr><td style="padding:20px 40px;background:#f5f7fb;font-size:11px;color:#7a8aa5">All Sky Fares · Need help? Call +1 (877) 818-4167 or email support@allskyfares.com</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href, label) => `<div style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#f26b1d;color:#fff;padding:14px 28px;text-decoration:none;font-weight:700;letter-spacing:.04em;font-size:13px">${esc(label)}</a></div>`;

const STATUS_LINE = {
  CONFIRMED: "Your booking is confirmed and paid.",
  ON_HOLD: "Your seats are held with the airline. Payment is needed before the deadline below to issue your tickets.",
  REQUESTED: "We've received your booking request. A travel agent will confirm availability and the final price with you shortly.",
  AWAITING_PAYMENT: "Your booking is waiting for payment.",
};

/**
 * Booking confirmation. `account` is { setupLink } for an account made at guest checkout
 * (no password yet), or { signInLink } for an existing one.
 */
function renderBookingEmail(booking, account = {}) {
  const route = (booking.slices || []).map((s) => `${esc(s.origin)} → ${esc(s.destination)}`).join(" &nbsp;·&nbsp; ");
  const total = `${esc(booking.currency || "USD")} ${Number(booking.customer_total || 0).toFixed(2)}`;
  const due = booking.status === "ON_HOLD" && booking.payment_required_by
    ? `<p style="font-size:13px;margin:0 0 16px;color:#b45309"><b>Payment needed by ${esc(new Date(booking.payment_required_by).toUTCString())}</b></p>` : "";
  const rows = [
    ["Booking number", `<b style="font-family:'Courier New',monospace">${esc(booking.booking_reference)}</b>`],
    booking.airline_pnr ? ["Airline confirmation", `<b style="font-family:'Courier New',monospace">${esc(booking.airline_pnr)}</b>`] : null,
    ["Trip", route],
    ["Travellers", (booking.passengers || []).map((p) => esc(`${p.given_name || ""} ${p.family_name || ""}`.trim())).join(", ")],
    ["Total", `<b>${total}</b>`],
  ].filter(Boolean).map(([k, val]) => `<tr><td style="padding:8px 0;font-size:12px;color:#5a6a8a;width:160px;vertical-align:top">${k}</td><td style="padding:8px 0;font-size:14px">${val}</td></tr>`).join("");
  const accountBlock = account.setupLink
    ? `<div style="border-top:1px solid #e5e9f2;margin-top:28px;padding-top:24px">
<p style="font-size:15px;margin:0 0 8px"><b>We've created your All Sky Fares account</b></p>
<p style="font-size:14px;line-height:1.6;margin:0">Use it to view this booking, download your e-ticket and invoice, or cancel. Set a password now, or skip it and sign in any time with a one-time code we email to <b>${esc(booking.email)}</b>.</p>
${button(account.setupLink, "SET MY PASSWORD")}
<p style="font-size:12px;color:#5a6a8a;margin:0">This link expires in 7 days. After that, use "Email me a sign-in code" on the sign-in page.</p></div>`
    : `<div style="border-top:1px solid #e5e9f2;margin-top:28px;padding-top:24px">
<p style="font-size:14px;line-height:1.6;margin:0">Sign in to your account to view this booking, download your e-ticket and invoice, or cancel. You can use your password or a one-time code sent to this email.</p>
${button(account.signInLink, "VIEW MY BOOKING")}</div>`;
  return layout("Your booking", `<p style="font-size:15px;margin:0 0 12px">Hi ${esc(booking.customer_name || "there")},</p>
<p style="font-size:14px;line-height:1.6;margin:0 0 16px">${esc(STATUS_LINE[booking.status] || "Thank you for booking with All Sky Fares.")}</p>${due}
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e9f2;border-bottom:1px solid #e5e9f2">${rows}</table>
${account.attached ? `<p style="font-size:14px;line-height:1.6;margin:20px 0 0"><b>Your e-ticket and invoice are attached</b> as PDFs. Keep the e-ticket with you when you travel.</p>` : ""}${accountBlock}`);
}

function renderLoginCodeEmail(firstName, code) {
  return layout("Your sign-in code", `<p style="font-size:15px;margin:0 0 16px">Hi ${esc(firstName || "there")},</p>
<p style="font-size:14px;line-height:1.6;margin:0 0 20px">Enter this code on the All Sky Fares sign-in page to access your account and bookings.</p>
<div style="font-family:'Courier New',monospace;font-size:28px;letter-spacing:.4em;font-weight:700;background:#f5f7fb;border:1px dashed #cfd7e6;padding:16px;text-align:center;margin:0 0 24px">${esc(code)}</div>
<p style="font-size:12px;color:#5a6a8a;line-height:1.6;margin:0">The code expires in 10 minutes. If you didn't ask for it, you can ignore this email; nobody can sign in without it.</p>`);
}

let _supportTransporter = null;
function getSupportTransporter() {
  if (!nodemailer) return null;
  const host = process.env.SMTP_HOST || cfg("SMTP_HOST", "smtp.hostinger.com");
  const port = Number(process.env.SMTP_PORT || cfg("SMTP_PORT", 465));
  const user = process.env.SUPPORT_SMTP_USERNAME || process.env.SUPPORT_SMTP_USER || "support@allskyfares.com";
  const pass = process.env.SUPPORT_SMTP_PASSWORD || process.env.SUPPORT_SMTP_PASS || "v0yf-z504-9s7x-9wql";

  if (!_supportTransporter) {
    _supportTransporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: { user, pass },
    });
  }
  return _supportTransporter;
}

let _reservationTransporter = null;
function getReservationTransporter() {
  if (!nodemailer) return null;
  const host = process.env.SMTP_HOST || cfg("SMTP_HOST", "smtp.hostinger.com");
  const port = Number(process.env.SMTP_PORT || cfg("SMTP_PORT", 465));
  const user = process.env.SMTP_USER || process.env.SMTP_USERNAME || "reservation@allskyfares.com";
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "whkh-tjqz-1vv5-bf1o";

  if (!_reservationTransporter) {
    _reservationTransporter = nodemailer.createTransport({
      host,
      port,
      secure: true,
      auth: { user, pass },
    });
  }
  return _reservationTransporter;
}

/** `attachments`: [{ filename, content: Buffer }] (Resend / SMTP accepts attachments). */
async function sendEmail(to, subject, html, logger = console, attachments = undefined, options = {}) {
  // Use Support email address and credentials for password reset, auth, or support inquiries
  const isAuthOrSupport = subject.toLowerCase().includes("reset") || subject.toLowerCase().includes("password") || subject.toLowerCase().includes("sign-in") || options.senderType === "support";
  
  const transporter = isAuthOrSupport ? getSupportTransporter() : getReservationTransporter();
  const from = isAuthOrSupport
    ? (process.env.SUPPORT_SMTP_FROM_NAME || "AllSkyFares Support") + " <" + (process.env.SUPPORT_SMTP_FROM_EMAIL || "support@allskyfares.com") + ">"
    : (process.env.SMTP_FROM_NAME || "All Sky Fares") + " <" + (process.env.SMTP_USER || "reservation@allskyfares.com") + ">";

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        html,
        ...(attachments && attachments.length ? { attachments } : {}),
      });
      logger.info(`SMTP Email sent id=${info.messageId} to=${to} from=${from}`);
      return true;
    } catch (smtpErr) {
      logger.warn(`SMTP send attempt failed (${smtpErr.message}), trying fallback...`);
    }
  }

  // Fallback: Resend API
  const key = cfg("RESEND_API_KEY");
  if (!key) {
    logger.warn("No working email provider available; email suppressed");
    return false;
  }
  try {
    const resendFrom = from.includes("@") && !from.includes("onboarding@resend.dev") ? from : "onboarding@resend.dev";
    const { data, error } = await new Resend(key).emails.send({
      from: resendFrom,
      to: [to],
      subject,
      html,
      ...(attachments && attachments.length ? { attachments } : {})
    });
    if (error) throw new Error(error.message || String(error));
    logger.info(`Resend Email sent id=${data && data.id} to=${to}`);
    return true;
  } catch (exc) {
    logger.warn(`Resend email send failed: ${exc.message}`);
    return false;
  }
}

module.exports = { renderResetEmail, renderBookingEmail, renderLoginCodeEmail, sendEmail };
