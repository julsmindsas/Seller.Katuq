'use strict';

// D-540 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B12b, tareas 13.2 a 13.7):
// onboarding e importador. Los textos de pantalla pasan al traductor con claves onboarding.*,
// importador.* y comun.*. No se traducen los encabezados de columnas que el importador espera,
// los mapeos que viajan a /v1/onboarding/import-* ni a KAI column-mapping, ni las respuestas de
// KAI. Node puro: lee plantillas, .ts y diccionarios.

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
const CERRADAS = ['components/onboarding', 'shared/components/import-modal', 'shared/components/import-components'];
const PREFIJO = /^(onboarding|importador)\./;
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

test('13.6: cero textos sueltos y sin claves inexistentes en onboarding e importador', () => {
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
    for (const m of texto.matchAll(/['"`]((?:onboarding|importador|comun)\.[\w.]+)['"`]/g)) {
      if (!m[1].endsWith('.')) usadas.add(m[1]);
    }
  }
  assert.ok([...usadas].filter(k => PREFIJO.test(k)).length > 700, `${usadas.size} claves`);
  for (const clave of usadas) {
    for (const idioma of IDIOMAS) {
      assert.equal(typeof dics[idioma][clave], 'string', `${idioma}: ${clave}`);
      assert.ok(dics[idioma][clave].trim().length > 0, `${idioma}: ${clave} no vacía`);
      assert.deepEqual(variables(dics[idioma][clave]), variables(dics.es[clave]), `${idioma}: variables de ${clave}`);
    }
  }
  // Los pasos y los tipos de negocio del asistente guardan la clave en el dato y la plantilla la traduce.
  for (const id of ['goal', 'context', 'product', 'payment', 'result']) {
    for (const parte of ['nombre', 'corto']) {
      for (const idioma of IDIOMAS) assert.ok(dics[idioma][`onboarding.onboardingWizard.paso.${id}.${parte}`], `${idioma} paso ${id} ${parte}`);
    }
  }
  const html = leer('src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.html');
  for (const expr of ['active.shortName | translate', 'step.shortName | translate', 'active.name | translate', 't.label | translate']) {
    assert.ok(html.includes(expr), expr);
  }
});

test('13.4: ortografía del español en las claves nuevas', () => {
  const nuevas = Object.entries(dics.es).filter(([k]) => PREFIJO.test(k));
  assert.ok(nuevas.length > 700, `${nuevas.length} claves nuevas`);
  for (const [clave, valor] of nuevas) {
    if (!/[_-]\.\.\.$/.test(valor)) assert.doesNotMatch(valor, /\.\.\./, `${clave}: «…»`);
    assert.doesNotMatch(valor, /[¡¿]\s|\s[!?]/, `${clave}: signos pegados`);
    assert.doesNotMatch(valor, /\b(querés|podés|tenés|revisá|asigná|corregí|creá|volvé|completá|completales|encontralos|marcá)\b/i, `${clave}: voseo`);
    assert.doesNotMatch(valor, /\b(esta analizando|analizara|importacion|configuracion|asegurate|descargala|aqui|sesion|encontro|subela|vacio)\b/i, `${clave}: sin tilde`);
  }
});

test('13.5: los nombres de columnas que el importador espera no se traducen', () => {
  // Los encabezados viven en constantes del .ts y las plantillas de Excel los traen en español:
  // la etiqueta que los nombra en un aviso conserva el mismo texto en los cuatro idiomas.
  const columnas = ['Activo', 'Página Web', 'Foto principal (URL)', 'Fotos adicionales (URLs)', 'Referencia', 'Categoría: Sin categoría'];
  const claves = Object.entries(dics.es).filter(([k, v]) => /^importador\.importModal\./.test(k) && columnas.includes(v));
  assert.equal(claves.length, columnas.length, claves.map(([k]) => k).join());
  for (const [clave, valor] of claves) {
    for (const idioma of IDIOMAS) assert.equal(dics[idioma][clave], valor, `${idioma}: ${clave}`);
  }
  const ts = leer('src/app/shared/components/import-modal/import-modal.component.ts');
  for (const encabezado of ['Foto principal (URL)', 'Fotos adicionales (URLs)', 'Referencia (SKU)']) {
    assert.ok(ts.includes(`'${encabezado}'`), `el encabezado «${encabezado}» sigue en el .ts`);
  }
  // Los textos que el aviso muestra como SI/NO son los valores que el backend entiende.
  for (const idioma of IDIOMAS) assert.equal(dics[idioma]['importador.importModal.siNo'], '(SI/NO)');
});

test('13.3: servicios, modelos y mapeos enviados a la API no pasan por el traductor', () => {
  for (const archivo of ARCHIVOS.filter(a => /\.service\.ts$|\.model\.ts$|\/utils\//.test(a))) {
    assert.doesNotMatch(fs.readFileSync(archivo, 'utf8'), /TranslateService|translate\.instant/, path.relative(APP, archivo));
  }
  // Ninguna línea que arme, envíe o lea los mapeos usa el traductor.
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.ts'))) {
    for (const [i, linea] of fs.readFileSync(archivo, 'utf8').split('\n').entries()) {
      if (/translate\.instant/.test(linea)) {
        assert.doesNotMatch(linea, /mappings\s*[:=\[]|columnMapping\(|importCustomers\(|importProducts\(|importInventory\(|\.post\(|\.put\(/,
          `${path.relative(APP, archivo)}:${i + 1}`);
      }
    }
  }
  // Los componentes con mensajes inyectan el traductor como último parámetro del constructor.
  for (const archivo of ARCHIVOS.filter(a => /\.component\.ts$/.test(a))) {
    const t = fs.readFileSync(archivo, 'utf8');
    if (!/this\.translate\.instant/.test(t)) continue;
    assert.match(t, /private translate: TranslateService,?\s*\)\s*\{/, `${path.relative(APP, archivo)} inyecta TranslateService al final`);
    assert.match(t, /import \{ TranslateService \} from '@ngx-translate\/core'/, path.relative(APP, archivo));
  }
  for (const modulo of ['src/app/shared/components/import-modal/import-modal.module.ts', 'src/app/shared/components/import-components/import-components.module.ts', 'src/app/components/onboarding/onboarding.module.ts']) {
    assert.match(leer(modulo), /TranslateModule/, modulo);
  }
});

test('13.2: los valores que se guardan no pasan por el traductor', () => {
  for (const archivo of ARCHIVOS.filter(a => a.endsWith('.html'))) {
    const t = sinComentarios(fs.readFileSync(archivo, 'utf8'));
    assert.doesNotMatch(t, /\[(value|ngValue)\]="[^"]*\| translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /formControlName="[^"]*translate/, path.relative(APP, archivo));
    assert.doesNotMatch(t, /\[\(ngModel\)\]="[^"]*translate/, path.relative(APP, archivo));
  }
  // Los métodos de pago del asistente se guardan con su nombre y su descripción: no se traducen.
  const wizard = leer('src/app/components/onboarding/onboarding-wizard/onboarding-wizard.component.ts');
  assert.match(wizard, /\{ label: 'Efectivo', hint: 'Pago en caja o contraentrega' \}/);
  assert.match(wizard, /\{ id: 'productos', label: 'onboarding\.onboardingWizard\.tipoProductos' \}/);
});

test('13.2: los espacios entre una etiqueta y su cifra se conservan', () => {
  // Los textos partidos por una cifra ('N campos mapeados') se arman con un espacio explícito.
  const casos = [
    ['src/app/components/onboarding/steps/generic-step.component.ts', /\+ ' ' \+ \('onboarding\.genericStep\.configurados' \| translate\)/],
    ['src/app/shared/components/import-modal/import-modal.component.html', /\+ ' ' \+ \('importador\.importModal\.ajustadosManualmente' \| translate\)/],
    ['src/app/shared/components/import-modal/import-modal.component.html', /\('importador\.importModal\.descargarLas' \| translate\) \+ ' ' \+ erroresDetallados\.length \+ ' ' \+ /],
    ['src/app/shared/components/import-components/column-mapping-preview/column-mapping-preview.component.html', /\+ ' ' \+ \('importador\.columnMappingPreview\.camposMapeados' \| translate\)/],
    ['src/app/components/onboarding/steps/import-customers-step.component.html', /\+ ' ' \+ \('onboarding\.importCustomersStep\.faltantes' \| translate\)/],
  ];
  for (const [archivo, patron] of casos) assert.match(leer(archivo), patron, archivo);
});

test('13.1: la partición del bloque 12 está anotada en tasks.md', () => {
  const tasks = leer('openspec/changes/idiomas-plataforma/tasks.md');
  for (const id of ['IDI-B12a', 'IDI-B12b', 'IDI-B12c', 'IDI-B12d', 'IDI-B12e', 'IDI-B12f']) {
    assert.ok(tasks.includes(id), `${id} en tasks.md`);
  }
});
