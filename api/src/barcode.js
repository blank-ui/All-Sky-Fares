// Code 128 (Subset B) Barcode Generator for SVG & PDFKit
// Generates standard, scannable IATA/airline e-ticket barcodes.

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106
];

const START_B = 104;
const STOP = 106;

function encodeCode128B(text) {
  const safeText = String(text || "").replace(/[^\x20-\x7E]/g, "").trim() || "ALLSKYFARES";
  let sum = START_B;
  const indices = [START_B];

  for (let i = 0; i < safeText.length; i++) {
    const code = safeText.charCodeAt(i) - 32;
    indices.push(code);
    sum += code * (i + 1);
  }

  const check = sum % 103;
  indices.push(check);
  indices.push(STOP);

  let patternStr = "";
  for (const idx of indices) {
    patternStr += CODE128_PATTERNS[idx];
  }

  return { pattern: patternStr, text: safeText };
}

function generateBarcodeSvg(text, { height = 36, barWidth = 1.3, color = "#15171c" } = {}) {
  const { pattern } = encodeCode128B(text);
  let totalModules = 0;
  for (const c of pattern) totalModules += parseInt(c, 10);

  const width = Math.ceil(totalModules * barWidth);
  let x = 0;
  let isBar = true;
  const rects = [];

  for (const c of pattern) {
    const mod = parseInt(c, 10);
    const w = mod * barWidth;
    if (isBar) {
      rects.push(`<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="${color}" />`);
    }
    x += w;
    isBar = !isBar;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;max-width:100%;height:auto" aria-hidden="true">${rects.join("")}</svg>`;
}

function drawBarcodePdf(doc, text, x, y, { height = 22, barWidth = 1.05, color = "#15171c" } = {}) {
  const { pattern } = encodeCode128B(text);
  let curX = x;
  let isBar = true;

  doc.save();
  for (const c of pattern) {
    const mod = parseInt(c, 10);
    const w = mod * barWidth;
    if (isBar) {
      doc.rect(curX, y, w, height).fill(color);
    }
    curX += w;
    isBar = !isBar;
  }
  doc.restore();

  return curX - x;
}

function getTicketBarcodeString(booking, passenger) {
  const full = `${passenger?.given_name || ""} ${passenger?.family_name || ""}`.trim().toLowerCase();
  const t = (booking?.tickets || []).find((x) => String(x.passenger || "").toLowerCase().includes(full));
  // Authentic ticket numbers are at least 6 characters (e.g. 125-8392019382)
  if (t && t.number && String(t.number).trim().length >= 6 && !/being issued|not issued/i.test(t.number)) {
    return String(t.number).trim().replace(/\s+/g, "");
  }
  if ((booking?.tickets || []).length === 1 && booking.tickets[0]?.number && String(booking.tickets[0].number).trim().length >= 6 && !/being issued|not issued/i.test(booking.tickets[0].number)) {
    return String(booking.tickets[0].number).trim().replace(/\s+/g, "");
  }
  // Otherwise use the combination of PNR and booking reference
  if (booking?.airline_pnr && booking.airline_pnr !== "—") {
    return `${booking.airline_pnr}-${booking.booking_reference || "ETKT"}`;
  }
  return `ASF-${booking?.booking_reference || "PASS"}`;
}

module.exports = {
  encodeCode128B,
  generateBarcodeSvg,
  drawBarcodePdf,
  getTicketBarcodeString,
};
