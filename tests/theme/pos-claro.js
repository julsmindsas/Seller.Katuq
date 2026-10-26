'use strict';

// Ayuda de TEMA-B16: compila los SCSS de la pantalla POS (pos2, sin los widgets de pago de B12) y los normaliza en claro
// (misma normalización que comparar-claro.js) para fijar el «antes» y comparar el «después».
// Uso para regenerar el fixture: node tests/theme/pos-claro.js <commit> > fixtures/pos-claro-<commit>.json

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const { normalizarCss, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const P = 'src/app/components/ventas/pos2/';
const ARCHIVOS = [
  P + 'pos.component.scss',
  P + 'widgets/cart-summary/cart-summary.component.scss',
  P + 'widgets/customer-section/customer-section.component.scss',
  P + 'widgets/payment-selector/payment-selector.component.scss',
  P + 'widgets/pos-facturacion/pos-facturacion.component.scss',
  P + 'widgets/product-category/product-category.component.scss',
  P + 'widgets/product/product.component.scss',
  P + 'widgets/warehouse-selector/warehouse-selector.scss',
  P + 'widgets/pos-checkout/pos-checkout.component.scss',
  P + 'widgets/payment-modal.ts/payment-modal.scss',
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
