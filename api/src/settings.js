// Centralized application settings & integration controls stored in MySQL `settings` table.
const db = require("./db");
const { utcNow } = require("./util");

const CONTROLS_META = {
  crm_sync: {
    label: "CRM Webhook Dispatch",
    category: "Webhooks",
    description: "Outbound booking events dispatched to external CRM webhook endpoint.",
    allowedModes: ["test_bypass", "enabled", "disabled"],
    labels: {
      test_bypass: "Test Bypass (Mock)",
      enabled: "Live Dispatch",
      disabled: "Paused / Spooled",
    },
    defaultMode: "enabled", // test_bypass marks events delivered without sending them; never the default
    requiresSuperAdmin: false,
  },
  duffel_payments: {
    label: "Duffel Card Payments",
    category: "Payment Gateway",
    description: "Enables instant Duffel Payments card intent capture at checkout.",
    allowedModes: ["enabled", "disabled"],
    labels: {
      enabled: "Card Checkout Active",
      disabled: "Hold / Manual Mode",
    },
    defaultMode: "disabled",
    requiresSuperAdmin: true,
  },
  duffel_webhook: {
    label: "Inbound Duffel Webhook",
    category: "Webhooks",
    description: "Receives airline schedule modifications, ticket issuances, and order cancellations.",
    allowedModes: ["enabled", "disabled"],
    labels: {
      enabled: "Ingestion Active",
      disabled: "Ignored / Paused",
    },
    defaultMode: "enabled",
    requiresSuperAdmin: true,
  },
  email_notifications: {
    label: "Customer Email Dispatch",
    category: "Communications",
    description: "Sends automated e-tickets, PDF receipts, and booking confirmation emails.",
    allowedModes: ["enabled", "disabled"],
    labels: {
      enabled: "Live Emails Active",
      disabled: "Suppressed (Test Mode)",
    },
    defaultMode: "enabled",
    requiresSuperAdmin: false,
  },
  tawk_chat: {
    label: "Tawk.to Customer Live Chat",
    category: "Communications",
    description: "Displays live support concierge chat widget for storefront visitors.",
    allowedModes: ["enabled", "disabled"],
    labels: {
      enabled: "Widget Active",
      disabled: "Widget Hidden",
    },
    defaultMode: "disabled",
    requiresSuperAdmin: false,
  },
};

const cache = new Map();
let lastLoadTime = 0;
const CACHE_TTL_MS = 3000;

async function loadAllSettings() {
  const now = Date.now();
  if (cache.size > 0 && now - lastLoadTime < CACHE_TTL_MS) {
    return cache;
  }
  try {
    const rows = await db.fetchAll("SELECT `key`, `value`, `updated_at`, `updated_by` FROM settings");
    cache.clear();
    for (const r of rows) {
      cache.set(r.key, r.value);
    }
    lastLoadTime = now;
  } catch (err) {
    // If DB has a temporary error, keep whatever was in cache
  }
  return cache;
}

/** The mode an admin saved, or null when the control was never set. */
function storedControlSync(key) {
  const meta = CONTROLS_META[key];
  const val = cache.get(`control_${key}`);
  return meta && val && typeof val === "object" && meta.allowedModes.includes(val.mode) ? val.mode : null;
}

function getControlSync(key) {
  const meta = CONTROLS_META[key];
  if (!meta) return null;
  return storedControlSync(key) || meta.defaultMode;
}

async function getControl(key) {
  const meta = CONTROLS_META[key];
  if (!meta) return null;
  const all = await loadAllSettings();
  const val = all.get(`control_${key}`);
  if (val && typeof val === "object" && meta.allowedModes.includes(val.mode)) {
    return val.mode;
  }
  return meta.defaultMode;
}

async function getAllControls() {
  const all = await loadAllSettings();
  const result = {};
  for (const [key, meta] of Object.entries(CONTROLS_META)) {
    const val = all.get(`control_${key}`);
    const mode = (val && typeof val === "object" && meta.allowedModes.includes(val.mode))
      ? val.mode
      : meta.defaultMode;
    result[key] = {
      key,
      label: meta.label,
      category: meta.category,
      description: meta.description,
      mode,
      allowedModes: meta.allowedModes,
      labels: meta.labels,
      requiresSuperAdmin: Boolean(meta.requiresSuperAdmin),
      updated_at: val?.updated_at || null,
      updated_by: val?.updated_by || null,
    };
  }
  return result;
}

async function setControl(key, mode, userId = null) {
  const meta = CONTROLS_META[key];
  if (!meta) throw new Error(`Unknown control: ${key}`);
  if (!meta.allowedModes.includes(mode)) {
    throw new Error(`Invalid mode "${mode}" for ${key}. Allowed: ${meta.allowedModes.join(", ")}`);
  }

  const payload = {
    mode,
    updated_at: utcNow(),
    updated_by: userId,
  };

  await db.upsert(
    "settings",
    {
      key: `control_${key}`,
      value: payload,
      updated_at: utcNow(),
      updated_by: userId,
    },
    ["key"]
  );

  // Invalidate cache immediately
  cache.set(`control_${key}`, payload);
  lastLoadTime = Date.now();

  return getAllControls();
}

module.exports = {
  CONTROLS_META,
  getControl,
  getControlSync,
  storedControlSync,
  getAllControls,
  setControl,
  loadAllSettings,
};
