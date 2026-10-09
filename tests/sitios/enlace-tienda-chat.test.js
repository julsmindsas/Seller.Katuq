'use strict';
/**
 * El chat de Opttia entrega el enlace para crear la tienda con IA (D-385, chat-crea-tienda) — front.
 *
 *   node --test tests/sitios/enlace-tienda-chat.test.js
 *
 * Qué protege:
 *  - El enlace (`/sitios?tiendaEnUnPaso=1&nombre=…&descripcion=…`) solo abre la pantalla con la bandera
 *    singleStepStore prendida; apagada no hace nada. Abrirlo NO crea nada: solo precarga el formulario.
 *  - Lo que llega por la dirección se trata como texto de formulario (sin < >, recortado a los topes).
 *  - La dirección se limpia (un refresco no reabre la pantalla) y se abre una sola vez, cuando la lista ya cargó.
 *  - Con una tienda sin terminar se muestra su avance, no el formulario precargado.
 *  - El chip "Crear mi tienda con IA" solo sale si la herramienta le llegó a la persona, y no manda nada solo:
 *    llena el cuadro para que el nombre y lo que vende viajen juntos con la intención (el chat no recuerda mensajes).
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { of, throwError } = require('rxjs');

require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'CommonJS' } });

const RAIZ = path.resolve(__dirname, '../..');
const SITIOS = path.join(RAIZ, 'src/app/components/sitios');
const LISTA = path.join(SITIOS, 'lista');
const ARCHIVO_LISTA = path.join(LISTA, 'sitios-lista.component.ts');
const ARCHIVO_TIENDA = path.join(SITIOS, 'tienda-en-un-paso/tienda-en-un-paso.component.ts');
const ARCHIVO_CHAT = path.join(RAIZ, 'src/app/shared/components/opttia-chat/opttia-chat.component.ts');
const E = require(path.join(LISTA, 'enlace-tienda.logic.ts'));
const leer = (ruta) => fs.readFileSync(ruta, 'utf8');

/** Carga un archivo TypeScript en un sandbox, con módulos de Angular de mentira. */
function cargar(archivo, stubs, extras = {}) {
  const contexto = vm.createContext({ console, setTimeout, clearTimeout, setInterval, clearInterval, crypto: require('node:crypto').webcrypto, ...extras });
  const cache = new Map();
  function cargarUno(ruta) {
    if (cache.has(ruta)) return cache.get(ruta).exports;
    const codigo = ts.transpileModule(fs.readFileSync(ruta, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, importHelpers: false },
    }).outputText;
    const modulo = { exports: {} };
    cache.set(ruta, modulo);
    const requerir = (nombre) => {
      if (Object.prototype.hasOwnProperty.call(stubs, nombre)) return stubs[nombre];
      if (nombre.startsWith('.')) return cargarUno(path.resolve(path.dirname(ruta), `${nombre}.ts`));
      return require(nombre);
    };
    vm.runInContext(`(function (exports, require, module) {${codigo}\n})`, contexto)(modulo.exports, requerir, modulo);
    return modulo.exports;
  }
  return cargarUno(archivo);
}

const stubsAngular = {
  '@angular/core': {
    Component: () => (c) => c, Input: () => () => undefined, Output: () => () => undefined, HostListener: () => () => undefined,
    EventEmitter: class { emit() {} }, ViewChild: () => () => undefined,
  },
  '@angular/router': { Router: class {}, ActivatedRoute: class {} },
  'ngx-toastr': { ToastrService: class {} },
  sweetalert2: { default: { fire: () => Promise.resolve({}) } },
  '../../../../environments/environment': { environment: { dominioSitios: 'katuq.com' } },
  '../../../shared/services/productos/ficha-desde-foto.service': { FichaDesdeFotoService: class {} },
  './tienda-en-un-paso.service': { TiendaEnUnPasoService: class {} },
};

// ── 1. La lógica del enlace ──────────────────────────────────────────────────

const leerDe = (texto) => {
  const p = new URLSearchParams(texto);
  return (clave) => p.get(clave);
};

test('solo la dirección del chat se entiende; cualquier otra no abre nada', () => {
  assert.equal(E.leerEnlaceTienda(leerDe('')), null);
  assert.equal(E.leerEnlaceTienda(leerDe('nombre=Flores&descripcion=Vendo flores')), null);
  assert.equal(E.leerEnlaceTienda(leerDe('tiendaEnUnPaso=0&nombre=Flores')), null);
  assert.equal(E.leerEnlaceTienda(leerDe('tiendaEnUnPaso=true&nombre=Flores')), null);
  assert.equal(E.leerEnlaceTienda(undefined), null);
  const ok = E.leerEnlaceTienda(leerDe('tiendaEnUnPaso=1&nombre=Flores%20del%20Valle&descripcion=Vendo%20ramos'));
  assert.equal(JSON.stringify(ok), JSON.stringify({ nombre: 'Flores del Valle', descripcion: 'Vendo ramos' }));
});

test('lo que llega por la dirección se limpia y se recorta a los topes de la pantalla', () => {
  const r = E.leerEnlaceTienda(leerDe(`tiendaEnUnPaso=1&nombre=${encodeURIComponent('<script>x</script>  ' + 'N'.repeat(200))}&descripcion=${encodeURIComponent('<b>hola</b>\n\n\tmundo ' + 'd'.repeat(500))}`));
  assert.ok(r.nombre.length <= 80 && r.descripcion.length <= 300);
  assert.ok(!/[<>]/.test(r.nombre + r.descripcion));
  assert.ok(!/[\n\t]/.test(r.descripcion));
  assert.match(r.descripcion, /^bhola\/b mundo d/);
  const vacio = E.leerEnlaceTienda(leerDe('tiendaEnUnPaso=1'));
  assert.equal(JSON.stringify(vacio), JSON.stringify({ nombre: '', descripcion: '' }));
});

test('el enlace que arma la herramienta del servidor se lee igual (ida y vuelta)', () => {
  const servidor = path.resolve(RAIZ, '../katuq_admin_back_firebase/functions/tools/getSingleStepStoreLink.js');
  if (!fs.existsSync(servidor)) return;
  const { crearHerramienta } = require(servidor);
  const tool = crearHerramienta({ isFeatureEnabled: async () => true, hasEcommerceSync: async () => false });
  return tool.execute(
    { businessName: 'Café & Té "El Rincón"', description: 'Vendo café, té y postres? a=b&c=d #hola' },
    { mcpCompany: 'FLORECER', userRole: 'Administrador' },
  ).then((r) => {
    const url = new URL(r.link);
    assert.equal(url.pathname, '/sitios');
    const precarga = E.leerEnlaceTienda((clave) => url.searchParams.get(clave));
    assert.equal(precarga.nombre, 'Café & Té "El Rincón"');
    assert.equal(precarga.descripcion, 'Vendo café, té y postres? a=b&c=d #hola');
  });
});

// ── 2. La lista ──────────────────────────────────────────────────────────────

function crearLista({ bandera = true, query = 'tiendaEnUnPaso=1&nombre=Flores%20del%20Valle&descripcion=Vendo%20ramos%20en%20Medell%C3%ADn', sitios = [], falla = false } = {}) {
  const { SitiosListaComponent } = cargar(ARCHIVO_LISTA, stubsAngular);
  const servicio = {
    creaciones: 0,
    listar: () => (falla ? throwError(() => new Error('sin red')) : of({ data: sitios })),
    kitDeMarca: () => of({ data: {} }),
    crearConDescripcion: () => { servicio.creaciones++; return of({}); },
  };
  const navegaciones = [];
  const router = { navigate: (...a) => { navegaciones.push(a); return Promise.resolve(true); } };
  const toastr = { error() {}, warning() {}, success() {}, info() {} };
  const features = { isEnabled: (f) => f === 'singleStepStore' && bandera === true };
  const p = new URLSearchParams(query);
  const route = { snapshot: { queryParamMap: { get: (k) => p.get(k) } } };
  const c = new SitiosListaComponent(servicio, router, toastr, features, route);
  return { c, servicio, navegaciones, route };
}

test('con la bandera prendida el enlace abre la tienda en un paso con los datos puestos, sin crear nada', () => {
  const { c, servicio, navegaciones, route } = crearLista();
  c.ngOnInit();
  assert.equal(c.mostrandoTiendaEnUnPaso, true);
  assert.equal(c.precargaNombre, 'Flores del Valle');
  assert.equal(c.precargaDescripcion, 'Vendo ramos en Medellín');
  assert.equal(c.sitioPendienteId, '');
  assert.equal(servicio.creaciones, 0, 'abrir el enlace no crea nada');
  // La dirección se limpia (un refresco no lo reabre): mismos parámetros vacíos, sin agregar al historial.
  assert.equal(navegaciones.length, 1);
  const [comandos, extras] = navegaciones[0];
  assert.equal(JSON.stringify(comandos), '[]');
  assert.equal(extras.relativeTo, route);
  assert.equal(JSON.stringify(extras.queryParams), '{}');
  assert.equal(extras.replaceUrl, true);
});

test('con la bandera APAGADA el enlace no hace nada: ni abre, ni precarga, ni toca la dirección', () => {
  const { c, navegaciones } = crearLista({ bandera: false });
  c.ngOnInit();
  assert.equal(c.mostrandoTiendaEnUnPaso, false);
  assert.equal(c.precargaNombre, '');
  assert.equal(c.precargaDescripcion, '');
  assert.equal(navegaciones.length, 0);
});

test('sin el enlace del chat la lista se comporta como siempre', () => {
  const { c, navegaciones } = crearLista({ query: '' });
  c.ngOnInit();
  assert.equal(c.mostrandoTiendaEnUnPaso, false);
  assert.equal(navegaciones.length, 0);
  // Un componente construido sin ruta (como antes) tampoco falla.
  const { SitiosListaComponent } = cargar(ARCHIVO_LISTA, stubsAngular);
  const c2 = new SitiosListaComponent({ listar: () => of({ data: [] }), kitDeMarca: () => of({ data: {} }) }, {}, {}, { isEnabled: () => true });
  c2.ngOnInit();
  assert.equal(c2.mostrandoTiendaEnUnPaso, false);
});

test('se abre una sola vez: recargar la lista no reabre la pantalla', () => {
  const { c } = crearLista();
  c.ngOnInit();
  c.cerrarTiendaEnUnPaso();
  assert.equal(c.mostrandoTiendaEnUnPaso, false);
  assert.equal(c.precargaNombre, '', 'al cerrar se borra lo precargado');
  c.cargar();
  assert.equal(c.mostrandoTiendaEnUnPaso, false);
});

test('si la lista no pudo cargar, la pantalla se abre igual (el servidor revisa si hay un trabajo en curso)', () => {
  const { c } = crearLista({ falla: true });
  c.ngOnInit();
  assert.equal(c.mostrandoTiendaEnUnPaso, true);
  assert.equal(c.precargaNombre, 'Flores del Valle');
});

test('con una tienda sin terminar se muestra su avance (no el formulario precargado)', () => {
  const sitio = { id: 's1', nombre: 'Tienda a medias', estado: 'borrador', origen: 'tienda-en-un-paso', creationProgress: { state: 'interrupted' } };
  const { c } = crearLista({ sitios: [sitio] });
  c.ngOnInit();
  assert.equal(c.mostrandoTiendaEnUnPaso, true);
  assert.equal(c.sitioPendienteId, 's1');
});

// ── 3. La pantalla de la tienda en un paso ───────────────────────────────────

function crearPantalla({ nombreInicial, descripcionInicial, sitioPendienteId = '' } = {}) {
  const { TiendaEnUnPasoComponent } = cargar(ARCHIVO_TIENDA, stubsAngular, { window: {}, navigator: undefined });
  const servicio = { avance: () => of({ data: {} }), retomar: () => of({}), iniciar: () => { servicio.iniciadas++; return of({}); }, iniciadas: 0 };
  const c = new TiendaEnUnPasoComponent(servicio, {}, {}, { info() {}, error() {}, warning() {}, success() {} });
  c.sitioPendienteId = sitioPendienteId;
  if (nombreInicial !== undefined) c.nombreInicial = nombreInicial;
  if (descripcionInicial !== undefined) c.descripcionInicial = descripcionInicial;
  return { c, servicio };
}

test('la pantalla abre con el nombre y la descripción precargados, sin mandar nada', () => {
  const { c, servicio } = crearPantalla({ nombreInicial: '  Flores   del Valle ', descripcionInicial: 'Vendo ramos en Medellín' });
  c.ngOnInit();
  assert.equal(c.formulario.nombre, 'Flores del Valle');
  assert.equal(c.formulario.descripcion, 'Vendo ramos en Medellín');
  assert.equal(c.fase, 'formulario');
  assert.equal(c.formulario.fotos.length, 0);
  assert.equal(servicio.iniciadas, 0, 'precargar no manda nada: falta el clic de la persona');
  assert.equal(c.hayContenido, true, 'cerrar avisa que se perdería lo escrito');
});

test('la precarga respeta los topes y no pisa nada si no hay datos', () => {
  const { c } = crearPantalla({ nombreInicial: 'N'.repeat(200), descripcionInicial: 'd'.repeat(900) });
  c.ngOnInit();
  assert.equal(c.formulario.nombre.length, 80);
  assert.equal(c.formulario.descripcion.length, 300);
  const vacio = crearPantalla();
  vacio.c.ngOnInit();
  assert.equal(vacio.c.formulario.nombre, '');
  assert.equal(vacio.c.formulario.descripcion, '');
  assert.equal(vacio.c.hayContenido, false);
});

test('con una tienda pendiente se muestra su avance y la precarga no se usa', () => {
  const { c } = crearPantalla({ nombreInicial: 'Flores', descripcionInicial: 'Vendo ramos', sitioPendienteId: 's1' });
  c.ngOnInit();
  assert.equal(c.formulario.nombre, '');
  assert.equal(c.formulario.descripcion, '');
});

// ── 4. El chat ───────────────────────────────────────────────────────────────

function crearChat({ herramientas = [] } = {}) {
  const { OpttiaChatComponent } = cargar(ARCHIVO_CHAT, { ...stubsAngular, '@angular/core': { ...stubsAngular['@angular/core'], AfterViewChecked: class {}, ChangeDetectorRef: class {}, ElementRef: class {}, OnDestroy: class {}, OnInit: class {} } });
  const enviados = [];
  const opttia = { hasTool: (n) => herramientas.includes(n), canSend: true, enviar: (t) => enviados.push(t) };
  const c = new OpttiaChatComponent(opttia, {});
  c.send = async () => { enviados.push(c.draft); };
  return { c, enviados };
}

test('el chip "Crear mi tienda con IA" solo sale si la herramienta le llegó a la persona', () => {
  assert.equal(crearChat({ herramientas: [] }).c.canSuggestStore, false);
  assert.equal(crearChat({ herramientas: ['get_orders'] }).c.canSuggestStore, false);
  assert.equal(crearChat({ herramientas: ['get_single_step_store_link'] }).c.canSuggestStore, true);
  const html = leer(path.join(RAIZ, 'src/app/shared/components/opttia-chat/opttia-chat.component.html'));
  assert.match(html, /\*ngIf="canSuggestStore"[\s\S]*?\(click\)="fillStoreDraft\(\)"/);
});

test('el chip llena el cuadro con la intención y no manda nada solo', () => {
  const { c, enviados } = crearChat({ herramientas: ['get_single_step_store_link'] });
  c.fillStoreDraft();
  assert.match(c.draft, /^Quiero crear mi tienda con IA\./);
  assert.match(c.draft, /Mi negocio se llama/);
  assert.match(c.draft, /vendo/);
  assert.deepEqual(enviados, [], 'el mensaje sale cuando la persona lo completa y lo envía');
});

// ── 5. Contratos ─────────────────────────────────────────────────────────────

test('la pantalla recibe lo precargado desde la lista y el módulo no usa HttpClient en la lista', () => {
  const html = leer(path.join(LISTA, 'sitios-lista.component.html'));
  assert.match(html, /\[nombreInicial\]="precargaNombre"[\s\S]*?\[descripcionInicial\]="precargaDescripcion"/);
  assert.ok(!/HttpClient/.test(leer(ARCHIVO_LISTA)));
});
