'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B01b, tarea 2.4): caracterización del
// modal de pago (upgrade-modal), escrita ANTES de pasar sus textos al traductor y corrida igual
// después. El modal toca pagos (Wompi), módulo sensible: el bloque solo puede cambiar textos.
// Fija lo que no depende del idioma: qué validaciones dejan error (vacío o no), cuándo el
// formulario es válido, a qué paso se avanza, que nada se envía con datos inválidos y qué se le
// manda al servicio. Node puro: transpila el .ts y simula SubscriptionService; nunca llama a Wompi.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const rxjs = require('rxjs');
const { cargarTs, navegadorFalso } = require('../theme/cargar-ts');

const RUTA = 'src/app/shared/components/upgrade-modal/upgrade-modal.component.ts';
const utilidades = cargarTs('src/app/shared/utils/wompi-card-security.utils.ts');
// @Input/@Output de propiedad: decoradores que no tocan la propiedad.
const angularCore = {
  Component: () => clase => clase,
  Input: () => () => undefined,
  Output: () => () => undefined,
  EventEmitter: class { constructor() { this.emitidos = []; } emit(v) { this.emitidos.push(v); } },
};

// Traductor de prueba: devuelve la clave con sus parámetros, así un texto que llegue sin traducir
// o un parámetro perdido se notan. Antes del bloque el componente no lo recibe y no lo usa.
const TRADUCTOR = {
  instant: (clave, params) => (params ? `${clave} ${JSON.stringify(params)}` : clave),
};

function crear({ servicio = {}, user = { email: 'ana@comercio.co' } } = {}) {
  const nav = navegadorFalso({ pathname: '/pricing', user });
  const { UpgradeModalComponent } = cargarTs(RUTA, {
    modulos: { '@angular/core': angularCore, '../../utils/wompi-card-security.utils': utilidades },
    globales: { localStorage: nav.localStorage, document: nav.document, window: nav.window },
  });
  const llamadas = [];
  const base = {
    getPaymentConfig: periodo => { llamadas.push(['getPaymentConfig', periodo]); return rxjs.throwError(() => new Error('sin red')); },
    getWompiMerchant: () => { llamadas.push(['getWompiMerchant']); return rxjs.of({}); },
    tokenizeWompiEncryptedCard: () => { llamadas.push(['tokenize']); return rxjs.of({}); },
    createRecurringPaymentSource: () => { llamadas.push(['create']); return rxjs.of({}); },
    replaceRecurringPaymentSource: () => { llamadas.push(['replace']); return rxjs.of({}); },
    getPaymentStatus: () => rxjs.of({}),
    refresh: () => {},
  };
  const componente = new UpgradeModalComponent({ ...base, ...servicio }, TRADUCTOR);
  return { componente, llamadas };
}

function llenarValido(c) {
  c.receiptEmail = 'ana@comercio.co';
  c.onCardNumberInput('4242 4242 4242 4242');
  c.cardExpMonth = '12';
  c.cardExpYear = '39';
  c.onCvcInput('123');
  c.onCardHolderInput('Ana Perez');
}

test('caracterización: cada validación deja error solo con el dato inválido', () => {
  const { componente: c } = crear();
  c.receiptEmail = 'no-es-correo';
  c.validateReceiptEmail();
  assert.ok(c.receiptEmailError, 'correo inválido deja error');
  c.receiptEmail = 'ana@comercio.co';
  c.validateReceiptEmail();
  assert.equal(c.receiptEmailError, '');

  c.cardNumber = '4242';
  c.validateCardNumber();
  assert.ok(c.cardNumberError, 'número corto deja error');
  c.cardNumber = '4242 4242 4242 4241';
  c.validateCardNumber();
  assert.ok(c.cardNumberError, 'número que no pasa Luhn deja error');
  c.cardNumber = '4242 4242 4242 4242';
  c.validateCardNumber();
  assert.equal(c.cardNumberError, '');

  c.cardExpMonth = '13';
  c.cardExpYear = '20';
  c.validateExpiry();
  assert.ok(c.expiryError, 'vencimiento inválido deja error');
  c.cardExpMonth = '12';
  c.cardExpYear = '39';
  c.validateExpiry();
  assert.equal(c.expiryError, '');

  c.cardBrand = 'amex';
  c.cardCvc = '123';
  c.validateCvc();
  assert.ok(c.cardCvcError, 'amex con 3 dígitos deja error');
  const errorAmex = c.cardCvcError;
  c.cardBrand = 'visa';
  c.cardCvc = '12';
  c.validateCvc();
  assert.ok(c.cardCvcError, 'visa con 2 dígitos deja error');
  assert.notEqual(c.cardCvcError, errorAmex, 'amex y el resto tienen mensajes distintos');
  c.cardCvc = '123';
  c.validateCvc();
  assert.equal(c.cardCvcError, '');

  c.cardHolder = 'A';
  c.validateHolder();
  assert.ok(c.cardHolderError, 'titular incompleto deja error');
  c.cardHolder = 'ANA PEREZ';
  c.validateHolder();
  assert.equal(c.cardHolderError, '');
});

test('caracterización: formulario válido, marca y largo del CVC', () => {
  const { componente: c } = crear();
  assert.equal(c.isCardFormValid, false);
  llenarValido(c);
  assert.equal(c.cardBrand, 'visa');
  assert.equal(c.cardCvcMaxLength, 3);
  assert.equal(c.isCardFormValid, true);
  c.onCardNumberInput('3782 822463 10005');
  assert.equal(c.cardBrand, 'amex');
  assert.equal(c.cardCvcMaxLength, 4);
});

test('caracterización: con datos inválidos submitCard no llama a Wompi ni al backend y deja error', async () => {
  const { componente: c, llamadas } = crear();
  c.receiptEmail = 'mal';
  await c.submitCard();
  assert.ok(c.cardError, 'deja un error general');
  assert.ok(c.receiptEmailError && c.cardNumberError && c.expiryError && c.cardCvcError && c.cardHolderError);
  assert.deepEqual(llamadas.filter(l => l[0] !== 'getPaymentConfig'), []);
  assert.equal(c.loading, false);
});

test('caracterización: sin aceptar los términos no envía la tarjeta', async () => {
  const { componente: c, llamadas } = crear();
  llenarValido(c);
  c.termsReady = true;
  c.securityReady = true;
  c.acceptedPolicy = false;
  c.acceptedPersonalData = true;
  await c.submitCard();
  assert.ok(c.cardError);
  assert.deepEqual(llamadas, []);
});

test('caracterización: sin configuración no avanza al paso de la tarjeta', () => {
  const { componente: c, llamadas } = crear();
  c.goToCardStep();
  assert.equal(c.step, 'info');
  assert.ok(c.cardError);
  assert.deepEqual(llamadas, []);
});

test('caracterización: al abrirse pide la configuración del período y un fallo deja error sin monto', () => {
  const { componente: c, llamadas } = crear();
  c.visible = true;
  c.ngOnChanges({ visible: { currentValue: true } });
  assert.deepEqual(llamadas, [['getPaymentConfig', 'monthly']]);
  assert.equal(c.step, 'info');
  assert.equal(c.configLoading, false);
  assert.equal(c.initialAmountCOP, null);
  assert.ok(c.cardError);
  assert.equal(c.receiptEmail, 'ana@comercio.co', 'toma el correo del usuario');
  assert.ok(c.pendingMessage, 'el mensaje de espera nunca queda vacío');
});

test('caracterización: configuración válida habilita el pago y el botón muestra el monto', () => {
  const config = {
    publicKey: 'pub_test_x', apiUrl: 'https://sandbox.wompi.co/v1', initialAmountCOP: 123456,
    quoteId: 'q1', quoteExpiresAt: '2099-01-01', tokenizationPublicKey: '-----BEGIN PUBLIC KEY-----x',
    environment: 'sandbox', billingPeriod: 'monthly', tierName: 'Origen',
  };
  const { componente: c } = crear({ servicio: { getPaymentConfig: () => rxjs.of(config) } });
  c.visible = true;
  c.ngOnChanges({ visible: { currentValue: true } });
  assert.equal(c.cardError, '');
  assert.equal(c.securityReady, true);
  assert.equal(c.initialAmountCOP, 123456);
  assert.equal(c.tierName, 'Origen', 'el nombre del tramo llega del backend y no se traduce');
  assert.match(c.paymentButtonLabel, /123\.456/);
  c.mode = 'replace';
  assert.doesNotMatch(c.paymentButtonLabel, /123\.456/);
  c.mode = 'upgrade';
  c.initialAmountCOP = null;
  assert.ok(c.paymentButtonLabel);
});

test('caracterización: el paso de la tarjeta pide las autorizaciones de Wompi', () => {
  const config = {
    publicKey: 'pub_test_x', apiUrl: 'https://sandbox.wompi.co/v1', initialAmountCOP: 1000,
    quoteId: 'q1', quoteExpiresAt: '2099-01-01', tokenizationPublicKey: '-----BEGIN PUBLIC KEY-----x',
    environment: 'sandbox', billingPeriod: 'monthly',
  };
  const { componente: c, llamadas } = crear({ servicio: { getPaymentConfig: () => rxjs.of(config) } });
  c.ngOnChanges({ visible: { currentValue: true } });
  c.visible = true;
  c.goToCardStep();
  assert.equal(c.step, 'card');
  assert.ok(llamadas.some(l => l[0] === 'getWompiMerchant'));
  assert.equal(c.termsReady, false, 'sin autorizaciones completas no habilita los campos');
  assert.ok(c.cardError, 'avisa que faltan las autorizaciones');
});
