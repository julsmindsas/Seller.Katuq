'use strict';

// D-546 (F3, tarea 7.3): reordenar, renombrar y mover entradas del menú NO cambia quién ve qué.
//
// `fixtures/menu-rutas-antes-f3.json` es la foto de las rutas que veía cada rol con el menú de ANTES de F3
// (administrador, comodín, super administrador, administrador de Julsmind, contador, un rol sin rutas, y cada
// una de las 91 rutas del menú sola; todos con las banderas de la empresa apagadas y encendidas). Cada escenario
// se repite aquí con el menú nuevo. La única diferencia permitida: `sitios/landings`, que ve quien ve `sitios`.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const foto = require('./fixtures/menu-rutas-antes-f3.json');
const { visibles } = require('./fixtures/generar-menu-rutas');

const LANDINGS = 'sitios/landings';

test('la foto de antes de F3 está completa', () => {
  assert.equal(foto.generadoAntesDeF3, true);
  assert(foto.escenarios.length >= 190);
  assert(foto.rutas.length >= 90);
  assert(!foto.rutas.includes(LANDINGS), 'la foto es del menú de antes: Landings no existía');
});

test('ningún rol gana ni pierde una pantalla: las rutas visibles son las mismas, más Landings donde se ve «Mis sitios»', () => {
  const diferencias = [];
  for (const escenario of foto.escenarios) {
    const esperadas = new Set(escenario.visibles);
    if (esperadas.has('sitios')) esperadas.add(LANDINGS);
    const obtenidas = new Set(visibles(escenario));
    const sobran = [...obtenidas].filter(r => !esperadas.has(r));
    const faltan = [...esperadas].filter(r => !obtenidas.has(r));
    if (sobran.length || faltan.length) diferencias.push(`${escenario.nombre}: sobran [${sobran}] faltan [${faltan}]`);
  }
  assert.deepEqual(diferencias, []);
});

test('Landings la ve quien ve «Mis sitios» y nadie más', () => {
  const conLandings = foto.escenarios.filter(e => visibles(e).includes(LANDINGS)).map(e => e.nombre);
  const conSitios = foto.escenarios.filter(e => e.visibles.includes('sitios')).map(e => e.nombre);
  assert.deepEqual(conLandings.sort(), conSitios.sort());
  const soloCatalogos = foto.escenarios.find(e => e.nombre.startsWith('solo «sitios/catalogos»'));
  assert(!visibles(soloCatalogos).includes(LANDINGS), 'quien solo tiene los catálogos web no ve Landings');
});

test('Catálogo por link sigue viéndose para quien ve Cotizaciones (D-416) y Prospectos abre la pantalla de siempre', () => {
  const cotizaciones = foto.escenarios.find(e => e.nombre.startsWith('solo «cotizaciones»'));
  assert(visibles(cotizaciones).includes('cotizaciones/catalogos'));
  const corporativos = foto.escenarios.find(e => e.nombre.startsWith('solo «ventas/clientes-corporativos»'));
  assert.deepEqual(visibles(corporativos).sort(), ['ventas/clientes-corporativos']);
});
