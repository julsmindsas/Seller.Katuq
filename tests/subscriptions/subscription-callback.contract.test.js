"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const componentPath = path.resolve(
  __dirname,
  "../../src/app/components/subscription-callback/subscription-callback.component.ts",
);
const component = fs.readFileSync(componentPath, "utf8");
const template = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/components/subscription-callback/subscription-callback.component.html"),
  "utf8",
);

assert.ok(
  component.includes("getPaymentStatus(subscriptionId)"),
  "el callback debe consultar la referencia concreta que acaba de pagar",
);
assert.ok(
  component.includes("payment.activated === true"),
  "solo la activación confirmada de esa referencia puede mostrar éxito",
);
assert.ok(
  component.includes("payment.paymentStatus"),
  "el callback debe distinguir pagos rechazados de pagos pendientes",
);
assert.ok(
  component.includes("params['id']") && component.includes('getPublicPaymentStatus(subscriptionId, this.transactionId)'),
  "el retorno de un link debe conciliar el ID de transacción agregado por Wompi sin exigir sesión",
);
assert.ok(
  component.includes('if (this.authService.isLoggedIn)'),
  "un callback abierto en otro navegador no debe llamar endpoints autenticados ni expulsar al usuario",
);
assert.ok(
  template.includes("failed ? 'Pago no aprobado' : 'Pago pendiente'"),
  "un rechazo no puede presentarse visualmente como pago pendiente",
);
assert.ok(
  component.includes("['failed', 'declined', 'error', 'voided']"),
  "los estados terminales fallidos no pueden mostrarse como pago exitoso",
);
assert.ok(
  !component.includes("subscription.plan === 'premium'"),
  "un Premium anterior no puede confirmar un pago nuevo",
);

console.log("subscription-callback.contract.test.js: OK");
