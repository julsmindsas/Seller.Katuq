'use strict';

// D-502 F3 (ticket 1180, tarea 4.4, bloque TEMA-B19): priorizacion estatica de la cola «todas las paginas».
// Sin navegador ni build: lee los .scss de src/app/components y cuenta, por hoja,
//   - blancos fijos: `background`/`background-color` con #fff, #ffffff o white (sin gradientes);
//   - textos literales: `color:` con un hex (el blanco #fff se deja: es el texto sobre un relleno propio);
//   - usos de var(--ds-*), para saber si ya esta migrada.
// Una hoja sin blancos ni textos literales pendientes (y con var(--ds-*) o sin colores) cuenta como migrada y no entra en la cola.
// Se excluyen las pantallas sin menu que quedan siempre en claro (valor por defecto 7) y las bases compartidas.
// Uso: node tests/theme/cola-paginas.js [--json] [--modulo <carpeta>]

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '../..');
const COMPONENTES = path.join(RAIZ, 'src/app/components');
// Pantallas sin menu (publica, Registrese, cambio de contrasena, agentes de voz y video, resultados de pago).
const SIEMPRE_CLARO = ['publica', 'change-password', 'privacy-policy', 'terms-conditions', 'payment-callback', 'subscription-callback',
  'catalogo-publico', 'cotizacion-publica', 'encuesta-publica', 'report-public', 'sitio-publico', 'sitio-render', 'onboarding', 'loader', 'katuq-flow'];
const AGENTES = /(voice|video)-agent|voz|video-agente/i;

function hojas(dir, salida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) hojas(p, salida);
    else if (e.name.endsWith('.scss') && !e.name.startsWith('_')) salida.push(p);
  }
  return salida;
}

function medir(texto) {
  const lineas = texto.split('\n').filter(l => !/^\s*\/\//.test(l));
  let blancos = 0, textos = 0, tokens = 0;
  for (const l of lineas) {
    tokens += (l.match(/var\(--ds-[\w-]+\)/g) || []).length;
    if (/gradient/.test(l)) continue;
    if (/\bbackground(-color)?:\s*(#fff|#ffffff|white)\b/i.test(l)) blancos++;
    if (/(^|[;{\s])color:\s*#(?!(?:fff|ffffff)\b)[0-9a-f]{3,8}\b/i.test(l)) textos++;
  }
  return { blancos, textos, tokens };
}

function cola(opciones = {}) {
  const filas = [];
  for (const f of hojas(COMPONENTES)) {
    const rel = path.relative(RAIZ, f);
    const modulo = path.relative(COMPONENTES, f).split(path.sep)[0];
    if (SIEMPRE_CLARO.includes(modulo) || AGENTES.test(rel)) continue;
    if (opciones.modulo && modulo !== opciones.modulo) continue;
    const m = medir(fs.readFileSync(f, 'utf8'));
    const pendiente = m.blancos + m.textos;
    if (!pendiente) continue;
    filas.push({ archivo: rel, modulo, ...m, puntaje: m.blancos * 2 + m.textos + (m.tokens === 0 ? 5 : 0) });
  }
  return filas.sort((a, b) => b.puntaje - a.puntaje || a.archivo.localeCompare(b.archivo));
}

function porModulo(filas) {
  const mapa = new Map();
  for (const f of filas) {
    const m = mapa.get(f.modulo) || { modulo: f.modulo, hojas: 0, blancos: 0, textos: 0, puntaje: 0 };
    m.hojas++; m.blancos += f.blancos; m.textos += f.textos; m.puntaje += f.puntaje;
    mapa.set(f.modulo, m);
  }
  return [...mapa.values()].sort((a, b) => b.puntaje - a.puntaje);
}

module.exports = { hojas, medir, cola, porModulo, SIEMPRE_CLARO };

if (require.main === module) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--modulo');
  const filas = cola({ modulo: i >= 0 ? args[i + 1] : undefined });
  if (args.includes('--json')) process.stdout.write(JSON.stringify({ modulos: porModulo(filas), hojas: filas }, null, 2));
  else {
    console.log('modulo\thojas\tblancos\ttextos\tpuntaje');
    for (const m of porModulo(filas)) console.log([m.modulo, m.hojas, m.blancos, m.textos, m.puntaje].join('\t'));
  }
}
