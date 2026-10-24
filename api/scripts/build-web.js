// Builds the React site and copies it to api/public, where server.js serves it next to /api.
// Run from api/: npm run build:web
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const frontend = path.join(__dirname, "..", "..", "frontend");
const out = path.join(__dirname, "..", "public");

// A fresh Git clone on Hostinger has no frontend packages; NODE_ENV=production there would skip craco (a devDependency).
if (!fs.existsSync(path.join(frontend, "node_modules"))) {
  execSync("npm ci --include=dev --no-audit --no-fund", { cwd: frontend, stdio: "inherit" });
}
execSync("npx craco build", { cwd: frontend, stdio: "inherit", env: { ...process.env, CI: "true" } });
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(frontend, "build"), out, { recursive: true });
fs.rmSync(path.join(out, ".htaccess"), { force: true }); // Apache-only; Express handles routing and headers
console.log(`Website copied to ${out}`);
