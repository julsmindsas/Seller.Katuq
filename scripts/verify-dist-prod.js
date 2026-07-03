"use strict";

/**
 * Guardarrail de deploy — incidente 2026-07-02/03.
 *
 * Esa noche, un `ng build` base (environment de DESARROLLO, urlApi
 * localhost:3300) corrió en paralelo con `npm run build:prod` sobre el mismo
 * dist/cuba; el main.js dev pisó al de producción y se desplegó a Firebase
 * Hosting → toda la app en prod quedó apuntando al localhost de cada usuario.
 *
 * Este script corre como `predeploy` del hosting (firebase.json) y ABORTA el
 * deploy si el bundle principal en dist/cuba no es un build de producción:
 *  1. urlApi debe ser el backend de prod (back.katuq.com).
 *  2. No puede existir un urlApi activo apuntando a localhost.
 *  3. index.html debe referenciar el/los bundles presentes (consistencia).
 */

const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "..", "dist", "cuba");
const PROD_API = "back.katuq.com";

function fail(msg) {
  console.error(`\n❌ [verify-dist-prod] ${msg}`);
  console.error("   Deploy ABORTADO. Reconstruye con: npm run build:prod (sin otros builds en paralelo).\n");
  process.exit(1);
}

if (!fs.existsSync(DIST)) fail(`No existe ${DIST} — corre npm run build:prod primero.`);

const indexPath = path.join(DIST, "index.html");
if (!fs.existsSync(indexPath)) fail("dist/cuba/index.html no existe.");
const indexHtml = fs.readFileSync(indexPath, "utf8");

// Bundles main referenciados por el index (con o sin hash).
const mainRefs = indexHtml.match(/src="(main[^"]*\.js)"/g) || [];
if (mainRefs.length === 0) fail("index.html no referencia ningún main*.js.");

const mainFiles = mainRefs.map((m) => m.match(/src="([^"]*)"/)[1]);
for (const f of mainFiles) {
  const p = path.join(DIST, f);
  if (!fs.existsSync(p)) fail(`index.html referencia ${f} pero no está en dist/cuba (¿builds mezclados?).`);
  const js = fs.readFileSync(p, "utf8");

  // urlApi activo apuntando a localhost = build de desarrollo.
  if (/urlApi\s*:\s*["']http:\/\/localhost/.test(js)) {
    fail(`${f} tiene urlApi apuntando a localhost — es un build de DESARROLLO (environment.ts).`);
  }
  // Debe existir el urlApi de producción.
  if (!new RegExp(`urlApi\\s*:\\s*["']https://${PROD_API.replace(/\./g, "\\.")}`).test(js)) {
    fail(`${f} no contiene urlApi https://${PROD_API} — no parece un build de producción.`);
  }
}

console.log(`✅ [verify-dist-prod] OK — ${mainFiles.join(", ")} apunta a https://${PROD_API}. Deploy permitido.`);
