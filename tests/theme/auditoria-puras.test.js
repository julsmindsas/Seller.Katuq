'use strict';

// D-502 (ticket 1180), bloque TEMA-B02: funciones puras de auditoria-tema.js (F1, terceros y --todas).
// La auditoría misma necesita dist/cuba, playwright-core y axe-core; aquí solo se revisa su sintaxis.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const {
  RELLENO_PRIMARIO, TEXTO_BLANCO, SELECTOR_P_BUTTON_PRIMARIO, rellenoPrimarioOk, compararTamanos,
  azulHeredadoEn, grupoF2aManual, revisionManualF2a, violacionesDe, ordenarReporte, resumenPorModulo,
  nombreArchivoRuta, coberturaCfg, compararTerceroConBase, parseRgb, luminanciaRgb, contrasteRgb, esCasiBlanco,
  controlSeDistingue, LUMINANCIA_CASI_BLANCO, CONTRASTE_MINIMO_CONTROL,
} = require('./auditoria-puras');

test('los scripts de la auditoría compilan (node --check)', () => {
  for (const archivo of ['auditoria-tema.js', 'rutas-marco.js', 'deuda-primary.js', 'auditoria-puras.js']) {
    execFileSync(process.execPath, ['--check', path.join(__dirname, archivo)]);
  }
});

test('F1: relleno primario #5F3FE0 con texto blanco', () => {
  assert.equal(RELLENO_PRIMARIO, 'rgb(95, 63, 224)');
  assert.equal(TEXTO_BLANCO, 'rgb(255, 255, 255)');
  assert.equal(rellenoPrimarioOk({ fondo: 'rgb(95, 63, 224)', texto: 'rgb(255, 255, 255)' }), true);
  // el azul heredado de hoy y el texto oscuro de 11 bloques de dark-mode.scss
  assert.equal(rellenoPrimarioOk({ fondo: 'rgb(106, 181, 232)', texto: 'rgb(255, 255, 255)' }), false);
  assert.equal(rellenoPrimarioOk({ fondo: 'rgb(95, 63, 224)', texto: 'rgb(26, 29, 35)' }), false);
  assert.equal(rellenoPrimarioOk({ fondo: 'rgba(95, 63, 224, 0.5)', texto: 'rgb(255, 255, 255)' }), false);
  assert.equal(rellenoPrimarioOk(null), false);
});

test('F1: el botón primario de PrimeNG excluye severidades y variantes', () => {
  assert.ok(SELECTOR_P_BUTTON_PRIMARIO.startsWith('.p-button'));
  for (const v of ['secondary', 'success', 'info', 'warning', 'help', 'danger', 'text', 'outlined', 'link']) {
    assert.ok(SELECTOR_P_BUTTON_PRIMARIO.includes(`:not(.p-button-${v})`), v);
  }
  assert.ok(SELECTOR_P_BUTTON_PRIMARIO.includes(':not(:disabled)'));
});

test('F1: compararTamanos detecta cambios de font-size y padding entre temas', () => {
  const medida = { fontSize: '11.2px', paddingTop: '8px', paddingRight: '8px', paddingBottom: '8px', paddingLeft: '8px' };
  assert.deepEqual(compararTamanos({ pButton: medida }, { pButton: { ...medida } }), { ok: true, diferencias: [], sinMedir: [] });
  const cambio = compararTamanos({ pButton: medida, tdTabla: medida }, { pButton: { ...medida, fontSize: '14px' }, tdTabla: medida });
  assert.equal(cambio.ok, false);
  assert.deepEqual(cambio.diferencias, [{ elemento: 'pButton', propiedad: 'fontSize', claro: '11.2px', oscuro: '14px' }]);
  const faltante = compararTamanos({ pButton: medida, thTabla: null }, { pButton: medida, thTabla: medida });
  assert.equal(faltante.ok, true);
  assert.deepEqual(faltante.sinMedir, ['thTabla']);
  assert.equal(compararTamanos({ a: null }, { a: null }).ok, null);
});

test('F1: azulHeredadoEn reconoce la familia del azul en valores computados', () => {
  assert.equal(azulHeredadoEn('rgb(106, 181, 232)'), '#6AB5E8');
  assert.equal(azulHeredadoEn('rgba(106, 181, 232, 0.15)'), '#6AB5E8');
  assert.equal(azulHeredadoEn('rgb(90, 165, 216)'), '#5AA5D8');
  assert.equal(azulHeredadoEn('rgb(138, 197, 248)'), '#8AC5F8');
  assert.equal(azulHeredadoEn('rgba(0, 0, 0, 0) 0px 0px 0px 2px, rgb(74, 149, 200) 0px 0px 0px 4px'), '#4A95C8');
  assert.equal(azulHeredadoEn('linear-gradient(rgb(106, 181, 232), rgb(0, 0, 0))'), '#6AB5E8');
  assert.equal(azulHeredadoEn('rgb(95, 63, 224)'), null);
  assert.equal(azulHeredadoEn('rgb(1106, 181, 232)'), null);
  assert.equal(azulHeredadoEn('rgb(106, 181, 2320)'), null);
  assert.equal(azulHeredadoEn(''), null);
  assert.equal(azulHeredadoEn(undefined), null);
});

test('F2a: grupo de revisión manual por prefijo de ruta (el más largo gana)', () => {
  assert.equal(grupoF2aManual('/ventas/pedidos'), 'Ventas');
  assert.equal(grupoF2aManual('/ventas'), 'Ventas');
  assert.equal(grupoF2aManual('/pos/list-ventas'), 'POS');
  assert.equal(grupoF2aManual('/extras/pos/formasPago'), 'POS');
  assert.equal(grupoF2aManual('/despachos'), 'Despachos');
  assert.equal(grupoF2aManual('/inventario/traslados'), 'Inventarios');
  assert.equal(grupoF2aManual('/inventario/bodegas'), 'Bodegas');
  assert.equal(grupoF2aManual('/proceso/bodegas-por-canal'), 'Bodegas');
  assert.equal(grupoF2aManual('/proceso/ocasiones/crear-ocasiones'), 'Ocasiones');
  assert.equal(grupoF2aManual('/proceso/generos'), null);
  // Formas de pago generales: la base las pinta y son de pagos (tarea 4.1); las del POS van con POS.
  assert.equal(grupoF2aManual('/extras/formasPago'), 'Formas de pago');
  assert.equal(grupoF2aManual('/extras/formasPago/crearFormasPago'), 'Formas de pago');
  assert.equal(grupoF2aManual('/extras/pos/formasPago/crearFormasPago'), 'POS');
  assert.equal(grupoF2aManual('/ventasx'), null);
  const lista = revisionManualF2a([{ ruta: '/inventario/bodegas' }, { ruta: '/inventario' }, { ruta: '/welcome' }]);
  assert.deepEqual(lista.find(g => g.grupo === 'Bodegas').rutas, ['/inventario/bodegas']);
  assert.deepEqual(lista.find(g => g.grupo === 'Inventarios').rutas, ['/inventario']);
  assert.deepEqual(lista.find(g => g.grupo === 'Ocasiones').rutas, []);
});

test('--todas: violaciones = axe + fondos #fff + casi blancos + controles + scroll; sin medir si no midió la pantalla pedida', () => {
  assert.equal(violacionesDe({ axeColorContrast: 3, fondosBlancos: 2, scrollHorizontal: true, oscuro: true }), 6);
  assert.equal(violacionesDe({ axeColorContrast: 1, fondosBlancos: 1, fondosCasiBlancos: 2, controlesSinContraste: 3, oscuro: true }), 7);
  assert.equal(violacionesDe({ axeColorContrast: 0, fondosBlancos: 0, scrollHorizontal: false, oscuro: true }), 0);
  assert.equal(violacionesDe({ error: 'timeout' }), null);
  assert.equal(violacionesDe({ axeColorContrast: 4, fondosBlancos: 0, redirigida: true }), null);
  assert.equal(violacionesDe({ axeColorContrast: 4, fondosBlancos: 0, oscuro: false }), null);
  assert.equal(violacionesDe({ axeColorContrast: null }), null);
});

test('--todas: el reporte va ordenado por violaciones, con las filas sin medir al final', () => {
  const filas = [
    { ruta: '/b', ancho: 1440, axeColorContrast: 1, fondosBlancos: 0, oscuro: true },
    { ruta: '/z', ancho: 1440, error: 'timeout' },
    { ruta: '/a', ancho: 1440, axeColorContrast: 1, fondosBlancos: 0, oscuro: true },
    { ruta: '/c', ancho: 1440, axeColorContrast: 10, fondosBlancos: 5, scrollHorizontal: true, oscuro: true },
    { ruta: '/a', ancho: 390, axeColorContrast: 1, fondosBlancos: 0, oscuro: true },
    { ruta: '/d', ancho: 1440, axeColorContrast: 0, fondosBlancos: 0, oscuro: true },
  ];
  const copia = JSON.parse(JSON.stringify(filas));
  const ordenadas = ordenarReporte(filas);
  assert.deepEqual(ordenadas.map(f => `${f.ruta}@${f.ancho}`), ['/c@1440', '/a@1440', '/a@390', '/b@1440', '/d@1440', '/z@1440']);
  assert.deepEqual(ordenadas.map(f => f.violaciones), [16, 1, 1, 1, 0, null]);
  assert.deepEqual(filas, copia, 'no cambia la entrada');
});

test('--todas: resumen por módulo para priorizar la cola', () => {
  const resumen = resumenPorModulo([
    { modulo: 'components/ventas', axeColorContrast: 2, fondosBlancos: 3, oscuro: true },
    { modulo: 'components/ventas', error: 'x' },
    { modulo: 'components/proceso', axeColorContrast: 9, fondosBlancos: 0, scrollHorizontal: true, oscuro: true },
    { modulo: null, axeColorContrast: 0, fondosBlancos: 0, oscuro: true },
  ]);
  assert.deepEqual(resumen.map(r => [r.modulo, r.violaciones, r.pantallas, r.sinMedir]), [
    ['components/proceso', 10, 1, 0],
    ['components/ventas', 5, 2, 1],
    ['(sin módulo)', 0, 1, 0],
  ]);
});

test('--todas: nombre de archivo de cada ruta', () => {
  assert.equal(nombreArchivoRuta('/ventas/pedidos'), 'ventas__pedidos');
  assert.equal(nombreArchivoRuta('/flows/runs/:flowId'), 'flows__runs__flowId');
  assert.equal(nombreArchivoRuta('/'), 'raiz');
});

test('--todas: colores — casi blanco, contraste WCAG y controles que no se separan 3:1', () => {
  assert.deepEqual(parseRgb('rgba(1, 2, 3, 0.5)'), { r: 1, g: 2, b: 3, a: 0.5 });
  assert.deepEqual(parseRgb('rgb(1 2 3 / 50%)'), { r: 1, g: 2, b: 3, a: 0.5 });
  assert.equal(parseRgb('transparent'), null);
  assert.equal(luminanciaRgb('rgb(255, 255, 255)'), 1);
  assert.equal(luminanciaRgb('rgb(0, 0, 0)'), 0);
  assert.equal(contrasteRgb('rgb(0, 0, 0)', 'rgb(255, 255, 255)'), 21);
  assert.equal(contrasteRgb('nada', 'rgb(0, 0, 0)'), null);
  assert.equal(LUMINANCIA_CASI_BLANCO, 0.8);
  // $cfg-tint, $cfg-chip-bg, #fafafa y #f8f9fa cuentan; #fff ya es del criterio 3; el lienzo oscuro no.
  for (const c of ['rgb(250, 249, 254)', 'rgb(245, 244, 250)', 'rgb(250, 250, 250)', 'rgb(248, 249, 250)']) assert.equal(esCasiBlanco(c), true, c);
  for (const c of ['rgb(255, 255, 255)', 'rgb(20, 18, 28)', 'rgba(250, 249, 254, 0.5)', 'rgb(95, 63, 224)']) assert.equal(esCasiBlanco(c), false, c);
  assert.equal(CONTRASTE_MINIMO_CONTROL, 3);
  assert.equal(controlSeDistingue({ borde: 'rgb(60, 60, 70)', fondoControl: null, fondoExterior: 'rgb(30, 30, 40)' }), false);
  assert.equal(controlSeDistingue({ borde: 'rgb(130, 128, 150)', fondoControl: null, fondoExterior: 'rgb(30, 30, 40)' }), true);
  // el fondo propio del control también lo separa (un input claro sobre lienzo oscuro se distingue)
  assert.equal(controlSeDistingue({ borde: 'rgb(30, 30, 40)', fondoControl: 'rgb(245, 244, 250)', fondoExterior: 'rgb(30, 30, 40)' }), true);
  assert.equal(controlSeDistingue({ borde: null, fondoControl: null, fondoExterior: 'rgb(30, 30, 40)' }), null);
});

test('--todas: las funciones de color corren solas en el navegador (como las inyecta auditoria-tema.js)', () => {
  const fuente = `window.__auditoriaColor = (function () {
    const LUMINANCIA_CASI_BLANCO = ${LUMINANCIA_CASI_BLANCO};
    const CONTRASTE_MINIMO_CONTROL = ${CONTRASTE_MINIMO_CONTROL};
    ${parseRgb}
    ${luminanciaRgb}
    ${contrasteRgb}
    ${esCasiBlanco}
    ${controlSeDistingue}
    return { esCasiBlanco, controlSeDistingue, contrasteRgb };
  })();`;
  const contexto = { window: {} };
  vm.runInNewContext(fuente, contexto);
  const color = contexto.window.__auditoriaColor;
  assert.equal(color.esCasiBlanco('rgb(250, 249, 254)'), true);
  assert.equal(color.controlSeDistingue({ borde: 'rgb(60, 60, 70)', fondoControl: null, fondoExterior: 'rgb(30, 30, 40)' }), false);
  assert.equal(color.contrasteRgb('rgb(0, 0, 0)', 'rgb(255, 255, 255)'), 21);
});

test('--todas: cobertura de las hojas con config-pagina (alcanzadas, solo con :param y sin ruta)', () => {
  const pantallas = [
    { ruta: '/a', conParametros: false, hojasCfg: ['a.scss', 'shell.scss'] },
    { ruta: '/b/:id', conParametros: true, hojasCfg: ['b.scss', 'a.scss'] },
    { ruta: '/c', conParametros: false, hojasCfg: [] },
  ];
  const archivos = ['a.scss', 'b.scss', 'dialogo.scss', 'shell.scss'];
  assert.deepEqual(coberturaCfg(pantallas, archivos), {
    archivos: 4, alcanzadas: ['a.scss', 'b.scss', 'shell.scss'], soloConParametros: [], sinRuta: ['dialogo.scss'],
  });
  assert.deepEqual(coberturaCfg(pantallas, archivos, { sinParametros: true }), {
    archivos: 4, alcanzadas: ['a.scss', 'shell.scss'], soloConParametros: ['b.scss'], sinRuta: ['dialogo.scss'],
  });
});

test('3.8: un tercero se compara con la base por conteos, no por píxeles', () => {
  const fila = (axeO, blancosO, axeC = 0) => ({ temas: {
    claro: { presente: true, axeColorContrast: axeC, fondosBlancos: 0 },
    oscuro: { presente: true, axeColorContrast: axeO, fondosBlancos: blancosO },
  } });
  // de 3 a 5 nodos de axe en oscuro: empeora aunque los dos tengan violaciones
  const peor = compararTerceroConBase(fila(5, 0), fila(3, 0));
  assert.equal(peor.comparable, true);
  assert.equal(peor.empeora, true);
  assert.deepEqual(peor.detalle.filter(d => d.empeora), [{ tema: 'oscuro', medida: 'axeColorContrast', base: 3, actual: 5, empeora: true }]);
  // baja o se mantiene: no empeora, aunque queden violaciones
  assert.equal(compararTerceroConBase(fila(2, 1), fila(3, 1)).empeora, false);
  // sin base, o sin el tercero en alguno de los dos: no comparable
  assert.deepEqual(compararTerceroConBase(fila(0, 0), null), { comparable: false, empeora: null, detalle: [] });
  assert.equal(compararTerceroConBase({ temas: { oscuro: { presente: false } } }, fila(1, 1)).comparable, false);
  assert.equal(compararTerceroConBase({ temas: { oscuro: { error: 'x' } } }, fila(1, 1)).comparable, false);
});
