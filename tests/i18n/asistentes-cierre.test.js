'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B12f, tareas 13.2 a 13.7):
// asistentes de shared (Opttia, KAI, voz, Live Audio, módulo IA, botón flotante, chat de servicio e
// images-manager). Los textos de pantalla pasan al traductor. No se traducen: las respuestas de Opttia y
// KAI, los prompts y preguntas que se envían al asistente, los comandos de voz ni las herramientas del
// ToolRegistryService. Node puro.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const RAIZ = path.resolve(__dirname, '../..');
const APP = path.join(RAIZ, 'src/app');
const IDIOMAS = ['es', 'en', 'pt', 'de'];
const leer = rel => fs.readFileSync(path.join(RAIZ, rel), 'utf8');
const dics = Object.fromEntries(IDIOMAS.map(i => [i, JSON.parse(leer(`src/assets/i18n/${i}.json`))]));
const config = JSON.parse(leer('scripts/i18n-check.config.json'));
const CERRADAS = ['gemini-asistant', 'gemini', 'voice-agent', 'opttia-chat', 'katuq-intelligence', 'modulo-ia', 'floating-button', 'chat-form', 'images-manager']
  .map(c => `shared/components/${c}`);
const variables = v => [...String(v).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(m => m[1]).sort();
const sinComentarios = t => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function archivos(dir) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...archivos(ruta));
    else if (/\.(html|ts)$/.test(e.name) && !e.name.endsWith('.spec.ts')) res.push(ruta);
  }
  return res;
}
const ARCHIVOS = CERRADAS.flatMap(c => archivos(path.join(APP, c)));

test('13.6: cero textos sueltos y sin errores en las nueve carpetas', () => {
  const r = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: CERRADAS });
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  assert.deepEqual(r.errores.map(e => `${e.tipo} ${e.archivo}:${e.linea}`), []);
});

test('13.6: las nueve carpetas están en modulosCerrados y en el bloque IDI-B12 Resto', () => {
  for (const c of CERRADAS) {
    assert.ok(config.modulosCerrados.includes(c), `${c} cerrado`);
    assert.ok(config.bloques['IDI-B12 Resto'].includes(c), `${c} en el bloque`);
  }
  assert.ok(config.prefijosDinamicos.includes('asistentes.voiceSalesDemo.paso.'));
});

test('13.2/13.3: las claves asistentes.* que piden las pantallas existen en los cuatro idiomas con las mismas variables', () => {
  const usadas = new Set();
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/['"`](asistentes\.\w+\.[\w.-]+)['"`]/g)) usadas.add(m[1]);
  }
  assert.ok(usadas.size > 250, `${usadas.size} claves`);
  for (const clave of usadas) {
    if (clave.endsWith('.')) continue;
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].trim().length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
  // Claves armadas en ejecución: nombre y descripción de cada paso de la demo, por id.
  const demo = leer('src/app/shared/components/voice-agent/voice-sales-demo/voice-sales-demo.component.ts');
  const ids = [...demo.matchAll(/id: '([\w-]+)'/g)].map(m => m[1]);
  assert.equal(ids.length, 8);
  for (const id of ids) {
    for (const idioma of IDIOMAS) {
      assert.ok(dics[idioma][`asistentes.voiceSalesDemo.paso.${id}.name`], `${idioma} ${id} name`);
      assert.ok(dics[idioma][`asistentes.voiceSalesDemo.paso.${id}.description`], `${idioma} ${id} description`);
    }
  }
  // Las cuatro claves dinámicas de modulo-ia (título, segmento, tipo de pedido, sin acceso).
  for (const idioma of IDIOMAS) {
    for (const m of ['clientes', 'cartera', 'pedidos', 'satisfaccion']) assert.ok(dics[idioma][`asistentes.moduloIa.titulo.${m}`]);
    for (const m of ['promotor', 'pasivo', 'detractor', 'mixto']) assert.ok(dics[idioma][`asistentes.moduloIa.segmento.${m}`]);
    for (const m of ['porProducir', 'pagadoSinEmpezar', 'sinPago']) assert.ok(dics[idioma][`asistentes.moduloIa.tipoPedido.${m}`]);
  }
});

test('13.4: ortografía del español y de-CH sin eszett en las claves nuevas', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => k.startsWith('asistentes.'));
  assert.ok(nuevas.length > 250, `${nuevas.length} claves`);
  for (const [clave, valor] of nuevas) {
    assert.doesNotMatch(valor, /\.\.\./, `${clave}: usar «…»`);
    assert.doesNotMatch(valor, /\b(querés|podés|tenés|revisá|asigná|volvé)\b/i, `${clave}: voseo`);
    assert.doesNotMatch(valor, /\b(configuracion|descripcion|informacion|sesion|aqui|facturacion|direccion)\b/i, `${clave}: sin tilde`);
  }
  for (const idioma of ['en', 'pt', 'de']) {
    for (const [clave, valor] of Object.entries(dics[idioma]).filter(([k]) => k.startsWith('asistentes.'))) {
      assert.doesNotMatch(valor, /\.\.\./, `${idioma}: ${clave}`);
    }
  }
  assert.doesNotMatch(Object.entries(dics.de).filter(([k]) => k.startsWith('asistentes.')).map(([, v]) => v).join(' '), /ß/);
});

test('13.3: lo que se envía al asistente no cambia (preguntas, comandos de voz, herramientas)', () => {
  const ia = leer('src/app/shared/components/modulo-ia/modulo-ia.component.ts');
  assert.match(ia, /clientes: \['¿Qué clientes dejaron de comprarme\?', '¿Quiénes son mis mejores clientes este trimestre\?'\]/);
  assert.match(ia, /cartera: \['¿A quién le cobro primero esta semana\?', '¿Cuánta cartera tengo vencida\?'\]/);
  assert.match(ia, /pedidos: \['¿Qué pedidos necesitan atención hoy\?'\]/);
  const chat = leer('src/app/shared/components/opttia-chat/opttia-chat.component.ts');
  assert.match(chat, /tool: 'get_sales_today', text: '¿Cómo van las ventas de hoy\?'/);
  const demo = leer('src/app/shared/components/voice-agent/voice-sales-demo/voice-sales-demo.component.ts');
  assert.match(demo, /command: 'Seleccionar bodega 1'/);
  assert.match(demo, /command: 'Procesar venta'/);
  // Servicios, herramientas y modelos no usan el traductor.
  const servicios = ['opttia-chat.service.ts', 'voice-agent.service.ts', 'modulos-ia.service.ts', 'avatar-canvas.service.ts']
    .map(f => path.join(RAIZ, 'src/app/shared/services', f))
    .concat(archivos(path.join(RAIZ, 'src/app/shared/services/tools')), archivos(path.join(RAIZ, 'src/app/shared/services/voice-agent')),
      archivos(path.join(RAIZ, 'src/app/shared/components/gemini-asistant/services')))
    .filter(f => fs.existsSync(f));
  assert.ok(servicios.length > 5, `${servicios.length} servicios`);
  for (const archivo of servicios) {
    assert.doesNotMatch(fs.readFileSync(archivo, 'utf8'), /TranslateService|translate\.instant/, path.relative(RAIZ, archivo));
  }
});

test('13.3: los componentes reciben TranslateService como último parámetro y los módulos importan TranslateModule', () => {
  for (const archivo of ARCHIVOS.filter(a => /\.component\.ts$/.test(a))) {
    const t = fs.readFileSync(archivo, 'utf8');
    if (!/this\.translate\.instant/.test(t)) continue;
    assert.match(t, /private translate: TranslateService,?\s*\)\s*\{/, `${path.relative(APP, archivo)} inyecta TranslateService al final`);
    assert.match(t, /import \{ (TranslateModule, )?TranslateService \} from '@ngx-translate\/core'/, path.relative(APP, archivo));
  }
  assert.match(leer('src/app/shared/components/modulo-ia/modulo-ia.component.ts'), /imports: \[CommonModule, TranslateModule\]/);
  assert.match(leer('src/app/shared/components/voice-agent/voice-agent.module.ts'), /TranslateModule/);
  assert.match(leer('src/app/shared/components/gemini-asistant/live-audio/live-audio.module.ts'), /TranslateModule/);
});

test('13.2: el valor que se guarda no pasa por el traductor y el nombre propio K.A.I. no cambia', () => {
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    const t = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    assert.doesNotMatch(t, /\[(value|ngValue)\]="[^"]*\| translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /\[\(ngModel\)\]="[^"]*\| translate/, path.relative(APP, archivo));
  }
  for (const idioma of IDIOMAS) assert.equal(dics[idioma]['asistentes.voiceAgent.kAI'], 'K.A.I.');
  // Los segmentos y tipos de pedido siguen identificándose por su código, no por el texto.
  const ia = leer('src/app/shared/components/modulo-ia/modulo-ia.component.ts');
  assert.match(ia, /por_producir: \{ texto: 'asistentes\.moduloIa\.tipoPedido\.porProducir', clase: 'is-danger' \}/);
  assert.match(ia, /promotor: \{ texto: 'asistentes\.moduloIa\.segmento\.promotor', clase: 'is-success' \}/);
});
