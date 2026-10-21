const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const component = read('src/app/shared/components/upgrade-modal/upgrade-modal.component.ts');
const modal = read('src/app/shared/components/upgrade-modal/upgrade-modal.component.html');
// D-540 (IDI-B01b): el modal de pago pasa sus textos por el traductor; el texto en español vive en
// es.json bajo la clave que pide la plantilla (puede llevar variables alrededor).
const esDic = JSON.parse(read('src/assets/i18n/es.json'));
const muestraTexto = (html, texto) => html.includes(texto)
  || Object.entries(esDic).some(([clave, valor]) => typeof valor === 'string' && valor.includes(texto) && html.includes(`'${clave}'`));
const service = read('src/app/shared/services/subscription.service.ts');
const pricing = read('src/app/components/pricing/pricing.component.html');

assert.ok(!component.includes("from '@angular/common/http'"), 'el componente no debe usar HttpClient directo');
assert.ok(component.includes('encryptCardDataForWompi'), 'el formulario debe cifrar la tarjeta antes de tokenizar');
assert.ok(component.includes('tokenizeWompiEncryptedCard'), 'el formulario debe enviar únicamente el JWE a Wompi');
assert.ok(component.includes('createRecurringPaymentSource'), 'el formulario debe crear la fuente recurrente a través del servicio');
assert.ok(component.includes('paymentQuoteId'), 'el frontend debe conservar la cotización mostrada');
assert.ok(component.includes('quoteId: this.paymentQuoteId'), 'el primer cobro debe enviar la misma cotización mostrada');
assert.ok(service.includes('getWompiMerchant'), 'el servicio debe cargar los términos públicos de Wompi');
assert.ok(service.includes('tokenizeWompiEncryptedCard'), 'el servicio debe encapsular la tokenización cifrada');
assert.ok(!service.includes('card: { number: string'), 'el servicio HTTP no debe aceptar campos legibles de tarjeta');
assert.ok(component.includes('config.initialAmountCOP'), 'el botón debe usar exactamente el monto del backend');
assert.ok(!component.includes('isLocalEnvironment'), 'localhost no puede decidir si un cobro es de prueba');
assert.ok(muestraTexto(modal, 'Pago real con Wompi'), 'producción debe advertir que el cobro es real');
assert.ok(muestraTexto(modal, 'Prueba real con Wompi'), 'el monto reducido productivo debe identificarse como dinero real');
assert.ok(modal.includes('shell.upgrade.summary.planMonthly') && modal.includes('shell.upgrade.summary.planYearly'), 'la recurrencia mensual o anual debe explicarse antes de pagar');
assert.ok(modal.includes("selectBillingPeriod('yearly')"), 'el alta debe permitir seleccionar anualidad');
assert.ok(component.includes('billingPeriod: this.billingPeriod'), 'el período elegido debe enviarse junto al token');
assert.ok(service.includes('updateBillingPeriod'), 'un cliente activo debe poder programar mensual↔anual sin recapturar tarjeta');
assert.ok(muestraTexto(modal, 'Cifrado seguro activo'), 'la UI debe confirmar el cifrado antes de habilitar campos');
assert.ok(modal.includes('autocomplete="cc-number"'), 'los campos deben declarar semántica segura de tarjeta');
assert.ok(modal.includes('isCardFormValid'), 'el botón debe bloquearse mientras haya campos inválidos');
assert.ok(muestraTexto(pricing, 'Último comprobante'), 'pricing debe mostrar el último comprobante');
assert.ok(muestraTexto(pricing, 'Simulación Wompi Sandbox · sin dinero real'), 'la UI debe identificar claramente la simulación');
assert.ok(muestraTexto(pricing, 'Guardar para el próximo cobro'), 'pricing debe aclarar que cambiar periodicidad no cobra inmediatamente');

console.log('wompi-recurring-ui.contract.test.js: OK');
