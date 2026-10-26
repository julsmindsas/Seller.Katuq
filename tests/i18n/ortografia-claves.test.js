'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B00e, tarea 1.11): ortografía de
// las 11 claves literales de es.json que tenían faltas. Cada clave se renombra a su forma
// corregida a la vez en es, en y pt, y en cada plantilla o .ts que la usa por el traductor.
// Ninguna es título del menú, valor guardado o comparado, ni ruta (D3, excepción): se comprueba.
// Node puro: no compila Angular ni llama a la red.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const RAIZ = path.resolve(__dirname, '../..');
const DIR = path.join(RAIZ, 'src/assets/i18n');
const APP = path.join(RAIZ, 'src/app');
const IDIOMAS = ['es', 'en', 'pt'];
const chk = require(path.join(RAIZ, 'scripts/i18n-check.js'));

const dic = idioma => JSON.parse(fs.readFileSync(path.join(DIR, `${idioma}.json`), 'utf8'));

// clave vieja -> clave corregida (nombres de tasks.md 1.11). El valor en es es la propia clave.
const RENOMBRES = {
  'Generar Facturación Electronica': 'Generar Facturación Electrónica',
  'Dirección de facturacion seleccionada:': 'Dirección de facturación seleccionada:',
  'Usar Esta Direccion': 'Usar esta dirección',
  'Los datos de facturacion electronica son iguales a los del cliente':
    'Los datos de facturación electrónica son iguales a los del cliente',
  'Cantidad minima de venta:': 'Cantidad mínima de venta:',
  'Accion': 'Acción',
  'Ecommerce/Configuracion catalogo/adiciones': 'Ecommerce/Configuración catálogo/adiciones',
  'Conoce Tu Codigo Postal': 'Conoce tu código postal',
  'Número de Telefono Fijo': 'Número de teléfono fijo',
  'Horarios de disponibilidad Pagina Web': 'Horarios de disponibilidad página web',
  'Nombres/Razon Social': 'Nombres/Razón social',
};

// Traducción que tenía cada clave VIEJA antes del bloque (en.json y pt.json en 193848fd, IDI-B00d).
// Es la que el usuario veía en en/pt: la clave corregida debe conservarla (spec
// seller-translation-coverage, «Tilde corregida»; criterio de 1.11 «la misma traducción en en/pt»).
const ANTES = {
  'Generar Facturación Electronica': { en: 'Generate Electronic Billing', pt: 'Gerar Faturamento Eletrônico' },
  'Dirección de facturacion seleccionada:': { en: 'Selected Billing Address:', pt: 'Endereço de Faturamento Selecionado:' },
  'Usar Esta Direccion': { en: 'Use This Address', pt: 'Usar Este Endereço' },
  'Los datos de facturacion electronica son iguales a los del cliente': {
    en: "Electronic billing data are same as the customer's",
    pt: 'Os dados de faturamento eletrônico são iguais aos do cliente',
  },
  'Cantidad minima de venta:': { en: 'Minimum sale quantity:', pt: 'Quantidade mínima de venda:' },
  'Accion': { en: 'Action', pt: 'Ação' },
  'Ecommerce/Configuracion catalogo/adiciones': {
    en: 'Ecommerce/Catalog Configuration/Additions',
    pt: 'Ecommerce/Configuração do catálogo/Adições',
  },
  'Conoce Tu Codigo Postal': { en: 'Find Your Postal Code', pt: 'Conheça Seu Código Postal' },
  'Número de Telefono Fijo': { en: 'Landline Number', pt: 'Número de Telefone Fixo' },
  'Horarios de disponibilidad Pagina Web': { en: 'Website Availability Hours', pt: 'Horários de Disponibilidade do Site' },
  'Nombres/Razon Social': { en: 'Names/Company Name', pt: 'Nomes/Razão Social' },
};

// Única excepción, explícita: «Número de teléfono fijo» ya existía en pt con «Número de telefone fixo»
// y se conserva ese valor. Ninguna pantalla pide la clave vieja ni la corregida (lo comprueba la
// prueba de usos), así que ningún usuario ve el cambio de mayúsculas.
const EXCEPCIONES = { 'Número de teléfono fijo': { pt: 'Número de telefone fixo' } };

const VIEJAS = Object.keys(RENOMBRES);
const NUEVAS = Object.values(RENOMBRES);

function listarArchivos(dir, fuera = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) listarArchivos(ruta, fuera);
    else if (/\.(html|ts)$/.test(e.name) && !e.name.endsWith('.d.ts')) fuera.push(ruta);
  }
  return fuera;
}

/** Claves que el código pide al traductor (pipe, directiva, instant/get/stream), como i18n-check. */
let cacheUsos;
function usosDelCodigo() {
  if (cacheUsos) return cacheUsos;
  const usos = [];
  for (const archivo of listarArchivos(APP)) {
    const texto = fs.readFileSync(archivo, 'utf8');
    const rel = path.relative(RAIZ, archivo).split(path.sep).join('/');
    const linea = offset => texto.slice(0, offset).split('\n').length;
    let fuente;
    if (archivo.endsWith('.ts')) {
      const { tokens, sinComentarios } = chk.lexTs(texto);
      fuente = sinComentarios;
      chk.clavesDeTs(sinComentarios).usos.forEach(u => usos.push({ clave: u.clave, archivo: rel, linea: linea(u.offset) }));
      for (const p of chk.plantillasEnLinea(tokens)) {
        chk.escanearHtml(p.texto).clavesDirectiva
          .forEach(c => usos.push({ clave: c.clave, archivo: rel, linea: linea(p.base + c.offset) }));
      }
    } else {
      fuente = texto.replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, ' '));
      chk.escanearHtml(texto).clavesDirectiva.forEach(c => usos.push({ clave: c.clave, archivo: rel, linea: linea(c.offset) }));
    }
    chk.clavesDePipe(fuente).usos.forEach(u => usos.push({ clave: u.clave, archivo: rel, linea: linea(u.offset) }));
  }
  cacheUsos = usos;
  return usos;
}

// ---------------------------------------------------------------- diccionarios

test('1.11: las 11 claves viejas ya no existen en es, en ni pt', () => {
  for (const idioma of IDIOMAS) {
    const d = dic(idioma);
    assert.deepEqual(VIEJAS.filter(k => k in d), [], `quedan claves viejas en ${idioma}.json`);
  }
});

test('1.11: las 11 claves corregidas existen en es, en y pt; en es el valor es la propia clave', () => {
  const es = dic('es');
  for (const nueva of NUEVAS) assert.equal(es[nueva], nueva, `es: ${nueva}`);
  for (const idioma of ['en', 'pt']) {
    const d = dic(idioma);
    for (const nueva of NUEVAS) {
      assert.equal(typeof d[nueva], 'string', `${idioma}: falta ${nueva}`);
      assert.ok(d[nueva].trim(), `${idioma}: vacío ${nueva}`);
    }
  }
});

test('1.11: en y pt conservan la traducción de la clave vieja (corregir el español no la pierde ni la cambia)', () => {
  for (const idioma of ['en', 'pt']) {
    const d = dic(idioma);
    for (const [vieja, nueva] of Object.entries(RENOMBRES)) {
      const esperado = (EXCEPCIONES[nueva] || {})[idioma] ?? ANTES[vieja][idioma];
      assert.equal(d[nueva], esperado, `${idioma}: ${nueva}`);
    }
  }
});

test('1.11: la excepción de traducción es de una clave que ninguna pantalla pide', () => {
  const sinUso = new Set(Object.keys(EXCEPCIONES));
  const viejasDeEsas = VIEJAS.filter(v => sinUso.has(RENOMBRES[v]));
  const usos = usosDelCodigo().filter(u => sinUso.has(u.clave) || viejasDeEsas.includes(u.clave));
  assert.deepEqual(usos, []);
});

// Los mismos 11 textos también estaban escritos directo en plantillas, sin el traductor (POS,
// Ventas > Entrega, Empresas, Despachos, Shopify). Se corrige su ortografía en el sitio; la
// extracción a clave se hace en el bloque de cada módulo. «Accion» se busca como palabra suelta.
const TEXTOS_VIEJOS = VIEJAS.filter(v => v !== 'Accion');
test('1.11: ninguna plantilla de src/app muestra los 11 textos con las faltas de antes', () => {
  const restos = [];
  for (const archivo of listarArchivos(APP).filter(a => a.endsWith('.html'))) {
    const texto = fs.readFileSync(archivo, 'utf8').replace(/<!--[\s\S]*?-->/g, ' ').replace(/\s+/g, ' ');
    const rel = path.relative(RAIZ, archivo);
    for (const v of TEXTOS_VIEJOS) if (texto.includes(v)) restos.push(`${rel} ${v}`);
    if (/(^|[^\wÁÉÍÓÚáéíóúñ])Accion(?![\wÁÉÍÓÚáéíóúñ])/.test(texto)) restos.push(`${rel} Accion`);
  }
  assert.deepEqual(restos, []);
});

test('1.11: cada diccionario es JSON sin claves repetidas (el renombre no duplica)', () => {
  for (const idioma of IDIOMAS) {
    const texto = fs.readFileSync(path.join(DIR, `${idioma}.json`), 'utf8');
    const vistas = new Map();
    for (const m of texto.matchAll(/^ {2}"((?:\\.|[^"\\])*)":/gm)) {
      const clave = JSON.parse(`"${m[1]}"`);
      vistas.set(clave, (vistas.get(clave) || 0) + 1);
    }
    for (const nueva of NUEVAS) assert.equal(vistas.get(nueva), 1, `${idioma}: «${nueva}» aparece ${vistas.get(nueva)} veces`);
  }
});

// ---------------------------------------------------------------- código

test('1.11: ninguna clave vieja se pide al traductor (pipe, directiva o instant) en src/app', () => {
  const viejas = new Set(VIEJAS);
  const restos = usosDelCodigo().filter(u => viejas.has(u.clave)).map(u => `${u.archivo}:${u.linea} ${u.clave}`);
  assert.deepEqual(restos, []);
});

// Sin números de línea: otros bloques editan esta plantilla y moverían las posiciones.
test('1.11: los usos de Ventas piden la clave corregida (pedido-facturacion)', () => {
  const rel = 'src/app/components/ventas/facturacion/pedido-facturacion.component.html';
  const usos = usosDelCodigo().filter(u => u.archivo === rel && NUEVAS.includes(u.clave)).map(u => u.clave).sort();
  assert.deepEqual(usos, [
    'Conoce tu código postal',
    'Conoce tu código postal',
    'Los datos de facturación electrónica son iguales a los del cliente',
  ]);
});

// «Acción» (despachos/generar-orden) y «Cantidad mínima de venta:» (ventas/conf-product-to-cart)
// ya se pedían con la ortografía buena y no existían en es.json: con el renombre quedan traducidas.
test('1.11: ningún uso de las claves corregidas queda sin traducción en es', () => {
  const es = dic('es');
  const nuevas = new Set(NUEVAS);
  const faltan = usosDelCodigo().filter(u => nuevas.has(u.clave) && !(u.clave in es));
  assert.deepEqual(faltan, []);
});

test('1.11 (D3): ninguna de las 11 claves es título del menú, ruta ni valor que se compare', () => {
  const nav = fs.readFileSync(path.join(APP, 'shared/services/nav.service.ts'), 'utf8');
  for (const k of [...VIEJAS, ...NUEVAS]) {
    assert.ok(!nav.includes(`"${k}"`) && !nav.includes(`'${k}'`), `nav.service.ts usa «${k}»`);
  }
  // En .ts, ninguna aparece como literal fuera del traductor (comparaciones, rutas, datos), salvo
  // los encabezados de columna que solo se muestran. generar-orden: `{ field: "accion", header:
  // "Acción" }` se pinta con `col.header | translate` y `optionLabel="header"`; la visibilidad y
  // la columna de acciones se comparan por `field`, nunca por `header`.
  const soloSeMuestran = ['src/app/components/despachos/components/generar-orden/generar-orden.component.ts Acción'];
  const usadas = new Set([...VIEJAS, ...NUEVAS]);
  const literales = [];
  for (const archivo of listarArchivos(APP).filter(a => a.endsWith('.ts'))) {
    const { tokens } = chk.lexTs(fs.readFileSync(archivo, 'utf8'));
    for (const tk of tokens) {
      if ((tk.tipo === 'cadena' || tk.tipo === 'plantilla') && usadas.has(tk.valor)) literales.push(`${path.relative(RAIZ, archivo)} ${tk.valor}`);
    }
  }
  assert.deepEqual(literales.filter(l => !soloSeMuestran.includes(l)), []);
  const gen = fs.readFileSync(path.join(APP, 'components/despachos/components/generar-orden/generar-orden.component.ts'), 'utf8');
  assert.match(gen, /\{\s*field:\s*"accion",\s*header:\s*"Acción"/);
  assert.doesNotMatch(gen, /\.header\s*===?|===?\s*[\w.]*\.header\b/, 'generar-orden compara un header');
});

test('1.11: i18n:check no reporta claves faltantes, repetidas ni inexistentes de las 11', () => {
  const r = chk.ejecutar();
  const todas = new Set([...VIEJAS, ...NUEVAS]);
  const malos = [...r.errores, ...r.avisos]
    .filter(h => ['claveFaltante', 'claveDuplicada', 'claveInexistente', 'claveInexistenteAbierta', 'jsonInvalido'].includes(h.tipo))
    .filter(h => h.tipo === 'jsonInvalido' || todas.has(h.clave))
    .map(h => `${h.tipo} ${h.idioma || ''} ${h.clave}`);
  assert.deepEqual(malos, []);
  assert.deepEqual(r.errores.filter(h => h.tipo === 'claveFaltante').map(h => `${h.idioma}:${h.clave}`), []);
});
