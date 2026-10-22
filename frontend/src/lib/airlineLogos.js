/**
 * Airline Logo and Carrier Registry for AllSkyFares
 * Resolves verified carrier IATA codes, CDN logo assets, and airport meta.
 */

export const AIRLINE_LOGO_CDN = "https://images.kiwi.com/airlines/64x64";
export const DUFFEL_AIRLINE_LOGO_CDN = "https://assets.duffel.com/img/airlines/for-light-background/full-color-logo";

export const AIRLINE_CODE_MAP = {
  // Major International & North American Carriers
  "american airlines": "AA",
  "american": "AA",
  "duffel airways": "ZZ",
  "duffel": "ZZ",
  "british airways": "BA",
  "united airlines": "UA",
  "united": "UA",
  "delta air lines": "DL",
  "delta airlines": "DL",
  "delta": "DL",
  "air france": "AF",
  "lufthansa": "LH",
  "emirates": "EK",
  "qatar airways": "QR",
  "qatar": "QR",
  "singapore airlines": "SQ",
  "singapore": "SQ",
  "virgin atlantic": "VS",
  "air canada": "AC",
  "turkish airlines": "TK",
  "klm": "KL",
  "klm royal dutch airlines": "KL",
  "iberia": "IB",
  "aer lingus": "EI",
  "alaska airlines": "AS",
  "alaska": "AS",
  "jetblue": "B6",
  "jetblue airways": "B6",
  "southwest airlines": "WN",
  "southwest": "WN",
  "spirit airlines": "NK",
  "frontier airlines": "F9",
  "qantas": "QF",
  "qantas airways": "QF",
  "cathay pacific": "CX",
  "japan airlines": "JL",
  "jal": "JL",
  "ana": "NH",
  "all nippon airways": "NH",
  "swiss": "LX",
  "swiss international air lines": "LX",
  "austrian airlines": "OS",
  "austrian": "OS",
  "sas": "SK",
  "scandinavian airlines": "SK",
  "finnair": "AY",
  "tap air portugal": "TP",
  "tap portugal": "TP",
  "etihad airways": "EY",
  "etihad": "EY",
  "saudia": "SV",
  "saudi arabian airlines": "SV",
  "gulf air": "GF",
  "oman air": "WY",
  "kuwait airways": "KU",
  "royal jordanian": "RJ",
  "el al": "LY",
  "egyptair": "MS",
  "ethiopian airlines": "ET",
  "kenya airways": "KQ",
  "south african airways": "SA",
  "royal air maroc": "AT",

  // Asian & Australasian Carriers
  "indigo": "6E",
  "air india": "AI",
  "air india express": "IX",
  "vistara": "UK",
  "spicejet": "SG",
  "akasa air": "QP",
  "korean air": "KE",
  "asiana airlines": "OZ",
  "eva air": "BR",
  "china airlines": "CI",
  "china southern": "CZ",
  "china eastern": "MU",
  "air china": "CA",
  "hainan airlines": "HU",
  "malaysia airlines": "MH",
  "thai airways": "TG",
  "vietnam airlines": "VN",
  "garuda indonesia": "GA",
  "philippine airlines": "PR",
  "air new zealand": "NZ",

  // European Low-Cost & Regional Carriers
  "ryanair": "FR",
  "easyjet": "U2",
  "wizz air": "W6",
  "vueling": "VY",
  "eurowings": "EW",
  "norwegian": "DY",
  "icelandair": "FI",
  "play": "OG",
  "transavia": "HV",
  "pegasus airlines": "PC",
  "sunexpress": "XQ",

  // Latin American Carriers
  "copa airlines": "CM",
  "avianca": "AV",
  "latam": "LA",
  "latam airlines": "LA",
  "aeromexico": "AM",
  "volaris": "Y4",
  "aerolineas argentinas": "AR",
  "gol": "G3",
  "azul": "AD",

  // Miscellaneous / Standard
  "westjet": "WS",
  "aeroflot": "SU",
  "lot polish airlines": "LO",
  "tarom": "RO",
};

export const AIRPORT_NAMES = {
  JFK: { name: "John F. Kennedy International", city: "New York", country: "United States", terminal: "T8" },
  LHR: { name: "London Heathrow Airport", city: "London", country: "United Kingdom", terminal: "T3" },
  LGW: { name: "London Gatwick Airport", city: "London", country: "United Kingdom", terminal: "North" },
  EWR: { name: "Newark Liberty International", city: "New York / Newark", country: "United States", terminal: "TC" },
  LAX: { name: "Los Angeles International", city: "Los Angeles", country: "United States", terminal: "TBIT" },
  SFO: { name: "San Francisco International", city: "San Francisco", country: "United States", terminal: "TInt" },
  ORD: { name: "O'Hare International Airport", city: "Chicago", country: "United States", terminal: "T5" },
  MIA: { name: "Miami International Airport", city: "Miami", country: "United States", terminal: "T-D" },
  DXB: { name: "Dubai International Airport", city: "Dubai", country: "United Arab Emirates", terminal: "T3" },
  HND: { name: "Tokyo Haneda Airport", city: "Tokyo", country: "Japan", terminal: "T3" },
  NRT: { name: "Tokyo Narita Airport", city: "Tokyo", country: "Japan", terminal: "T1" },
  CDG: { name: "Charles de Gaulle Airport", city: "Paris", country: "France", terminal: "2E" },
  AMS: { name: "Amsterdam Schiphol Airport", city: "Amsterdam", country: "Netherlands", terminal: "T1" },
  FRA: { name: "Frankfurt Airport", city: "Frankfurt", country: "Germany", terminal: "T1" },
  MUC: { name: "Munich Airport", city: "Munich", country: "Germany", terminal: "T2" },
  MAD: { name: "Adolfo Suárez Madrid–Barajas", city: "Madrid", country: "Spain", terminal: "T4" },
  FCO: { name: "Leonardo da Vinci–Fiumicino", city: "Rome", country: "Italy", terminal: "T3" },
  SIN: { name: "Singapore Changi Airport", city: "Singapore", country: "Singapore", terminal: "T3" },
  HKG: { name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong", terminal: "T1" },
  BOM: { name: "Chhatrapati Shivaji Maharaj Intl", city: "Mumbai", country: "India", terminal: "T2" },
  DEL: { name: "Indira Gandhi International", city: "Delhi", country: "India", terminal: "T3" },
  SYD: { name: "Sydney Kingsford Smith Airport", city: "Sydney", country: "Australia", terminal: "T1" },
  MEL: { name: "Melbourne Airport", city: "Melbourne", country: "Australia", terminal: "T2" },
  YYZ: { name: "Toronto Pearson International", city: "Toronto", country: "Canada", terminal: "T1" },
  YVR: { name: "Vancouver International", city: "Vancouver", country: "Canada", terminal: "M" },
  DOH: { name: "Hamad International Airport", city: "Doha", country: "Qatar", terminal: "T1" },
  IST: { name: "Istanbul Airport", city: "Istanbul", country: "Turkey", terminal: "Main" },
  ZRH: { name: "Zurich Airport", city: "Zurich", country: "Switzerland", terminal: "Airside Center" },
  VIE: { name: "Vienna International Airport", city: "Vienna", country: "Austria", terminal: "T3" },
  BRU: { name: "Brussels Airport", city: "Brussels", country: "Belgium", terminal: "T1" },
  DUB: { name: "Dublin Airport", city: "Dublin", country: "Ireland", terminal: "T2" },
};

/**
 * Resolves complete airline branding (code, full name, CDN logo, and fallback logo)
 * from any booking object, segment, carrier code, or airline string.
 */
export function getAirlineInfo(input) {
  if (!input) {
    return {
      code: "ASF",
      name: "Scheduled Carrier",
      logo: null,
      fallbackLogo: null,
    };
  }

  // If plain string passed
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.length === 2 && trimmed === trimmed.toUpperCase()) {
      return getAirlineInfo({ airline_code: trimmed });
    }
    return getAirlineInfo({ airline: trimmed });
  }

  // Look for direct logo on booking or nested segments
  const firstSeg = input?.slices?.[0]?.segments?.[0] || input?.segments?.[0] || {};
  const explicitLogo = input?.airline_logo || firstSeg?.airline_logo || input?.logo || null;

  // Find airline name
  const name = (
    input?.airline ||
    firstSeg?.airline ||
    input?.carrier_name ||
    input?.name ||
    ""
  ).trim();

  // Find airline code
  let code = (
    input?.airline_code ||
    firstSeg?.airline_code ||
    input?.code ||
    ""
  ).trim().toUpperCase();

  // If code is missing, wildcard, or invalid, deduce from airline name
  if (!code || code === "*" || code.length !== 2) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    if (cleanName && AIRLINE_CODE_MAP[cleanName]) {
      code = AIRLINE_CODE_MAP[cleanName];
    } else {
      // Partial prefix matching
      for (const [key, mappedCode] of Object.entries(AIRLINE_CODE_MAP)) {
        if (cleanName.startsWith(key) || key.startsWith(cleanName)) {
          code = mappedCode;
          break;
        }
      }
    }
  }

  // Special case: Duffel Airways (test sandbox carrier)
  const isDuffel = code === "ZZ" || name.toLowerCase().includes("duffel");
  if (isDuffel) {
    return {
      code: "ZZ",
      name: name || "Duffel Airways",
      logo: `${DUFFEL_AIRLINE_LOGO_CDN}/ZZ.svg`,
      fallbackLogo: `${DUFFEL_AIRLINE_LOGO_CDN}/ZZ.svg`,
      isDuffel: true,
    };
  }

  // Standard carrier with 2-letter IATA code
  if (code && code.length === 2 && code !== "**") {
    const kiwiLogo = `${AIRLINE_LOGO_CDN}/${code}.png`;
    const duffelSvg = `${DUFFEL_AIRLINE_LOGO_CDN}/${code}.svg`;
    return {
      code,
      name: name || code,
      logo: explicitLogo || kiwiLogo,
      fallbackLogo: duffelSvg,
      isDuffel: false,
    };
  }

  // Fallback if no code could be derived
  return {
    code: name ? name.slice(0, 2).toUpperCase() : "FL",
    name: name || "Scheduled Carrier",
    logo: explicitLogo,
    fallbackLogo: null,
    isDuffel: false,
  };
}

/**
 * Returns primary logo URL for a booking
 */
export function getBookingLogo(booking) {
  const info = getAirlineInfo(booking);
  return info.logo;
}

/**
 * Helper to get clean airport details
 */
export function getAirportMeta(iata) {
  const code = (iata || "").toUpperCase().trim();
  if (AIRPORT_NAMES[code]) {
    return {
      code,
      ...AIRPORT_NAMES[code],
    };
  }
  return {
    code: code || "???",
    name: `${code} Airport`,
    city: code,
    country: "",
    terminal: "Main",
  };
}
