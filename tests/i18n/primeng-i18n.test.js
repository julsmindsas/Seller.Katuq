'use strict';

// D-532 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B00b, tarea 1.9): textos de PrimeNG
// en el idioma del panel. TranslateService y PrimeNGConfig simulados; sin Angular ni red.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const rxjs = require('rxjs');
const { RAIZ, existe, cargarTs } = require('../theme/cargar-ts');

const SERVICIO = 'src/app/shared/services/i18n/primeng-i18n.service.ts';

const CLAVES_TEXTO = [
  'startsWith', 'contains', 'notContains', 'endsWith', 'equals', 'notEquals', 'noFilter',
  'lt', 'lte', 'gt', 'gte', 'is', 'isNot', 'before', 'after',
  'dateIs', 'dateIsNot', 'dateBefore', 'dateAfter',
  'clear', 'apply', 'matchAll', 'matchAny', 'addRule', 'removeRule', 'accept', 'reject',
  'choose', 'upload', 'cancel', 'today', 'weekHeader', 'weak', 'medium', 'strong', 'passwordPrompt',
  'emptyMessage', 'emptyFilterMessage',
];
const CLAVES_LISTA = { dayNames: 7, dayNamesShort: 7, dayNamesMin: 7, monthNames: 12, monthNamesShort: 12 };

function diccionario(lang) {
  return JSON.parse(fs.readFileSync(path.resolve(RAIZ, `src/assets/i18n/${lang}.json`), 'utf8'));
}

// TranslateService mínimo: get(clave) devuelve el valor o la propia clave si falta (como ngx-translate).
function traductorFalso(diccionarios, inicial = 'es') {
  const onLangChange = new rxjs.Subject();
  const pedidos = [];
  const t = {
    currentLang: inicial,
    defaultLang: 'es',
    onLangChange,
    pedidos,
    // como ngx-translate: los diccionarios ya cargados, por idioma
    get translations() { return diccionarios; },
    get(clave) {
      pedidos.push({ clave, lang: t.currentLang });
      const valor = (diccionarios[t.currentLang] || {})[clave];
      return rxjs.of(valor === undefined ? clave : valor);
    },
    use(lang) {
      t.currentLang = lang;
      onLangChange.next({ lang, translations: diccionarios[lang] || {} });
      return rxjs.of(diccionarios[lang]);
    },
  };
  return t;
}

// PrimeNGConfig con la semántica real de PrimeNG 14 (setTranslation mezcla sobre `translation`)
// y un setter que cuenta cualquier reasignación de `filterMatchModeOptions`.
function configFalsa() {
  let filtros = { text: ['startsWith', 'contains'], numeric: ['equals'], date: ['dateIs'] };
  const config = {
    translation: { today: 'Today', clear: 'Clear', dayNamesMin: ['Su', 'Mo'] },
    escriturasFiltros: 0,
    recibidas: [],
    get filterMatchModeOptions() { return filtros; },
    set filterMatchModeOptions(valor) { filtros = valor; config.escriturasFiltros++; },
    setTranslation(valor) {
      // copia plana: el objeto llega del contexto vm del .ts
      config.recibidas.push(JSON.parse(JSON.stringify(valor)));
      config.translation = Object.assign(Object.assign({}, config.translation), valor);
    },
  };
  return config;
}

function cargarServicio() {
  assert.ok(existe(SERVICIO), `falta ${SERVICIO} (tarea 1.9)`);
  const utilidades = cargarTs('src/app/shared/utils/app-language.utils.ts');
  return cargarTs(SERVICIO, { modulos: { '../../utils/app-language.utils': utilidades } }).PrimengI18nService;
}

const DICCIONARIOS = {
  es: { primeng: { today: 'Hoy', clear: 'Limpiar', dateFormat: 'dd/mm/yy', firstDayOfWeek: 1 } },
  en: { primeng: { today: 'Today', clear: 'Clear' } },
  pt: { primeng: { today: 'Hoje', clear: 'Limpar' } },
  fr: {},
};

test('al iniciar llama setTranslation con el objeto primeng del idioma activo', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso(DICCIONARIOS, 'en');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  assert.deepEqual(translate.pedidos, [{ clave: 'primeng', lang: 'en' }]);
  assert.deepEqual(config.recibidas, [{ today: 'Today', clear: 'Clear' }]);
  servicio.ngOnDestroy();
});

test('en cada cambio de idioma vuelve a llamar setTranslation', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso(DICCIONARIOS, 'es');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  translate.use('pt');
  translate.use('en');
  assert.deepEqual(config.recibidas.map(r => r.today), ['Hoy', 'Hoje', 'Today']);
  servicio.ngOnDestroy();
});

test('no pasa dateFormat ni firstDayOfWeek aunque el diccionario los traiga (son de la Ola 0)', () => {
  const PrimengI18nService = cargarServicio();
  const config = configFalsa();
  const servicio = new PrimengI18nService(traductorFalso(DICCIONARIOS, 'es'), config);
  servicio.iniciar();
  assert.deepEqual(config.recibidas, [{ today: 'Hoy', clear: 'Limpiar' }]);
  servicio.ngOnDestroy();
});

test('si falta el objeto primeng (llega la clave cruda) no llama setTranslation', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso(DICCIONARIOS, 'fr');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  assert.deepEqual(config.recibidas, []);
  translate.use('es');
  assert.equal(config.recibidas.length, 1);
  servicio.ngOnDestroy();
});

test('iniciar dos veces no duplica la suscripción', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso(DICCIONARIOS, 'es');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  servicio.iniciar();
  translate.use('en');
  assert.deepEqual(config.recibidas.map(r => r.today), ['Hoy', 'Today']);
  servicio.ngOnDestroy();
});

test('no pisa filterMatchModeOptions (lo usa produccion/dashboard)', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso(DICCIONARIOS, 'es');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  // produccion/dashboard fija sus opciones de filtro en español (dashboard.component.ts)
  const delDashboard = { text: [{ label: 'Contiene', value: 'contains' }] };
  config.filterMatchModeOptions = delDashboard;
  const escriturasAntes = config.escriturasFiltros;
  translate.use('en');
  translate.use('pt');
  assert.equal(config.escriturasFiltros, escriturasAntes, 'el servicio reasignó filterMatchModeOptions');
  assert.equal(config.filterMatchModeOptions, delDashboard);
  // setTranslation solo mezcla textos: lo que ya tenía PrimeNG y no llega en el diccionario se conserva
  assert.equal(config.translation.today, 'Hoje');
  assert.deepEqual(config.translation.dayNamesMin, ['Su', 'Mo']);
  const fuente = fs.readFileSync(path.resolve(RAIZ, SERVICIO), 'utf8');
  assert.doesNotMatch(fuente, /filterMatchModeOptions/);
  servicio.ngOnDestroy();
});

test('respaldo en español por texto: un objeto primeng incompleto completa lo que falta con español', () => {
  const PrimengI18nService = cargarServicio();
  const diccionarios = {
    es: { primeng: { today: 'Hoy', clear: 'Limpiar', dayNamesMin: ['D', 'L'] } },
    de: { primeng: { today: 'Heute' } },
  };
  const translate = traductorFalso(diccionarios, 'de');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  assert.deepEqual(config.recibidas, [{ today: 'Heute', clear: 'Limpiar', dayNamesMin: ['D', 'L'] }]);
  // nunca el inglés de PrimeNG que traía la configuración
  assert.deepEqual(config.translation.dayNamesMin, ['D', 'L']);
  servicio.ngOnDestroy();
});

test('sin español cargado todavía, aplica el objeto del idioma tal como viene', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso({ en: { primeng: { today: 'Today' } } }, 'en');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  assert.deepEqual(config.recibidas, [{ today: 'Today' }]);
  servicio.ngOnDestroy();
});

test('un error al pedir el diccionario no rompe el arranque', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso(DICCIONARIOS, 'es');
  translate.get = () => rxjs.throwError(() => new Error('404'));
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  assert.doesNotThrow(() => servicio.iniciar());
  assert.deepEqual(config.recibidas, []);
  servicio.ngOnDestroy();
});

test('después de ngOnDestroy ya no escucha cambios de idioma', () => {
  const PrimengI18nService = cargarServicio();
  const translate = traductorFalso(DICCIONARIOS, 'es');
  const config = configFalsa();
  const servicio = new PrimengI18nService(translate, config);
  servicio.iniciar();
  servicio.ngOnDestroy();
  translate.use('en');
  assert.equal(config.recibidas.length, 1);
});

// ---------------------------------------------------------------- diccionarios

for (const lang of ['es', 'en', 'pt']) {
  test(`${lang}.json: objeto primeng solo con textos completos`, () => {
    const primeng = diccionario(lang).primeng;
    assert.equal(typeof primeng, 'object');
    assert.ok(primeng && !Array.isArray(primeng));
    const esperadas = [...CLAVES_TEXTO, ...Object.keys(CLAVES_LISTA)].sort();
    assert.deepEqual(Object.keys(primeng).sort(), esperadas);
    for (const clave of CLAVES_TEXTO) {
      assert.equal(typeof primeng[clave], 'string', clave);
      assert.ok(primeng[clave].trim().length > 0, clave);
    }
    for (const [clave, largo] of Object.entries(CLAVES_LISTA)) {
      assert.ok(Array.isArray(primeng[clave]), clave);
      assert.equal(primeng[clave].length, largo, clave);
      assert.ok(primeng[clave].every(v => typeof v === 'string' && v.trim()), clave);
    }
    assert.equal('dateFormat' in primeng, false);
    assert.equal('firstDayOfWeek' in primeng, false);
  });
}

test('primeng: los días empiezan en domingo en los tres idiomas (orden de PrimeNG)', () => {
  assert.equal(diccionario('es').primeng.dayNames[0], 'domingo');
  assert.equal(diccionario('en').primeng.dayNames[0], 'Sunday');
  assert.equal(diccionario('pt').primeng.dayNames[0], 'domingo');
  assert.equal(diccionario('es').primeng.monthNames[0], 'enero');
  assert.equal(diccionario('en').primeng.monthNames[0], 'January');
  assert.equal(diccionario('pt').primeng.monthNames[0], 'janeiro');
});

test('primeng: en y pt traducen (no copian el español)', () => {
  const es = diccionario('es').primeng;
  for (const lang of ['en', 'pt']) {
    const otro = diccionario(lang).primeng;
    assert.notEqual(otro.today, es.today, lang);
    assert.notEqual(otro.choose, es.choose, lang);
    assert.notEqual(otro.emptyMessage, es.emptyMessage, lang);
  }
});

// ---------------------------------------------------------------- arranque

test('lo arranca solo app.component.ts, una vez; el selector no lo llama', () => {
  const app = fs.readFileSync(path.resolve(RAIZ, 'src/app/app.component.ts'), 'utf8');
  assert.equal((app.match(/primengI18n\.iniciar\(\)/g) || []).length, 1);
  const selector = fs.readFileSync(path.resolve(RAIZ, 'src/app/shared/components/header/elements/languages/languages.component.ts'), 'utf8');
  assert.doesNotMatch(selector, /PrimengI18nService|primengI18n/);
});

test('el servicio es providedIn root', () => {
  const fuente = fs.readFileSync(path.resolve(RAIZ, SERVICIO), 'utf8');
  assert.match(fuente, /providedIn: 'root'/);
});
