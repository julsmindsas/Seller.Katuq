'use strict';
/**
 * Retiro de bloques sin consumidor de dark-mode.scss y themes/_dark.scss (tarea 4.5, TEMA-B20).
 *
 * Un selector «muerto» nombra una clase que no existe en ninguna plantilla (html/ts de src), en los
 * recursos (src/assets) ni en las librerías del front (css/js/scss de sus paquetes). Una regla cuyos
 * selectores resueltos están todos muertos (y los de sus hijas) no puede aplicar: se puede borrar sin
 * cambiar la pantalla. El resto no se toca aquí.
 *
 * Uso: node tests/theme/retiro-oscuro.js [--aplicar] [--json]
 */
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..', '..');
const SCSS = path.join(RAIZ, 'src', 'assets', 'scss');
const ARCHIVOS = [path.join(SCSS, 'dark-mode.scss'), path.join(SCSS, 'themes', '_dark.scss')];

const LIBRERIAS = [
  'primeng', 'bootstrap', '@ng-select', 'ngx-toastr', 'sweetalert2', '@ng-bootstrap', '@swimlane',
  '@ks89', '@angular-slider', '@ctrl', 'ngx-star-rating', 'ngx-tabset', 'angular-archwizard', 'ng2-dragula',
  'dragula', 'dropzone', 'ngx-dropzone-wrapper', 'ng2-file-upload', 'leaflet', 'driver.js', 'apexcharts',
  'ng-apexcharts', 'animate.css', 'font-awesome', 'feather-icons', 'primeicons', '@angular/cdk',
  '@angular/forms', '@angular/common', '@angular/router', '@ngx-loading-bar', 'ngx-barcode', 'ngx-echarts',
  '@ckeditor', 'hammerjs', 'siriwave', 'html2pdf.js', 'jspdf', 'pdfjs-dist', 'markdown-it', 'ngx-hotkeys',
  '@balticcode', '@ng-idle', '@popperjs', 'mousetrap',
];
const MARCA_PROTEGIDA = 'terceros en oscuro, solo con tokens --ds-*';
const EXT_LIB = new Set(['.css', '.js', '.mjs', '.scss', '.html']);
const EXT_SRC = new Set(['.html', '.ts', '.js', '.json', '.svg', '.css']);

function recorrer(dir, ext, salida, omitir) {
  let entradas;
  try { entradas = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entradas) {
    const p = path.join(dir, e.name);
    if (omitir && omitir(p)) continue;
    if (e.isDirectory()) recorrer(p, ext, salida, omitir);
    else if (ext.has(path.extname(e.name)) && !e.name.endsWith('.map')) salida.push(p);
  }
}

function palabras(texto, conjunto, prefijos) {
  const re = /[A-Za-z_][\w-]*/g;
  let m;
  while ((m = re.exec(texto))) {
    conjunto.add(m[0]);
    // «'badge-' + x» o «`col-${n}`»: el prefijo cubre todas las clases que empiezan así.
    if (m[0].endsWith('-') && m[0].length > 2) prefijos.add(m[0]);
  }
}

/** Conjunto de nombres que existen en alguna parte del front. Cacheado en memoria. */
function nombresConocidos(raiz = RAIZ) {
  const conj = new Set();
  const prefijos = new Set();
  const archivos = [];
  const omitirSrc = (p) => p.includes(`${path.sep}assets${path.sep}scss${path.sep}`) || p.endsWith('.spec.ts');
  recorrer(path.join(raiz, 'src'), EXT_SRC, archivos, omitirSrc);
  // Los scss de los componentes no cuentan como consumo, pero sí las clases que ellos crean con @extend
  // son raras; las plantillas y el código son la fuente de verdad.
  for (const l of LIBRERIAS) {
    const base = path.join(raiz, 'node_modules', l);
    recorrer(base, EXT_LIB, archivos, (p) => p.slice(base.length).includes(`${path.sep}node_modules${path.sep}`));
  }
  for (const a of archivos) {
    let t;
    try { t = fs.readFileSync(a, 'utf8'); } catch { continue; }
    palabras(t, conj, prefijos);
  }
  return { conj, prefijos };
}

/* ---------- lectura de bloques SCSS ---------- */

/** Salta comentarios, cadenas e interpolaciones desde i; devuelve el nuevo i o -1 si no hay nada que saltar. */
function saltar(s, i) {
  const c = s[i];
  const d = s[i + 1];
  if (c === '/' && d === '/') { const j = s.indexOf('\n', i); return j < 0 ? s.length : j; }
  if (c === '/' && d === '*') { const j = s.indexOf('*/', i + 2); return j < 0 ? s.length : j + 2; }
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < s.length && s[j] !== c) { if (s[j] === '\\') j++; j++; }
    return j + 1;
  }
  if (c === '#' && d === '{') {
    let n = 1; let j = i + 2;
    while (j < s.length && n) { if (s[j] === '{') n++; else if (s[j] === '}') n--; j++; }
    return j;
  }
  return -1;
}

/** Devuelve bloques {selector, ini, abre, cierra, hijos, padre}. `ini` es el inicio del selector en el texto. */
function leerBloques(s) {
  const raiz = { hijos: [], cierra: s.length };
  let actual = raiz;
  let ini = 0; // inicio de la sentencia actual
  let i = 0;
  while (i < s.length) {
    const salto = saltar(s, i);
    if (salto >= 0) {
      // un comentario antes de la sentencia desplaza su inicio
      if (s.slice(ini, i).trim() === '' && (s[i] === '/')) ini = salto;
      i = salto; continue;
    }
    const c = s[i];
    if (c === '{') {
      const b = { selector: s.slice(ini, i).trim(), ini: ini + (s.slice(ini, i).length - s.slice(ini, i).trimStart().length), abre: i, cierra: -1, hijos: [], padre: actual };
      actual.hijos.push(b);
      actual = b; ini = i + 1;
    } else if (c === '}') {
      actual.cierra = i;
      actual = actual.padre || raiz;
      ini = i + 1;
    } else if (c === ';') {
      ini = i + 1;
    }
    i++;
  }
  return raiz;
}

function partirComas(sel) {
  const salida = []; let n = 0; let ini = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '(' || c === '[') n++; else if (c === ')' || c === ']') n--;
    else if (c === ',' && n === 0) { salida.push(sel.slice(ini, i).trim()); ini = i + 1; }
  }
  salida.push(sel.slice(ini).trim());
  return salida.filter(Boolean);
}

function quitarComentarios(sel) {
  return sel.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ').trim();
}

const OPACOS = /^@(mixin|function|if|else|each|for|while|keyframes|-webkit-keyframes|font-face|include|return)/;
const TRANSPARENTES = /^@(media|supports|at-root|layer)/;

/** Recorre y devuelve, por bloque de regla, sus selectores resueltos. `opaco` si está dentro de un mixin o similar. */
function resolver(bloque, padres, opaco, salida) {
  const sel = quitarComentarios(bloque.selector || '');
  let resueltos = padres;
  let esRegla = false;
  let op = opaco;
  if (bloque.selector !== undefined) {
    if (OPACOS.test(sel)) op = true;
    else if (TRANSPARENTES.test(sel)) { /* conserva padres */ }
    else if (sel.startsWith('@')) op = true;
    else if (/^[\w-]+\s*:\s*[^&.#\[]*$/.test(sel) && !/[.#\[&>+~]/.test(sel)) { op = true; } // propiedad anidada (font: {)
    else {
      esRegla = true;
      const propios = partirComas(sel);
      resueltos = [];
      for (const p of propios) {
        if (padres.length === 0) resueltos.push(p.replace(/&/g, ''));
        else for (const pa of padres) resueltos.push(p.includes('&') ? p.replace(/&/g, pa) : `${pa} ${p}`);
      }
    }
  }
  if (esRegla) salida.push({ bloque, resueltos, opaco: op });
  for (const h of bloque.hijos) resolver(h, resueltos, op, salida);
  return salida;
}

/** Clases nombradas por un selector, sin las de :not(...) / :is / :where / :has. */
function clasesDe(selector) {
  let s = selector;
  let previo;
  do { previo = s; s = s.replace(/:(not|is|where|has|matches)\([^()]*\)/g, ' '); } while (s !== previo);
  s = s.replace(/\[[^\]]*\]/g, ' ').replace(/"[^"]*"|'[^']*'/g, ' ');
  const clases = [];
  const re = /\.(-?[A-Za-z_][\w-]*)/g;
  let m;
  while ((m = re.exec(s))) clases.push(m[1]);
  return clases;
}

function esDinamico(selector) {
  return /#\{|%|\$/.test(selector);
}

function claseConocida(c, { conj, prefijos }) {
  if (conj.has(c)) return true;
  for (const p of prefijos) if (c.startsWith(p)) return true;
  return false;
}

function selectorMuerto(selector, conocidos) {
  if (esDinamico(selector)) return false;
  return clasesDe(selector).some((c) => !claseConocida(c, conocidos));
}

/** Bloques de regla que se pueden borrar: todos sus selectores y los de sus hijas están muertos. */
function bloquesMuertos(texto, conocidos) {
  const arbol = leerBloques(texto);
  const reglas = resolver(arbol, [], false, []).filter((r) => !r.opaco);
  const muertasPorBloque = new Map();
  for (const r of reglas) muertasPorBloque.set(r.bloque, r.resueltos.every((s) => selectorMuerto(s, conocidos)));
  const hijaViva = (b) => b.hijos.some((h) => {
    if (muertasPorBloque.has(h)) return !muertasPorBloque.get(h) || hijaViva(h);
    return hijaViva(h) || /^@(include|extend)/.test(h.selector || '');
  });
  // El bloque de terceros de B18 (ng-select, SweetAlert2, Quill, FullCalendar) se deja a propósito aunque la
  // librería no esté instalada; va al final de dark-mode.scss y se protege desde su marca.
  const marca = texto.indexOf(MARCA_PROTEGIDA);
  const lista = [];
  const dentroDeMuerto = (b) => { let p = b.padre; while (p && p.selector !== undefined) { if (lista.includes(p)) return true; p = p.padre; } return false; };
  for (const r of reglas) {
    if (!muertasPorBloque.get(r.bloque)) continue;
    if (hijaViva(r.bloque)) continue;
    // Una regla sin selectores propios con `&` suelto o con @extend dentro no se toca.
    if (/@extend|@include/.test(texto.slice(r.bloque.abre, r.bloque.cierra))) continue;
    if (dentroDeMuerto(r.bloque)) continue;
    if (marca >= 0 && r.bloque.ini > marca) continue;
    lista.push(r.bloque);
  }
  return lista.map((b) => ({ ini: b.ini, fin: b.cierra + 1, selector: quitarComentarios(b.selector), resueltos: reglas.find((r) => r.bloque === b).resueltos }));
}

function borrar(texto, bloques) {
  let t = texto;
  for (const b of [...bloques].sort((x, y) => y.ini - x.ini)) {
    let ini = b.ini;
    let fin = b.fin;
    // se lleva el salto de línea final y la sangría previa
    while (ini > 0 && (t[ini - 1] === ' ' || t[ini - 1] === '\t')) ini--;
    if (t[fin] === '\n') fin++;
    t = t.slice(0, ini) + t.slice(fin);
  }
  return t;
}

function main(argv) {
  const aplicar = argv.includes('--aplicar');
  const conocidos = nombresConocidos();
  let total = 0;
  for (const archivo of ARCHIVOS) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const muertos = bloquesMuertos(texto, conocidos);
    total += muertos.length;
    process.stdout.write(`${path.relative(RAIZ, archivo)}: ${muertos.length} bloques sin consumidor\n`);
    if (argv.includes('--json')) process.stdout.write(`${JSON.stringify(muertos.map((m) => m.resueltos[0]).slice(0, 4000), null, 1)}\n`);
    if (aplicar && muertos.length) fs.writeFileSync(archivo, borrar(texto, muertos));
  }
  return total;
}

module.exports = { ARCHIVOS, nombresConocidos, leerBloques, resolver, clasesDe, selectorMuerto, bloquesMuertos, borrar, partirComas };

if (require.main === module) main(process.argv.slice(2));
