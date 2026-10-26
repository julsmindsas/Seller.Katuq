'use strict';

// Ayuda de TEMA-B17: compila los SCSS de la pantalla POS (pos2, sin los widgets de pago de B12) y los normaliza en claro
// (misma normalización que comparar-claro.js) para fijar el «antes» y comparar el «después».
// Uso para regenerar el fixture: node tests/theme/inv-claro.js <commit> > fixtures/inv-claro-<commit>.json

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const { normalizarCss, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const P = 'src/app/components/inventarios/';
const ARCHIVOS = [
  P + 'inventario-catalogo/inventarios.component.scss',
  P + 'historial-movimientos/historial-movimientos.component.scss',
  P + 'traslados/traslados.component.scss',
  P + 'recepcion-mercancia/recepcion-mercancia.component.scss',
  P + 'central-abastecimiento/central-abastecimiento.component.scss',
  P + 'central-abastecimiento/insights.shared.scss',
  P + 'central-abastecimiento/insights-resumen/insights-resumen.component.scss',
  P + 'bodega-detalle/bodega-detalle.component.scss',
  P + 'bodegas/bodegas.component.scss',
  P + 'bodegas/importar-bodegas-modal/importar-bodegas-modal.component.scss',
];
const nm = path.join(RAIZ, 'node_modules');

function compilar(rel) {
  return sass.compile(path.join(RAIZ, rel), {
    style: 'expanded',
    loadPaths: [path.join(RAIZ, 'src'), nm],
    importers: [{ findFileUrl: u => (u.startsWith('~') ? pathToFileURL(path.join(nm, u.slice(1))) : null) }],
    logger: sass.Logger.silent,
  }).css;
}

function lineasClaro(rel) {
  const claros = leerTokens(compilar('src/app/shared/styles/_theme-tokens.scss'), 'claro');
  return normalizarCss(compilar(rel), claros, 'claro');
}

module.exports = { ARCHIVOS, compilar, lineasClaro };

if (require.main === module) {
  const salida = { base: process.argv[2] || '', archivos: {} };
  for (const f of ARCHIVOS) salida.archivos[f] = lineasClaro(f);
  process.stdout.write(JSON.stringify(salida));
}
