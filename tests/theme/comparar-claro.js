#!/usr/bin/env node
'use strict';

// D-502 (ticket 1180): chequeo «claro idéntico» sin ng build.
//
// Compila con `sass` un .scss en dos versiones, la de un commit base y la del árbol actual, normaliza
// las dos salidas y reporta las diferencias que se verían en el tema claro. Sale con código 1 si el
// claro cambió, 0 si es idéntico y 2 si hubo un error de uso o de compilación.
//
// Uso (desde la raíz del front; compilar styles.scss es pesado, va con flock):
//   node tests/theme/comparar-claro.js --base <commit> --tmp <scratchpad> [--tema claro|oscuro] [--max <n>] <ruta.scss> [<ruta.scss> ...]
//
//   --base  commit, rama o tag contra el que se compara (obligatorio).
//   --tmp   scratchpad de la sesión (obligatorio): ahí se extraen las hojas de estilo del commit base, en
//           `comparar-claro/<sha>`. La extracción se hace en una carpeta temporal y se renombra al final,
//           así que dos corridas a la vez sobre el mismo sha nunca leen una copia a medias. Se reutiliza.
//   --max   cuántas líneas distintas mostrar por lado (por defecto 40).
//   --tema  claro (por defecto) u oscuro. Con `oscuro` (tarea 3.6, bloque TEMA-B05) compara lo que se ve en
//           el tema oscuro: conserva también las reglas body.dark-only y sustituye var(--ds-X) por el valor
//           OSCURO de cada lado (el de body.dark-only, o el de :root si el oscuro no lo redefine). Sirve para
//           comprobar que pasar un literal oscuro a token no cambia el oscuro («mismo valor»).
//
// Si las dos versiones compiladas no tienen ninguna declaración (por ejemplo, un parcial que solo
// define mixins), no hay nada que comparar: sale con 2 en vez de dar un falso «idéntico».
//
// Normalización (funciones puras exportadas, prueba en comparar-claro.test.js):
//   - var(--ds-X) y var(--ds-X, respaldo) pasan al valor claro de src/app/shared/styles/_theme-tokens.scss
//     de CADA lado: la base con los tokens de la base (si el parcial existía) y el árbol actual con los
//     suyos. Así, cambiar el valor claro de un token se ve en sus consumidores. En :root se descartan las
//     definiciones --ds-* (sin consumidor no pintan nada);
//   - se descartan los selectores que empiezan con body.dark-only, .dark-only o :host-context(body.dark-only)
//     (y :host-context(.dark-only)); si un selector de una lista es oscuro y otro no, queda el claro;
//   - hex en minúsculas y de 6 dígitos, white/black y rgb()/rgba(…, 1) a hex, cero inicial en decimales,
//     espacios y comas uniformes; se quitan los comentarios.
// Cada declaración queda en una línea «contexto selector { prop: valor }». Se comparan como multiconjunto
// y, si son iguales, también el orden (el orden cambia la cascada).
//
// Limitaciones: compila un archivo suelto; un parcial que solo define mixins da CSS vacío, así que se
// compara el consumidor (la pantalla o src/styles.scss). Imports de .css quedan como @import planos.

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const RAIZ = path.resolve(__dirname, '../..');
const TOKENS_REL = 'src/app/shared/styles/_theme-tokens.scss';
const PREFIJOS_OSCUROS = ['body.dark-only', '.dark-only', ':host-context(body.dark-only)', ':host-context(.dark-only)'];
const NOMBRES = { white: '#ffffff', black: '#000000' };

// sass y postcss no están declarados en package.json: llegan con @angular-devkit/build-angular.
function requerir(modulo) {
  try {
    return require(modulo);
  } catch (error) {
    throw new Error(`no se encontró «${modulo}» en node_modules (llega con @angular-devkit/build-angular; `
      + `revisar la instalación del front): ${error.message}`);
  }
}

// ---------- funciones puras ----------

function esSelectorOscuro(selector) {
  const s = String(selector).trim();
  return PREFIJOS_OSCUROS.some(p => s.startsWith(p));
}

function valorToken(tokens, token) {
  if (tokens instanceof Map) return tokens.get(token);
  return tokens && Object.prototype.hasOwnProperty.call(tokens, token) ? tokens[token] : undefined;
}

// Reemplaza var(--ds-X[, respaldo]) por el valor del mapa (claro). Los tokens desconocidos quedan igual.
function sustituirTokens(valor, tokens) {
  let texto = String(valor);
  for (let vuelta = 0; vuelta < 5; vuelta++) {
    let salida = '';
    let i = 0;
    let cambio = false;
    while (i < texto.length) {
      const inicio = texto.indexOf('var(', i);
      if (inicio === -1) { salida += texto.slice(i); break; }
      salida += texto.slice(i, inicio);
      let profundidad = 0;
      let fin = inicio + 3;
      for (; fin < texto.length; fin++) {
        if (texto[fin] === '(') profundidad++;
        else if (texto[fin] === ')' && --profundidad === 0) break;
      }
      const dentro = texto.slice(inicio + 4, fin);
      const nombre = dentro.split(',')[0].trim();
      const token = nombre.startsWith('--ds-') ? nombre.slice(5) : null;
      const reemplazo = token === null ? undefined : valorToken(tokens, token);
      if (reemplazo !== undefined) {
        salida += reemplazo;
        cambio = true;
      } else {
        salida += texto.slice(inicio, fin + 1);
      }
      i = fin + 1;
    }
    texto = salida;
    if (!cambio) break;
  }
  return texto;
}

function aHex(r, g, b) {
  return '#' + [r, g, b].map(n => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0')).join('');
}

function normalizarValor(valor) {
  let v = String(valor).replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
  v = v.replace(/\s*!\s*important$/i, ' !important');
  v = v.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s*,\s*/g, ', ');
  // decimales: .5 -> 0.5, 0.50 -> 0.5, 1.0 -> 1
  v = v.replace(/(^|[^\w.])(-?)\.(\d)/g, '$1$20.$3');
  v = v.replace(/(\d\.\d*?[1-9])0+(?!\d)/g, '$1').replace(/(\d)\.0+(?!\d)/g, '$1');
  // hex
  v = v.replace(/#([0-9a-f]{3,8})\b/gi, (m, h) => {
    const x = h.toLowerCase();
    if (x.length === 3 || x.length === 4) return '#' + x.split('').map(c => c + c).join('');
    return '#' + x;
  });
  v = v.replace(/#([0-9a-f]{6})ff\b/g, '#$1');
  // rgb()/rgba(..., 1) -> hex
  v = v.replace(/rgba?\((\d{1,3}), (\d{1,3}), (\d{1,3})(?:, 1)?\)/gi, (m, r, g, b) => aHex(r, g, b));
  // nombres
  v = v.replace(/(^|[\s,(])(white|black)(?=$|[\s,)])/gi, (m, pre, n) => pre + NOMBRES[n.toLowerCase()]);
  return v;
}

function normalizarSelector(selector) {
  return String(selector).trim().replace(/\s+/g, ' ').replace(/\s*([>+~])\s*/g, ' $1 ');
}

const TEMAS = ['claro', 'oscuro'];

function validarTema(tema) {
  if (!TEMAS.includes(tema)) throw new Error(`tema desconocido «${tema}» (claro u oscuro)`);
  return tema;
}

// Selectores que definen el juego de tokens: :root (claro) y body.dark-only / .dark-only (oscuro).
function esReglaDeTokens(regla) {
  return regla.selectors.every(s => [':root', 'body.dark-only', '.dark-only'].includes(s.trim()));
}

// Lee un juego de tokens de un CSS compilado del parcial. `claro`: el de :root. `oscuro`: el de :root con
// lo que redefine body.dark-only encima (un token que el oscuro no redefine hereda el claro).
function leerTokens(css, tema = 'claro') {
  validarTema(tema);
  const postcss = requerir('postcss');
  const raiz = postcss.parse(css);
  const tokens = new Map();
  const leerDe = selector => raiz.walkRules(regla => {
    if (!regla.selectors.map(s => s.trim()).includes(selector)) return;
    regla.walkDecls(/^--ds-/, d => tokens.set(d.prop.slice(5), d.value.trim()));
  });
  leerDe(':root');
  if (tema === 'oscuro') leerDe('body.dark-only');
  return tokens;
}

function leerTokensClaros(css) {
  return leerTokens(css, 'claro');
}

function contexto(nodo) {
  const partes = [];
  for (let p = nodo.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule') partes.unshift(`@${p.name} ${normalizarValor(p.params)}`.trim());
  }
  return partes.join(' > ');
}

// CSS compilado -> líneas normalizadas del tema pedido. En claro se descartan las reglas oscuras; en
// oscuro se conservan todas (las claras también aplican en oscuro si nada las pisa).
function normalizarCss(css, tokens, tema = 'claro') {
  validarTema(tema);
  const postcss = requerir('postcss');
  const raiz = postcss.parse(css);
  raiz.walkComments(c => c.remove());
  if (tema === 'claro') {
    raiz.walkRules(regla => {
      const claros = regla.selectors.filter(s => !esSelectorOscuro(s));
      if (claros.length === 0) { regla.remove(); return; }
      if (claros.length !== regla.selectors.length) regla.selectors = claros;
    });
  }
  const lineas = [];
  raiz.walk(nodo => {
    if (nodo.type === 'atrule' && !nodo.nodes) {
      lineas.push(`${contexto(nodo)} @${nodo.name} ${normalizarValor(nodo.params)}`.trim());
      return;
    }
    if (nodo.type !== 'decl') return;
    const padre = nodo.parent;
    const selector = padre.type === 'rule' ? padre.selectors.map(normalizarSelector).join(', ') : '';
    if (padre.type === 'rule' && /^--ds-/.test(nodo.prop) && esReglaDeTokens(padre)) return;
    const valor = normalizarValor(sustituirTokens(nodo.value, tokens)) + (nodo.important ? ' !important' : '');
    const ctx = contexto(nodo);
    lineas.push(`${ctx ? ctx + ' | ' : ''}${selector} { ${nodo.prop.trim()}: ${valor} }`);
  });
  return lineas;
}

// Compara dos listas de líneas: multiconjunto y, si coincide, el orden.
function compararLineas(base, actual) {
  const cuenta = new Map();
  for (const l of base) cuenta.set(l, (cuenta.get(l) || 0) + 1);
  for (const l of actual) cuenta.set(l, (cuenta.get(l) || 0) - 1);
  const soloBase = [];
  const soloActual = [];
  for (const [l, n] of cuenta) {
    for (let k = 0; k < n; k++) soloBase.push(l);
    for (let k = 0; k < -n; k++) soloActual.push(l);
  }
  const mismoConjunto = soloBase.length === 0 && soloActual.length === 0;
  let ordenCambio = false;
  if (mismoConjunto) ordenCambio = base.some((l, i) => l !== actual[i]);
  return { soloBase, soloActual, ordenCambio, igual: mismoConjunto && !ordenCambio };
}

// Compara dos CSS compilados, cada uno sustituido con los tokens del tema pedido de su propio árbol.
// `vacio` es true si ninguno de los dos tiene declaraciones (no hay nada que comparar).
function compararVersiones(cssBase, tokensBase, cssActual, tokensActual, tema = 'claro') {
  const base = cssBase === null ? [] : normalizarCss(cssBase, tokensBase, tema);
  const actual = normalizarCss(cssActual, tokensActual, tema);
  return { ...compararLineas(base, actual), declaraciones: actual.length, vacio: base.length === 0 && actual.length === 0 };
}

// ---------- compilación ----------

function importadorTilde(nodeModules) {
  return {
    findFileUrl(url) {
      if (!url.startsWith('~')) return null;
      return pathToFileURL(path.join(nodeModules, url.slice(1)));
    },
  };
}

function compilar(archivo, raizSrc) {
  const sass = requerir('sass');
  const nodeModules = path.join(RAIZ, 'node_modules');
  return sass.compile(archivo, {
    style: 'expanded',
    loadPaths: [raizSrc, nodeModules],
    importers: [importadorTilde(nodeModules)],
    logger: sass.Logger.silent,
  }).css;
}

function git(args, opciones = {}) {
  return execFileSync('git', ['-C', RAIZ, ...args], { maxBuffer: 1 << 30, ...opciones });
}

// Extrae las hojas de estilo de src/ del commit base a <tmp>/comparar-claro/<sha>. Un sha no cambia de
// contenido, así que la caché por sha es válida; se escribe en una carpeta temporal propia y se publica con
// un rename atómico, para que otra corrida simultánea nunca vea una extracción a medias.
function extraerBase(sha, tmp) {
  const padre = path.join(tmp, 'comparar-claro');
  const destino = path.join(padre, sha);
  if (fs.existsSync(path.join(destino, '.listo'))) return destino;
  fs.mkdirSync(padre, { recursive: true });
  const trabajo = fs.mkdtempSync(path.join(padre, `.${sha.slice(0, 8)}-`));
  try {
    const archivos = git(['ls-tree', '-r', '--name-only', sha, '--', 'src']).toString()
      .split('\n').filter(f => /\.(scss|sass|css)$/i.test(f));
    for (let i = 0; i < archivos.length; i += 200) {
      const tar = git(['archive', '--format=tar', sha, '--', ...archivos.slice(i, i + 200)]);
      execFileSync('tar', ['-x', '-C', trabajo], { input: tar, maxBuffer: 1 << 30 });
    }
    fs.writeFileSync(path.join(trabajo, '.listo'), `${new Date().toISOString()}\n`);
    if (fs.existsSync(destino) && !fs.existsSync(path.join(destino, '.listo'))) {
      // Restos de una versión anterior sin rename atómico: se apartan antes de publicar la nueva.
      fs.renameSync(destino, `${trabajo}-viejo`);
      fs.rmSync(`${trabajo}-viejo`, { recursive: true, force: true });
    }
    try {
      fs.renameSync(trabajo, destino);
    } catch (error) {
      // Otra corrida publicó primero: se usa la suya.
      if (!fs.existsSync(path.join(destino, '.listo'))) throw error;
    }
  } finally {
    fs.rmSync(trabajo, { recursive: true, force: true });
  }
  return destino;
}

// Tokens del tema pedido de un árbol (actual o extraído); null si ese árbol no tiene el parcial.
function tokensDe(raizArbol, tema = 'claro') {
  const archivo = path.join(raizArbol, TOKENS_REL);
  if (!fs.existsSync(archivo)) return null;
  return leerTokens(compilar(archivo, path.join(raizArbol, 'src')), tema);
}

function argumentos(argv) {
  const opciones = { base: null, tmp: null, max: 40, tema: 'claro', rutas: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') opciones.base = argv[++i];
    else if (a === '--tmp') opciones.tmp = argv[++i];
    else if (a === '--max') opciones.max = Number(argv[++i]);
    else if (a === '--tema') opciones.tema = argv[++i];
    else opciones.rutas.push(a);
  }
  return opciones;
}

function main(argv) {
  const op = argumentos(argv);
  if (!op.base || !op.tmp || op.rutas.length === 0 || !TEMAS.includes(op.tema)) {
    process.stderr.write('Uso: node tests/theme/comparar-claro.js --base <commit> --tmp <scratchpad> [--tema claro|oscuro] [--max <n>] <ruta.scss> [...]\n');
    return 2;
  }
  const tema = op.tema;
  const sha = git(['rev-parse', '--verify', `${op.base}^{commit}`]).toString().trim();
  const dirBase = extraerBase(sha, path.resolve(op.tmp));
  const tokensActual = tokensDe(RAIZ, tema) || new Map();
  // Sin parcial en la base tampoco hay consumidores var(--ds-*) en ella: da igual con qué mapa se sustituya.
  const tokensBase = tokensDe(dirBase, tema) || tokensActual;
  let cambios = 0;
  let vacios = 0;
  for (const ruta of op.rutas) {
    const rel = path.relative(RAIZ, path.resolve(RAIZ, ruta)).split(path.sep).join('/');
    const archivoBase = path.join(dirBase, rel);
    const cssBase = fs.existsSync(archivoBase) ? compilar(archivoBase, path.join(dirBase, 'src')) : null;
    const r = compararVersiones(cssBase, tokensBase, compilar(path.join(RAIZ, rel), path.join(RAIZ, 'src')), tokensActual, tema);
    if (r.vacio) {
      vacios++;
      process.stderr.write(`SIN DATOS: ${rel} no produce ninguna declaración ni en la base ni en el árbol actual `
        + '(¿un parcial que solo define mixins?). Comparar el consumidor: la pantalla o src/styles.scss.\n');
      continue;
    }
    if (r.igual) {
      process.stdout.write(`OK ${tema} idéntico: ${rel} (${r.declaraciones} declaraciones, base ${sha.slice(0, 8)})\n`);
      continue;
    }
    cambios++;
    process.stdout.write(`CAMBIÓ el ${tema}: ${rel} (base ${sha.slice(0, 8)}${fs.existsSync(archivoBase) ? '' : ', no existía en la base'})\n`);
    if (r.ordenCambio) process.stdout.write('  mismas declaraciones en otro orden (la cascada puede cambiar)\n');
    process.stdout.write(`  solo en la base: ${r.soloBase.length}; solo en el árbol actual: ${r.soloActual.length}\n`);
    for (const l of r.soloBase.slice(0, op.max)) process.stdout.write(`  - ${l}\n`);
    for (const l of r.soloActual.slice(0, op.max)) process.stdout.write(`  + ${l}\n`);
  }
  if (cambios > 0) return 1;
  return vacios > 0 ? 2 : 0;
}

module.exports = { esSelectorOscuro, sustituirTokens, normalizarValor, normalizarSelector, leerTokens, leerTokensClaros, normalizarCss, compararLineas, compararVersiones };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 2;
  }
}
