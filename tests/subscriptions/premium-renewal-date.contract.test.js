const assert = require('assert');
const fs = require('fs');
const path = require('path');

const sidebarPath = path.join(
  __dirname,
  '../../src/app/shared/components/sidebar/sidebar.component.ts'
);
const sidebar = fs.readFileSync(sidebarPath, 'utf8');

assert.ok(
  sidebar.includes("subscription.nextBillingDate || subscription.premiumUntil"),
  'Premium debe mostrar nextBillingDate como fecha canónica de próximo cobro'
);
assert.ok(
  sidebar.includes(": subscription.limits?.orders?.resetDate"),
  'Freemium puede seguir usando la fecha de reinicio de pedidos'
);
assert.ok(
  !sidebar.includes('this.currentPlan.renewalDate = this.formatDate(subscription.limits.orders.resetDate)'),
  'La tarjeta Premium no debe presentar resetDate como fecha de cobro'
);

console.log('✅ premium-renewal-date.contract.test.js OK');
