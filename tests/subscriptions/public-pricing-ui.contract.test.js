"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pricingTs = read("src/app/components/pricing/pricing.component.ts");
const pricingHtml = read("src/app/components/pricing/pricing.component.html");
const pricingScss = read("src/app/components/pricing/pricing.component.scss");
const modalHtml = read("src/app/shared/components/upgrade-modal/upgrade-modal.component.html");

const publicTiers = [
  ["Base", 27, 15000000],
  ["Origen", 47, 30000000],
  ["Esencia", 77, 60000000],
  ["Impulso", 147, 150000000],
  ["Expansión", 247, 300000000],
  ["Liderazgo", 427, 500000000],
];

for (const [name, price, maxSales] of publicTiers) {
  assert.ok(pricingTs.includes(`name: '${name}', priceUSD: ${price}, maxSalesCOP: ${maxSales}`));
}

assert.ok(pricingHtml.includes("Crece") && pricingHtml.includes("Todo Katuq sin límites"));
assert.ok(pricingHtml.includes("Calculadora"));
assert.ok(pricingHtml.includes("Ver precios públicos"));
assert.ok(pricingHtml.includes("20% de descuento") || pricingHtml.includes("annualDiscount"));
assert.ok(pricingHtml.includes('¿Mensual o anual?'));
assert.ok(pricingHtml.includes('invoice.paymentLink') && pricingHtml.includes('Pagar ahora'), 'una cuenta manual debe poder pagarse también desde Pricing');
assert.ok(pricingHtml.includes('!invoice.manualReconciliationRequired'), 'Pricing no debe ofrecer de nuevo un link cuyo pago está en conciliación');
assert.ok(pricingHtml.includes('No vuelvas a pagarlo'), 'la conciliación manual debe proteger al comercio de un segundo pago');
assert.ok(pricingHtml.includes("invoice.status === 'paid'"), 'solo una factura pagada puede mostrar el próximo cobro');
assert.ok(pricingTs.includes('invoiceGraceDeadline'), 'Pricing debe mostrar la fecha límite de la gabela manual');
assert.ok(pricingTs.includes('Math.round(monthly * 12 * 0.8'), 'la vista anual debe aplicar el mismo 20% del backend');
assert.ok(pricingTs.includes('billingInfo?.projectedAmountUSD'), 'la anualidad de un Premium debe usar su tramo calculado por backend y no el slider');
assert.ok(pricingHtml.includes('*ngIf="canManageBillingPeriod"'), 'promociones y cortesías no deben mostrar un selector de cobro que backend rechazará');
assert.ok(pricingTs.includes('refreshBillingState()') && pricingTs.includes('loadSubscriptionStatus()'), 'actualizar debe refrescar factura y plan');
assert.ok(pricingHtml.includes('[disabled]="billingActionDisabled"'), 'no se puede abrir un alta mientras el estado del plan está cargando');
assert.ok(modalHtml.includes("<td>Base</td>") && modalHtml.includes("$27 USD"));
assert.ok(!pricingScss.includes("linear-gradient"), "Pricing debe usar cards planas sin gradientes");

console.log("public-pricing-ui.contract.test.js: OK");
