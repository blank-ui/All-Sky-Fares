const path = require("path");

// Load backend secrets and database settings into process.env
require("dotenv").config({ path: path.join(__dirname, "../../api/.env") });

// Signal api/server.js not to start an independent port listener
process.env.EMBEDDED_API = "true";

const { app: apiApp } = require("../../api/server");

/**
 * Single-port development setup:
 * Mounts the AllSkyFares API router directly inside the frontend dev server.
 * Frontend (HTML, React, HMR) and API (/api/*, /health) operate on the single active port.
 */
module.exports = function (app) {
  app.use(apiApp);
};
