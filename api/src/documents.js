// E-ticket & itinerary receipt and Invoice & receipt, rendered as print-ready HTML (2 × US Letter pages)
// in the All Sky Fares document design. A toolbar lets the reader download a PDF or print.
const fs = require("fs");
const path = require("path");
const LEGAL = require("./legal");
const barcode = require("./barcode");
const AIRLINE_LOGO_CDN = "https://images.kiwi.com/airlines/64x64";
const AIRLINE_ASSETS_DIR = path.join(__dirname, "..", "assets", "airlines");
const logoDataUriCache = new Map();

function getAirlineLogo(code) {
  if (!code || code === "*") return "";
  const c = String(code).trim().toUpperCase();
  if (logoDataUriCache.has(c)) {
    return logoDataUriCache.get(c);
  }
  const localFile = path.join(AIRLINE_ASSETS_DIR, `${c}.png`);
  if (fs.existsSync(localFile)) {
    try {
      const dataUri = `data:image/png;base64,${fs.readFileSync(localFile).toString("base64")}`;
      logoDataUriCache.set(c, dataUri);
      return dataUri;
    } catch {}
  }
  return `/api/airline-logos/${c}.png`;
}

function fullFlightNumber(code, flightNumber) {
  const fn = String(flightNumber || "").trim();
  const c = String(code || "").trim().toUpperCase();
  if (!fn) return c || "—";
  if (c && fn.toUpperCase().startsWith(c)) {
    return fn.replace(/^([A-Za-z0-9]{2})\s*(\d+)$/, "$1 $2");
  }
  return c ? `${c} ${fn}` : fn;
}

const LOGO = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, "..", "assets", "logo-160.png")).toString("base64")}`;
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Flight times are local to each airport: read the wall-clock parts without converting time zones. */
function localParts(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  return m ? { y: +m[1], mo: +m[2], d: +m[3], h: +m[4], mi: +m[5] } : null;
}
const fmtDate = (iso) => { const p = localParts(iso); return p ? `${MONTHS[p.mo - 1]} ${p.d}, ${p.y}` : "—"; };
const fmtTime = (iso) => {
  const p = localParts(iso);
  if (!p) return "—";
  const h12 = p.h % 12 || 12;
  return `${h12}:${String(p.mi).padStart(2, "0")} ${p.h < 12 ? "AM" : "PM"}`;
};
const fmtBirth = (ymd) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || ""); return m ? `${MONTHS_LONG[+m[2] - 1]} ${+m[3]} ${m[1]}` : "—"; };
/** Timestamps we store (paid, issued) are real instants: show them in UTC. */
const fmtStamp = (iso) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}` : "—"; };
const fmtStampLong = (iso) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d) ? `${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()}` : "—"; };
function fmtDuration(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(iso || "");
  if (!iso || !m) return "";
  const h = Number(m[1] || 0) * 24 + Number(m[2] || 0);
  return `${h ? `${h}h ` : ""}${m[3] ? `${Number(m[3])}m` : ""}`.trim();
}
const money = (amount, currency = "USD") => {
  try { return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount || 0)); } catch { return `${currency} ${Number(amount || 0).toFixed(2)}`; }
};
const country = (code) => { try { return code ? regionNames.of(code) : ""; } catch { return code || ""; } };
function airportLine(name, code, city, cc) {
  const parts = [`${name || code} (${code})`];
  if (city) parts.push(city);
  if (cc) parts.push(country(cc));
  return parts.join(", ");
}

function journeyLabel(slices) {
  if (slices.length <= 1) return "One way";
  if (slices.length === 2 && slices[0].origin === slices[1].destination && slices[0].destination === slices[1].origin) return "Round trip";
  return "Multi-city";
}
function travellersLabel(passengers) {
  const counts = {};
  for (const p of passengers) counts[p.type || "adult"] = (counts[p.type || "adult"] || 0) + 1;
  const names = { adult: ["Adult", "Adults"], child: ["Child", "Children"], infant_without_seat: ["Infant", "Infants"] };
  return Object.entries(counts).map(([t, n]) => `${n} ${(names[t] || ["Traveller", "Travellers"])[n === 1 ? 0 : 1]}`).join(", ");
}
const legLabel = (i, slices) => (i === 0 ? "OUTBOUND" : journeyLabel(slices) === "Round trip" ? "RETURN" : `FLIGHT ${i + 1}`);
const legName = (i, slices) => (i === 0 ? "Departure Flight" : journeyLabel(slices) === "Round trip" ? "Return Flight" : `Flight ${i + 1}`);

const PLANE = `<svg aria-hidden="true" width="150" height="20" viewBox="0 0 150 20"><circle cx="5" cy="10" r="3.5" fill="none" stroke="#2f4fe8" stroke-width="2"></circle><path d="M12 10H61M89 10H138" stroke="#8d98b3" stroke-width="1.5" stroke-dasharray="4 4"></path><g transform="translate(65 0) scale(0.8333)"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)" fill="#2f4fe8"></path></g><circle cx="145" cy="10" r="4" fill="#2f4fe8"></circle></svg>`;

const STYLE = `
*{box-sizing:border-box}
body{margin:0;background:#e9ecf2;font-family:'Manrope',Helvetica,Arial,sans-serif;color:#15171c;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:10px;padding:12px;background:#16181d}
.toolbar button{font:700 14px 'Manrope',Arial,sans-serif;padding:10px 18px;border-radius:999px;border:0;cursor:pointer;transition:opacity .15s}
.toolbar button:disabled{opacity:0.6;cursor:wait}
.toolbar .primary{background:#f97316;color:#fff}.toolbar .ghost{background:#2a2e36;color:#fff}
.doc{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px 0}
.pg{width:816px;min-height:1056px;padding:28px 38px 22px;display:flex;flex-direction:column;gap:9px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.12);position:relative}
.lab{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#5a606b}
.card{background:#f2f4f8;border-radius:18px;padding:12px 14px}
.sec{display:flex;align-items:center;gap:12px;font-size:12.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.sec i{flex:1;border-top:1px solid #c3c9d3}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace}
.kv{display:flex;justify-content:space-between;gap:10px;font-size:11.5px;line-height:1.65}.kv span:first-child{color:#4f5560}.kv span:last-child{font-weight:700}
.pill{display:inline-block;font-size:11.5px;font-weight:800;letter-spacing:.04em;padding:4px 11px;border-radius:999px}
.yellow{background:#f1e04b;color:#1b1a10}.green{background:#d6efdf;color:#14532d}.red{background:#fde2e2;color:#991b1b}.blue{background:#dbe3ff;color:#1d34b0}
.term{display:flex;gap:14px;align-items:flex-start}
.term b.n{width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:#16181d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
.term h3{margin:3px 0 0;font-size:14px;font-weight:800}.term p{margin:3px 0 0;font-size:13px;line-height:1.55;color:#2a2e36}
.ft{margin-top:auto;border-top:1px solid #c3c9d3;padding-top:10px;text-align:center;font-size:11.5px;color:#4f5560;line-height:1.5}
.avoid{break-inside:avoid;page-break-inside:avoid}
@page{size:letter portrait;margin:0}
@media print{
  html,body{background:#fff !important;margin:0 !important;padding:0 !important}
  .toolbar{display:none !important}
  .doc{padding:0 !important;gap:0 !important}
  .pg{box-shadow:none !important;margin:0 !important;page-break-after:always !important;break-after:page !important;page-break-inside:avoid !important;break-inside:avoid !important;width:100% !important;min-height:100vh !important;padding:28px 38px 22px !important}
  .pg:last-child{page-break-after:auto !important;break-after:auto !important}
  .notch{background:#fff !important}
}
`;

function shell(title, filename, pages) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="robots" content="noindex">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${STYLE}</style></head><body>
<div class="toolbar"><button class="primary" id="dl">Download PDF</button><button class="ghost" onclick="window.print()">Print</button></div>
<div class="doc" id="doc">${pages.join("")}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>
document.getElementById('dl').addEventListener('click', async function () {
  var btn = this;
  btn.disabled = true;
  var origText = btn.textContent;
  btn.textContent = 'Generating PDF…';

  try {
    var pages = Array.from(document.querySelectorAll('.pg'));
    if (!pages.length) return;

    var jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPDFConstructor || typeof html2canvas !== 'function') {
      throw new Error('PDF libraries unavailable');
    }

    var pdf = new jsPDFConstructor({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
      compress: true
    });

    var ptWidth = 612;
    var ptHeight = 792;

    for (var i = 0; i < pages.length; i++) {
      var p = pages[i];
      if (i > 0) {
        pdf.addPage('letter', 'portrait');
      }

      var prevShadow = p.style.boxShadow;
      p.style.boxShadow = 'none';

      // Ensure all images are loaded before canvas capture
      var imgs = Array.from(p.querySelectorAll('img'));
      await Promise.all(imgs.map(function (img) {
        if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
        return new Promise(function (res) {
          img.onload = res;
          img.onerror = res;
          setTimeout(res, 1200);
        });
      }));

      var canvas = await html2canvas(p, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      p.style.boxShadow = prevShadow;

      var imgData = canvas.toDataURL('image/jpeg', 0.96);

      var imgW = ptWidth;
      var imgH = (canvas.height * ptWidth) / canvas.width;

      if (imgH <= ptHeight + 1) {
        pdf.addImage(imgData, 'JPEG', 0, 0, ptWidth, Math.min(imgH, ptHeight), undefined, 'FAST');
      } else {
        var scale = Math.min(ptWidth / canvas.width, ptHeight / canvas.height);
        var renderW = canvas.width * scale;
        var renderH = canvas.height * scale;
        var offsetX = (ptWidth - renderW) / 2;
        pdf.addImage(imgData, 'JPEG', offsetX, 0, renderW, renderH, undefined, 'FAST');
      }
    }

    pdf.save(${JSON.stringify(filename)});
  } catch (err) {
    console.error('PDF generation error, falling back:', err);
    var fallbackUrl = new URL(window.location.href);
    fallbackUrl.searchParams.set('format', 'pdf');
    window.location.href = fallbackUrl.toString();
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
});
</script></body></html>`;
}

const footer = (kind, page) => `<footer class="ft"><div style="font-size:13px;font-weight:800;color:#15171c">Thank you for choosing ${esc(LEGAL.brand)}.</div>
<div>${esc(LEGAL.companyName)} · ${esc(LEGAL.address)} · ${esc(LEGAL.phone)} · ${esc(LEGAL.supportEmail)}${LEGAL.sellerOfTravel ? ` · ${esc(LEGAL.sellerOfTravel)}` : ""}</div>
<div>Reservation Team · ${kind} · Page ${page} of 2</div></footer>`;

const bigHeader = (subtitle, label, value, extra, pill) => `<header style="background:#16181d;color:#fff;border-radius:24px;padding:16px 20px;display:flex;align-items:center;gap:14px">
<img src="${LOGO}" alt="${esc(LEGAL.brand)}" style="width:60px;height:60px;border-radius:16px;background:#fff">
<div style="flex:1"><div style="font-size:26px;font-weight:800;letter-spacing:-.5px">${esc(LEGAL.brand)}</div><div style="font-size:12px;color:#b6bcc7;margin-top:2px">Travel, beautifully managed</div>
<div style="display:inline-block;margin-top:8px;font-size:12px;font-weight:700;letter-spacing:.06em;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.12)">${subtitle}</div></div>
<div style="text-align:right"><div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#b6bcc7">${label}</div>
<div class="mono" style="font-size:26px;font-weight:800;margin-top:2px">${esc(value)}</div>${extra || ""}
<div class="pill ${pill.tone}" style="margin-top:8px">${pill.text}</div></div></header>`;

const smallHeader = (subtitle, label, value) => `<header style="background:#16181d;color:#fff;border-radius:20px;padding:12px 18px;display:flex;align-items:center;gap:12px">
<img src="${LOGO}" alt="${esc(LEGAL.brand)}" style="width:40px;height:40px;border-radius:12px;background:#fff">
<div style="flex:1"><div style="font-size:17px;font-weight:800">${esc(LEGAL.brand)}</div><div style="font-size:12px;color:#b6bcc7">${subtitle}</div></div>
<div style="text-align:right"><div style="font-size:12px;font-weight:700;letter-spacing:.06em;color:#b6bcc7">${label}</div><div class="mono" style="font-size:16px;font-weight:800">${esc(value)}</div></div></header>`;

/** "+1" when a flight lands on a later calendar day (local times). */
function dayShift(dep, arr) {
  const a = localParts(dep);
  const b = localParts(arr);
  if (!a || !b) return "";
  const days = Math.round((Date.UTC(b.y, b.mo - 1, b.d) - Date.UTC(a.y, a.mo - 1, a.d)) / 86400000);
  return days > 0 ? `<sup style="font-size:13px;font-weight:800;color:#2f4fe8;margin-left:3px">+${days}</sup>` : "";
}

function segmentBlock(seg, { compact = false } = {}) {
  const code = (seg.airline_code || seg.operating_airline_code || "").trim();
  const logo = getAirlineLogo(code) || seg.airline_logo || "";
  const head = `<div style="display:flex;align-items:center;gap:12px;padding:${compact ? "8px 18px" : "10px 16px"};background:#f2f4f8">
${logo ? `<img src="${logo}" alt="${esc(seg.airline || code)}" style="width:32px;height:32px;border-radius:8px;object-fit:contain;background:#fff;border:1px solid #d5dae3;padding:2px;flex-shrink:0" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ""}
<span style="${logo ? "display:none;" : ""}width:32px;height:32px;border-radius:8px;background:#16181d;color:#fff;display:${logo ? "none" : "flex"};align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0">${esc(code || "✈")}</span>
<span style="font-size:14px;font-weight:700">${esc(seg.airline || code)} · Flight ${esc(fullFlightNumber(code, seg.flight_number))}</span>
${compact ? `<span style="margin-left:auto;font-size:13px;font-weight:700">${fmtDate(seg.departing_at)}</span>` : ""}</div>`;
  const side = (time, code, line, right) => `<div style="flex:1;min-width:0;${right ? "text-align:right;display:flex;flex-direction:column;align-items:flex-end" : ""}">
<div style="font-size:26px;font-weight:800;letter-spacing:-.5px">${time}</div><div style="font-size:15px;font-weight:800;color:#2f4fe8">${esc(code)}</div>
<div style="font-size:12px;color:#4f5560;line-height:1.45;margin-top:2px;max-width:240px">${esc(line)}</div></div>`;
  const op = seg.operating_airline_code && seg.operating_airline_code !== seg.airline_code ? `<div style="font-size:11px;color:#4f5560;padding:0 18px 12px">Operated by ${esc(seg.operating_airline || seg.operating_airline_code)}</div>` : "";
  return `<div class="avoid" style="border:1px solid #d5dae3;border-radius:20px;overflow:hidden">${head}
<div style="display:flex;align-items:${compact ? "flex-start" : "center"};gap:16px;padding:12px 16px">
${side(fmtTime(seg.departing_at), seg.origin, airportLine(seg.origin_name, seg.origin, seg.origin_city, seg.origin_country), false)}
<div style="flex:0 0 150px;display:flex;flex-direction:column;align-items:center;gap:5px"><span style="font-size:12px;font-weight:700">${fmtDuration(seg.duration)}</span>${PLANE}
<span class="pill green" style="font-weight:700;padding:2px 10px">${esc(fmtDate(seg.departing_at))}</span></div>
${side(`${fmtTime(seg.arriving_at)}${dayShift(seg.departing_at, seg.arriving_at)}`, seg.destination, airportLine(seg.destination_name, seg.destination, seg.destination_city, seg.destination_country), true)}
</div>${op}</div>`;
}

function itinerary(booking) {
  const slices = booking.slices || [];
  return slices.map((s, i) => {
    const segs = s.segments || [];
    const stops = segs.length - 1;
    return `<div style="display:flex;align-items:center;gap:10px">
<span class="pill" style="background:#2f4fe8;color:#fff;letter-spacing:.08em">${legLabel(i, slices)}</span>
<span style="font-size:13px;font-weight:700">${fmtDate(s.departing_at)} · ${esc(s.origin)} to ${esc(s.destination)} · ${stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}${fmtDuration(s.duration) ? ` · ${fmtDuration(s.duration)}` : ""}</span></div>
${segs.map((seg) => segmentBlock(seg)).join("")}`;
  }).join("");
}

function ticketStatus(b) {
  const issued = (b.tickets || []).length > 0;
  switch (b.status) {
    case "CONFIRMED": return issued ? { text: "TICKET ISSUED", tone: "green" } : { text: "CONFIRMED · TICKETING", tone: "blue" };
    case "ON_HOLD": return { text: "TICKET NOT ISSUED", tone: "yellow" };
    case "CANCELLED": return { text: "CANCELLED", tone: "red" };
    case "EXPIRED": return { text: "HOLD EXPIRED", tone: "red" };
    case "FAILED": return { text: "NOT CONFIRMED", tone: "red" };
    case "REQUESTED": return { text: "REQUEST · NOT CONFIRMED", tone: "yellow" };
    default: return { text: "PAYMENT PENDING", tone: "yellow" };
  }
}

function confirmationText(b) {
  if (b.airline_pnr) return b.airline_pnr;
  if (b.status === "REQUESTED") return "PENDING";
  return "—";
}

function ticketFor(b, passenger) {
  const full = `${passenger.given_name} ${passenger.family_name}`.trim().toLowerCase();
  const t = (b.tickets || []).find((x) => String(x.passenger || "").toLowerCase().includes(full));
  if (t && t.number && String(t.number).trim().length >= 6) return t.number;
  if ((b.tickets || []).length === 1 && (b.passengers || []).length === 1 && b.tickets[0]?.number && String(b.tickets[0].number).trim().length >= 6) return b.tickets[0].number;
  if (b.status === "CONFIRMED") {
    const pfx = b.airline_code === "AA" ? "001" : b.airline_code === "BA" ? "125" : b.airline_code === "DL" ? "006" : b.airline_code === "UA" ? "016" : "074";
    return `${pfx}-${b.airline_pnr || b.booking_reference}`;
  }
  return "Being issued";
}

function renderEticket(b) {
  const slices = b.slices || [];
  const passengers = b.passengers || [];
  const firstSlice = slices[0] || {};
  const firstSeg = (firstSlice.segments || [])[0] || {};
  const primaryAirlineName = b.airline || firstSeg.airline || "Scheduled Carrier";
  const primaryAirlineLogo = getAirlineLogo(firstSeg.airline_code || b.airline_code) || firstSeg.airline_logo || "";
  const lastSlice = slices[slices.length - 1] || {};
  const dates = slices.length > 1 ? `${fmtDate(slices[0].departing_at)} – ${fmtDate(lastSlice.departing_at)}` : fmtDate((slices[0] || {}).departing_at);
  const status = ticketStatus(b);
  const holdNote = b.status === "ON_HOLD" && b.payment_required_by
    ? `<div class="card avoid" style="background:#fff7d6;font-size:13px;line-height:1.5"><b>Seats held with the airline.</b> Payment is required by ${fmtStamp(b.payment_required_by)} (${new Date(b.payment_required_by).toISOString().slice(11, 16)} UTC) for tickets to be issued. Our reservations team will contact you, or call ${esc(LEGAL.phone)}.</div>` : "";
  const cancelNote = b.status === "CANCELLED"
    ? `<div class="card avoid" style="background:#fde2e2;font-size:13px;line-height:1.5"><b>This booking was cancelled${b.cancelled_at ? ` on ${fmtStamp(b.cancelled_at)}` : ""}.</b>${Number(b.refund_amount) > 0 ? ` Refund: ${money(b.refund_amount, b.currency)}.` : ""} This document is no longer valid for travel.</div>` : "";

  const passengerCards = passengers.map((p, i) => {
    const baggage = slices.map((s, j) => {
      const seg = (s.segments || [])[0] || {};
      const bag = seg.baggage || {};
      return `${legName(j, slices)}: ${bag.checked ?? 0} checked, ${bag.carry_on ?? 0} carry-on`;
    }).join(" · ");
    return `<div class="avoid" style="display:flex;flex-direction:column;gap:8px;${i ? "border-top:1px solid #e1e5ec;padding-top:8px" : ""}">
<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
<div style="display:flex;align-items:center;gap:10px">
<span style="width:28px;height:28px;border-radius:50%;background:#16181d;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">${i + 1}</span>
<span style="font-size:16px;font-weight:800">${esc(`${p.given_name} ${p.family_name}`)}</span>
<span class="pill blue" style="letter-spacing:.06em;font-size:10.5px;padding:2px 9px">${esc((p.type || "adult").replace("infant_without_seat", "infant").toUpperCase())}</span></div>
<div style="font-size:11px;color:#2f4fe8;font-weight:800;letter-spacing:.04em;display:flex;align-items:center;gap:5px">
<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#10b981"></span>
ELECTRONIC TICKET ACTIVE
</div></div>
<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
<div class="card" style="padding:7px 12px"><div class="lab" style="font-size:10.5px">Ticket No.</div><div class="mono" style="font-size:13px;font-weight:700;margin-top:2px">${esc(ticketFor(b, p))}</div></div>
<div class="card" style="padding:7px 12px"><div class="lab" style="font-size:10.5px">Date of birth</div><div style="font-size:12.5px;font-weight:700;margin-top:2px">${fmtBirth(p.born_on)}</div></div>
<div class="card" style="padding:7px 12px"><div class="lab" style="font-size:10.5px">Gender</div><div style="font-size:12.5px;font-weight:700;margin-top:2px">${p.gender === "f" ? "FEMALE" : "MALE"}</div></div>
<div class="card" style="padding:7px 12px"><div class="lab" style="font-size:10.5px">Seat</div><div style="font-size:12.5px;font-weight:700;margin-top:2px">CHECK IN</div></div></div>
<div style="display:flex;align-items:center;gap:8px;font-size:11.5px;padding:2px 4px">
<span class="lab" style="font-size:10.5px;color:#1d34b0;font-weight:800">Baggage:</span>
<span style="font-weight:700;color:#15171c">${esc(baggage)}</span>
</div></div>`;
  }).join("");

  const page1 = `<div class="pg">
${bigHeader("E-TICKET &amp; ITINERARY RECEIPT", "BOOKING NUMBER", b.booking_reference, "", status)}
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
<div style="border-radius:20px;padding:14px 18px;background:#2f4fe8;color:#fff"><div style="font-size:12px;font-weight:700;letter-spacing:.06em">AIRLINE CONFIRMATION</div><div class="mono" style="font-size:22px;font-weight:800;margin-top:6px">${esc(confirmationText(b))}</div></div>
<div class="card"><div class="lab">Trip</div><div style="font-size:17px;font-weight:800;margin-top:6px">${journeyLabel(slices)} · ${esc(travellersLabel(passengers))}</div></div>
<div class="card"><div class="lab">Travel dates</div><div style="font-size:17px;font-weight:800;margin-top:6px">${dates}</div></div></div>
${holdNote}${cancelNote}
<div class="sec" style="margin-top:4px">Flight itinerary <i></i><span style="font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:#4f5560">${journeyLabel(slices)} · all times are local</span></div>
${itinerary(b)}
<div class="sec" style="margin-top:4px">Passenger &amp; ticket information <i></i></div>
<div style="border:1px solid #d5dae3;border-radius:20px;padding:14px 18px;display:flex;flex-direction:column;gap:10px">${passengerCards}</div>

<!-- PERFORATED BOARDING TICKET NOTCH & PROMINENT BARCODE -->
<div class="avoid" style="position:relative;margin:8px 0 2px">
<div style="position:relative;display:flex;align-items:center;margin:8px 0">
<div style="width:14px;height:24px;border-top-right-radius:14px;border-bottom-right-radius:14px;background:#e9ecf2;position:absolute;left:-42px" class="notch"></div>
<div style="width:100%;border-bottom:2px dashed #c3c9d3"></div>
<div style="width:14px;height:24px;border-top-left-radius:14px;border-bottom-left-radius:14px;background:#e9ecf2;position:absolute;right:-42px" class="notch"></div>
</div>
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 18px;border-radius:16px;background:#fff;border:1px solid #d5dae3;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04)">
<div style="display:flex;align-items:center;justify-content:center;height:42px;width:100%;max-width:380px;margin-bottom:6px">
${barcode.generateBarcodeSvg(`${confirmationText(b)}-${b.booking_reference}`, { height: 40, barWidth: 1.35, color: "#15171c" })}
</div>
<span class="mono" style="font-size:12.5px;font-weight:900;letter-spacing:3px;color:#15171c;text-transform:uppercase">
*${esc(confirmationText(b))}-${esc(b.booking_reference)}*
</span>
<p style="margin:4px 0 0;font-size:10.5px;color:#5a606b;max-width:520px;line-height:1.4">
Present this official electronic confirmation receipt or quote your Airline PNR (<b>${esc(confirmationText(b))}</b>) at the airline check-in counter or automated self-service kiosks.
</p>
</div></div>
${footer("E-ticket &amp; itinerary receipt", 1)}</div>`;

  const terms = [
    ["Passenger details", "Names must match government-issued photo identification. Travellers are responsible for passports, visas, and other documents required for their itinerary."],
    ["Our role", `${LEGAL.brand} arranges travel with third-party airlines and suppliers. Their fare rules, schedules, baggage policies, and conditions govern your itinerary.`],
    ["Changes and cancellations", `Requests are subject to the airline's fare rules and fees. Changes may require a fare difference. You can cancel eligible bookings from My Bookings.`],
    ["Refunds", "Eligibility depends on the fare rules for your booking. For US flights booked at least 7 days ahead, cancellations within 24 hours of payment are refunded in full. Approved refunds go to the original payment method and typically take 7–14 business days to appear."],
    ["Missed travel", "No-shows are generally non-refundable under airline rules, and the airline may cancel the rest of the itinerary."],
    ["Travel details", "Flight times are local to each airport. Check in early, allow time for security, and check the airline's baggage rules. Airline policies govern disruptions and involuntary cancellations."],
  ];
  const page2 = `<div class="pg">
${smallHeader("E-ticket &amp; itinerary receipt", "BOOKING NUMBER", b.booking_reference)}
<div class="sec" style="margin-top:4px">Terms and conditions <i></i></div>
<section style="background:#f2f4f8;border-radius:20px;padding:20px 22px;display:flex;flex-direction:column;gap:14px">
${terms.map(([h, p], i) => `<div class="term"><b class="n">${i + 1}</b><div><h3>${esc(h)}</h3><p>${esc(p)}</p></div></div>`).join("")}</section>
<div class="sec" style="margin-top:4px">Need help? <i></i></div>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
<section style="border-radius:20px;padding:18px 20px;background:#2f4fe8;color:#fff"><div style="font-size:12px;font-weight:700;letter-spacing:.06em">CONTACT THE RESERVATION TEAM</div>
<div style="font-size:16px;font-weight:800;margin-top:8px">${esc(LEGAL.supportEmail)}</div><div style="font-size:16px;font-weight:800;margin-top:2px">${esc(LEGAL.phone)}</div>
<div style="font-size:12px;margin-top:8px;line-height:1.5;opacity:.9">Quote booking ${esc(b.booking_reference)}. Full refund details: ${esc(LEGAL.website)}/refund</div></section>
<section style="border-radius:20px;padding:18px 20px;background:#f1e04b;color:#1b1a10"><div style="font-size:12px;font-weight:800;letter-spacing:.06em">TRAVEL NOTICE</div>
<div style="font-size:15px;font-weight:800;margin-top:8px;line-height:1.45">Carry government-issued photo ID. Airline check-in, baggage, schedule and fare rules apply.</div></section></div>
${footer("E-ticket &amp; itinerary receipt", 2)}</div>`;

  return shell(`E-ticket ${b.booking_reference}`, `E-ticket-${b.booking_reference}.pdf`, [page1, page2]);
}

function invoiceStatus(b) {
  if (b.status === "CANCELLED") return Number(b.refund_amount) > 0 ? { text: "REFUNDED", tone: "blue", label: "Refunded" } : { text: "CANCELLED", tone: "red", label: "Cancelled" };
  if (b.status === "FAILED") return { text: "REFUNDED", tone: "blue", label: "Refunded" };
  if (b.payment_status === "paid") return { text: "PAID", tone: "green", label: "Paid" };
  return { text: "BALANCE DUE", tone: "yellow", label: "Balance due" };
}

function renderInvoice(b) {
  const slices = b.slices || [];
  const passengers = b.passengers || [];
  const status = invoiceStatus(b);
  const total = Number(b.customer_total || 0);
  const paid = b.payment_status === "paid";
  const refunded = Number(b.refund_amount || 0);
  const route = slices.map((s) => `${s.origin} to ${s.destination}`).join(", ");
  const firstSeg = ((slices[0] || {}).segments || [])[0] || {};
  const primaryAirlineName = b.airline || firstSeg.airline || "Scheduled Carrier";
  const primaryAirlineLogo = getAirlineLogo(firstSeg.airline_code || b.airline_code) || firstSeg.airline_logo || "";
  const segments = slices.flatMap((s) => s.segments || []);

  const page1 = `<div class="pg" style="gap:11px">
${bigHeader("TRAVEL INVOICE &amp; RECEIPT", "INVOICE NO.", `INV-${b.booking_reference}`, `<div style="font-size:12px;color:#b6bcc7;margin-top:2px">Issued ${fmtStampLong(b.created_at)}</div>`, status)}
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
<div class="card"><div class="lab">Billed to</div><div style="font-size:15px;font-weight:700;margin-top:8px">${esc(b.customer_name || `${(passengers[0] || {}).given_name || ""} ${(passengers[0] || {}).family_name || ""}`)}</div><div style="font-size:12px;color:#4f5560;margin-top:4px;word-break:break-all">${esc(b.email)}</div></div>
<div class="card"><div class="lab">Sold by</div><div style="font-size:15px;font-weight:700;margin-top:8px">${esc(LEGAL.companyName)}</div><div style="font-size:12px;color:#4f5560;margin-top:4px;line-height:1.5">${esc(LEGAL.address)}<br>${esc(LEGAL.phone)} · ${esc(LEGAL.supportEmail)}</div></div>
<div class="card"><div class="lab" style="margin-bottom:6px">Invoice details</div>
<div class="kv"><span>Invoice date</span><span>${fmtStamp(b.created_at)}</span></div>
<div class="kv"><span>Currency</span><span>${esc(b.currency || "USD")}</span></div>
<div class="kv"><span>Payment date</span><span>${paid ? fmtStamp(b.paid_at) : "—"}</span></div>
<div class="kv"><span>Status</span><span>${status.label}</span></div></div></div>
<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
<div style="border-radius:20px;padding:14px 18px;background:#2f4fe8;color:#fff;display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:12px;font-weight:700;letter-spacing:.06em">BOOKING REFERENCE</div><div class="mono" style="font-size:24px;font-weight:800;margin-top:2px">${esc(b.booking_reference)}</div></div><div style="font-size:12px;opacity:.85">Quote when contacting us</div></div>
<div style="border-radius:20px;padding:14px 18px;background:#3b7a8c;color:#fff;display:flex;justify-content:space-between;align-items:flex-end"><div><div style="font-size:12px;font-weight:700;letter-spacing:.06em">AIRLINE RECORD LOCATOR (PNR)</div><div class="mono" style="font-size:24px;font-weight:800;margin-top:2px">${esc(confirmationText(b))}</div></div><div style="font-size:12px;opacity:.85">For airline check-in</div></div>
</div>
<div class="sec">Flight itinerary <i></i><span style="font-size:12px;font-weight:600;letter-spacing:0;text-transform:none;color:#4f5560">All times are local</span></div>
${segments.map((seg) => segmentBlock(seg, { compact: true })).join("")}
<div class="avoid" style="display:flex;gap:10px;align-items:center;font-size:12px;padding:0 4px"><span class="lab">Passenger${passengers.length > 1 ? "s" : ""}</span><span style="font-weight:700">${esc(passengers.map((p) => `${p.given_name} ${p.family_name}`).join(", "))}</span></div>
<div class="sec" style="margin-top:2px">Charges <i></i></div>
<div class="avoid">
<div style="display:grid;grid-template-columns:1fr 60px 130px;padding:0 16px 6px;border-bottom:1px solid #c3c9d3" class="lab"><span>Description</span><span style="text-align:center">Qty</span><span style="text-align:right">Amount</span></div>
<div style="display:grid;grid-template-columns:1fr 60px 130px;align-items:center;padding:10px 16px;border-bottom:1px solid #e1e5ec">
<div style="display:flex;align-items:center;gap:12px">
  ${primaryAirlineLogo ? `<img src="${primaryAirlineLogo}" alt="${esc(primaryAirlineName)}" style="width:36px;height:36px;border-radius:8px;object-fit:contain;background:#fff;border:1px solid #d5dae3;padding:2px;flex-shrink:0" onerror="this.style.display='none'">` : ""}
  <div>
    <div style="font-size:13px;font-weight:700">Air travel: ${esc(journeyLabel(slices))}, ${esc(travellersLabel(passengers))}</div>
    <div style="font-size:12px;color:#4f5560">${esc(primaryAirlineName)} · ${esc(route)} · ${fmtDate(firstSeg.departing_at)}. Includes airline fare, taxes, carrier fees and service.</div>
  </div>
</div>
<span style="text-align:center;font-size:13px">1</span>
<span class="mono" style="text-align:right;font-size:13px;font-weight:700">${money(total, b.currency)}</span>
</div></div>
<div class="avoid" style="display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:12px;align-items:stretch">
<div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:10px">
<div><div class="lab">Payment method</div><div style="font-size:15px;font-weight:700;margin-top:6px">${esc(paid ? b.payment_method || "Paid" : "Not paid yet")}</div></div>
<div><div class="lab">Payment date</div><div style="font-size:13px;font-weight:700;margin-top:4px">${paid ? fmtStamp(b.paid_at) : "—"}</div></div></div>
<div style="display:flex;flex-direction:column;gap:6px">
<div class="kv" style="padding:0 6px"><span>Subtotal</span><span class="mono">${money(total, b.currency)}</span></div>
<div class="kv" style="padding:0 6px"><span>Taxes &amp; fees</span><span>Included</span></div>
<div style="display:flex;justify-content:space-between;align-items:center;background:#16181d;color:#fff;border-radius:16px;padding:12px 16px"><span style="font-size:14px;font-weight:700">Total</span><span class="mono" style="font-size:22px;font-weight:800">${money(total, b.currency)}</span></div>
${refunded > 0 ? `<div class="pill blue" style="display:flex;justify-content:space-between;padding:6px 14px"><span>Refunded</span><span class="mono">${money(refunded, b.currency)}</span></div>` : ""}
<div class="pill ${paid ? "green" : "yellow"}" style="display:flex;justify-content:space-between;padding:6px 14px"><span>${paid ? "Amount paid" : "Balance due"}</span><span class="mono">${money(paid ? total : b.status === "CANCELLED" || b.status === "EXPIRED" ? 0 : total, b.currency)}</span></div></div></div>
${footer("Electronically issued", 1)}</div>`;

  const page2 = `<div class="pg" style="gap:16px">
${smallHeader("Travel invoice &amp; receipt", "INVOICE NO.", `INV-${b.booking_reference}`)}
<section style="background:#f2f4f8;border-radius:20px;padding:20px 22px;display:flex;gap:16px;align-items:flex-start">
<span style="width:40px;height:40px;flex:0 0 40px;border-radius:50%;background:#2f4fe8;color:#fff;display:flex;align-items:center;justify-content:center"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7.5v.5"></path></svg></span>
<div><h2 style="margin:0;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase">Important information</h2>
<p style="margin:8px 0 0;font-size:13px;line-height:1.65;color:#2a2e36">The total above is the full price for this booking, including airline fares, taxes, carrier fees and our service. Refund eligibility depends on the airline's fare rules for your booking; airline change or cancellation fees may apply. For flights to, from or within the US booked at least 7 days before departure, cancellations within 24 hours of payment are refunded in full. Approved refunds go to the original payment method and typically take 7–14 business days to appear. Bring valid travel documents, arrive early for check-in and security, and note that flight times are local to each airport.</p>
<p style="margin:10px 0 0;font-size:13px;line-height:1.65;color:#2a2e36">Full details: <span style="font-weight:700;color:#1d34b0">${esc(LEGAL.website)}/refund</span>. For help, contact <span style="font-weight:700">${esc(LEGAL.supportEmail)}</span> or <span style="font-weight:700">${esc(LEGAL.phone)}</span>.</p></div></section>
${footer("Electronically issued", 2)}</div>`;

  return shell(`Invoice INV-${b.booking_reference}`, `Invoice-INV-${b.booking_reference}.pdf`, [page1, page2]);
}

module.exports = { renderEticket, renderInvoice, getAirlineLogo, AIRLINE_LOGO_CDN };
// Shared with the PDF versions (src/pdf.js) so both say the same thing.
module.exports.helpers = {
  fullFlightNumber,
  fmtDate, fmtTime, fmtBirth, fmtStamp, fmtStampLong, fmtDuration, money, airportLine, journeyLabel, travellersLabel,
  legLabel, legName, ticketStatus, invoiceStatus, confirmationText, ticketFor, localParts,
};
