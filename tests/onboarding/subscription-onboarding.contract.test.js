const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const modalTs = read('src/app/shared/components/upgrade-modal/upgrade-modal.component.ts');
const modalHtml = read('src/app/shared/components/upgrade-modal/upgrade-modal.component.html');
const guard = read('src/app/shared/guards/subscription.guard.ts');
const appRoutes = read('src/app/app-routing.module.ts');
const childRoutes = read('src/app/shared/routes/routes.ts');
const welcome = read('src/app/welcome/welcome.component.html');
const onboarding = read('src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.html');
const registrationTs = read('src/app/components/diagnostic-survey/diagnostic-survey.component.ts');
const registrationHtml = read('src/app/components/diagnostic-survey/diagnostic-survey.component.html');
const quickStart = read('src/app/shared/services/quickstart/katuq-quickstart.service.ts');

assert.ok(!modalTs.includes('skipCard()'), 'el modal no debe permitir omitir el pago');
assert.ok(!modalTs.includes("upgradePlan('premium'"), 'el frontend no debe activar Premium directamente');
assert.ok(!modalHtml.includes('Omitir tarjeta'), 'la UI no debe ofrecer Premium sin tarjeta/pago');
assert.ok(modalTs.includes('getPaymentStatus'), 'el modal debe esperar confirmación del webhook');
assert.ok(modalHtml.includes("step === 'pending'"), 'la UI debe explicar el estado pendiente');
assert.ok(modalTs.includes('localTestAmountCOP'), 'el modal debe exponer el monto de prueba local');
assert.ok(modalHtml.includes('Este valor no aplica en producción'), 'la UI debe diferenciar el precio local del productivo');

assert.ok(guard.includes('loadSubscriptionStatus()'), 'el guard debe validar el plan contra backend');
assert.ok(guard.includes('return of(false)'), 'un fallo de validación debe cerrar el acceso');
assert.ok(!guard.includes('En caso de error, permitir acceso'), 'el guard no puede fallar abierto');

for (const route of ['video-agent', 'agent-builder']) {
  const start = appRoutes.indexOf(`path: '${route}'`);
  assert.ok(start >= 0, `falta la ruta ${route}`);
  const routeBlock = appRoutes.slice(start, start + 420);
  assert.ok(routeBlock.includes('SubscriptionGuard'), `${route} debe usar SubscriptionGuard`);
  assert.ok(routeBlock.includes('requiresPremium: true'), `${route} debe declarar requiresPremium`);
}

const dropshippingStart = childRoutes.indexOf('path: "dropshipping"');
const dropshippingBlock = childRoutes.slice(dropshippingStart, dropshippingStart + 420);
assert.ok(dropshippingBlock.includes('SubscriptionGuard'), 'dropshipping debe usar SubscriptionGuard');
assert.ok(dropshippingBlock.includes('requiresPremium: true'), 'dropshipping debe ser Premium');

assert.ok(onboarding.includes('Empiezas en el plan Gratis'), 'el cierre debe confirmar el plan Gratis');
assert.ok(welcome.includes('Haz tu primera venta en Katuq'), 'el inicio debe guiar a la primera venta');
assert.ok(welcome.includes('0 de {{ freeOrdersLimit }} pedidos usados') || welcome.includes('{{ freeOrdersUsed }} de {{ freeOrdersLimit }} pedidos usados'), 'el inicio debe mostrar uso Gratis');

assert.ok(registrationTs.includes("= 'welcome'"), 'el registro no debe comenzar obligatoriamente en el video');
assert.ok(registrationTs.includes('startFreeRegistration()'), 'debe existir un camino de registro directo');
assert.ok(registrationTs.includes("['video', 'welcome', 'quickstart-success']"), 'un registro anterior no debe dejar una pantalla de éxito vacía');
assert.ok(registrationHtml.includes('Crear mi cuenta Gratis'), 'el CTA principal debe ser crear la cuenta Gratis');
assert.ok(registrationHtml.includes('El diagnóstico es opcional'), 'la UI debe decir que el diagnóstico es opcional');
assert.ok(registrationHtml.includes('Solo necesitamos estos 4 datos'), 'el registro directo debe explicar su alcance');
assert.ok(!quickStart.includes('Se requieren respuestas del diagnóstico'), 'el servicio no debe bloquear el registro sin diagnóstico');

console.log('subscription-onboarding.contract.test.js: OK');
