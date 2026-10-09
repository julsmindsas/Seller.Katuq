'use strict';
/**
 * Editar la página con IA desde el editor (bandera `landingPrompt`) — front.
 *
 *   node --test tests/sitios/editar-con-ia.test.js
 *
 * Qué protege: la pestaña solo aparece con la bandera, una instrucción corta no viaja, el historial
 * no lleva errores ni más de 6 mensajes, los mensajes de error son para el comercio, y el componente
 * habla por el servicio (BaseService) a la ruta de la función, sin HttpClient.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const EDITOR = path.join(RAIZ, 'src/app/components/sitios/editor');
const L = require(path.join(EDITOR, 'editar-con-ia.logic.ts'));
const leer = (f) => fs.readFileSync(f, 'utf8');

test('validarInstruccion: lo corto no viaja; lo largo se recorta', () => {
  for (const corto of [undefined, null, '', '  ', 'ok']) assert.equal(L.validarInstruccion(corto).ok, false);
  assert.deepEqual(L.validarInstruccion('  pon   un título  '), { ok: true, instruccion: 'pon un título', mensaje: '' });
  assert.equal(L.validarInstruccion('x'.repeat(2000)).instruccion.length, L.INSTRUCCION_MAX);
});

test('historialParaServidor: sin errores, máximo 6, textos recortados', () => {
  const mensajes = [];
  for (let i = 0; i < 10; i++) mensajes.push({ rol: i % 2 ? 'ia' : 'comercio', texto: `m${i} ` + 'z'.repeat(400) });
  mensajes.push({ rol: 'ia', texto: 'falló', error: true });
  const h = L.historialParaServidor(mensajes);
  assert.equal(h.length, 6);
  assert.ok(h.every((m) => m.texto.length <= 300));
  assert.ok(!h.some((m) => m.texto === 'falló'));
  assert.deepEqual(L.historialParaServidor(null), []);
});

test('mensajeDeErrorEditarIA: el del servidor; si no, uno sin jerga', () => {
  assert.equal(L.mensajeDeErrorEditarIA({ error: { message: 'La IA no respondió esta vez.' } }), 'La IA no respondió esta vez.');
  assert.match(L.mensajeDeErrorEditarIA({ status: 0 }), /internet/);
  assert.match(L.mensajeDeErrorEditarIA({}), /No pude aplicar el cambio/);
});

test('las sugerencias no traen precios, teléfonos ni enlaces', () => {
  for (const s of L.SUGERENCIAS_EDITAR_IA) assert.ok(!/\d{5,}|\$|https?:|@/.test(s), s);
});

test('la pestaña "Con IA" solo se dibuja con la bandera, y el panel también', () => {
  const html = leer(path.join(EDITOR, 'sitio-editor.component.html'));
  assert.match(html, /<button \*ngIf="puedeEditarConIA" class="pestana-ia"/);
  assert.match(html, /\*ngIf="panel === 'ia' && puedeEditarConIA"/);
  const ts = leer(path.join(EDITOR, 'sitio-editor.component.ts'));
  assert.match(ts, /isEnabled\("landingPrompt"\)/);
  assert.match(ts, /if \(!this\.contenido \|\| this\.editandoIA \|\| !this\.puedeEditarConIA\) return;/);
  assert.ok(!/HttpClient/.test(ts));
});

test('el servicio usa BaseService y la ruta de la función', () => {
  const s = leer(path.join(RAIZ, 'src/app/components/sitios/sitios.service.ts'));
  assert.match(s, /editarConIA\([\s\S]*?this\.post<any>\("\/v1\/onboarding\/pagina-con-ia\/editar", body\)/);
});

test('los estilos del chat no usan degradados ni colores fuera de la tabla', () => {
  const scss = leer(path.join(EDITOR, 'sitio-editor.component.scss'));
  const desde = scss.indexOf('"Con IA": chat');
  assert.ok(desde > 0);
  const bloque = scss.slice(desde, desde + 2500);
  assert.ok(!/gradient\(/.test(bloque));
  assert.ok(!/#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea/i.test(bloque));
});
