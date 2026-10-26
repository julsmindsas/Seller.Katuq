#!/usr/bin/env node
'use strict';

// D-546 (D6): genera `src/app/shared/icons/tabler-iconos.ts` con SOLO los íconos Tabler que usa la app.
//
//   node scripts/generar-iconos-tabler.js              # lee node_modules/@tabler/icons
//   TABLER_ICONS_DIR=/ruta/a/@tabler/icons node scripts/generar-iconos-tabler.js
//   node scripts/generar-iconos-tabler.js --check      # falla si el archivo generado no coincide (sin escribir)
//   TABLER_USADOS y TABLER_SALIDA cambian la lista y el archivo de salida (las pruebas los usan).
//
// La lista está en `src/app/shared/icons/tabler-usados.json`. El build NO depende del paquete:
// el archivo generado se commitea (versión y licencia MIT en su cabecera).
// Falla con error si un nombre no existe o si un SVG trae algo distinto de <path>.

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const LISTA = process.env.TABLER_USADOS || path.join(RAIZ, 'src/app/shared/icons/tabler-usados.json');
const SALIDA = process.env.TABLER_SALIDA || path.join(RAIZ, 'src/app/shared/icons/tabler-iconos.ts');
const PAQUETE = process.env.TABLER_ICONS_DIR || path.join(RAIZ, 'node_modules/@tabler/icons');
const soloComprobar = process.argv.includes('--check');

function fallar(mensaje) {
  console.error(`generar-iconos-tabler: ${mensaje}`);
  process.exit(1);
}

/** Trazos (`d`) de un SVG de contorno de Tabler. Acepta únicamente <svg> y <path>. */
function trazosDe(nombre, svg) {
  const etiquetas = [...svg.matchAll(/<\s*([a-zA-Z][a-zA-Z0-9]*)/g)].map(m => m[1].toLowerCase());
  const raras = [...new Set(etiquetas.filter(e => e !== 'svg' && e !== 'path'))];
  if (raras.length) fallar(`el ícono «${nombre}» trae etiquetas distintas de <path>: ${raras.join(', ')}`);
  const trazos = [];
  for (const m of svg.matchAll(/<path\b([^>]*)\/?>/g)) {
    const atributos = m[1];
    // El primer <path stroke="none" d="M0 0h24v24H0z"/> es solo el recuadro del ícono: no dibuja nada.
    if (/stroke\s*=\s*"none"/.test(atributos)) continue;
    const d = atributos.match(/\bd\s*=\s*"([^"]+)"/);
    if (!d) fallar(`un <path> de «${nombre}» no trae atributo d`);
    trazos.push(d[1].replace(/\s+/g, ' ').trim());
  }
  if (!trazos.length) fallar(`el ícono «${nombre}» no tiene trazos`);
  return trazos;
}

const nombres = JSON.parse(fs.readFileSync(LISTA, 'utf8'));
if (!Array.isArray(nombres) || nombres.some(n => typeof n !== 'string' || !/^[a-z0-9-]+$/.test(n))) {
  fallar('tabler-usados.json debe ser una lista de nombres en minúscula con guiones');
}
const unicos = [...new Set(nombres)].sort();
if (unicos.length !== nombres.length) fallar('tabler-usados.json tiene nombres repetidos');

const paquete = path.join(PAQUETE, 'package.json');
if (!fs.existsSync(paquete)) fallar(`no encuentro @tabler/icons en ${PAQUETE} (usa TABLER_ICONS_DIR o instala la devDependency)`);
const { version, license } = JSON.parse(fs.readFileSync(paquete, 'utf8'));
if (license !== 'MIT') fallar(`la licencia de @tabler/icons es «${license}», se esperaba MIT`);

const iconos = {};
for (const nombre of unicos) {
  const archivo = path.join(PAQUETE, 'icons/outline', `${nombre}.svg`);
  if (!fs.existsSync(archivo)) fallar(`el ícono «${nombre}» no existe en @tabler/icons ${version}`);
  iconos[nombre] = trazosDe(nombre, fs.readFileSync(archivo, 'utf8'));
}

const cuerpo = unicos.map(n => `  '${n}': [\n${iconos[n].map(d => `    '${d}',`).join('\n')}\n  ],`).join('\n');
const contenido = `// GENERADO por scripts/generar-iconos-tabler.js. No editar a mano.
// Íconos de @tabler/icons ${version} (licencia MIT, https://github.com/tabler/tabler-icons), solo los de
// src/app/shared/icons/tabler-usados.json. Cada ícono es una lista de trazos SVG de contorno en una
// caja de 24 × 24, para pintarse con stroke="currentColor". Para agregar uno: sumarlo a tabler-usados.json
// y volver a correr el script.

export const TABLER_VERSION = '${version}';

export const TABLER_ICONOS: Record<string, string[]> = {
${cuerpo}
};
`;

if (soloComprobar) {
  const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
  if (actual !== contenido) fallar('tabler-iconos.ts no coincide con tabler-usados.json (vuelve a generarlo)');
  console.log(`tabler-iconos.ts al día (${unicos.length} íconos, @tabler/icons ${version})`);
} else {
  fs.writeFileSync(SALIDA, contenido);
  console.log(`tabler-iconos.ts escrito: ${unicos.length} íconos, @tabler/icons ${version}`);
}
