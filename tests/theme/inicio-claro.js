'use strict';

// Ayuda de TEMA-B18: compila el SCSS del Inicio (dashboard/home) y lo normaliza en claro para fijar el «antes».
// Uso para regenerar el fixture (compila la version de un commit): node tests/theme/inicio-claro.js <commit> > fixtures/inicio-claro-<commit>.json

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const { normalizarCss, leerTokens } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const ARCHIVOS = ['src/app/components/dashboard/home/dashboard-home.component.scss'];
const nm = path.join(RAIZ, 'node_modules');
const opts = { style: 'expanded', loadPaths: [path.join(RAIZ, 'src'), nm], logger: sass.Logger.silent,
  importers: [{ findFileUrl: u => (u.startsWith('~') ? pathToFileURL(path.join(nm, u.slice(1))) : null) }] };

function compilar(rel, commit) {
  if (!commit) return sass.compile(path.join(RAIZ, rel), opts).css;
  const fuente = execFileSync('git', ['show', `${commit}:${rel}`], { cwd: RAIZ, encoding: 'utf8' });
  return sass.compileString(fuente, { ...opts, url: pathToFileURL(path.join(RAIZ, rel)) }).css;
}

function lineasClaro(rel, commit) {
  const claros = leerTokens(compilar('src/app/shared/styles/_theme-tokens.scss'), 'claro');
  return normalizarCss(compilar(rel, commit), claros, 'claro');
}

module.exports = { ARCHIVOS, compilar, lineasClaro };

if (require.main === module) {
  const salida = { base: process.argv[2] || '', archivos: {} };
  for (const f of ARCHIVOS) salida.archivos[f] = lineasClaro(f, process.argv[2]);
  process.stdout.write(JSON.stringify(salida));
}
