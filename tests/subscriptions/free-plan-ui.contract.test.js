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
assert.ok(pricingTs.includes('Consultas KAI: 10 al día por usuario'));
assert.ok(pricingTs.includes('Productos con IA: 10 al día por usuario'));
assert.ok(pricingHtml.includes('Lo que incluye tu plan Gratis'));
assert.ok(usageHtml.includes('Consultas KAI hoy (tu usuario)'));
assert.ok(usageHtml.includes('Productos IA hoy (tu usuario)'));
assert.ok(sidebarHtml.includes('Pedidos del mes'));
assert.ok(sidebarHtml.includes('Consultas KAI hoy'));
assert.ok(sidebarHtml.includes('Se renuevan diariamente'));
assert.ok(
  sidebarTs.includes('this.currentPlan.progress = this.calculateOrderProgress(usage)'),
  'el progreso mensual del sidebar debe calcularse solo con pedidos'
);

console.log('free-plan-ui.contract.test.js: OK');
