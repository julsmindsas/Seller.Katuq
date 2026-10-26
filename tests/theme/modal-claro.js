#!/usr/bin/env node
'use strict';

// D-502 F2c (ticket 1180, tarea 4.3, bloque TEMA-B12): «claro idéntico» de _katuq-modal y de sus consumidores.
//
// comparar-claro.js no resuelve las variables propias del modal (--kc-*, --km-*) y las ve como cambios. Aquí
// se resuelven en los dos lados antes de comparar: cada --kc-*/--km-* definida en un selector claro (:host)
// se sustituye por su valor en todos los usos (hasta 6 pasadas, por las variables que apuntan a otras) y se
// quitan sus definiciones. Después se normaliza igual que comparar-claro (tokens --ds-* del árbol, hex,
// sin reglas oscuras) y se compara. La referencia del antes es un fixture con las líneas de commit 5a1982da.
//
// Foto vigente: la de D-520 (5a1982da); se generó con --base HEAD tras comprobar que el claro del árbol es el de D-520.
// Uso para regenerar el fixture (solo si cambia a propósito el claro, con visto bueno de Daniel):
//   node tests/theme/modal-claro.js --base 5a1982da --tmp <scratchpad>

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const sass = require('sass');
const postcss = require('postcss');
const { normalizarCss, leerTokens, esSelectorOscuro } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const W = 'src/app/components/ventas/pos2/widgets/';
const ARCHIVOS = [
  W + 'cash-payment/cash-payment.scss',
  W + 'card-payment/card-payment.scss',
  W + 'ewallet-payment/ewallet-payment.scss',
  W + 'cash-closing/cash-closing.component.scss',
  W + 'cash-closing-history/cash-closing-history.component.scss',
  'src/app/shared/components/opinar-modal/opinar-modal.component.scss',
];
const FIXTURE = path.join(__dirname, 'fixtures', 'modal-claro-5a1982da.json');
const TOKENS_REL = 'src/app/shared/styles/_theme-tokens.scss';
const PROPIAS = /^--(kc|km)-/;

function compilar(rel, raiz) {
  const nm = path.join(RAIZ, 'node_modules');
  return sass.compile(path.join(raiz, rel), {
    style: 'expanded',
    loadPaths: [path.join(raiz, 'src'), nm],
    importers: [{ findFileUrl: u => (u.startsWith('~') ? pathToFileURL(path.join(nm, u.slice(1))) : null) }],
    logger: sass.Logger.silent,
  }).css;
}

// Sustituye en todos los usos las variables kc y km definidas en reglas claras y quita sus definiciones.
function resolverPropias(css) {
  const raiz = postcss.parse(css);
  const defs = new Map();
  raiz.walkRules(r => {
    if (r.selectors.some(esSelectorOscuro)) return;
    r.walkDecls(PROPIAS, d => { defs.set(d.prop, d.value.trim()); });
  });
  const resolver = v => {
    let actual = v;
    for (let i = 0; i < 6; i++) {
      const sig = actual.replace(/var\((--(?:kc|km)-[\w-]+)\)/g, (m, n) => (defs.has(n) ? defs.get(n) : m));
      if (sig === actual) break;
      actual = sig;
    }
    return actual;
  };
  raiz.walkRules(r => {
    if (r.selectors.some(esSelectorOscuro)) return;
    r.walkDecls(d => { if (PROPIAS.test(d.prop)) d.remove(); else d.value = resolver(d.value); });
  });
  raiz.walkRules(r => { if (r.nodes.length === 0) r.remove(); });
  return raiz.toString();
}

function lineasClaro(css, tokens) {
  return normalizarCss(resolverPropias(css), tokens, 'claro');
}

function tokensDe(raiz) {
  return leerTokens(compilar(TOKENS_REL, raiz), 'claro');
}

function regenerar(sha, tmp) {
  const destino = fs.mkdtempSync(path.join(tmp, 'modal-claro-'));
  const archivos = execFileSync('git', ['-C', RAIZ, 'ls-tree', '-r', '--name-only', sha, '--', 'src']).toString()
    .split('\n').filter(f => /\.(scss|css)$/i.test(f));
  for (let i = 0; i < archivos.length; i += 200) {
    const tar = execFileSync('git', ['-C', RAIZ, 'archive', '--format=tar', sha, '--', ...archivos.slice(i, i + 200)], { maxBuffer: 1 << 30 });
    execFileSync('tar', ['-x', '-C', destino], { input: tar, maxBuffer: 1 << 30 });
  }
  const tokens = tokensDe(destino);
  const salida = {};
  for (const rel of ARCHIVOS) salida[rel] = lineasClaro(compilar(rel, destino), tokens);
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(FIXTURE, JSON.stringify({ base: sha, archivos: salida }, null, 1) + '\n');
  fs.rmSync(destino, { recursive: true, force: true });
  return Object.fromEntries(Object.entries(salida).map(([k, v]) => [k, v.length]));
}

module.exports = { ARCHIVOS, FIXTURE, compilar, resolverPropias, lineasClaro, tokensDe, RAIZ };

if (require.main === module) {
  const a = process.argv.slice(2);
  const base = a[a.indexOf('--base') + 1];
  const tmp = a[a.indexOf('--tmp') + 1];
  if (!base || !tmp || !a.includes('--base') || !a.includes('--tmp')) {
    process.stderr.write('Uso: node tests/theme/modal-claro.js --base <commit> --tmp <scratchpad>\n');
    process.exit(2);
  }
  console.log(regenerar(base, tmp));
}
