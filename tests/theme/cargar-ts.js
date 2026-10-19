'use strict';

// D-502 (ticket 1180): utilidades de las pruebas del tema. Transpilan un .ts del front y lo
// corren en `vm` con imports simulados, sin Angular, Firebase ni red.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rxjs = require('rxjs');
const operators = require('rxjs/operators');

const RAIZ = path.resolve(__dirname, '../..');

function decorador() {
  return target => target;
}

// Cualquier import no declarado: decoradores que no hacen nada y clases vacías.
function moduloGenerico() {
  return new Proxy({}, {
    get: (_, clave) => (clave === '__esModule' ? false : function Generico() { return decorador(); }),
  });
}

function existe(rel) {
  return fs.existsSync(path.resolve(RAIZ, rel));
}

function cargarTs(rel, { modulos = {}, globales = {} } = {}) {
  const archivo = path.resolve(RAIZ, rel);
  const salida = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
    fileName: archivo,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true },
  }).outputText;
  const base = { rxjs, 'rxjs/operators': operators };
  const requerir = nombre => {
    if (Object.prototype.hasOwnProperty.call(modulos, nombre)) return modulos[nombre];
    if (Object.prototype.hasOwnProperty.call(base, nombre)) return base[nombre];
    return moduloGenerico();
  };
  const module = { exports: {} };
  const contexto = vm.createContext({
    module, exports: module.exports, require: requerir,
    console, setTimeout, clearTimeout, Promise,
    ...globales,
  });
  vm.runInContext(salida, contexto, { filename: archivo });
  return module.exports;
}

// Navegador simulado: <body>, el <link id="app-theme">, location y localStorage.
function navegadorFalso({ pathname = '/', user = null, almacenamientoRoto = false } = {}) {
  const clases = new Set();
  const link = {
    escrituras: 0,
    _href: './assets/scss/theme-lara-light-blue.scss',
    get href() { return this._href; },
    set href(valor) { this._href = valor; this.escrituras++; },
    getAttribute(nombre) { return nombre === 'href' ? this._href : null; },
  };
  const style = {
    removeProperty(nombre) {
      if (nombre === 'background-color') delete this.backgroundColor;
    },
  };
  const body = {
    style,
    classList: {
      add: c => { clases.add(c); },
      remove: c => { clases.delete(c); },
      contains: c => clases.has(c),
      toggle: (c, forzar) => {
        const prender = forzar === undefined ? !clases.has(c) : !!forzar;
        if (prender) clases.add(c); else clases.delete(c);
        return prender;
      },
    },
  };
  const location = { pathname };
  const document = {
    body,
    location,
    documentElement: { lang: 'es', style: { setProperty() {} } },
    getElementById: id => (id === 'app-theme' ? link : null),
    querySelector: () => null,
  };
  const datos = new Map();
  if (user) datos.set('user', JSON.stringify(user));
  const localStorage = almacenamientoRoto
    ? {
      getItem() { throw new Error('almacenamiento bloqueado'); },
      setItem() { throw new Error('almacenamiento bloqueado'); },
      removeItem() {},
    }
    : {
      getItem: clave => (datos.has(clave) ? datos.get(clave) : null),
      setItem: (clave, valor) => { datos.set(clave, String(valor)); },
      removeItem: clave => { datos.delete(clave); },
    };
  const window = { location, localStorage, matchMedia: () => ({ matches: false, addEventListener() {} }) };
  const usuario = () => {
    const raw = datos.get('user');
    return raw ? JSON.parse(raw) : null;
  };
  return { document, localStorage, window, link, usuario };
}

// Eventos del router (la prueba crea las instancias con estas mismas clases).
class NavigationEnd {
  constructor(id, url, urlAfterRedirects) { Object.assign(this, { id, url, urlAfterRedirects }); }
}
class NavigationCancel {
  constructor(id, url, reason) { Object.assign(this, { id, url, reason }); }
}
class NavigationError {
  constructor(id, url, error) { Object.assign(this, { id, url, error }); }
}
const routerModulo = { NavigationEnd, NavigationCancel, NavigationError, Router: class Router {} };

// La configuración real de rutas: `app-routing.module.ts` con `content` de `routes.ts`.
function cargarRutasApp() {
  class ContentComponent {}
  const { content } = cargarTs('src/app/shared/routes/routes.ts');
  let rutas = null;
  cargarTs('src/app/app-routing.module.ts', {
    modulos: {
      '@angular/router': { RouterModule: { forRoot: r => { rutas = r; return {}; } } },
      './shared/routes/routes': { content },
      './shared/components/layout/content/content.component': { ContentComponent },
    },
  });
  return { rutas, ContentComponent };
}

// Árbol activado mínimo (ActivatedRouteSnapshot) para una ruta de primer nivel.
function arbolActivado(rutaConfig) {
  const hoja = { routeConfig: (rutaConfig.children || [])[0] || null, children: [] };
  return { routeConfig: null, children: [{ routeConfig: rutaConfig, children: [hoja] }] };
}

function routerFalso(rutas) {
  return {
    events: new rxjs.Subject(),
    config: rutas,
    routerState: { snapshot: { root: { routeConfig: null, children: [] } } },
  };
}

function layoutFalso() {
  return { config: { settings: { layout_version: 'light-only' } } };
}

// Servicio del tema contra el navegador simulado (null si todavía no existe).
function crearServicioTema(nav, router, layout = layoutFalso()) {
  const rel = 'src/app/shared/services/theme-mode.service.ts';
  if (!existe(rel)) return null;
  const { NgpThemeService } = cargarTs('src/app/shared/services/ngtheme.service.ts');
  const mod = cargarTs(rel, {
    modulos: { '@angular/router': routerModulo, '@angular/common': { DOCUMENT: {} } },
    globales: { localStorage: nav.localStorage, document: nav.document, window: nav.window },
  });
  const servicio = new mod.ThemeModeService(router, layout, new NgpThemeService(nav.document), nav.document);
  return { servicio, mod, layout };
}

// Nombres de los parámetros del constructor de la clase exportada de un .ts.
function parametrosConstructor(rel) {
  const archivo = path.resolve(RAIZ, rel);
  const fuente = ts.createSourceFile(archivo, fs.readFileSync(archivo, 'utf8'), ts.ScriptTarget.Latest, true);
  const clase = fuente.statements.find(n => ts.isClassDeclaration(n));
  const ctor = clase.members.find(m => ts.isConstructorDeclaration(m));
  return ctor ? ctor.parameters.map(p => p.name.getText(fuente)) : [];
}

module.exports = {
  RAIZ, existe, cargarTs, navegadorFalso, routerModulo, NavigationEnd, NavigationCancel, NavigationError,
  cargarRutasApp, arbolActivado, routerFalso, layoutFalso, crearServicioTema, parametrosConstructor,
};
