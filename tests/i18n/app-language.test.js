'use strict';

// D-532 (ticket Traducción cd CMNdBkVZXgYoOCvqfGZc, bloque IDI-B00b, tareas 1.1 y 1.6):
// catálogo de idiomas con Deutsch (CH) oculto, idiomas visibles del login y selector filtrado.
// Corre el .ts real con el cargador de tests/theme; nunca llama al backend.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const rxjs = require('rxjs');
const { RAIZ, cargarTs, navegadorFalso, parametrosConstructor } = require('../theme/cargar-ts');

const UTILS = 'src/app/shared/utils/app-language.utils.ts';
const SELECTOR = 'src/app/shared/components/header/elements/languages/languages.component.ts';
const AUTH = 'src/app/shared/services/firebase/auth.service.ts';

const utilidades = () => cargarTs(UTILS);

// ---------------------------------------------------------------- catálogo

test('catálogo: cuatro idiomas, cada uno con su htmlLang', () => {
  const { APP_LANGUAGES } = utilidades();
  const porCodigo = Object.fromEntries(APP_LANGUAGES.map(l => [l.code, l.htmlLang]));
  assert.deepEqual(porCodigo, { en: 'en-US', es: 'es-CO', pt: 'pt-BR', de: 'de-CH' });
});

test('catálogo: Deutsch (CH) con la bandera de Suiza', () => {
  const { APP_LANGUAGES } = utilidades();
  const de = APP_LANGUAGES.find(l => l.code === 'de');
  assert.deepEqual({ ...de }, { language: 'Deutsch', code: 'de', type: 'CH', icon: 'ch', htmlLang: 'de-CH' });
});

test('catálogo: el español por defecto conserva sus datos y suma es-CO', () => {
  const { DEFAULT_APP_LANGUAGE } = utilidades();
  assert.deepEqual({ ...DEFAULT_APP_LANGUAGE }, { language: 'Español', code: 'es', type: 'CO', icon: 'co', htmlLang: 'es-CO' });
});

test('catálogo: sin francés, chino ni árabe', () => {
  const { APP_LANGUAGES } = utilidades();
  for (const code of ['fr', 'cn', 'zh', 'ae', 'ar']) {
    assert.equal(APP_LANGUAGES.some(l => l.code === code), false, code);
  }
});

// ---------------------------------------------------------------- idiomasVisibles

test('idiomasVisibles: sin el campo (sesiones de antes) da es, en y pt', () => {
  const { idiomasVisibles } = utilidades();
  for (const user of [null, undefined, {}, { lang: 'de' }, 'basura', 42]) {
    assert.deepEqual([...idiomasVisibles(user)].sort(), ['en', 'es', 'pt'], JSON.stringify(user));
  }
});

test('idiomasVisibles: con de visible lo incluye', () => {
  const { idiomasVisibles } = utilidades();
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: ['es', 'en', 'pt', 'de'] })].sort(), ['de', 'en', 'es', 'pt']);
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: ['es', 'de'] })].sort(), ['de', 'es']);
});

test('idiomasVisibles: siempre trae es', () => {
  const { idiomasVisibles } = utilidades();
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: ['en'] })].sort(), ['en', 'es']);
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: [] })], ['es']);
});

test('idiomasVisibles: ignora códigos desconocidos y elementos raros; valor que no es arreglo da el defecto', () => {
  const { idiomasVisibles } = utilidades();
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: ['fr', 'cn', 'ae', 'pt', 5, null, {}] })].sort(), ['es', 'pt']);
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: ['EN', ' de '] })].sort(), ['de', 'en', 'es']);
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: 'es,en,pt,de' })].sort(), ['en', 'es', 'pt']);
  assert.deepEqual([...idiomasVisibles({ visibleLanguages: { de: true } })].sort(), ['en', 'es', 'pt']);
});

test('idiomasVisibles: sin duplicados y en el orden del catálogo', () => {
  const { idiomasVisibles, APP_LANGUAGES } = utilidades();
  const orden = APP_LANGUAGES.map(l => l.code);
  const visibles = idiomasVisibles({ visibleLanguages: ['de', 'es', 'de', 'en'] });
  assert.deepEqual([...visibles], [...orden].filter(c => ['de', 'es', 'en'].includes(c)));
});

// ---------------------------------------------------------------- normalizeAppLanguage

test("normalizeAppLanguage('de', ['es','en','pt']) da español", () => {
  const { normalizeAppLanguage } = utilidades();
  assert.equal(normalizeAppLanguage('de', ['es', 'en', 'pt']).code, 'es');
  assert.equal(normalizeAppLanguage({ code: 'de' }, ['es', 'en', 'pt']).code, 'es');
});

test('normalizeAppLanguage: sin visibles usa es, en y pt (de queda oculto)', () => {
  const { normalizeAppLanguage } = utilidades();
  assert.equal(normalizeAppLanguage('de').code, 'es');
  assert.equal(normalizeAppLanguage('pt').code, 'pt');
});

test('normalizeAppLanguage: de visible devuelve Deutsch (CH)', () => {
  const { normalizeAppLanguage } = utilidades();
  const de = normalizeAppLanguage('de', ['es', 'en', 'pt', 'de']);
  assert.equal(de.code, 'de');
  assert.equal(de.htmlLang, 'de-CH');
});

test('normalizeAppLanguage: fr, cn, ae, null, objetos raros y basura dan español', () => {
  const { normalizeAppLanguage } = utilidades();
  const todos = ['es', 'en', 'pt', 'de'];
  const raros = ['fr', 'cn', 'ae', null, undefined, '', 42, true, [], ['en'], {}, { code: null }, { code: 5 },
    { code: { code: 'en' } }, { language: 'English' }, 'english', 'en-US', '{"code":"en"}', NaN];
  for (const valor of raros) {
    assert.equal(normalizeAppLanguage(valor, todos).code, 'es', String(JSON.stringify(valor)));
  }
});

test('normalizeAppLanguage: acepta la cadena o el objeto {code}, como hoy', () => {
  const { normalizeAppLanguage } = utilidades();
  assert.equal(normalizeAppLanguage('EN').code, 'en');
  assert.equal(normalizeAppLanguage({ code: 'pt' }).code, 'pt');
  assert.equal(normalizeAppLanguage({ language: 'English', code: 'en', type: 'US', icon: 'us' }).icon, 'us');
  assert.equal(normalizeAppLanguage('es').language, 'Español');
});

test('normalizeAppLanguage: devuelve una copia (no se puede alterar el catálogo)', () => {
  const { normalizeAppLanguage, APP_LANGUAGES } = utilidades();
  const en = normalizeAppLanguage('en');
  en.language = 'otro';
  assert.equal(APP_LANGUAGES.find(l => l.code === 'en').language, 'English');
});

test('normalizeAppLanguage: visibles inválidos no abren idiomas ocultos', () => {
  const { normalizeAppLanguage } = utilidades();
  assert.equal(normalizeAppLanguage('de', 'de').code, 'es');
  assert.equal(normalizeAppLanguage('de', null).code, 'es');
  assert.equal(normalizeAppLanguage('en', []).code, 'es');
});

// ---------------------------------------------------------------- selector del encabezado

const USUARIO = {
  email: 'ana@comercio.co', company: 'COMERCIO', nit: '900123', token: 'a.b.c', rol: 'Administrador',
  lang: { language: 'Deutsch', code: 'de', type: 'CH', icon: 'ch', htmlLang: 'de-CH' }, tema: false,
};

function montarSelector(user) {
  const nav = navegadorFalso({ pathname: '/ventas', user });
  const { LanguagesComponent } = cargarTs(SELECTOR, {
    modulos: { '../../../../utils/app-language.utils': utilidades() },
    globales: { document: nav.document, localStorage: nav.localStorage, window: nav.window },
  });
  const usados = [];
  const enviados = [];
  const componente = new LanguagesComponent(
    { setDefaultLang() {}, use: code => usados.push(code) },
    {},
    { updateUser: item => { enviados.push(JSON.parse(JSON.stringify(item))); return rxjs.of({ ok: true }); } },
  );
  componente.ngOnInit();
  return { nav, componente, usados, enviados };
}

test('selector: sin visibleLanguages ofrece es, en y pt; de oculto muestra español y no reescribe users.lang', () => {
  const { nav, componente, usados, enviados } = montarSelector(USUARIO);
  assert.deepEqual([...componente.languages].map(l => l.code).sort(), ['en', 'es', 'pt']);
  assert.equal(componente.selectedLanguage.code, 'es');
  assert.deepEqual(usados, ['es']);
  assert.equal(nav.document.documentElement.lang, 'es-CO');
  assert.deepEqual(enviados, [], 'ocultar un idioma no guarda nada en el backend');
  assert.deepEqual(nav.usuario(), USUARIO, 'ni en localStorage');
  componente.ngOnDestroy();
});

test('selector: empresa de prueba ve Deutsch (CH) y <html lang> toma de-CH', () => {
  const user = { ...USUARIO, visibleLanguages: ['es', 'en', 'pt', 'de'] };
  const { nav, componente, usados, enviados } = montarSelector(user);
  assert.deepEqual([...componente.languages].map(l => l.code).sort(), ['de', 'en', 'es', 'pt']);
  assert.equal(componente.selectedLanguage.code, 'de');
  assert.deepEqual(usados, ['de']);
  assert.equal(nav.document.documentElement.lang, 'de-CH');
  assert.deepEqual(enviados, []);
  componente.ngOnDestroy();
});

test('selector: cambiar a inglés usa en-US en <html lang> y guarda como hoy (D-502)', () => {
  const user = { ...USUARIO, lang: 'es' };
  const { nav, componente, enviados } = montarSelector(user);
  componente.changeLanguage(componente.languages.find(l => l.code === 'en'));
  assert.equal(nav.document.documentElement.lang, 'en-US');
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].identificacion, '900123');
  assert.equal(enviados[0].lang.code, 'en');
  assert.deepEqual(Object.keys(enviados[0]).sort(), ['identificacion', 'lang']);
  // users.lang conserva la forma de antes de D-532: htmlLang se deriva del code y no se guarda
  assert.deepEqual(enviados[0].lang, { language: 'English', code: 'en', type: 'US', icon: 'us' });
  assert.deepEqual(nav.usuario().lang, { language: 'English', code: 'en', type: 'US', icon: 'us' });
  assert.equal(componente.selectedLanguage.htmlLang, 'en-US');
  componente.ngOnDestroy();
});

test('selector: un código oculto que llegue a changeLanguage cae en español', () => {
  const { componente, enviados } = montarSelector({ ...USUARIO, lang: 'en' });
  componente.changeLanguage('de');
  assert.equal(componente.selectedLanguage.code, 'es');
  assert.equal(enviados[0].lang.code, 'es');
  componente.ngOnDestroy();
});

test('selector: la plantilla recorre la lista filtrada languages', () => {
  const html = fs.readFileSync(path.resolve(RAIZ, SELECTOR.replace('.ts', '.html')), 'utf8');
  assert.match(html, /\*ngFor="let lang of languages"/);
  assert.match(html, /\(click\)="changeLanguage\(lang\)"/);
});

// ---------------------------------------------------------------- arranque y login

test('app.component: solo declara los idiomas reales y arranca con los visibles del user', () => {
  const fuente = fs.readFileSync(path.resolve(RAIZ, 'src/app/app.component.ts'), 'utf8').replace(/\s+/g, ' ');
  assert.match(fuente, /addLangs\(\['es', 'en', 'pt', 'de'\]\)/);
  assert.doesNotMatch(fuente, /'fr'|'cn'|'ae'/);
  assert.match(fuente, /normalizeAppLanguage\(storedUser\?\.lang, idiomasVisibles\(storedUser\)\)/);
  assert.match(fuente, /document\.documentElement\.lang = activeLanguage\.htmlLang/);
});

function crearAuth(nav) {
  const usados = [];
  const { AuthService } = cargarTs(AUTH, {
    modulos: {
      '../../utils/app-language.utils': utilidades(),
      '../../../components/onboarding/utils/onboarding-v2.utils': { clearOnboardingStorage() {} },
    },
    globales: { document: nav.document, localStorage: nav.localStorage, sessionStorage: { removeItem() {} }, window: nav.window },
  });
  const fakes = {
    services: {}, ngZone: {}, toster: {}, onboardingService: {}, navServices: {},
    router: { navigateByUrl() {} },
    translate: { setDefaultLang() {}, use: code => usados.push(code) },
    initializationService: { resetInitialization() {} },
    loaderService: { reset() {} },
    themeMode: { reset() {} },
  };
  const auth = new AuthService(...parametrosConstructor(AUTH).map(nombre => fakes[nombre]));
  return { auth, usados };
}

test('auth.setLanguage: aplica el idioma con los visibles del login y escribe htmlLang', () => {
  const nav = navegadorFalso({ pathname: '/login' });
  const { auth, usados } = crearAuth(nav);
  assert.equal(auth.setLanguage('de', ['es', 'en', 'pt']).code, 'es');
  assert.equal(nav.document.documentElement.lang, 'es-CO');
  assert.equal(auth.setLanguage('de', ['es', 'en', 'pt', 'de']).code, 'de');
  assert.equal(nav.document.documentElement.lang, 'de-CH');
  assert.equal(auth.setLanguage({ code: 'pt' }).code, 'pt', 'sin visibles: es, en y pt como hoy');
  assert.deepEqual(usados, ['es', 'de', 'pt']);
});

test('auth: el login pasa visibleLanguages y sigue guardando la respuesta completa', () => {
  const fuente = fs.readFileSync(path.resolve(RAIZ, AUTH), 'utf8').replace(/\s+/g, ' ');
  assert.match(fuente, /result\.lang = this\.setLanguage\(result\.lang, result\.visibleLanguages\);/);
  assert.match(fuente, /localStorage\.setItem\("user", JSON\.stringify\(result\)\)/);
});

test('auth: SignOut sigue dejando el panel en español', () => {
  const nav = navegadorFalso({ pathname: '/ventas', user: { ...USUARIO, lang: 'en' } });
  const { auth, usados } = crearAuth(nav);
  auth.SignOut();
  assert.deepEqual(usados, ['es']);
  assert.equal(nav.document.documentElement.lang, 'es-CO');
});

// ---------------------------------------------------------------- restos (tarea 1.7)

test('restos: no existe fr.json ni diccionarios de cn o ae', () => {
  const dir = path.resolve(RAIZ, 'src/assets/i18n');
  const archivos = fs.readdirSync(dir).filter(n => n.endsWith('.json')).sort();
  for (const n of ['fr.json', 'cn.json', 'ae.json']) assert.equal(archivos.includes(n), false, n);
  for (const n of ['en.json', 'es.json', 'pt.json']) assert.equal(archivos.includes(n), true, n);
});
