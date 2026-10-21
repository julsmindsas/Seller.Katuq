'use strict';

// Ayuda de TEMA-B14: compila los SCSS del flujo de venta asistida y los normaliza en claro
// (misma normalización que comparar-claro.js) para fijar el «antes» y comparar el «después».
// Uso para regenerar el fixture: node tests/theme/ventas-claro.js <commit> > fixtures/ventas-claro-<commit>.json

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const { normalizarCss, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const V = 'src/app/components/ventas/';
const ARCHIVOS = [
  V + 'crear-ventas/crear-ventas.component.scss',
  V + 'venta-asistida-unica/venta-asistida-unica.component.scss',
  V + 'carrito/carrito.component.scss',
  V + 'checkout/checkout.component.scss',
  V + 'facturacion/pedido-facturacion.component.scss',
  V + 'catalogo/conf-product-to-cart/conf-product-to-cart.component.scss',
  V + 'catalogo/ecomerce-products/ecomerce-products.component.scss',
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
