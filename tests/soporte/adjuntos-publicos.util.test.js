'use strict';
/**
 * D-549 (plan B): la parte pura de la página pública de subida de archivos de un ticket
 * (src/app/shared/services/soporte/adjuntos-publicos.util.ts) y los cableados de la página.
 *
 * Qué protege:
 *  1. Que la validación local avise lo mismo que dice el servidor (tipos, topes de 15 y 50 MB, cupo de 10),
 *     con textos de negocio. El servidor vuelve a validar todo.
 *  2. Que ningún motivo de error use jerga y que ningún camino pida iniciar sesión.
 *  3. Que la página esté cableada: ruta pública, sin loader global, subida por XMLHttpRequest (no por el
 *     interceptor, que agregaría encabezados que el almacenamiento rechaza) y de a un archivo.
 *
 *   node --test tests/soporte/adjuntos-publicos.util.test.js
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.join(__dirname, '../..');
const u = require('../../src/app/shared/services/soporte/adjuntos-publicos.util.ts');
const leer = (rel) => fs.readFileSync(path.join(RAIZ, rel), 'utf8');

const MB = 1024 * 1024;
const TIPOS = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/ogg', 'audio/opus', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'video/mp4', 'video/quicktime', 'video/webm',
];
const REGLAS = { tipos: TIPOS, topes: { general: 15 * MB, audioVideo: 50 * MB }, maximo: 10 };

test('formatea el tamaño como la tarjeta de Claude: B, KB y MB con coma', () => {
  assert.equal(u.formatearTamano(0), '0 B');
  assert.equal(u.formatearTamano(900), '900 B');
  assert.equal(u.formatearTamano(120 * 1024), '120 KB');
  assert.equal(u.formatearTamano(3 * MB), '3 MB');
  assert.equal(u.formatearTamano(3.5 * MB), '3,5 MB');
  assert.equal(u.formatearTamano(undefined), '0 B');
});

test('el tope depende del tipo: audio y video tienen el suyo', () => {
  assert.equal(u.topeEnBytes('image/png', REGLAS.topes), 15 * MB);
  assert.equal(u.topeEnBytes('application/pdf', REGLAS.topes), 15 * MB);
  assert.equal(u.topeEnBytes('video/mp4', REGLAS.topes), 50 * MB);
  assert.equal(u.topeEnBytes('audio/ogg', REGLAS.topes), 50 * MB);
});

test('el tipo sale del navegador si el servidor lo permite, y si no, de la extensión', () => {
  assert.equal(u.tipoDeArchivo('a.png', 'image/png', TIPOS), 'image/png');
  assert.equal(u.tipoDeArchivo('a.PNG', '', TIPOS), 'image/png', 'el navegador a veces no trae tipo');
  assert.equal(u.tipoDeArchivo('nota.opus', '', TIPOS), 'audio/ogg', 'audios de WhatsApp');
  assert.equal(u.tipoDeArchivo('foto.heic', 'image/heic', TIPOS), null);
  assert.equal(u.tipoDeArchivo('programa.exe', 'application/x-msdownload', TIPOS), null);
  assert.equal(u.tipoDeArchivo('a.png', 'application/octet-stream', TIPOS), 'image/png');
  assert.equal(u.tipoDeArchivo('sin_extension', '', TIPOS), null);
});

test('valida lo mismo que el servidor: tipo, vacío, tope y cupo, con mensajes de negocio', () => {
  const v = (archivo, yaEnLista = 0) => u.validarArchivoLocal(archivo, REGLAS, yaEnLista);
  assert.deepEqual(v({ name: 'a.pdf', size: 300 * 1024, type: 'application/pdf' }), { ok: true, tipo: 'application/pdf' });
  assert.deepEqual(v({ name: 'demo.mp4', size: 40 * MB, type: 'video/mp4' }), { ok: true, tipo: 'video/mp4' });
  assert.deepEqual(v({ name: 'a.exe', size: 10, type: 'application/x-msdownload' }), { ok: false, motivo: 'Este tipo de archivo no se puede adjuntar.' });
  assert.deepEqual(v({ name: 'a.png', size: 0, type: 'image/png' }), { ok: false, motivo: 'El archivo está vacío.' });
  assert.deepEqual(v({ name: 'a.png', size: 22 * MB, type: 'image/png' }), { ok: false, motivo: 'Pesa 22 MB; el máximo es 15 MB.' });
  assert.deepEqual(v({ name: 'demo.mp4', size: 60 * MB, type: 'video/mp4' }), { ok: false, motivo: 'Pesa 60 MB; el máximo es 50 MB.' });
  assert.deepEqual(v({ name: 'a.png', size: 15 * MB, type: 'image/png' }), { ok: true, tipo: 'image/png' }, '15 MB justos caben');
  assert.deepEqual(v({ name: 'a.png', size: 15 * MB + 1, type: 'image/png' }).ok, false);
  assert.deepEqual(v({ name: 'a.png', size: 10, type: 'image/png' }, 10), { ok: false, motivo: 'Se pueden adjuntar hasta 10 archivos. Quita uno para agregar otro.' });
  assert.equal(v({ name: 'a.png', size: 10, type: 'image/png' }, 9).ok, true);
});

test('el número de orden se lee de la ruta que devuelve el servidor', () => {
  assert.equal(u.numeroDeRuta('tickets/subidas/pendientes/abc/def/3_foto.png'), 3);
  assert.equal(u.numeroDeRuta('12_a.pdf'), 12);
  assert.equal(u.numeroDeRuta('tickets/subidas/pendientes/abc/def/foto.png'), null);
  assert.equal(u.numeroDeRuta(''), null);
  assert.equal(u.numeroDeRuta(undefined), null);
});

test('cada motivo por el que no se abre la página tiene título, texto e ícono, sin jerga', () => {
  for (const codigo of ['INVALIDO', 'VENCIDO', 'USADO', 'NO_DISPONIBLE']) {
    const e = u.errorDePagina(codigo);
    assert.ok(e.titulo && e.texto && /^pi-/.test(e.icono), codigo);
    assert.ok(!/token|403|401|500|error|endpoint|sesi[oó]n expirada/i.test(`${e.titulo} ${e.texto}`), `${codigo}: ${e.titulo} ${e.texto}`);
  }
  assert.match(u.errorDePagina('USADO').titulo, /ya se us/i);
  assert.match(u.errorDePagina('VENCIDO').texto, /30 minutos/);
  assert.equal(u.errorDePagina('LO_QUE_SEA'), u.ERRORES_DE_PAGINA.GENERAL);
  assert.equal(u.errorDePagina(null), u.ERRORES_DE_PAGINA.GENERAL);
});

test('el motivo de un archivo: el del servidor si es una falla de la persona; si no, uno genérico sin jerga', () => {
  assert.equal(u.mensajeDeArchivo(400, 'ARCHIVO_MUY_GRANDE', 'Pesa 22 MB; el máximo es 15 MB.'), 'Pesa 22 MB; el máximo es 15 MB.');
  assert.match(u.mensajeDeArchivo(429, 'DEMASIADAS_SOLICITUDES', 'x'), /demasiadas solicitudes/i);
  assert.match(u.mensajeDeArchivo(0, undefined, undefined), /conexión/i, 'sin respuesta: conexión o permisos del navegador');
  assert.match(u.mensajeDeArchivo(500, 'ERROR', 'TypeError: algo interno'), /No pudimos subir este archivo/);
  assert.ok(!/TypeError/.test(u.mensajeDeArchivo(500, 'ERROR', 'TypeError: algo interno')), 'nunca se enseña el error interno');
  assert.equal(u.mensajeDeArchivo(410, 'USADO', 'x'), u.errorDePagina('USADO').titulo);
  // La subida directa al almacenamiento rechazada (403 del almacenamiento) NO es una sesión caída
  assert.match(u.mensajeDeArchivo(403, undefined, undefined), /No pudimos subir este archivo/);
});

test('se puede terminar con al menos un archivo subido y nada en marcha', () => {
  assert.equal(u.puedeTerminar([]), false);
  assert.equal(u.puedeTerminar([{ estado: 'error' }]), false);
  assert.equal(u.puedeTerminar([{ estado: 'subido' }]), true);
  assert.equal(u.puedeTerminar([{ estado: 'subido' }, { estado: 'error' }]), true, 'un rechazado no impide terminar');
  assert.equal(u.puedeTerminar([{ estado: 'subido' }, { estado: 'subiendo' }]), false);
  assert.equal(u.puedeTerminar([{ estado: 'subido' }, { estado: 'esperando' }]), false);
});

test('los archivos que ya estaban subidos al abrir la página se muestran como subidos', () => {
  assert.deepEqual(u.itemsDeSesion([{ n: 2, nombre: 'a.pdf', bytes: 10 }]), [{ nombre: 'a.pdf', bytes: 10, n: 2 }]);
  assert.deepEqual(u.itemsDeSesion([]), []);
});

// ── Cableado de la página ─────────────────────────────────────────────────

test('la ruta /adjuntar/:token es pública (fuera del guard) y está en las listas de rutas públicas', () => {
  const rutas = leer('src/app/app-routing.module.ts');
  const inicio = rutas.indexOf("path: 'adjuntar'");
  const bloque = rutas.slice(inicio, rutas.indexOf("path: ''", inicio));
  assert.match(bloque, /component: BlankComponent/);
  assert.match(bloque, /path: ':token'/);
  assert.match(bloque, /loadComponent: \(\) => import\('\.\/components\/adjuntar-publico\/adjuntar-publico\.component'\)/);
  assert.ok(!/canActivate/.test(bloque), 'sin AuthGuard: la abre quien tiene el enlace');
  assert.match(leer('src/app/shared/data/rutas-publicas.ts'), /'\/adjuntar'/);
  assert.match(leer('src/app/app.component.ts'), /'\/adjuntar'/);
});

test('el servicio extiende BaseService, no muestra la pantalla de carga global y sube por XMLHttpRequest', () => {
  const s = leer('src/app/shared/services/soporte/adjuntos-publicos.service.ts');
  assert.match(s, /extends BaseService/);
  assert.match(s, /getSinLoader\(/);
  assert.equal((s.match(/postSinLoader\(/g) || []).length, 2, 'permiso y listo');
  assert.match(s, /SKIP_LOADER/, 'el borrado tampoco muestra el loader');
  assert.match(s, /new XMLHttpRequest\(\)/);
  assert.match(s, /xhr\.open\('PUT', permiso\.uploadUrl\)/);
  assert.match(s, /setRequestHeader\(nombre, valor\)/, 'manda exactamente las cabeceras firmadas');
  assert.ok(!/this\.http\.put\(/.test(s), 'el PUT al almacenamiento NO va por HttpClient: el interceptor agrega encabezados que no están firmados');
  assert.match(s, /xhr\.abort\(\)/, 'darse de baja cancela la subida');
  // Rutas del contrato
  for (const ruta of ["'/permiso'", "'/listo'", '/v1/soporte/adjuntos/']) assert.ok(s.includes(ruta), ruta);
});

test('el componente es standalone, OnPush, usa el marco público y sube de a un archivo', () => {
  const c = leer('src/app/components/adjuntar-publico/adjuntar-publico.component.ts');
  assert.match(c, /standalone: true/);
  assert.match(c, /changeDetection: ChangeDetectionStrategy\.OnPush/);
  assert.match(c, /PublicaModule/);
  assert.ok(!/HttpClient/.test(c), 'nunca HttpClient directo en un componente');
  assert.ok(!/confirm\(|alert\(|prompt\(/.test(c), 'sin diálogos del navegador');
  assert.match(c, /De a uno a propósito/, 'documenta por qué no es en paralelo');
  assert.match(c, /if \(this\.subiendoAhora\) return;/);
  const h = leer('src/app/components/adjuntar-publico/adjuntar-publico.component.html');
  assert.match(h, /<app-publica-marco/);
  assert.match(h, /type="file" multiple/);
  assert.match(h, /\(drop\)="alSoltar\(\$event\)"/);
});

test('diseño (D-398/D-399): sin gradientes, sin primarios prohibidos, sin clases con «p-»', () => {
  const scss = leer('src/app/components/adjuntar-publico/adjuntar-publico.component.scss');
  const html = leer('src/app/components/adjuntar-publico/adjuntar-publico.component.html');
  assert.equal((scss.match(/(linear|radial)-gradient\(/gi) || []).length, 0);
  assert.equal((scss.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(\s*102\s*,\s*126\s*,\s*234/gi) || []).length, 0);
  assert.ok(!/border-left/.test(scss));
  assert.match(scss, /@include publica-piezas/);
  const clases = [...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).concat([...scss.matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]));
  for (const clase of new Set(clases)) {
    assert.ok(!/p-/.test(clase), `la clase «${clase}» contiene «p-» y el reset global le fuerza el tamaño de letra`);
  }
});
