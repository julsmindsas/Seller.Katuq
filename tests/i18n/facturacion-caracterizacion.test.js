'use strict';

// D-532 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B10, tarea 11.7): lo que el compositor de
// facturas manda a la DIAN no depende del idioma de la pantalla. Se arma el mismo borrador, la misma
// revisión, los mismos textos de observaciones y el mismo envío con el traductor en español y en inglés,
// y se compara lo que recibe el servicio HTTP (sin emitir: el servicio es un registro en memoria).
// Corre antes y después de pasar los textos del módulo al traductor; debe pasar en ambos momentos.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test, before } = require('node:test');
const ts = require('typescript');
const { of } = require('rxjs');
const { finalize } = require('rxjs/operators');
const { defer } = require('rxjs');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const COMPOSER = path.join(RAIZ, 'src/app/components/facturacion-electronica/composer');
const models = require(path.join(COMPOSER, 'invoice-composer.models.ts'));
const dane = require(path.join(RAIZ, 'src/app/shared/data/colombia-dane-codes.ts'));
const diccionario = idioma => JSON.parse(fs.readFileSync(path.join(RAIZ, `src/assets/i18n/${idioma}.json`), 'utf8'));
let forms, EventEmitter;

before(async () => {
  await import('@angular/compiler');
  forms = await import('@angular/forms');
  ({ EventEmitter } = await import('@angular/core'));
});

function cargarClase(archivo, extras = {}) {
  const nombre = path.join(COMPOSER, archivo);
  const fuente = ts.createSourceFile(nombre, fs.readFileSync(nombre, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = fuente.statements.find(ts.isClassDeclaration);
  const js = ts.transpileModule(clase.getText(fuente), { compilerOptions: {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
  } }).outputText;
  const globales = { exports: {}, ...forms, EventEmitter, ...dane, ...models,
    Component: () => v => v, Input: () => () => {}, Output: () => () => {}, ViewChild: () => () => {},
    ManualInvoiceFormComponent: {}, InvoiceCustomerPickerComponent: {},
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    window: { confirm: () => true },
    MONTHS: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    Swal: { fire: () => Promise.resolve({ isConfirmed: true }) }, defer, finalize, Date, ...extras };
  vm.runInNewContext(js, globales);
  return Object.values(globales.exports)[0];
}

/** Traductor mínimo: resuelve la clave en el diccionario del idioma o devuelve la clave. */
function traductor(idioma) {
  const dic = diccionario(idioma);
  const instant = (clave, params = {}) => String(dic[clave] ?? clave).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, p) => params[p]);
  return { currentLang: idioma, instant, get: clave => of(instant(clave)) };
}

function envios(idioma) {
  const llamadas = [];
  const registro = nombre => (...args) => { llamadas.push({ nombre, args: JSON.parse(JSON.stringify(args)) }); };
  const factura = { source: 'manual', invoice: null };
  const servicio = {
    saveDraft(id, invoice, version, obs) { registro('saveDraft')(id, invoice, version, obs); return of({ version: 1, selection: { source: 'manual', invoice, observations: obs } }); },
    createReview(id, selection, v) { registro('createReview')(selection, v); return of({ requestId: id, status: 'ready', source: selection.source, preview: { fingerprint: 'fp-1', observations: selection.observations }, delivery: { ready: true } }); },
    submit(id, fingerprint) { registro('submit')(fingerprint); return of({ requestId: id, status: 'processing', source: 'manual', preview: { fingerprint, observations: '' } }); },
    status() { return of({ status: 'processing' }); },
  };
  const Form = cargarClase('manual-invoice-form.component.ts');
  const form = new Form(new forms.FormBuilder());
  form.chooseCustomer({ customerId: 'cliente-unidad', billingProfile: -1 });
  form.form.patchValue({ payment: { meansId: '1', meansCode: '42' } });
  form.items.at(0).patchValue({ description: 'Servicio de prueba', quantity: 2, unitPrice: 1000, taxRate: 19 });
  const Composer = cargarClase('invoice-composer.component.ts');
  const t = traductor(idioma);
  const composer = new Composer(servicio, { getActiveCompanyId: () => 'ShopA' }, t);
  composer.integration = { enabled: true, config: { environment: 'produccion', numbering: { prefix: 'JULS', current: 41 } } };
  composer.manualForm = form;
  let emitida;
  form.review.subscribe(v => { emitida = v; });
  form.reviewInvoice();
  composer.changeObservations('  Pago a 30 días\r\nRef. 123  ');
  for (const plantilla of composer.observationTemplates) {
    // El texto de la plantilla viaja en las observaciones: no depende del idioma. Solo cambia la etiqueta.
    llamadas.push({ nombre: 'plantilla', args: [plantilla.text] });
  }
  composer.reviewManual(emitida);
  composer.saveDraft(emitida);
  composer.setMode('order');
  composer.reviewOrder('pedido-unidad');
  composer.confirmed = true;
  llamadas.push({ nombre: 'puedeEmitir', args: [composer.canEmit] });
  composer.emitInvoice();
  return { llamadas, emitida: JSON.parse(JSON.stringify(emitida)), siguienteNumero: composer.nextNumber.startsWith('JULS') };
}

test('11.7: el payload de la factura manual, el borrador, el pedido y el envío son idénticos con translate en es y en en', () => {
  const es = envios('es');
  const en = envios('en');
  assert.ok(es.llamadas.some(l => l.nombre === 'createReview'), 'hubo revisión');
  assert.ok(es.llamadas.some(l => l.nombre === 'submit'), 'hubo envío (simulado)');
  assert.deepEqual(en, es);
});

test('11.7: las observaciones que viajan a la DIAN quedan en español aunque la pantalla esté en inglés', () => {
  const en = envios('en');
  const textos = en.llamadas.filter(l => l.nombre === 'plantilla').map(l => l.args[0]);
  assert.equal(textos.length, 3);
  assert.match(textos[0], /^Servicio correspondiente a [a-z]+ de \d{4}\.$/);
  assert.equal(textos[1], 'Indicar el número de factura al realizar el pago.');
  assert.equal(textos[2], 'Gracias por tu compra. Cualquier inquietud sobre esta factura escríbenos.');
});

test('11.7: la pantalla sí se traduce (etiquetas de plantillas y estado) mientras el payload no cambia', () => {
  const Composer = cargarClase('invoice-composer.component.ts');
  const en = new Composer({}, { getActiveCompanyId: () => 'ShopA' }, traductor('en'));
  const es = new Composer({}, { getActiveCompanyId: () => 'ShopA' }, traductor('es'));
  assert.equal(es.observationTemplates[0].label, 'Periodo del servicio');
  assert.equal(en.observationTemplates[0].label, 'Service period');
  assert.notEqual(en.statusTitle, es.statusTitle);
  assert.equal(en.observationTemplates[0].text, es.observationTemplates[0].text);
});
