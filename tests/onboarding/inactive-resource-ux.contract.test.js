"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const component = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.ts",
  ),
  "utf8",
).replace(/\s+/g, " ");
const template = fs.readFileSync(
  path.resolve(
    __dirname,
    "../../src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.html",
  ),
  "utf8",
).replace(/\s+/g, " ");

assert.match(component, /error\?\.error\?\.code === 'ONBOARDING_RESOURCE_INACTIVE'/);
assert.match(component, /this\.activeId === 'payment'.*?this\.paymentNeedsManualActivation = true/);
assert.match(component, /managePaymentMethods\(\).*?navigate\(\['\/extras\/formasPago'\]\)/);
assert.match(
  template,
  /\*ngIf="paymentNeedsManualActivation".*?\(click\)="managePaymentMethods\(\)".*?Revisar métodos de pago/,
);

// Una forma de entrega inactiva no queda en un loop de "éxito" falso: el CTA
// del requisito faltante lleva al módulo donde el usuario puede activarla.
assert.match(
  component,
  /channel === 'delivery'.*?delivery_ready === false.*?navigate\(\['\/formasEntrega'\]\)/,
);

console.log("inactive-resource-ux.contract.test.js: OK");
