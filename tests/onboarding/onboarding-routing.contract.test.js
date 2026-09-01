"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function compact(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8")
    .replace(/\s+/g, " ");
}

const wizard = compact("../../src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.ts");
const wizardHtml = compact("../../src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.html");
const products = compact("../../src/app/components/productos/productos.component.ts");
const productsHtml = compact("../../src/app/components/productos/productos.component.html");
const inventory = compact("../../src/app/components/inventarios/inventario-catalogo/inventarios.component.ts");
const inventoryHtml = compact("../../src/app/components/inventarios/inventario-catalogo/inventarios.component.html");
const appHtml = compact("../../src/app/app.component.html");
const auth = compact("../../src/app/shared/services/firebase/auth.service.ts");

// El flujo y sus dos handoffs tienen loaders propios y no quedan cubiertos por
// las precargas globales que arrancan después del login.
assert.match(wizard, /suppressGlobalLoader\(\).*?releaseGlobalLoader\(\)/);
assert.match(products, /onboardingReturnUrl.*?suppressGlobalLoader\(\)/);
assert.match(products, /releaseGlobalLoader\(\)/);
assert.match(inventory, /onboardingReturnUrl.*?suppressGlobalLoader\(\)/);
assert.match(inventory, /releaseGlobalLoader\(\)/);
assert.match(appHtml, /app-loader-custom \*ngIf="!isPublicRoute"/);
assert.match(auth, /SignOut\(\).*?loaderService\.reset\(\)/);

// Ambos importadores conservan una ruta de regreso explícita y validada.
assert.match(wizard, /onboardingImport: 'products', onboardingReturn: '\/onboarding'/);
assert.match(wizard, /onboardingImport: 'inventory', onboardingReturn: '\/onboarding'/);
assert.match(products, /requestedReturn === '\/onboarding'/);
assert.match(inventory, /requestedReturn === '\/onboarding'/);
assert.match(inventory, /!this\.onboardingReturnUrl && !completedTours\.includes\("inventario"\)/);
assert.match(productsHtml, /Volver a la configuración/);
assert.match(inventoryHtml, /Volver a la configuración/);
assert.match(wizardHtml, /Faltan las existencias iniciales/);

// La copia más reciente gana por fecha y el dato viaja dentro del contexto V2.
assert.match(wizard, /lastUpdated: this\.progressUpdatedAt/);
assert.match(wizard, /newestProgress\(cachedProgress, remoteProgress\)/);
assert.match(wizard, /cachedAt > remoteAt \? cached : remote/);

// Entrar manualmente a /onboarding después de completarlo abre el resumen para
// revisarlo; no debe generar un rebote silencioso a /welcome.
assert.match(wizard, /const onboardingWasCompleted = remoteProgress\?\.onboardingCompleted === true/);
assert.match(wizard, /onboardingWasCompleted[\s\S]*?this\.status = \{ \.\.\.this\.status, result: 'done' \}/);
assert.doesNotMatch(wizard, /onboardingCompleted === true[\s\S]{0,260}router\.navigate\(\['\/welcome'\]\)/);

console.log("onboarding-routing.contract.test.js: OK");
