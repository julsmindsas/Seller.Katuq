'use strict';

// D-502 (ticket 1180), tarea 3.9: «deuda medida» de los rellenos con `var(--primary-color)`.
//
// En oscuro, `--primary-color` pasa al tinte de texto (`--ds-accent-ink`, design-f1.md §2), así que un
// relleno con esa variable y texto blanco encima queda en 2,72:1. Cada pantalla los pasa a
// `var(--ds-accent)` en su fase (F2 o F3). Este conteo es estático, sin navegador ni build:
// por archivo `.scss`/`.css` de `src/`, las declaraciones `background` y `background-color` cuyo valor
// usa `var(--primary-color)`, también con respaldo (`var(--primary-color, #…)`). `--primary-color-rgb`
// y otras variables con el mismo prefijo no cuentan.
//
// Uso: node tests/theme/deuda-primary.js [--json]

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '../..');
const EXTENSIONES = new Set(['.scss', '.css']);
const USO = /var\(\s*--primary-color\s*[,)]/;
const PROPIEDAD = /^\s*background(-color)?\s*:/i;

// Quita comentarios `/* */` y `//` de SCSS sin tocar las URL (`url(http://…)`).
function sinComentarios(texto) {
  return String(texto)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"(])\/\/.*$/gm, '$1');
}

/** Rellenos con `var(--primary-color)` en el texto de una hoja: { background, backgroundColor, total }. */
function contarEnTexto(texto) {
  const resultado = { background: 0, backgroundColor: 0, total: 0 };
  for (const declaracion of sinComentarios(texto).split(/[;{}]/)) {
    const m = declaracion.match(PROPIEDAD);
    if (!m) continue;
    const valor = declaracion.slice(declaracion.indexOf(':') + 1);
    if (!USO.test(valor)) continue;
    if (m[1]) resultado.backgroundColor++;
    else resultado.background++;
    resultado.total++;
  }
  return resultado;
}

function* hojas(directorio) {
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === 'node_modules') continue;
      yield* hojas(ruta);
    } else if (EXTENSIONES.has(path.extname(entrada.name))) {
      yield ruta;
    }
  }
}

/**
 * Deuda por archivo en `src/` (solo los que tienen alguno), ordenada de mayor a menor.
 * @returns {{ total: number, background: number, backgroundColor: number, archivos: object[] }}
 */
function medirDeuda(raiz = RAIZ) {
  const archivos = [];
  for (const archivo of hojas(path.join(raiz, 'src'))) {
    const conteo = contarEnTexto(fs.readFileSync(archivo, 'utf8'));
    if (conteo.total) archivos.push({ archivo: path.relative(raiz, archivo).split(path.sep).join('/'), ...conteo });
  }
  archivos.sort((a, b) => b.total - a.total || (a.archivo < b.archivo ? -1 : 1));
  const suma = clave => archivos.reduce((s, a) => s + a[clave], 0);
  return { total: suma('total'), background: suma('background'), backgroundColor: suma('backgroundColor'), archivos };
}

module.exports = { contarEnTexto, sinComentarios, medirDeuda };

if (require.main === module) {
  const deuda = medirDeuda();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(deuda, null, 2)}\n`);
  } else {
    for (const a of deuda.archivos) process.stdout.write(`${String(a.total).padStart(4)}  ${a.archivo}\n`);
    process.stdout.write(`Total: ${deuda.total} rellenos (${deuda.background} background, ${deuda.backgroundColor} background-color) en ${deuda.archivos.length} archivos\n`);
  }
}
