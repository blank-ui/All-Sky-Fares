const fs = require("fs");
// PDF versions of the e-ticket and invoice, attached to booking emails. Same content as the HTML
// documents in documents.js, drawn with pdfkit (pure JavaScript, so it runs on Hostinger's Node hosting).
const path = require("path");
const PDFDocument = require("pdfkit");
const LEGAL = require("./legal");
const barcode = require("./barcode");
const { helpers: h } = require("./documents");
const AIRLINE_LOGO_CDN = "https://images.kiwi.com/airlines/64x64";
const logoBufferCache = new Map();

const AIRLINE_ASSETS_DIR = path.join(__dirname, "..", "assets", "airlines");
async function getAirlineLogoBuffer(code) {
  if (!code || code === "*") return null;
  const c = String(code).trim().toUpperCase();
  if (logoBufferCache.has(c)) return logoBufferCache.get(c);
  const localFile = path.join(AIRLINE_ASSETS_DIR, `${c}.png`);
  if (fs.existsSync(localFile)) {
    try {
      const buf = fs.readFileSync(localFile);
      logoBufferCache.set(c, buf);
      return buf;
    } catch {}
  }
  try {
    const res = await fetch(`${AIRLINE_LOGO_CDN}/${c}.png`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) {
      logoBufferCache.set(c, null);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    logoBufferCache.set(c, buf);
    try {
      if (!fs.existsSync(AIRLINE_ASSETS_DIR)) fs.mkdirSync(AIRLINE_ASSETS_DIR, { recursive: true });
      fs.writeFileSync(localFile, buf);
    } catch {}
    return buf;
  } catch {
    logoBufferCache.set(c, null);
    return null;
  }
}


const LOGO = path.join(__dirname, "..", "assets", "logo-160.png");
const C = { ink: "#15171c", muted: "#5a606b", soft: "#f2f4f8", line: "#d5dae3", dark: "#16181d", blue: "#2f4fe8", teal: "#3b7a8c" };
const TONES = { green: ["#d6efdf", "#14532d"], yellow: ["#f1e04b", "#1b1a10"], red: ["#fde2e2", "#991b1b"], blue: ["#dbe3ff", "#1d34b0"] };
const M = 40; // page margin
const W = 612 - M * 2; // usable width on US Letter

// The standard PDF fonts only cover Latin-1; replace anything else so text never renders as boxes.
const latin = (s) => String(s ?? "").replace(/[→]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF–—‘’“”•]/g, "?");

function newDoc(title) {
  const doc = new PDFDocument({ size: "LETTER", bufferPages: true, margins: { top: M, bottom: 60, left: M, right: M }, info: { Title: title, Author: LEGAL.companyName } });
  doc.font("Helvetica");
  return doc;
}

const toBuffer = (doc) => new Promise((resolve, reject) => {
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  doc.on("end", () => resolve(Buffer.concat(chunks)));
  doc.on("error", reject);
  doc.end();
});

/** Starts a new page when the next block of `height` points won't fit. */
function ensure(doc, height, onNewPage) {
  if (doc.y + height > doc.page.height - 70) {
    doc.addPage();
    if (onNewPage) onNewPage();
  }
}

function text(doc, str, x, y, opts = {}) {
  const { size = 10, bold = false, color = C.ink, width, align, mono = false } = opts;
  doc.font(mono ? (bold ? "Courier-Bold" : "Courier") : bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor(color);
  doc.text(latin(str), x, y, { width, align, lineBreak: width !== undefined });
}

function pill(doc, label, x, y, tone, align = "left") {
  const [bg, fg] = TONES[tone] || TONES.blue;
  doc.font("Helvetica-Bold").fontSize(8.5);
  const w = doc.widthOfString(latin(label)) + 16;
  const left = align === "right" ? x - w : x;
  doc.roundedRect(left, y, w, 17, 8.5).fill(bg);
  text(doc, label, left + 8, y + 4.5, { size: 8.5, bold: true, color: fg });
  return w;
}

function header(doc, subtitle, label, value, extra, status) {
  const top = doc.y;
  doc.roundedRect(M, top, W, 78, 16).fill(C.dark);
  doc.roundedRect(M + 16, top + 14, 50, 50, 12).fill("#ffffff");
  try { doc.image(LOGO, M + 19, top + 17, { width: 44, height: 44 }); } catch { /* logo is optional */ }
  text(doc, LEGAL.brand, M + 78, top + 16, { size: 18, bold: true, color: "#ffffff" });
  text(doc, "Travel, beautifully managed", M + 78, top + 38, { size: 8.5, color: "#b6bcc7" });
  text(doc, subtitle, M + 78, top + 53, { size: 8, bold: true, color: "#ffffff" });
  const right = M + W - 16;
  text(doc, label, right - 220, top + 12, { size: 8, bold: true, color: "#b6bcc7", width: 220, align: "right" });
  text(doc, value, right - 220, top + 24, { size: 17, bold: true, color: "#ffffff", width: 220, align: "right", mono: true });
  if (extra) text(doc, extra, right - 220, top + 43, { size: 8, color: "#b6bcc7", width: 220, align: "right" });
  pill(doc, status.text, right, top + 55, status.tone, "right");
  doc.y = top + 90;
}

/** Section heading; `keep` is the height of what follows, so the heading never sits alone at a page end. */
function section(doc, title, note, keep = 0) {
  ensure(doc, 40 + keep);
  const y = doc.y + 4;
  text(doc, title.toUpperCase(), M, y, { size: 9, bold: true });
  doc.font("Helvetica-Bold").fontSize(9);
  const start = M + doc.widthOfString(latin(title.toUpperCase())) + 10;
  let end = M + W;
  if (note) {
    doc.font("Helvetica").fontSize(8);
    end = M + W - doc.widthOfString(latin(note)) - 10;
    text(doc, note, end + 10, y + 1, { size: 8, color: C.muted });
  }
  doc.moveTo(start, y + 5).lineTo(end, y + 5).lineWidth(0.6).strokeColor("#c3c9d3").stroke();
  doc.y = y + 18;
}

/** A row of equal boxes: [{ label, value, fill, dark, mono }]. */
function boxes(doc, items, height = 52) {
  ensure(doc, height + 10);
  const top = doc.y;
  const gap = 8;
  const bw = (W - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = M + i * (bw + gap);
    doc.roundedRect(x, top, bw, height, 12).fill(it.fill || C.soft);
    const fg = it.dark ? "#ffffff" : C.ink;
    text(doc, it.label.toUpperCase(), x + 12, top + 10, { size: 7.5, bold: true, color: it.dark ? "#e3e8ff" : C.muted, width: bw - 24 });
    text(doc, it.value, x + 12, top + 23, { size: it.size || 12, bold: true, color: fg, width: bw - 24, mono: it.mono });
    if (it.sub) text(doc, it.sub, x + 12, top + 38, { size: 7.5, color: it.dark ? "#e3e8ff" : C.muted, width: bw - 24 });
  });
  doc.y = top + height + 10;
}

function note(doc, str, fill) {
  doc.font("Helvetica").fontSize(9);
  const height = doc.heightOfString(latin(str), { width: W - 24 }) + 18;
  ensure(doc, height + 8);
  const top = doc.y;
  doc.roundedRect(M, top, W, height, 10).fill(fill);
  text(doc, str, M + 12, top + 9, { size: 9, width: W - 24 });
  doc.y = top + height + 8;
}

function segmentCard(doc, seg) {
  ensure(doc, 92);
  const top = doc.y;
  doc.roundedRect(M, top, W, 84, 12).lineWidth(0.8).strokeColor(C.line).stroke();
  doc.save().roundedRect(M, top, W, 24, 12).clip().rect(M, top, W, 24).fill(C.soft).restore();
  text(doc, `${seg.airline || seg.airline_code || ""} · Flight ${seg.airline_code || ""}${seg.flight_number || ""}`, M + 12, top + 8, { size: 9, bold: true });
  text(doc, h.fmtDate(seg.departing_at), M + W - 172, top + 8, { size: 9, bold: true, width: 160, align: "right" });
  const col = (W - 150) / 2;
  const side = (x, time, code, line, align) => {
    text(doc, time, x, top + 32, { size: 15, bold: true, width: col - 24, align });
    text(doc, code, x, top + 51, { size: 10, bold: true, color: C.blue, width: col - 24, align });
    text(doc, line, x, top + 64, { size: 7.5, color: C.muted, width: col - 24, align });
  };
  side(M + 12, h.fmtTime(seg.departing_at), seg.origin, h.airportLine(seg.origin_name, seg.origin, seg.origin_city, seg.origin_country), "left");
  const days = (() => {
    const a = h.localParts(seg.departing_at);
    const b = h.localParts(seg.arriving_at);
    if (!a || !b) return 0;
    return Math.round((Date.UTC(b.y, b.mo - 1, b.d) - Date.UTC(a.y, a.mo - 1, a.d)) / 86400000);
  })();
  side(M + 12 + col + 150, `${h.fmtTime(seg.arriving_at)}${days > 0 ? ` +${days}` : ""}`, seg.destination, h.airportLine(seg.destination_name, seg.destination, seg.destination_city, seg.destination_country), "right");
  const mid = M + 12 + col;
  text(doc, h.fmtDuration(seg.duration), mid, top + 36, { size: 8.5, bold: true, width: 126, align: "center" });
  doc.moveTo(mid + 8, top + 52).lineTo(mid + 118, top + 52).dash(3, { space: 3 }).lineWidth(1).strokeColor("#8d98b3").stroke().undash();
  doc.circle(mid + 8, top + 52, 2.5).fill(C.blue);
  doc.circle(mid + 118, top + 52, 2.5).fill(C.blue);
  if (seg.operating_airline_code && seg.operating_airline_code !== seg.airline_code) {
    text(doc, `Operated by ${seg.operating_airline || seg.operating_airline_code}`, mid, top + 60, { size: 7, color: C.muted, width: 126, align: "center" });
  }
  doc.y = top + 92;
}

function footer(doc, kind) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const y = doc.page.height - 52;
    doc.moveTo(M, y - 6).lineTo(M + W, y - 6).lineWidth(0.5).strokeColor("#e1e5ec").stroke();
    // Footer sits inside the bottom margin, so lift the margin while drawing it.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    text(doc, `Thank you for choosing ${LEGAL.brand}.`, M, y, { size: 8.5, bold: true, width: W });
    text(doc, `${LEGAL.companyName} · ${LEGAL.address} · ${LEGAL.phone} · ${LEGAL.supportEmail}`, M, y + 12, { size: 7, color: C.muted, width: W });
    text(doc, `${kind} · Page ${i - range.start + 1} of ${range.count}`, M, y + 22, { size: 7, color: C.muted, width: W });
    doc.page.margins.bottom = bottom;
  }
}

async function eticketPdf(b) {
  const doc = newDoc(`E-ticket ${b.booking_reference}`);
  const slices = b.slices || [];
  const passengers = b.passengers || [];
  const last = slices[slices.length - 1] || {};
  const dates = slices.length > 1 ? `${h.fmtDate(slices[0].departing_at)} - ${h.fmtDate(last.departing_at)}` : h.fmtDate((slices[0] || {}).departing_at);

  header(doc, "E-TICKET & ITINERARY RECEIPT", "BOOKING NUMBER", b.booking_reference, "", h.ticketStatus(b));
  boxes(doc, [
    { label: "Airline confirmation", value: h.confirmationText(b), fill: C.blue, dark: true, mono: true, size: 14 },
    { label: "Trip", value: `${h.journeyLabel(slices)} · ${h.travellersLabel(passengers)}` },
    { label: "Travel dates", value: dates },
  ]);
  if (b.status === "ON_HOLD" && b.payment_required_by) {
    note(doc, `Seats held with the airline. Payment is required by ${h.fmtStamp(b.payment_required_by)} (${new Date(b.payment_required_by).toISOString().slice(11, 16)} UTC) for tickets to be issued. Call ${LEGAL.phone} for help.`, "#fff7d6");
  }
  if (b.status === "CANCELLED") note(doc, `This booking was cancelled${b.cancelled_at ? ` on ${h.fmtStamp(b.cancelled_at)}` : ""}. This document is no longer valid for travel.`, "#fde2e2");

  section(doc, "Flight itinerary", `${h.journeyLabel(slices)} · all times are local`);
  slices.forEach((s, i) => {
    const segs = s.segments || [];
    const stops = segs.length - 1;
    ensure(doc, 110);
    const y = doc.y;
    const w = pill(doc, h.legLabel(i, slices), M, y, "blue");
    text(doc, `${h.fmtDate(s.departing_at)} · ${s.origin} to ${s.destination} · ${stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}${h.fmtDuration(s.duration) ? ` · ${h.fmtDuration(s.duration)}` : ""}`, M + w + 8, y + 4, { size: 9, bold: true });
    doc.y = y + 24;
    segs.forEach((seg) => segmentCard(doc, seg));
  });

  section(doc, "Passenger & ticket information", null, 90);
  passengers.forEach((p, i) => {
    ensure(doc, 90);
    const y = doc.y;
    text(doc, `${i + 1}.  ${p.given_name} ${p.family_name}`, M, y, { size: 12, bold: true });
    pill(doc, (p.type || "adult").replace("infant_without_seat", "infant").toUpperCase(), M + W, y - 2, "blue", "right");
    doc.y = y + 20;
    boxes(doc, [
      { label: "Ticket", value: h.ticketFor(b, p), mono: true, size: 10 },
      { label: "Date of birth", value: h.fmtBirth(p.born_on), size: 10 },
      { label: "Gender", value: p.gender === "f" ? "FEMALE" : "MALE", size: 10 },
      { label: "Seat", value: "CHECK IN", size: 10 },
    ], 42);
    const baggage = slices.map((s, j) => {
      const bag = (((s.segments || [])[0] || {}).baggage) || {};
      return `${h.legName(j, slices)}: ${bag.checked ?? 0} checked, ${bag.carry_on ?? 0} carry-on`;
    }).join(" · ");
    text(doc, `Baggage  ${baggage}`, M, doc.y - 2, { size: 8.5, color: C.muted, width: W });
    doc.y += 10;
  });

  ensure(doc, 75);
  const barY = doc.y + 4;
  doc.moveTo(M, barY).lineTo(M + W, barY).dash(4, { space: 3 }).lineWidth(1).strokeColor("#c3c9d3").stroke().undash();
  doc.roundedRect(M, barY + 8, W, 62, 10).fillAndStroke("#ffffff", "#d5dae3");
  const pnr = h.confirmationText(b);
  const barCode = `${pnr}-${b.booking_reference}`;
  barcode.drawBarcodePdf(doc, barCode, M + (W - 220) / 2, barY + 14, { height: 26, barWidth: 1.15, color: C.dark });
  text(doc, `*${barCode}*`, M, barY + 44, { size: 9, mono: true, bold: true, width: W, align: "center", color: C.ink });
  text(doc, `Present this official electronic confirmation receipt or quote your Airline PNR (${pnr}) at airport check-in.`, M, barY + 56, { size: 7.5, width: W, align: "center", color: C.muted });
  doc.y = barY + 80;

  section(doc, "Terms and conditions", null, 120);
  const terms = [
    ["Passenger details", "Names must match government-issued photo ID. Travellers are responsible for passports, visas and other documents required for their itinerary."],
    ["Our role", `${LEGAL.brand} arranges travel with third-party airlines. Their fare rules, schedules, baggage policies and conditions govern your itinerary.`],
    ["Changes and cancellations", "Requests are subject to the airline's fare rules and fees; changes may require a fare difference. You can cancel eligible bookings from My Bookings."],
    ["Refunds", "Eligibility depends on the fare rules. For US flights booked at least 7 days ahead, cancellations within 24 hours of payment are refunded in full. Approved refunds go to the original payment method and typically take 7-14 business days."],
    ["Missed travel", "No-shows are generally non-refundable, and the airline may cancel the rest of the itinerary."],
  ];
  terms.forEach(([title, body], i) => {
    doc.font("Helvetica").fontSize(8.5);
    ensure(doc, doc.heightOfString(body, { width: W - 24 }) + 22);
    const y = doc.y;
    text(doc, `${i + 1}. ${title}`, M, y, { size: 9, bold: true });
    text(doc, body, M + 14, y + 12, { size: 8.5, color: "#2a2e36", width: W - 14 });
    doc.y += 6;
  });
  doc.y += 4;
  boxes(doc, [
    { label: "Contact the reservation team", value: `${LEGAL.phone}`, sub: `${LEGAL.supportEmail} · quote ${b.booking_reference}`, fill: C.blue, dark: true },
    { label: "Travel notice", value: "Carry government-issued photo ID", sub: "Airline check-in, baggage and fare rules apply.", fill: "#f1e04b" },
  ], 54);

  footer(doc, "E-ticket & itinerary receipt");
  return toBuffer(doc);
}

async function invoicePdf(b) {
  const doc = newDoc(`Invoice INV-${b.booking_reference}`);
  const slices = b.slices || [];
  const passengers = b.passengers || [];
  const status = h.invoiceStatus(b);
  const total = Number(b.customer_total || 0);
  const paid = b.payment_status === "paid";
  const refunded = Number(b.refund_amount || 0);
  const firstSeg = ((slices[0] || {}).segments || [])[0] || {};
  const lead = passengers[0] || {};

  header(doc, "TRAVEL INVOICE & RECEIPT", "INVOICE NO.", `INV-${b.booking_reference}`, `Issued ${h.fmtStampLong(b.created_at)}`, status);
  boxes(doc, [
    { label: "Billed to", value: b.customer_name || `${lead.given_name || ""} ${lead.family_name || ""}`, sub: b.email, size: 11 },
    { label: "Sold by", value: LEGAL.companyName, sub: LEGAL.address, size: 11 },
    { label: "Payment", value: status.label, sub: paid ? `Paid ${h.fmtStamp(b.paid_at)}` : `Currency ${b.currency || "USD"}`, size: 11 },
  ], 60);
  boxes(doc, [
    { label: "Booking reference", value: b.booking_reference, sub: "Quote when contacting us", fill: C.blue, dark: true, mono: true, size: 14 },
    { label: "Airline record locator (PNR)", value: h.confirmationText(b), sub: "For airline check-in", fill: C.teal, dark: true, mono: true, size: 14 },
  ], 56);

  section(doc, "Flight itinerary", "All times are local");
  slices.flatMap((s) => s.segments || []).forEach((seg) => segmentCard(doc, seg));
  text(doc, `Passenger${passengers.length > 1 ? "s" : ""}: ${passengers.map((p) => `${p.given_name} ${p.family_name}`).join(", ")}`, M, doc.y, { size: 9, bold: true, width: W });
  doc.y += 8;

  section(doc, "Charges");
  ensure(doc, 150);
  let y = doc.y;
  text(doc, "DESCRIPTION", M + 8, y, { size: 7.5, bold: true, color: C.muted });
  text(doc, "QTY", M + W - 160, y, { size: 7.5, bold: true, color: C.muted, width: 40, align: "center" });
  text(doc, "AMOUNT", M + W - 110, y, { size: 7.5, bold: true, color: C.muted, width: 102, align: "right" });
  doc.moveTo(M, y + 12).lineTo(M + W, y + 12).lineWidth(0.6).strokeColor("#c3c9d3").stroke();
  y += 20;
  text(doc, `Air travel: ${h.journeyLabel(slices)}, ${h.travellersLabel(passengers)}`, M + 8, y, { size: 10, bold: true, width: W - 180 });
  text(doc, `${firstSeg.airline || b.airline || ""} · ${slices.map((s) => `${s.origin} to ${s.destination}`).join(", ")} · ${h.fmtDate(firstSeg.departing_at)}. Includes airline fare, taxes, carrier fees and service.`, M + 8, y + 14, { size: 8, color: C.muted, width: W - 180 });
  text(doc, "1", M + W - 160, y, { size: 10, width: 40, align: "center" });
  text(doc, h.money(total, b.currency), M + W - 110, y, { size: 10, bold: true, width: 102, align: "right", mono: true });
  y += 44;
  doc.moveTo(M, y).lineTo(M + W, y).lineWidth(0.5).strokeColor("#e1e5ec").stroke();
  y += 12;

  // Payment method (left) and totals (right).
  doc.roundedRect(M, y, W - 250, 78, 12).fill(C.soft);
  text(doc, "PAYMENT METHOD", M + 12, y + 10, { size: 7.5, bold: true, color: C.muted });
  text(doc, paid ? b.payment_method || "Paid" : "Not paid yet", M + 12, y + 23, { size: 11, bold: true, width: W - 274 });
  text(doc, "PAYMENT DATE", M + 12, y + 44, { size: 7.5, bold: true, color: C.muted });
  text(doc, paid ? h.fmtStamp(b.paid_at) : "-", M + 12, y + 57, { size: 10, bold: true });
  const tx = M + W - 238;
  text(doc, "Subtotal", tx, y + 2, { size: 9, color: C.muted });
  text(doc, h.money(total, b.currency), tx, y + 2, { size: 9, bold: true, width: 238, align: "right", mono: true });
  text(doc, "Taxes & fees", tx, y + 16, { size: 9, color: C.muted });
  text(doc, "Included", tx, y + 16, { size: 9, bold: true, width: 238, align: "right" });
  doc.roundedRect(tx, y + 32, 238, 28, 10).fill(C.dark);
  text(doc, "Total", tx + 12, y + 41, { size: 10, bold: true, color: "#ffffff" });
  text(doc, h.money(total, b.currency), tx, y + 39, { size: 14, bold: true, color: "#ffffff", width: 226, align: "right", mono: true });
  const due = paid ? total : b.status === "CANCELLED" || b.status === "EXPIRED" ? 0 : total;
  const [bg, fg] = TONES[paid ? "green" : "yellow"];
  doc.roundedRect(tx, y + 64, 238, 18, 9).fill(bg);
  text(doc, paid ? "Amount paid" : "Balance due", tx + 12, y + 69, { size: 8.5, bold: true, color: fg });
  text(doc, h.money(due, b.currency), tx, y + 69, { size: 8.5, bold: true, color: fg, width: 226, align: "right", mono: true });
  doc.y = y + 92;
  if (refunded > 0) {
    text(doc, `Refunded: ${h.money(refunded, b.currency)}`, tx, doc.y, { size: 9, bold: true, color: TONES.blue[1], width: 238, align: "right" });
    doc.y += 16;
  }

  section(doc, "Important information", null, 90);
  note(doc, `The total above is the full price for this booking, including airline fares, taxes, carrier fees and our service. Refund eligibility depends on the airline's fare rules; airline change or cancellation fees may apply. For flights to, from or within the US booked at least 7 days before departure, cancellations within 24 hours of payment are refunded in full. Approved refunds go to the original payment method and typically take 7-14 business days to appear. Full details: ${LEGAL.website}/refund. Help: ${LEGAL.supportEmail} or ${LEGAL.phone}.`, C.soft);

  footer(doc, "Electronically issued");
  return toBuffer(doc);
}

module.exports = { eticketPdf, invoicePdf, getAirlineLogoBuffer };
