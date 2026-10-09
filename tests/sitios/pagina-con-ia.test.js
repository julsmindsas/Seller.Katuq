'use strict';
/**
 * Página con IA desde una descripción (bandera `landingPrompt`) — front.
 *
 *   node --test tests/sitios/pagina-con-ia.test.js
 *
 * Tres partes:
 *  1. La lógica pura (`pagina-con-ia.logic.ts`): cuántas letras se piden, los ejemplos y los mensajes.
 *  2. El componente de verdad (`sitios-lista.component.ts`), sin Angular y con un servicio de mentira:
 *     un solo envío por intento, nada se manda con la bandera apagada, y mientras Opttia trabaja no se
 *     puede cerrar ni volver atrás.
 *  3. Contratos de las fuentes: la bandera, el servicio por BaseService, la opción solo con la bandera
 *     prendida y el tema canónico (sin degradados ni colores fuera de la tabla).
 *
 * Qué protege:
 *  - Con la bandera ausente no se dibuja nada nuevo en el asistente y el componente no envía nada.
 *  - Una descripción corta no llega al servidor; el mensaje es para el comercio, sin jerga.
 *  - Doble clic = un solo envío (cada envío gasta una página con Opttia del plan).
 *  - Los ejemplos que se ofrecen no traen teléfonos ni precios (el servidor no los dejaría pasar).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { Subject } = require('rxjs');

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const CARPETA = path.join(RAIZ, 'src/app/components/sitios');
const LISTA = path.join(CARPETA, 'lista');
const ARCHIVO_LISTA = path.join(LISTA, 'sitios-lista.component.ts');
const L = require(path.join(LISTA, 'pagina-con-ia.logic.ts'));
const leer = (ruta) => fs.readFileSync(ruta, 'utf8');

// ── 1. La lógica pura ────────────────────────────────────────────────────────

test('los topes son los mismos del servidor', () => {
  assert.equal(L.DESCRIPCION_MIN, 15);
  assert.equal(L.DESCRIPCION_MAX, 600);
  assert.equal(L.NOMBRE_MAX, 60);
  const servidor = path.resolve(RAIZ, '../katuq_admin_back_firebase/functions/services/sites/paginaDesdeDescripcion.js');
  if (fs.existsSync(servidor)) {
    const S = require(servidor);
    assert.equal(S.LIMITES.minDescripcion, L.DESCRIPCION_MIN);
    assert.equal(S.LIMITES.maxDescripcion, L.DESCRIPCION_MAX);
    assert.equal(S.LIMITES.maxNombre, L.NOMBRE_MAX);
  }
});

test('validarDescripcion: lo corto se rechaza con un mensaje para el comercio', () => {
  for (const corto of [undefined, null, '', '   ', 'hola', 'a'.repeat(14), '  ' + 'a '.repeat(6)]) {
    const r = L.validarDescripcion(corto);
    assert.equal(r.ok, false, JSON.stringify(corto));
    assert.match(r.mensaje, /Cuéntanos un poco más de tu negocio \(mínimo 15 letras\)/);
  }
  const ok = L.validarDescripcion('   Vendo   flores \n en Medellín  ');
  assert.deepEqual(ok, { ok: true, descripcion: 'Vendo flores en Medellín' });
  assert.equal(L.validarDescripcion('a'.repeat(15)).ok, true);
  assert.equal(L.validarDescripcion('b'.repeat(5000)).descripcion.length, L.DESCRIPCION_MAX);
});

test('letrasQueFaltan cuenta lo que falta para el mínimo', () => {
  assert.equal(L.letrasQueFaltan(''), 15);
  assert.equal(L.letrasQueFaltan(undefined), 15);
  assert.equal(L.letrasQueFaltan('  abc  '), 12);
  assert.equal(L.letrasQueFaltan('a'.repeat(15)), 0);
  assert.equal(L.letrasQueFaltan('a'.repeat(100)), 0);
});

test('los ejemplos alcanzan el mínimo, caben en el tope y no traen teléfonos, precios, enlaces ni correos', () => {
  assert.ok(L.EJEMPLOS_DESCRIPCION.length >= 3);
  for (const e of L.EJEMPLOS_DESCRIPCION) {
    assert.ok(e.titulo.length > 0);
    assert.ok(e.texto.length >= L.DESCRIPCION_MIN && e.texto.length <= L.DESCRIPCION_MAX, e.titulo);
    assert.equal(L.validarDescripcion(e.texto).ok, true, e.titulo);
    assert.ok(!/\d{6,}|\$|https?:|www\.|@|\.com|\.co\b/i.test(e.texto), `${e.titulo}: sin datos que el servidor rechazaría`);
  }
});

test('mensajeDeErrorPaginaConIA: el del servidor si viene; si no, uno sin jerga', () => {
  assert.equal(
    L.mensajeDeErrorPaginaConIA({ error: { message: 'Tu plan permite 3 páginas con Opttia al mes.' } }),
    'Tu plan permite 3 páginas con Opttia al mes.',
  );
  assert.match(L.mensajeDeErrorPaginaConIA({ status: 0 }), /Revisa tu internet/);
  for (const raro of [undefined, null, {}, { status: 500 }, { error: {} }, { error: { message: '   ' } }]) {
    const m = L.mensajeDeErrorPaginaConIA(raro);
    assert.match(m, /No pudimos crear la página/);
    assert.ok(!/undefined|null|\[object|HttpErrorResponse|stack/i.test(m));
  }
});

// ── 2. El componente de verdad ───────────────────────────────────────────────

function cargarLista() {
  const sandbox = { console, setInterval, clearInterval, setTimeout, clearTimeout };
  const contexto = vm.createContext(sandbox);
  const cache = new Map();
  const stubs = {
    '@angular/core': { Component: () => (clase) => clase, HostListener: () => () => undefined },
    sweetalert2: { default: { fire: () => Promise.resolve({}) } },
    '@angular/router': { Router: class {} },
    'ngx-toastr': { ToastrService: class {} },
    '../../../../environments/environment': { environment: { dominioSitios: 'katuq.com' } },
  };
  function cargar(archivo) {
    if (cache.has(archivo)) return cache.get(archivo).exports;
    const codigo = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, importHelpers: false },
    }).outputText;
    const modulo = { exports: {} };
    cache.set(archivo, modulo);
    const requerir = (nombre) => {
      if (Object.prototype.hasOwnProperty.call(stubs, nombre)) return stubs[nombre];
      if (nombre.startsWith('.')) return cargar(path.resolve(path.dirname(archivo), `${nombre}.ts`));
      return require(nombre);
    };
    vm.runInContext(`(function (exports, require, module) {${codigo}\n})`, contexto)(modulo.exports, requerir, modulo);
    return modulo.exports;
  }
  return cargar(ARCHIVO_LISTA).SitiosListaComponent;
}

const DESCRIPCION = 'Vendo ramos de flores en Medellín y quiero que me escriban por WhatsApp';

function crear({ bandera = true } = {}) {
  const Clase = cargarLista();
  const envios = [];
  const respuestas = [];
  const servicio = {
    crearConDescripcion(cuerpo) {
      envios.push(cuerpo);
      const s = new Subject();
      respuestas.push(s);
      return s;
    },
    plantillas: () => new Subject(),
  };
  const navegaciones = [];
  const router = { navigate: (ruta) => navegaciones.push(ruta) };
  const avisos = { warning: [], error: [] };
  const toastr = { warning: (m) => avisos.warning.push(m), error: (m) => avisos.error.push(m), success() {}, info() {} };
  const banderas = [];
  const features = { isEnabled: (flag) => (banderas.push(flag), flag === 'landingPrompt' && bandera === true) };
  const c = new Clase(servicio, router, toastr, features);
  c.plantillas = [{ id: 'p' }]; // abrirAsistente no pide plantillas de nuevo
  return { c, envios, respuestas, navegaciones, avisos, banderas };
}

test('con la bandera APAGADA no se abre el paso ni se manda nada', () => {
  const { c, envios, avisos } = crear({ bandera: false });
  c.abrirAsistente();
  c.abrirDescribe();
  assert.equal(c.paso, 'tipo');
  c.descripcionIA = DESCRIPCION;
  c.crearConIA();
  assert.deepEqual(envios, []);
  assert.deepEqual(avisos.error, []);
  assert.equal(c.creandoConIA, false);
});

test('con la bandera prendida el paso se abre y atrás vuelve a las opciones', () => {
  const { c } = crear();
  c.abrirAsistente();
  c.abrirDescribe();
  assert.equal(c.paso, 'describe');
  c.atras();
  assert.equal(c.paso, 'tipo');
});

test('una descripción corta no llega al servidor: aviso claro y nada queda "creando"', () => {
  const { c, envios, avisos } = crear();
  c.abrirAsistente();
  c.abrirDescribe();
  c.descripcionIA = 'flores';
  assert.equal(c.letrasFaltantes, 9);
  c.crearConIA();
  assert.deepEqual(envios, []);
  assert.equal(avisos.warning.length, 1);
  assert.match(avisos.warning[0], /Cuéntanos un poco más/);
  assert.equal(c.creandoConIA, false);
});

test('envío válido: un solo envío aunque se toque dos veces, y al terminar abre el editor', () => {
  const { c, envios, respuestas, navegaciones } = crear();
  c.abrirAsistente();
  c.abrirDescribe();
  c.descripcionIA = `  ${DESCRIPCION}  `;
  c.nombreIA = '  Flores del Valle ';
  c.crearConIA();
  c.crearConIA();
  c.crearConIA();
  assert.equal(envios.length, 1, 'doble clic = un solo envío');
  assert.equal(JSON.stringify(envios[0]), JSON.stringify({ descripcion: DESCRIPCION, nombre: 'Flores del Valle' }));
  assert.equal(c.creandoConIA, true);

  // Mientras Opttia trabaja no se puede cerrar ni volver atrás ni cambiar el texto con un ejemplo.
  c.cerrarAsistente();
  assert.equal(c.mostrandoAsistente, true);
  c.atras();
  assert.equal(c.paso, 'describe');
  c.usarEjemplo('otro texto distinto de los ejemplos para la prueba');
  assert.equal(c.descripcionIA, `  ${DESCRIPCION}  `);

  respuestas[0].next({ success: true, data: { id: 'sitio9', nombre: 'Flores del Valle' } });
  assert.equal(c.creandoConIA, false);
  assert.equal(c.mostrandoAsistente, false);
  assert.equal(JSON.stringify(navegaciones), JSON.stringify([['/sitios/editor', 'sitio9']]));
});

test('si el servidor responde con error, el mensaje es el suyo y se puede reintentar', () => {
  const { c, envios, respuestas, navegaciones, avisos } = crear();
  c.abrirAsistente();
  c.abrirDescribe();
  c.descripcionIA = DESCRIPCION;
  c.crearConIA();
  respuestas[0].error({ status: 403, error: { message: 'Tu plan permite 3 páginas con Opttia al mes.' } });
  assert.deepEqual(avisos.error, ['Tu plan permite 3 páginas con Opttia al mes.']);
  assert.equal(c.creandoConIA, false);
  assert.deepEqual(navegaciones, []);
  assert.equal(c.mostrandoAsistente, true);
  assert.equal(c.descripcionIA, DESCRIPCION, 'el texto no se pierde');
  c.crearConIA();
  assert.equal(envios.length, 2, 'se puede reintentar');
});

test('una respuesta sin id no navega a ningún lado', () => {
  const { c, respuestas, navegaciones, avisos } = crear();
  c.abrirAsistente();
  c.abrirDescribe();
  c.descripcionIA = DESCRIPCION;
  c.crearConIA();
  respuestas[0].next({ success: false, message: 'No pudimos crear la página.' });
  assert.deepEqual(navegaciones, []);
  assert.equal(avisos.error.length, 1);
  assert.equal(c.creandoConIA, false);
});

test('al abrir el asistente de nuevo el texto anterior se borra; un ejemplo llena el cuadro', () => {
  const { c } = crear();
  c.abrirAsistente();
  c.abrirDescribe();
  c.usarEjemplo(L.EJEMPLOS_DESCRIPCION[0].texto);
  assert.equal(c.descripcionIA, L.EJEMPLOS_DESCRIPCION[0].texto);
  c.cerrarAsistente();
  c.abrirAsistente();
  assert.equal(c.descripcionIA, '');
  assert.equal(c.nombreIA, '');
  assert.equal(c.paso, 'tipo');
});

// ── 3. Contratos de las fuentes ──────────────────────────────────────────────

test('la bandera está en el catálogo del front y del servidor', () => {
  assert.match(leer(path.join(RAIZ, 'src/app/shared/services/company-features.service.ts')), /'landingPrompt'/);
  const servidor = path.resolve(RAIZ, '../katuq_admin_back_firebase/functions/services/companyFeatureFlags.js');
  if (fs.existsSync(servidor)) assert.match(leer(servidor), /"landingPrompt"/);
});

test('la opción y el paso solo se dibujan con la bandera prendida', () => {
  const html = leer(path.join(LISTA, 'sitios-lista.component.html'));
  assert.match(html, /\*ngIf="features\.isEnabled\('landingPrompt'\)"\s*\n\s*\(click\)="abrirDescribe\(\)"/);
  assert.match(html, /\*ngIf="paso === 'describe'"/);
  assert.match(html, /Descríbela y la armamos con IA/);
});

test('el componente nunca usa HttpClient: habla por el servicio (BaseService) a la ruta de la función', () => {
  const ts_ = leer(ARCHIVO_LISTA);
  assert.ok(!/HttpClient/.test(ts_));
  const servicio = leer(path.join(CARPETA, 'sitios.service.ts'));
  assert.match(servicio, /crearConDescripcion\([\s\S]*?this\.post<any>\("\/v1\/onboarding\/pagina-con-ia", body\)/);
});

test('los estilos nuevos siguen el tema canónico: sin degradados ni colores fuera de la tabla', () => {
  const scss = leer(path.join(LISTA, 'sitios-lista.component.scss'));
  const desde = scss.indexOf('"Descríbela y la armamos con IA"');
  assert.ok(desde > 0, 'se encontró el bloque nuevo');
  const bloque = scss.slice(desde, desde + 1200);
  assert.ok(!/gradient\(/.test(bloque));
  assert.ok(!/#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea/i.test(bloque));
});
