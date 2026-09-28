'use strict';
/**
 * Ticket 1041 (OH MY STORE): la validación de datos de facturación exigía
 * ciudad, pero el bloque de país/departamento/ciudad estaba COMENTADO en el
 * formulario de crear. Nadie podía guardar y el arreglo del 1040 solo cambió el
 * texto del aviso. Contrato: todo campo que `validarDatosFacturacion()` lee
 * tiene que poder llenarse en los dos formularios (crear y editar).
 *
 *   node --test tests/ventas/datos-facturacion-campos.contract.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.resolve(__dirname, '../../src/app/components/ventas/facturacion');
const ts = fs.readFileSync(path.join(DIR, 'pedido-facturacion.component.ts'), 'utf8');
const html = fs.readFileSync(path.join(DIR, 'pedido-facturacion.component.html'), 'utf8');

/** Campos `this.x` que lee la validación (las líneas `const ... = String(this.x ...)`). */
function camposValidados() {
  const inicio = ts.indexOf('validarDatosFacturacion(): boolean {');
  assert.ok(inicio >= 0, 'no se encontró validarDatosFacturacion()');
  // Las lecturas van antes del primer `if (` de la función.
  const cuerpo = ts.slice(inicio, ts.indexOf('if (', inicio));
  const campos = [...cuerpo.matchAll(/String\(this\.(\w+)/g)].map((m) => m[1]);
  assert.ok(campos.length >= 5, `la validación leyó muy pocos campos: ${campos}`);
  return campos;
}

/** Contenido de un <ng-template #nombre>, sin comentarios HTML. */
function plantilla(nombre) {
  const abre = html.indexOf(`<ng-template #${nombre}`);
  assert.ok(abre >= 0, `no se encontró <ng-template #${nombre}>`);
  const cierra = html.indexOf('</ng-template>', abre);
  return html.slice(abre, cierra).replace(/<!--[\s\S]*?-->/g, '');
}

const conCampo = (tpl, campo) => new RegExp(`\\[\\(ngModel\\)\\]="${campo}"`).test(tpl);

for (const [nombre, etiqueta] of [['crearFacturacion', 'crear'], ['facturacion', 'editar']]) {
  test(`formulario de ${etiqueta}: tiene cada campo que la validación exige`, () => {
    const tpl = plantilla(nombre);
    const faltan = camposValidados().filter((c) => !conCampo(tpl, c));
    assert.deepEqual(faltan, [], `el formulario de ${etiqueta} no deja llenar: ${faltan.join(', ')}`);
  });

  test(`formulario de ${etiqueta}: la ciudad tiene de dónde llenarse (departamento con su cambio)`, () => {
    const tpl = plantilla(nombre);
    assert.ok(conCampo(tpl, 'ciudad_municipio'), 'falta el desplegable de ciudad');
    assert.match(tpl, /\[\(ngModel\)\]="departamento"[^>]*\(change\)="identificarCiu\(\)"/,
      'la ciudad es en cascada: sin departamento que dispare identificarCiu() la lista queda vacía');
  });
}

test('el contrato detecta un bloque comentado (el bug real del 1041)', () => {
  const tpl = '<ng-template #x><!-- <select [(ngModel)]="ciudad_municipio"></select> --></ng-template>'
    .replace(/<!--[\s\S]*?-->/g, '');
  assert.equal(conCampo(tpl, 'ciudad_municipio'), false);
});
