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
  assert.match(s, /editarConIA\([\s\S]*?this\.postSinLoader<any>\("\/v1\/onboarding\/pagina-con-ia\/editar", body\)/);
});

test('los estilos del chat no usan degradados ni colores fuera de la tabla', () => {
  const scss = leer(path.join(EDITOR, 'sitio-editor.component.scss'));
  const desde = scss.indexOf('"Con IA": diseñar la página conversando');
  assert.ok(desde > 0);
  const bloque = scss.slice(desde, scss.indexOf('@keyframes chat-ia-punto', desde));
  assert.ok(!/gradient\(/.test(bloque));
  assert.ok(!/#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea/i.test(bloque));
});

test('archivos: solo fotos JPG/PNG/WebP o PDF, hasta 20 MB, con mensajes para cualquiera', () => {
  assert.equal(L.clasificarArchivo({ type: 'image/png', name: 'a.png' }), 'imagen');
  assert.equal(L.clasificarArchivo({ type: '', name: 'captura.JPG' }), 'imagen');
  assert.equal(L.clasificarArchivo({ type: 'application/pdf', name: 'diseño.pdf' }), 'pdf');
  assert.equal(L.clasificarArchivo({ type: 'image/gif', name: 'a.gif' }), null);
  assert.equal(L.clasificarArchivo({ type: 'application/zip', name: 'a.zip' }), null);
  assert.equal(L.clasificarArchivo(null), null);
  assert.equal(L.problemaConArchivo({ type: 'image/jpeg', name: 'a.jpg', size: 1000 }), '');
  assert.match(L.problemaConArchivo({ type: 'video/mp4', name: 'a.mp4', size: 10 }), /foto o captura/);
  assert.match(L.problemaConArchivo({ type: 'image/png', name: 'a.png', size: 30 * 1024 * 1024 }), /20 MB/);
  assert.equal(L.MAX_REFERENCIAS, 3);
});

test('avance: dice qué está pasando, en palabras simples', () => {
  assert.equal(L.textoAvance(1, 1), 'Mirando tu imagen…');
  assert.equal(L.textoAvance(1, 2), 'Mirando tus 2 imágenes…');
  assert.match(L.textoAvance(5, 2), /colores, la letra y el estilo/);
  assert.match(L.textoAvance(1, 0), /Aplicando los cambios/);
  assert.match(L.textoAvance(20, 0), /Ya casi/);
});

test('la conversación se recuerda sin imágenes, con tope, y una lectura rota no rompe nada', () => {
  const mensajes = [];
  for (let i = 0; i < 40; i++) mensajes.push({ rol: i % 2 ? 'ia' : 'comercio', texto: `m${i}`, ...(i === 39 ? { cambios: [{ icono: '🎨', texto: 'Colores', colores: ['#111111'] }] } : {}), ...(i === 38 ? { adjuntos: 2 } : {}) });
  const guardado = L.serializarConversacion(mensajes);
  assert.ok(!/data:image/.test(guardado));
  const leido = L.leerConversacion(guardado);
  assert.equal(leido.length, L.MENSAJES_GUARDADOS);
  assert.equal(leido[leido.length - 1].cambios[0].texto, 'Colores');
  assert.equal(leido[leido.length - 2].adjuntos, 2);
  assert.deepEqual(L.leerConversacion('{roto'), []);
  assert.deepEqual(L.leerConversacion(null), []);
  assert.deepEqual(L.leerConversacion(JSON.stringify([{ rol: 'otro', texto: 'x' }, { rol: 'ia' }])), []);
  assert.equal(L.llaveConversacion('s1'), 'katuq:editor-ia:s1');
});

test('el panel pregunta para qué es la imagen y deja guardar o deshacer después de un cambio', () => {
  const html = leer(path.join(EDITOR, 'sitio-editor.component.html'));
  assert.match(html, /¿Para qué es esta imagen\?/);
  assert.match(html, /Que mi página se vea parecida/);
  assert.match(html, /Ponerla en mi página/);
  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp,application\/pdf"/);
  assert.match(html, /\(paste\)="alPegarEnChat/);
  assert.match(html, /\(drop\)="alSoltarEnChat/);
  assert.match(html, /Me gusta, guardar/);
  assert.match(html, /Esto cambié:/);
  assert.ok(!/hero|footer|faq/i.test(html.slice(html.indexOf('Diseña tu página conversando'), html.indexOf('<!-- ── Secciones ── -->'))), 'sin palabras técnicas en el panel');
  const ts = leer(path.join(EDITOR, 'sitio-editor.component.ts'));
  assert.match(ts, /localStorage\.setItem\(llaveConversacion/);
  assert.match(ts, /if \(this\.relojAvanceIA\) clearInterval\(this\.relojAvanceIA\);/);
  assert.match(ts, /this\.service\.subirImagenEnSegundoPlano\(adjunto\.archivo\)/);
});

test('pdf.js se carga solo al adjuntar un PDF y su worker viaja como asset', () => {
  const arch = leer(path.join(EDITOR, 'editar-con-ia.archivos.ts'));
  assert.match(arch, /await import\('pdfjs-dist\/legacy\/build\/pdf'\)/);
  assert.match(arch, /assets\/pdfjs\/pdf\.worker\.min\.js/);
  const angular = leer(path.join(RAIZ, 'angular.json'));
  assert.match(angular, /"glob": "pdf\.worker\.min\.js"/);
  assert.match(leer(path.join(RAIZ, 'package.json')), /"pdfjs-dist": "\^?2\.16\.105"/);
});
