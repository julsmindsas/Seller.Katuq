'use strict';
/**
 * D-547 (F1, tarea 2.3): contrato del plan de ejecución contra lo que hacía la plantilla de hoy.
 *   - cada acción del plan = la entrada de `acciones-pedido-antes.json` (método, plantilla, cierre y argumento);
 *   - cada método del plan existe en `ListOrdersComponent` (se lee el fuente, no se supone).
 *
 *   node --test tests/ventas/acciones-pedido-plan.contract.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const root = path.resolve(__dirname, '../..');
const { PLAN_ACCIONES } = require('../../src/app/components/ventas/list/acciones-pedido/acciones-pedido.plan.ts');
const antes = require('./acciones-pedido-antes.json');

/** Diferencias entre un plan y la tabla de hoy. Vacío = el plan copia lo de hoy. */
function diferencias(plan, hoy) {
  const fallas = [];
  const idsHoy = hoy.acciones.map(a => a.id).sort();
  const idsPlan = Object.keys(plan).sort();
  if (JSON.stringify(idsHoy) !== JSON.stringify(idsPlan)) {
    fallas.push(`ids distintos: hoy=${idsHoy.length}, plan=${idsPlan.length}`);
  }
  for (const a of hoy.acciones) {
    const p = plan[a.id];
    if (!p) { fallas.push(`${a.id}: no está en el plan`); continue; }
    if (a.metodoAlterno) {
      const envuelve = [...(p.envuelve || [])].sort().join('|');
      if (envuelve !== [a.metodo, a.metodoAlterno].sort().join('|')) fallas.push(`${a.id}: envuelve ${envuelve}`);
    } else if (p.metodo !== a.metodo) {
      fallas.push(`${a.id}: método ${p.metodo} != ${a.metodo}`);
    }
    if ((p.plantilla ?? null) !== a.plantilla) fallas.push(`${a.id}: plantilla ${p.plantilla} != ${a.plantilla}`);
    if (p.cerrar !== a.cerrar) fallas.push(`${a.id}: cerrar ${p.cerrar} != ${a.cerrar}`);
    const extra = a.argumentoExtra ? a.argumentoExtra.replace(/'/g, '') : null;
    if ((p.argumentoExtra ?? null) !== extra) fallas.push(`${a.id}: argumento ${p.argumentoExtra} != ${extra}`);
  }
  return fallas;
}

/** Miembros (métodos y propiedades) de `ListOrdersComponent`, leídos del fuente con el compilador de TypeScript. */
function miembrosDeListOrders() {
  const archivo = path.join(root, 'src/app/components/ventas/list/list.component.ts');
  const fuente = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.ES2020, true);
  const nombres = new Set();
  fuente.forEachChild(nodo => {
    if (ts.isClassDeclaration(nodo) && nodo.name && nodo.name.text === 'ListOrdersComponent') {
      for (const m of nodo.members) if (m.name && ts.isIdentifier(m.name)) nombres.add(m.name.text);
    }
  });
  return nombres;
}

test('el plan copia lo que hacía la plantilla de hoy (28 acciones)', () => {
  assert.equal(antes.acciones.length, 28);
  assert.deepEqual(diferencias(PLAN_ACCIONES, antes), []);
});

test('el contrato SÍ detecta una diferencia (se cambia un método, una plantilla y un cierre a propósito)', () => {
  const roto = JSON.parse(JSON.stringify(PLAN_ACCIONES));
  roto.orderPdf.metodo = 'pdfOrderX';
  roto.editCustomer.plantilla = 'notasModal';
  roto.editAddress.cerrar = true;
  const fallas = diferencias(roto, antes);
  assert.equal(fallas.length, 3, fallas.join('\n'));
  const sinUna = { ...PLAN_ACCIONES }; delete sinUna.history;
  assert(diferencias(sinUna, antes).length > 0);
});

test('cada método del plan (y los que envuelve) existe en ListOrdersComponent', () => {
  const miembros = miembrosDeListOrders();
  assert(miembros.size > 100, 'no se pudo leer la clase ListOrdersComponent');
  const faltan = [];
  for (const [id, p] of Object.entries(PLAN_ACCIONES)) {
    for (const m of [p.metodo, ...(p.envuelve || [])]) if (!miembros.has(m)) faltan.push(`${id}: ${m}`);
  }
  assert.deepEqual(faltan, []);
});

test('las plantillas del plan son referencias reales de list.component.html', () => {
  const html = fs.readFileSync(path.join(root, 'src/app/components/ventas/list/list.component.html'), 'utf8');
  const usadas = new Set(Object.values(PLAN_ACCIONES).map(p => p.plantilla).filter(Boolean));
  for (const t of usadas) assert(html.includes(`<ng-template #${t} `), `no existe <ng-template #${t}> en list.component.html`);
});
