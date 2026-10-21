const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const subscriptionService = read('src/app/shared/services/subscription.service.ts');
const pricingTs = read('src/app/components/pricing/pricing.component.ts');
const pricingHtml = read('src/app/components/pricing/pricing.component.html');
const usageHtml = read('src/app/shared/components/usage-widget/usage-widget.component.html');
const sidebarHtml = read('src/app/shared/components/sidebar/sidebar.component.html');
const sidebarTs = read('src/app/shared/components/sidebar/sidebar.component.ts');

assert.ok(
  subscriptionService.includes('remaining: usage.ai.chat?.remaining ?? 10'),
  'el valor real 0 de consultas KAI no debe convertirse en 10'
);
assert.ok(
  subscriptionService.includes('remaining: usage.ai.products?.remaining ?? 10'),
  'el valor real 0 de productos IA no debe convertirse en 10'
);
assert.ok(
  subscriptionService.includes('Math.max(0, usage.orders.limit - (usage.orders.current ?? 0))'),
  'los pedidos restantes nunca deben mostrarse negativos'
);
// D-532 (IDI-B02): la lista del plan Gratis guarda claves; el texto en español vive en es.json.
const esPricing = JSON.parse(read('src/assets/i18n/es.json'));
assert.ok(pricingTs.includes("text: 'pricing.free.kaiQueries'") && esPricing['pricing.free.kaiQueries'] === 'Consultas KAI: 10 al día por usuario');
assert.ok(pricingTs.includes("text: 'pricing.free.aiProducts'") && esPricing['pricing.free.aiProducts'] === 'Productos con IA: 10 al día por usuario');
assert.ok(pricingHtml.includes("'pricing.free.includes' | translate") && esPricing['pricing.free.includes'] === 'Lo que incluye tu plan Gratis');
// D-532 (IDI-B01a): la tarjeta del plan pasa sus textos por el traductor; el texto en español vive
// en es.json bajo la clave que pide la plantilla.
const es = JSON.parse(read('src/assets/i18n/es.json'));
const muestraTexto = (html, texto) => html.includes(texto)
  || Object.entries(es).some(([clave, valor]) => valor === texto && html.includes(`'${clave}' | translate`));
// IDI-B01b: el widget de uso también pasa sus textos por el traductor.
assert.ok(muestraTexto(usageHtml, 'Consultas KAI hoy (tu usuario)'));
assert.ok(muestraTexto(usageHtml, 'Productos IA hoy (tu usuario)'));
assert.ok(muestraTexto(sidebarHtml, 'Pedidos del mes'));
assert.ok(muestraTexto(sidebarHtml, 'Consultas KAI hoy'));
assert.ok(muestraTexto(sidebarHtml, 'Se renuevan diariamente'));
assert.ok(
  sidebarTs.includes('this.currentPlan.progress = this.calculateOrderProgress(usage)'),
  'el progreso mensual del sidebar debe calcularse solo con pedidos'
);

console.log('free-plan-ui.contract.test.js: OK');
