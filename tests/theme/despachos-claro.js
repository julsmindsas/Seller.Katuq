'use strict';

// Ayuda de TEMA-B15: compila los SCSS del de despachos y los normaliza en claro
// (misma normalización que comparar-claro.js) para fijar el «antes» y comparar el «después».
// Uso para regenerar el fixture: node tests/theme/despachos-claro.js <commit> > fixtures/despachos-claro-<commit>.json

const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const { normalizarCss, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const V = 'src/app/components/despachos/';
const ARCHIVOS = [
  V + 'despachos/despachos.component.scss',
  V + 'components/tabla-pedidos/tabla-pedidos.component.scss',
  V + 'components/enviame/tracking-details/tracking-details-modal.component.scss',
  V + 'components/enviame/rates-modal/enviame-rates-modal.component.scss',
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

// Custom properties locales --er-* del modal de tarifas (ticket 1180, auditoría): en claro valen un literal;
// se resuelven aquí y se quitan sus definiciones, así el «claro idéntico» sigue midiendo los valores reales.
function resolverLocales(lineas) {
  const valores = new Map();
  for (const l of lineas) {
    const m = /\{ --er-([\w-]+): ([^}]*?) \}$/.exec(l);
    if (m) valores.set(m[1], m[2]);
  }
  return lineas
    .filter(l => !/\{ --er-[\w-]+: [^}]*? \}$/.test(l))
    .map(l => l.replace(/var\(--er-([\w-]+)\)/g, (t, n) => (valores.has(n) ? valores.get(n) : t)));
}

function lineasClaro(rel) {
  const claros = leerTokens(compilar('src/app/shared/styles/_theme-tokens.scss'), 'claro');
  return resolverLocales(normalizarCss(compilar(rel), claros, 'claro'));
}

module.exports = { ARCHIVOS, compilar, lineasClaro };

if (require.main === module) {
  const salida = { base: process.argv[2] || '', archivos: {} };
  for (const f of ARCHIVOS) salida.archivos[f] = lineasClaro(f);
  process.stdout.write(JSON.stringify(salida));
}
