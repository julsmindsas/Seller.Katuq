'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B12e, tareas 13.2 a 13.7): En vivo.
// Las plantillas y el interruptor de Opttia pasan al traductor. Las cifras, los nombres de comercios y
// los textos que genera Opttia se muestran como llegan; los servicios y las escenas no cambian.
// Node puro.

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
const CARPETA = 'components/en-vivo';
const PREFIJO = /^enVivo\./;
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
const ARCHIVOS = archivos(path.join(APP, CARPETA));

test('13.6: cero textos sueltos y sin claves inexistentes en components/en-vivo', () => {
  const r = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: [CARPETA] });
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  assert.deepEqual(r.errores.filter(e => (e.archivo || '').includes(CARPETA)).map(e => `${e.tipo} ${e.archivo}:${e.linea}`), []);
});

test('13.6: la carpeta está en modulosCerrados y en el bloque IDI-B12 Resto', () => {
  assert.ok(config.modulosCerrados.includes(CARPETA));
  assert.ok(config.bloques['IDI-B12 Resto'].includes(CARPETA));
});

test('13.2/13.3: las claves que piden las pantallas existen en los cuatro idiomas con las mismas variables', () => {
  const usadas = new Set();
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/['"`]((?:[a-zA-Z]+)\.\w+\.[\w.]+)['"`]/g)) {
      if ((PREFIJO.test(m[1]) || /^comun\./.test(m[1])) && !m[1].endsWith('.')) usadas.add(m[1]);
    }
  }
  assert.ok([...usadas].filter(k => PREFIJO.test(k)).length > 170, 'claves propias usadas');
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].trim().length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
  // Y todas las claves enVivo.* de es existen en los otros tres idiomas.
  for (const clave of Object.keys(dics.es).filter(k => PREFIJO.test(k))) {
    for (const idioma of ['en', 'pt', 'de']) assert.ok(dics[idioma][clave], `${idioma}: ${clave}`);
  }
});

test('13.4: ortografía del español y reglas de de-CH en las claves nuevas', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => PREFIJO.test(k));
  assert.ok(nuevas.length > 170, `${nuevas.length} claves`);
  for (const [clave, valor] of nuevas) {
    assert.doesNotMatch(valor, /\.\.\./, `${clave}: usar «…»`);
    assert.doesNotMatch(valor, /\b(querés|podés|tenés|revisá|asigná|ajustá|elegí|volvé)\b/i, `${clave}: voseo`);
    assert.ok((valor.match(/!/g) || []).length <= (valor.match(/¡/g) || []).length, `${clave}: signo de apertura ¡`);
  }
  for (const idioma of ['en', 'pt', 'de']) {
    for (const [clave, valor] of Object.entries(dics[idioma]).filter(([k]) => PREFIJO.test(k))) {
      assert.doesNotMatch(valor, /\.\.\./, `${idioma}: ${clave}`);
    }
  }
  assert.doesNotMatch(Object.entries(dics.de).filter(([k]) => PREFIJO.test(k)).map(([, v]) => v).join(' '), /ß/, 'de-CH sin eszett');
});

test('13.5: glosario D7 en lo nuevo (pedido, despacho, comercio) en inglés, portugués y alemán', () => {
  const de = Object.entries(dics.de).filter(([k]) => PREFIJO.test(k)).map(([, v]) => v).join(' ');
  const en = Object.entries(dics.en).filter(([k]) => PREFIJO.test(k)).map(([, v]) => v).join(' ');
  const pt = Object.entries(dics.pt).filter(([k]) => PREFIJO.test(k)).map(([, v]) => v).join(' ');
  assert.doesNotMatch(en, /dispatch|\bclient\b/i);
  assert.doesNotMatch(pt, /despacho|armaz[eé]m|inventário/i);
  assert.doesNotMatch(de, /Kunde\b|Pedido/);
  assert.match(de, /Bestellung/);
});

test('13.2: el interruptor de Opttia traduce el aviso y sus botones, con TranslateService al final', () => {
  const ts = leer('src/app/components/en-vivo/opttia/en-vivo-opttia-interruptor.component.ts');
  assert.match(ts, /import \{ TranslateService \} from '@ngx-translate\/core'/);
  assert.match(ts, /private readonly translate: TranslateService\s*\)\s*\{\}/);
  for (const viejo of ['¿Prender a Opttia?', '¿Apagar a Opttia?', 'Sí, prender', 'Sí, apagar', 'Cancelar', 'No fue posible guardar el cambio.', 'Opttia prendido']) {
    assert.ok(!sinComentarios(ts).includes(`'${viejo}'`), `${viejo} ya no va literal`);
  }
  // El nombre del comercio sigue escapado antes de entrar al HTML del aviso.
  assert.match(ts, /alcanceComercio', \{ comercio: escapar\(this\.comercio\) \}/);
  // La llamada al servidor no cambia.
  assert.match(ts, /this\.api\.guardarInterruptorOpttia\(nuevo, this\.comercio\)/);
});

test('13.3: los servicios, modelos y escenas de En vivo no usan el traductor; los módulos con plantillas importan TranslateModule', () => {
  for (const archivo of ARCHIVOS.filter(a => /\.service\.ts$|\/servicios\/|\.escena\.ts$|\.mundo\.ts$|\/utilidades\//.test(a))) {
    assert.doesNotMatch(fs.readFileSync(archivo, 'utf8'), /TranslateService|translate\.instant/, path.relative(APP, archivo));
  }
  for (const modulo of ARCHIVOS.filter(a => /\.module\.ts$/.test(a) && /declarations/.test(fs.readFileSync(a, 'utf8')))) {
    assert.match(fs.readFileSync(modulo, 'utf8'), /TranslateModule/, path.relative(APP, modulo));
  }
});

test('13.2: las plantillas no pasan por el traductor valores que viajan o vienen del servidor', () => {
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    const t = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    assert.doesNotMatch(t, /\[(value|ngValue)\]="[^"]*\| translate/, path.relative(APP, archivo));
    // Cifras y textos generados por Opttia se muestran como llegan.
    assert.doesNotMatch(t, /\{\{\s*(sugerencia|texto|narracion|respuesta)\w*\s*\|\s*translate/, path.relative(APP, archivo));
  }
});
