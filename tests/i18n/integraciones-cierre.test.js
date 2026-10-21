'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B12a, tareas 13.1 a 13.7):
// integraciones, flows y katuq-flow. Los textos de pantalla pasan al traductor con claves
// integrations.*, flows.*, katuqFlow.* y comun.*. No se traducen nombres de proveedores, nodos
// de flows, campos integrations.<provider>.* ni valores que se guardan; ningún servicio cambia.
// Node puro: lee plantillas, .ts y diccionarios.

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
const CERRADAS = ['components/integrations', 'components/flows', 'components/katuq-flow'];
const PREFIJO = /^(integrations|flows|katuqFlow)\./;
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

test('13.6: cero textos sueltos y sin claves inexistentes en integraciones, flows y katuq-flow', () => {
  const r = require(path.join(RAIZ, 'scripts/i18n-check.js')).ejecutar({ modulos: CERRADAS });
  assert.deepEqual(r.modulo.map(s => `${s.archivo}:${s.linea} ${s.texto}`), []);
  const propios = r.errores.filter(e => CERRADAS.some(c => (e.archivo || '').startsWith(`src/app/${c}/`)));
  assert.deepEqual(propios.map(e => `${e.tipo} ${e.archivo}:${e.linea}`), []);
  const inexistentes = r.avisos.filter(h => h.tipo === 'claveInexistenteAbierta'
    && CERRADAS.some(c => h.archivo.startsWith(`src/app/${c}/`)));
  assert.deepEqual(inexistentes.map(h => `${h.archivo}:${h.linea} ${h.clave}`), []);
});

test('13.6: los tres módulos están en modulosCerrados', () => {
  for (const c of CERRADAS) assert.ok(config.modulosCerrados.includes(c), `${c} cerrado`);
});

test('13.2/13.3: las claves que piden las pantallas existen en los cuatro idiomas con las mismas variables', () => {
  const usadas = new Set();
  for (const archivo of ARCHIVOS) {
    const texto = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    for (const m of texto.matchAll(/['"`]((?:integrations|flows|katuqFlow|comun)\.[\w.]+)['"`]/g)) {
      if (!m[1].endsWith('.')) usadas.add(m[1]);
    }
  }
  assert.ok([...usadas].filter(k => PREFIJO.test(k)).length > 1200, `${usadas.size} claves`);
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].trim().length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
});

test('13.4: ortografía del español en las claves nuevas', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => PREFIJO.test(k));
  assert.ok(nuevas.length > 1200, `${nuevas.length} claves nuevas`);
  for (const [clave, valor] of nuevas) {
    // Los ejemplos de llaves (pk_test_..., https://us-central1-...) conservan sus puntos.
    if (!/[_-]\.\.\.$/.test(valor)) assert.doesNotMatch(valor, /\.\.\./, `${clave}: «…»`);
    assert.doesNotMatch(valor, /[¡¿]\s|\s[!?]/, `${clave}: signos pegados`);
    assert.doesNotMatch(valor, /\b(querés|podés|tenés|conectá|pegá|elegí|ingresá)\b/i, `${clave}: voseo`);
  }
  // Las palabras que la plantilla vieja escribía sin tilde.
  for (const [clave, valor] of Object.entries(dics.es).filter(([k]) => /^integrations\.(shopifyDashboard|syncLogs|webhookConfig|fieldMapping|siigoConfig)\./.test(k))) {
    assert.doesNotMatch(valor, /\b(sincronizacion|configuracion|facturacion|descripcion|categoria|ultimo|ultima|inventario?s? sin|gestion|integracion|conexion|automaticamente|ordenes)\b/i, `${clave}: falta tilde`);
  }
});

test('13.5: los nombres de proveedores no se traducen y el glosario D7 se respeta', () => {
  const PROVEEDORES = ['Shopify', 'WooCommerce', 'Siigo', 'SIIGO', 'World Office', 'Wompi', 'Addi', 'Sistecrédito', 'Fullpi', 'Cereza', 'Aliaddo', 'Prindel', 'MultiOP', 'Envíame', 'ePayco', 'PayPal', 'Stripe', 'PayU', 'Mercado Pago', 'Magento', 'WhatsApp', 'Kapso', 'DIAN', 'Instagram', 'Facebook'];
  for (const [clave, valor] of Object.entries(dics.es).filter(([k]) => PREFIJO.test(k))) {
    for (const p of PROVEEDORES.filter(n => valor.includes(n))) {
      for (const idioma of ['en', 'pt', 'de']) {
        assert.ok(dics[idioma][clave].includes(p), `${idioma}: ${clave} conserva «${p}»`);
      }
    }
  }
  for (const [clave, valor] of Object.entries(dics.pt).filter(([k]) => PREFIJO.test(k))) {
    assert.doesNotMatch(valor, /\b(Despacho|armazéns?|Inventário|Faturação)\b/, `pt ${clave}: glosario D7`);
  }
  for (const [clave, valor] of Object.entries(dics.en).filter(([k]) => PREFIJO.test(k))) {
    assert.doesNotMatch(valor, /\b(Dispatch|Client(?! (ID|Secret)))\b/, `en ${clave}: glosario D7`);
  }
  for (const [clave, valor] of Object.entries(dics.de).filter(([k]) => PREFIJO.test(k))) {
    assert.doesNotMatch(valor, /ß/, `de ${clave}: eszett`);
  }
});

test('13.3: ningún servicio ni llamada HTTP cambia; solo textos de pantalla', () => {
  for (const archivo of ARCHIVOS.filter(a => /\.service\.ts$|\.registry\.ts$|connector-registry\.ts$|-lenguaje\.ts$|fallback-catalog\.ts$/.test(a))) {
    assert.doesNotMatch(fs.readFileSync(archivo, 'utf8'), /TranslateService|translate\.instant/, path.relative(APP, archivo));
  }
  // Los componentes con mensajes inyectan el traductor como último parámetro del constructor.
  for (const archivo of ARCHIVOS.filter(a => /\.component\.ts$/.test(a))) {
    const t = fs.readFileSync(archivo, 'utf8');
    if (!/this\.translate\.instant/.test(t)) continue;
    assert.match(t, /private translate: TranslateService,?\s*\)\s*\{/, `${path.relative(APP, archivo)} inyecta TranslateService al final`);
    assert.match(t, /import \{ TranslateService \} from '@ngx-translate\/core'/, path.relative(APP, archivo));
  }
});

test('13.2: los valores que se guardan no pasan por el traductor', () => {
  // El id de integración, el ambiente y los tipos viajan al backend tal cual: ninguna plantilla
  // traduce un [value], un [ngValue], un formControlName ni un [ngModel].
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    const t = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    assert.doesNotMatch(t, /\[(value|ngValue)\]="[^"]*\| translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /formControlName="[^"]*translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /\[\(ngModel\)\]="[^"]*translate/, path.relative(APP, archivo));
  }
});

test('13.1: la partición del bloque 12 está anotada en tasks.md', () => {
  const tasks = leer('openspec/changes/idiomas-plataforma/tasks.md');
  for (const id of ['IDI-B12a', 'IDI-B12b', 'IDI-B12c', 'IDI-B12d', 'IDI-B12e', 'IDI-B12f']) {
    assert.ok(tasks.includes(id), `${id} en tasks.md`);
  }
});
