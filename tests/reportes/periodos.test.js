/**
 * D-551 6.3 (ticket 1347): `periodos.ts` (front) con la MISMA tabla de casos que el backend
 * (`functions/services/metricas/periodo.js`, `tests/metricas/periodo.test.js`). Se corre con tres zonas
 * (da lo mismo): for z in UTC America/Bogota Asia/Tokyo; do TZ=$z node --test tests/reportes/periodos.test.js; done
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/app/components/dashboard/model/periodos.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
const modulo = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, modulo, modulo.exports);
const P = modulo.exports;
const ms = (iso) => Date.parse(iso);
const HOY_23_OCT = ms('2026-10-23T15:00:00Z'); // 10:00 a. m. en Colombia

test('período anterior: la misma tabla de casos del backend', () => {
  const casos = [
    ['2026-09-01', '2026-09-30', '2026-08-01', '2026-08-31', 'mes calendario completo'],
    ['2026-10-01', '2026-10-23', '2026-09-01', '2026-09-23', 'mes en curso hasta hoy (23-oct)'],
    ['2026-10-10', '2026-10-16', '2026-10-03', '2026-10-09', 'rango libre de 7 días'],
    ['2026-10-01', '2026-10-15', '2026-09-16', '2026-09-30', 'rango que empieza el 1 pero no llega a hoy'],
    ['2026-03-01', '2026-03-31', '2026-02-01', '2026-02-28', 'marzo contra febrero corto'],
    ['2026-03-01', '2026-03-30', '2026-01-30', '2026-02-28', 'no es mes completo ni hasta hoy: mismos días de largo'],
  ];
  for (const [d, h, ed, eh, nombre] of casos) assert.deepEqual(P.periodoAnterior(d, h, HOY_23_OCT), { desde: ed, hasta: eh }, nombre);
  assert.deepEqual(P.periodoAnterior('2026-10-01', '2026-10-31', ms('2026-10-31T15:00:00Z')), { desde: '2026-09-01', hasta: '2026-09-30' });
});

test('bordes del período anterior (los del backend)', () => {
  const en = (iso, d, h) => P.periodoAnterior(d, h, ms(iso));
  assert.deepEqual(en('2026-10-23T15:00:00Z', '2026-01-01', '2026-01-31'), { desde: '2025-12-01', hasta: '2025-12-31' }, 'enero completo');
  assert.deepEqual(en('2026-01-15T15:00:00Z', '2026-01-01', '2026-01-15'), { desde: '2025-12-01', hasta: '2025-12-15' }, 'enero en curso');
  assert.deepEqual(en('2028-10-01T15:00:00Z', '2028-03-01', '2028-03-31'), { desde: '2028-02-01', hasta: '2028-02-29' }, 'marzo bisiesto completo');
  assert.deepEqual(en('2028-10-01T15:00:00Z', '2028-02-01', '2028-02-29'), { desde: '2028-01-01', hasta: '2028-01-31' }, 'febrero bisiesto completo');
  assert.deepEqual(en('2028-03-30T15:00:00Z', '2028-03-01', '2028-03-30'), { desde: '2028-02-01', hasta: '2028-02-29' });
  assert.deepEqual(en('2026-03-30T15:00:00Z', '2026-03-01', '2026-03-30'), { desde: '2026-02-01', hasta: '2026-02-28' });
  assert.deepEqual(en('2026-03-31T15:00:00Z', '2026-03-01', '2026-03-31'), { desde: '2026-02-01', hasta: '2026-02-28' });
  assert.deepEqual(en('2026-10-24T03:00:00Z', '2026-10-01', '2026-10-23'), { desde: '2026-09-01', hasta: '2026-09-23' }, 'hoy es 23 en Bogotá');
  assert.deepEqual(en('2026-10-24T04:59:59Z', '2026-10-01', '2026-10-23'), { desde: '2026-09-01', hasta: '2026-09-23' });
  assert.deepEqual(en('2026-10-24T05:00:00Z', '2026-10-01', '2026-10-23'), { desde: '2026-09-08', hasta: '2026-09-30' }, 'ya es 24');
  assert.deepEqual(en('2026-10-23T15:00:00Z', '2026-10-10', '2026-10-10'), { desde: '2026-10-09', hasta: '2026-10-09' }, 'un solo día');
  assert.deepEqual(en('2026-10-23T15:00:00Z', '2026-10-16', '2026-10-10'), { desde: '2026-10-03', hasta: '2026-10-09' }, 'rango invertido');
  assert.deepEqual(en('2026-10-23T15:00:00Z', '2025-12-28', '2026-01-03'), { desde: '2025-12-21', hasta: '2025-12-27' }, 'cruza el año');
});

test('semana de lunes a domingo y día de Colombia', () => {
  assert.deepEqual(P.semanaDe('2026-01-01'), { desde: '2025-12-29', hasta: '2026-01-04' });
  assert.deepEqual(P.semanaDe('2028-02-29'), { desde: '2028-02-28', hasta: '2028-03-05' });
  assert.deepEqual(P.semanaDe('2026-10-25'), { desde: '2026-10-19', hasta: '2026-10-25' }, 'el domingo cierra su semana');
  assert.equal(P.diaBogota('2026-10-01T02:00:00.000Z'), '2026-09-30', 'el pedido del 30-sep a las 9 p. m.');
  assert.equal(P.diaBogota('2026-10-01T05:00:00.000Z'), '2026-10-01');
  assert.equal(P.diaBogota('x'), null);
});

test('los presets: el 23-oct (viernes) en hora de Colombia', () => {
  const de = (p, personalizado) => P.periodoDePreset(p, HOY_23_OCT, personalizado);
  assert.deepEqual(de('hoy'), { desde: '2026-10-23', hasta: '2026-10-23' });
  assert.deepEqual(de('ayer'), { desde: '2026-10-22', hasta: '2026-10-22' });
  assert.deepEqual(de('semana'), { desde: '2026-10-19', hasta: '2026-10-23' }, 'lunes hasta hoy');
  assert.deepEqual(de('mes'), { desde: '2026-10-01', hasta: '2026-10-23' }, '«Este mes» cubre del 1 al 23 de octubre');
  assert.deepEqual(de('mes_anterior'), { desde: '2026-09-01', hasta: '2026-09-30' });
  assert.deepEqual(de('ultimos_30'), { desde: '2026-09-24', hasta: '2026-10-23' });
  assert.deepEqual(de('anio'), { desde: '2026-01-01', hasta: '2026-10-23' });
  assert.deepEqual(de('personalizado', { desde: '2026-10-16', hasta: '2026-10-10' }), { desde: '2026-10-10', hasta: '2026-10-16' }, 'en orden');
  assert.equal(de('personalizado', { desde: '2026-02-31', hasta: '2026-03-01' }), null, 'día que no existe');
  assert.equal(de('personalizado'), null);
  assert.equal(de('nada'), null);
  // Cerca de la medianoche de Bogotá: a las 4:59 UTC del 24 todavía es 23; a las 5:00 ya es 24.
  assert.deepEqual(P.periodoDePreset('hoy', ms('2026-10-24T04:59:00Z')), { desde: '2026-10-23', hasta: '2026-10-23' });
  assert.deepEqual(P.periodoDePreset('hoy', ms('2026-10-24T05:00:00Z')), { desde: '2026-10-24', hasta: '2026-10-24' });
  // Enero: el mes anterior es diciembre del año anterior.
  assert.deepEqual(P.periodoDePreset('mes_anterior', ms('2027-01-10T15:00:00Z')), { desde: '2026-12-01', hasta: '2026-12-31' });
  assert.deepEqual(P.periodoDePreset('semana', ms('2026-10-25T15:00:00Z')), { desde: '2026-10-19', hasta: '2026-10-25' }, 'domingo');
});

test('comparación: sin comparación, período anterior y mismo período del año pasado', () => {
  const mes = P.periodoDePreset('mes', HOY_23_OCT);
  assert.equal(P.periodoDeComparacion('ninguna', mes, HOY_23_OCT), null);
  assert.deepEqual(P.periodoDeComparacion('periodo_anterior', mes, HOY_23_OCT), { desde: '2026-09-01', hasta: '2026-09-23' }, '1 al 23 de octubre contra 1 al 23 de septiembre');
  assert.deepEqual(P.periodoDeComparacion('anio_pasado', mes, HOY_23_OCT), { desde: '2025-10-01', hasta: '2025-10-23' }, 'contra el 1 al 23 de octubre del año anterior');
  assert.deepEqual(P.periodoDeComparacion('periodo_anterior', { desde: '2026-10-10', hasta: '2026-10-16' }, HOY_23_OCT), { desde: '2026-10-03', hasta: '2026-10-09' });
  assert.deepEqual(P.periodoAnioPasado('2028-02-29', '2028-03-05'), { desde: '2027-02-28', hasta: '2027-03-05' }, '29 de febrero contra un año que no es bisiesto');
  assert.deepEqual(P.periodoAnioPasado('2026-12-28', '2027-01-03'), { desde: '2025-12-28', hasta: '2026-01-03' });
  assert.deepEqual(P.periodoAnioPasado('2026-10-16', '2026-10-10'), { desde: '2025-10-10', hasta: '2025-10-16' }, 'rango invertido');
});

test('el subtítulo dice el período', () => {
  assert.equal(P.textoDelPeriodo({ desde: '2026-10-01', hasta: '2026-10-23' }), '1 al 23 de octubre de 2026');
  assert.equal(P.textoDelPeriodo({ desde: '2026-10-23', hasta: '2026-10-23' }), '23 de octubre de 2026');
  assert.equal(P.textoDelPeriodo({ desde: '2026-09-24', hasta: '2026-10-23' }), '24 de septiembre al 23 de octubre de 2026');
  assert.equal(P.textoDelPeriodo({ desde: '2025-12-28', hasta: '2026-01-03' }), '28 de diciembre de 2025 al 3 de enero de 2026');
});

test('al servidor van días de Colombia, no instantes UTC', () => {
  const p = P.periodoParaServidor({ desde: '2026-10-01', hasta: '2026-10-23' });
  assert.deepEqual(p, { desde: '2026-10-01', hasta: '2026-10-23', base: 'entrega' });
  assert.ok(!JSON.stringify(p).includes('T00:00:00'));
  assert.equal(P.periodoParaServidor({ desde: '2026-10-01', hasta: '2026-10-23' }, 'creacion').base, 'creacion');
});

test('los textos de los presets son los del spec', () => {
  assert.deepEqual(P.PRESETS_PERIODO.map((x) => x.label), ['Hoy', 'Ayer', 'Esta semana', 'Este mes', 'Mes anterior', 'Últimos 30 días', 'Este año', 'Personalizado']);
  assert.deepEqual(P.MODOS_COMPARACION.map((x) => x.label), ['Sin comparación', 'Período anterior', 'Mismo período del año pasado']);
});
