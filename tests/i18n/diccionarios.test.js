'use strict';

// D-532 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B00d, tareas 1.10 y 1.12):
// contenido de los diccionarios reales de src/assets/i18n.
// - 1.10: en.json y pt.json tienen todas las claves de es.json y ningún valor igual al español
//   fuera de la lista permitida (scripts/i18n-check.config.json); glosario y tratamiento de D7.
// - 1.12: claves comun.* en es, en y pt, con el valor de la clave literal antigua equivalente.
// Node puro: no compila Angular ni llama a la red.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const RAIZ = path.resolve(__dirname, '../..');
const DIR = path.join(RAIZ, 'src/assets/i18n');
const IDIOMAS = ['es', 'en', 'pt'];

const texto = idioma => fs.readFileSync(path.join(DIR, `${idioma}.json`), 'utf8');
const dic = idioma => JSON.parse(texto(idioma));

/** Claves aplanadas con puntos (el objeto `primeng` es la única clave anidada, D3). */
function aplanar(obj, prefijo = '', fuera = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const clave = prefijo ? `${prefijo}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) aplanar(v, clave, fuera);
    else fuera.set(clave, v);
  }
  return fuera;
}

let informe;
function revisarRepo() {
  if (!informe) informe = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar();
  return informe;
}

const COMUN = {
  // clave comun.* -> clave literal antigua de la que sale el valor (null: no existía).
  'comun.guardar': 'Guardar',
  'comun.cancelar': 'Cancelar',
  'comun.aceptar': 'Aceptar',
  'comun.cerrar': 'Cerrar',
  'comun.buscar': 'Buscar',
  'comun.eliminar': 'Eliminar',
  'comun.editar': 'Editar',
  'comun.si': 'Si',
  'comun.no': 'No',
  'comun.cargando': 'Cargando...',
  'comun.sinResultados': null,
};

// ---------------------------------------------------------------- formato

test('formato: UTF-8 sin BOM, JSON válido, sin CRLF y el final de archivo de hoy', () => {
  // «Como hoy» (D7): en.json y pt.json terminan con salto de línea; es.json no, y este bloque no
  // lo cambia para no mover la última línea del diccionario de referencia.
  const finalConSalto = { es: false, en: true, pt: true };
  for (const idioma of IDIOMAS) {
    const bytes = fs.readFileSync(path.join(DIR, `${idioma}.json`));
    assert.notDeepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], `${idioma}.json sin BOM`);
    assert.doesNotThrow(() => JSON.parse(bytes.toString('utf8')), `${idioma}.json es JSON válido`);
    assert.ok(!bytes.toString('utf8').includes('\r'), `${idioma}.json sin CRLF`);
    assert.equal(bytes.toString('utf8').endsWith('\n'), finalConSalto[idioma], `${idioma}.json: final de archivo`);
  }
});

test('formato: las claves comun.* van agrupadas, seguidas y justo antes de primeng', () => {
  for (const idioma of IDIOMAS) {
    const claves = Object.keys(dic(idioma));
    const desde = claves.indexOf('comun.guardar');
    assert.ok(desde >= 0, `${idioma}: comun.guardar existe`);
    assert.deepEqual(claves.slice(desde, desde + 11), Object.keys(COMUN), `${idioma}: grupo comun.* en orden`);
    assert.equal(claves[desde + 11], 'primeng', `${idioma}: primeng después de comun.*`);
  }
});

test('formato: las líneas nuevas usan la sangría de sus vecinas', () => {
  for (const idioma of IDIOMAS) {
    const lineas = texto(idioma).split('\n');
    const i = lineas.findIndex(l => l.includes('"comun.guardar"'));
    const sangria = l => l.match(/^ */)[0].length;
    const vecina = lineas[i - 1];
    for (let j = i; j < i + 11; j++) assert.equal(sangria(lineas[j]), sangria(vecina), `${idioma}: línea ${j + 1}`);
  }
});

// ---------------------------------------------------------------- 1.10

test('1.10: en.json y pt.json tienen todas las claves de es.json (incluido primeng)', () => {
  const es = aplanar(dic('es'));
  for (const idioma of ['en', 'pt']) {
    const otro = aplanar(dic(idioma));
    const faltan = [...es.keys()].filter(k => !otro.has(k));
    assert.deepEqual(faltan, [], `faltan en ${idioma}`);
  }
});

test('1.10: i18n:check sin claveFaltante ni igualAlEspanol en en y pt', () => {
  const r = revisarRepo();
  const de = (lista, tipo) => lista.filter(h => h.tipo === tipo && ['en', 'pt'].includes(h.idioma));
  assert.deepEqual(de(r.errores, 'claveFaltante').map(h => `${h.idioma}:${h.clave}`), []);
  assert.deepEqual(de(r.avisos, 'igualAlEspanol').map(h => `${h.idioma}:${h.clave}`), []);
  assert.deepEqual(r.errores.filter(h => ['variablesDistintas', 'claveDuplicada', 'jsonInvalido'].includes(h.tipo)), []);
});

test('1.10: las claves que faltaban quedan traducidas (en-US neutro, pt-BR con você)', () => {
  const en = dic('en');
  const pt = dic('pt');
  assert.equal(en['Próximamente'], 'Coming soon');
  assert.equal(pt['Próximamente'], 'Em breve');
  assert.equal(en['Cargando...'], 'Loading...');
  assert.equal(pt['Cargando...'], 'Carregando...');
  assert.equal(en['Perfil'], 'Profile');
  // IDI-B01b: la pantalla de notificaciones pasó a la clave semántica y la literal se borró (receta,
  // paso 5); la traducción que se fijó en 1.10 sigue igual bajo la clave nueva.
  assert.equal(pt['notificaciones.privacyLink'], 'Política de privacidade');
  assert.equal(pt['Política de privacidad'], undefined);
  assert.equal(pt['Ingresa tu correo y tu contraseña'], 'Digite seu e-mail e sua senha');
  assert.equal(pt['Orden de Venta'], 'Ordem de venda');
  // notificaciones.privacy_note_1 termina en espacio y privacy_note_2 empieza con espacio: la
  // plantilla pone el enlace a la política entre las dos.
  for (const d of [en, pt]) {
    assert.match(d['notificaciones.privacy_note_1'], / $/);
    assert.match(d['notificaciones.privacy_note_2'], /^ /);
  }
  assert.match(pt['notificaciones.privacy_note_1'], /(?<!\p{L})você(?!\p{L})/u);
  assert.match(pt['notificaciones.privacy_note_2'], /(?<!\p{L})Você(?!\p{L})/u);
  // Nombres de canal sin traducir (D4).
  for (const d of [en, pt]) {
    assert.match(d['notificaciones.channels_hint'], /Email, SMS/);
    assert.match(d['notificaciones.channels_hint'], /WhatsApp/);
  }
});

test('1.10: pt aplica el glosario de D7 en los valores corregidos (Despacho -> Envio)', () => {
  const pt = dic('pt');
  assert.equal(pt['Despachos'], 'Envios');
  assert.equal(pt['Depachos'], 'Envios');
  assert.equal(pt['Despacho'], 'Envio');
  assert.equal(pt['Iva 19%:'], 'IVA 19%:', 'conserva los dos puntos del español');
  // «Sedes» ya era portugués correcto y sus hermanas usan «Sede» («Nome da Sede»): no cambia.
  assert.equal(pt['Sedes'], 'Sedes');
});

test('1.10: glosario de D7 en todo el diccionario, no solo en los valores iguales al español', () => {
  // Un mismo concepto con un solo término por idioma (corrección de IDI-B00d): el menú dice
  // «Envios»/«Shipments» y también sus pantallas. Se revisan todas las claves, sobrantes incluidas.
  const prohibidos = {
    en: [/dispatch/i, /\bclients?\b/i],
    pt: [/despach/i, /armaz[ée]m|armaz[ée]ns/i, /invent[áa]ri/i, /fatura[çc][ãa]o/i],
  };
  for (const [idioma, patrones] of Object.entries(prohibidos)) {
    for (const [clave, valor] of aplanar(dic(idioma))) {
      if (typeof valor !== 'string') continue;
      for (const re of patrones) assert.doesNotMatch(valor, re, `${idioma}: ${clave}`);
    }
  }
  const en = dic('en');
  const pt = dic('pt');
  assert.equal(en['Despachos'], 'Shipments');
  assert.equal(en['Clientes'], 'Customers');
  assert.equal(en['Cliente'], 'Customer');
  assert.equal(pt['Orden de despacho'], 'Ordem de envio');
  assert.equal(pt['Bodegas Principales'], 'Depósitos principais');
  assert.equal(pt['Inventario global'], 'Estoque global');
});

test('1.10: tratamiento — en y pt sin signos ni letras propias del español; pt sin «tu»/«usted»', () => {
  for (const idioma of ['en', 'pt']) {
    for (const [clave, valor] of aplanar(dic(idioma))) {
      if (typeof valor !== 'string') continue;
      assert.doesNotMatch(valor, /[¿¡ñÑ]/, `${idioma}: ${clave}`);
    }
  }
  for (const [clave, valor] of aplanar(dic('pt'))) {
    if (typeof valor !== 'string') continue;
    assert.doesNotMatch(valor, /\b(tu|tus|usted|ustedes)\b/i, `pt: ${clave}`);
  }
});

test('1.10: la lista permitida solo trae frases que existen como valor igual al español', () => {
  // Evita que la lista crezca con frases que ya no hacen falta (y que silenciarían textos futuros).
  // Misma regla que scripts/i18n-check.js: las siglas de `todos` se quitan por palabra y la frase
  // del idioma tiene que ser el resto completo del valor, no una subcadena.
  const config = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/i18n-check.config.json'), 'utf8'));
  const escapar = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const siglas = [...config.nombresPropios, ...config.igualesPermitidos.todos].sort((a, b) => b.length - a.length);
  const reSiglas = new RegExp(`(?<![\\p{L}\\p{N}])(?:${siglas.map(escapar).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const letras = t => String(t).replace(/[^\p{L}]+/gu, ' ').trim().toLowerCase();
  const resto = t => letras(String(t).replace(reSiglas, ' '));
  const es = aplanar(dic('es'));
  const usadasTodos = new Set();
  for (const idioma of ['en', 'pt']) {
    const otro = aplanar(dic(idioma));
    const iguales = [...es.keys()]
      .filter(k => otro.has(k) && typeof otro.get(k) === 'string'
        && otro.get(k).trim().toLowerCase() === String(es.get(k)).trim().toLowerCase())
      .map(k => otro.get(k));
    const restos = new Set(iguales.map(resto));
    for (const frase of config.igualesPermitidos[idioma]) {
      assert.ok(restos.has(resto(frase)), `${idioma}: «${frase}» no es el resto completo de ningún valor igual al español`);
    }
    for (const sigla of config.igualesPermitidos.todos) {
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapar(sigla)}(?![\\p{L}\\p{N}])`, 'iu');
      if (iguales.some(v => re.test(v))) usadasTodos.add(sigla);
    }
  }
  for (const sigla of config.igualesPermitidos.todos) {
    assert.ok(usadasTodos.has(sigla), `todos: «${sigla}» no aparece en ningún valor igual al español de en o pt`);
  }
  // «IVA» solo hace falta en pt: en de-CH el impuesto es «MWST» y el chequeo debe avisar (D7).
  assert.ok(!config.igualesPermitidos.todos.includes('IVA'));
  assert.ok(config.igualesPermitidos.pt.includes('IVA'));
});

// ---------------------------------------------------------------- 1.12

test('1.12: comun.* existe en es, en y pt con valores no vacíos', () => {
  for (const idioma of IDIOMAS) {
    const d = dic(idioma);
    for (const clave of Object.keys(COMUN)) {
      assert.equal(typeof d[clave], 'string', `${idioma}: ${clave}`);
      assert.ok(d[clave].trim(), `${idioma}: ${clave} no vacío`);
    }
  }
});

test('1.12: cada comun.* toma el valor de su clave literal antigua en cada idioma', () => {
  for (const idioma of IDIOMAS) {
    const d = dic(idioma);
    for (const [clave, antigua] of Object.entries(COMUN)) {
      // La clave antigua se borra cuando su módulo se migra (D3); desde entonces no se compara.
      if (!antigua || !(antigua in d)) continue;
      assert.equal(d[clave], d[antigua], `${idioma}: ${clave} = «${antigua}»`);
    }
  }
});

test('1.12: valores esperados de comun.*', () => {
  const esperado = {
    es: ['Guardar', 'Cancelar', 'Aceptar', 'Cerrar', 'Buscar', 'Eliminar', 'Editar', 'Sí', 'No', 'Cargando…', 'Sin resultados'],
    en: ['Save', 'Cancel', 'Accept', 'Close', 'Search', 'Delete', 'Edit', 'Yes', 'No', 'Loading...', 'No results'],
    pt: ['Salvar', 'Cancelar', 'Aceitar', 'Fechar', 'Buscar', 'Excluir', 'Editar', 'Sim', 'Não', 'Carregando...', 'Nenhum resultado'],
  };
  for (const idioma of IDIOMAS) {
    const d = dic(idioma);
    assert.deepEqual(Object.keys(COMUN).map(k => d[k]), esperado[idioma], idioma);
  }
});

test('1.12: la copia en de llega en IDI-B00f (1.14): mientras de.json no exista no se exige', () => {
  const existeDe = fs.existsSync(path.join(DIR, 'de.json'));
  if (!existeDe) return;
  const de = dic('de');
  for (const clave of Object.keys(COMUN)) assert.equal(typeof de[clave], 'string', `de: ${clave}`);
});
