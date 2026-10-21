'use strict';

// D-502 (ticket 1180): conteos de diseño en los archivos que toca el modo oscuro.
// 1) Gradientes y primarios prohibidos (AGENTS.md) no suben frente a la línea base del 2026-10-18.
// 2) En dark-mode.scss no queda la familia del azul heredado (169 apariciones): pasa en F1 (tarea 3.4).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { RAIZ } = require('./cargar-ts');

const GRADIENTE = /(linear|radial)-gradient\(/gi;
const PRIMARIOS = /#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(\s*102\s*,\s*126\s*,\s*234/gi;
const AZULES = ['#6AB5E8', 'rgba(106, 181, 232', 'rgb(106, 181, 232', '#5AA5D8', '#8AC5F8', '#4A95C8'];

// Línea base del 2026-10-18 (gradientes / primarios), design-pruebas.md.
const LINEA_BASE = {
  'src/assets/scss/dark-mode.scss': [1, 0],
  'src/styles.scss': [2, 10],
  'src/app/shared/components/sidebar/sidebar.component.scss': [2, 0],
  'src/app/shared/components/filters/shared-filters.component.scss': [0, 3],
  'src/app/components/despachos/components/enviame/tracking-details/tracking-details-modal.component.scss': [5, 0],
  'src/app/components/extras/pos/formas-pago/crear-formas-pago/crear-formas-pago.component.scss': [0, 1],
  'src/app/modules/agent-builder/general-chat/general-chat.component.scss': [1, 0],
  // los demás, 0 / 0
  'src/app/shared/components/bottom-navigation/bottom-navigation.component.scss': [0, 0],
  'src/app/shared/components/header/header.component.scss': [0, 0],
  'src/app/components/chat/chat/chat.component.scss': [0, 0],
  'src/app/shared/styles/_theme-tokens.scss': [0, 0], // F1: todavía puede no existir
};

function leer(rel) {
  const archivo = path.resolve(RAIZ, rel);
  return fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : null;
}

function contar(texto, patron) {
  return (texto.match(patron) || []).length;
}

test('gradientes y primarios prohibidos no suben en los archivos del modo oscuro', () => {
  for (const [rel, [gradientes, primarios]] of Object.entries(LINEA_BASE)) {
    const texto = leer(rel);
    if (texto === null) continue;
    assert.ok(contar(texto, GRADIENTE) <= gradientes, `${rel}: gradientes ${contar(texto, GRADIENTE)} > ${gradientes}`);
    assert.ok(contar(texto, PRIMARIOS) <= primarios, `${rel}: primarios prohibidos ${contar(texto, PRIMARIOS)} > ${primarios}`);
  }
});

test('la familia del azul heredado está contada completa (169) o ya en cero', () => {
  const texto = leer('src/assets/scss/dark-mode.scss').toLowerCase();
  const total = AZULES.reduce((suma, azul) => suma + texto.split(azul.toLowerCase()).length - 1, 0);
  assert.ok(total === 0 || total <= 169, `la familia del azul subió: ${total} > 169`);
});

// Se cumple al cerrar la tarea 3.4 (F1). Mientras tanto queda como pendiente y no rompe la línea.
test('dark-mode.scss sin ninguno de los seis patrones del azul heredado', { todo: 'F1, tarea 3.4' }, () => {
  const texto = leer('src/assets/scss/dark-mode.scss').toLowerCase();
  for (const azul of AZULES) {
    assert.equal(texto.split(azul.toLowerCase()).length - 1, 0, `${azul} sigue en dark-mode.scss`);
  }
});

// Tarea 3.9 (bloque TEMA-B02): «deuda medida» de los rellenos con var(--primary-color) en src/.
// En oscuro `--primary-color` es el tinte de texto, así que esos rellenos quedan en 2,72:1 con texto
// blanco hasta que su pantalla pase a var(--ds-accent) (F2 o F3). Techo medido el 2026-10-21 con
// tests/theme/deuda-primary.js: 42 rellenos (33 background y 9 background-color) en 16 archivos.
// Trinquete: si sube, falla; si baja, también falla hasta que se baje el techo en el mismo commit, así
// lo migrado no deja hueco para regresiones posteriores.
const { contarEnTexto, medirDeuda } = require('./deuda-primary');
const TECHO_DEUDA_PRIMARY = 42;

test('deuda-primary cuenta background y background-color con var(--primary-color), con respaldo y sin comentarios', () => {
  const hoja = [
    '.a { background: var(--primary-color); color: var(--primary-color); }',
    '.b { background-color: var(--primary-color) !important; }',
    '.c { background: linear-gradient(135deg, var(--primary-color, #7366ff), #fff); }',
    '.d { background:',
    '  var( --primary-color ); }',
    '.e { background: rgba(var(--primary-color-rgb), .1); background-color: var(--primary-color-dark); }',
    '.f { border-color: var(--primary-color); --x: var(--primary-color); }',
    '// .g { background: var(--primary-color); }',
    '/* .h { background: var(--primary-color); } */',
    '.i { background: url(http://x.test/a.png) var(--primary-color); }',
  ].join('\n');
  assert.deepEqual(contarEnTexto(hoja), { background: 4, backgroundColor: 1, total: 5 });
});

test('la deuda de rellenos con var(--primary-color) no sube y el techo baja con ella (tarea 3.9)', () => {
  const deuda = medirDeuda();
  const detalle = deuda.archivos.map(a => `${a.total} ${a.archivo}`).join('\n');
  assert.ok(deuda.total <= TECHO_DEUDA_PRIMARY, `la deuda subió: ${deuda.total} > ${TECHO_DEUDA_PRIMARY}\n${detalle}`);
  assert.equal(deuda.total, TECHO_DEUDA_PRIMARY,
    `la deuda bajó a ${deuda.total}: baja TECHO_DEUDA_PRIMARY a ${deuda.total} en este mismo commit`);
});
