'use strict';

// D-502 (ticket 1180), fase 0: un solo dueño del tema. Corre el ThemeModeService real contra
// un navegador simulado y la configuración real de rutas.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  existe, cargarTs, navegadorFalso, routerModulo, NavigationEnd, NavigationCancel,
  cargarRutasApp, arbolActivado, routerFalso, crearServicioTema, parametrosConstructor,
} = require('./cargar-ts');

const SERVICIO = 'src/app/shared/services/theme-mode.service.ts';
const USUARIO = { email: 'ana@comercio.co', company: 'COMERCIO', nit: '900', token: 'a.b.c', lang: { code: 'es' }, tema: true };

const { rutas, ContentComponent } = cargarRutasApp();
const rutaMarco = rutas.find(r => r.path === '' && r.component === ContentComponent);
const rutaTerminos = rutas.find(r => r.path === 'terms-conditions');

function servicioExiste() {
  assert.ok(existe(SERVICIO), 'falta src/app/shared/services/theme-mode.service.ts (tarea 2.2)');
}

function montar({ pathname, user = USUARIO, almacenamientoRoto = false } = {}) {
  servicioExiste();
  const nav = navegadorFalso({ pathname, user, almacenamientoRoto });
  const router = routerFalso(rutas);
  const { servicio, layout } = crearServicioTema(nav, router);
  let ultimo = null;
  servicio.isDark$.subscribe(valor => { ultimo = valor; });
  const navegar = (rutaConfig, url) => {
    nav.document.location.pathname = url;
    router.routerState.snapshot.root = arbolActivado(rutaConfig);
    router.events.next(new NavigationEnd(1, url, url));
  };
  return { nav, router, servicio, layout, navegar, oscuro: () => ultimo };
}

function claseOscura(nav) {
  return nav.document.body.classList.contains('dark-only');
}

test('1. al arrancar en el marco con tema oscuro queda oscuro antes de cualquier evento del router', () => {
  const { nav, layout, oscuro } = montar({ pathname: '/ventas/todos-los-pedidos' });
  assert.equal(claseOscura(nav), true);
  assert.equal(nav.link.href, 'katuq-dark.css');
  assert.equal(layout.config.settings.layout_version, 'dark-only');
  assert.equal(oscuro(), true);
});

test('1. al arrancar en /terms-conditions con la misma sesión oscura queda claro', () => {
  const { nav, oscuro } = montar({ pathname: '/terms-conditions' });
  assert.equal(claseOscura(nav), false);
  assert.equal(nav.link.href, 'lara-light-blue.css');
  assert.equal(oscuro(), false);
});

test('2. las cuatro rutas con ContentComponent llevan data.shell y ninguna otra', () => {
  const marcadas = rutas.filter(r => r.data && r.data.shell === true).map(r => r.path);
  const conMarco = rutas.filter(r => r.component === ContentComponent).map(r => r.path);
  assert.deepEqual(marcadas, conMarco);
  assert.deepEqual([...conMarco].sort(), ['', 'agent-builder', 'billing', 'pricing']);
  // agent-builder conserva su dato de suscripción
  assert.equal(rutas.find(r => r.path === 'agent-builder').data.requiresPremium, true);
});

test('2. isShellUrl reconoce el marco, :param, /, /login y rutas desconocidas', () => {
  servicioExiste();
  const { isShellUrl } = cargarTs(SERVICIO, { modulos: { '@angular/router': routerModulo } });
  // las cuatro rutas del marco: content, agent-builder, pricing y billing
  assert.equal(isShellUrl('/ventas/todos-los-pedidos', rutas), true);
  assert.equal(isShellUrl('/inventario', rutas), true);
  assert.equal(isShellUrl('/agent-builder', rutas), true);
  assert.equal(isShellUrl('/agent-builder/agentes/12', rutas), true);
  assert.equal(isShellUrl('/pricing', rutas), true);
  assert.equal(isShellUrl('/billing/', rutas), true);
  // un :param acepta cualquier valor
  assert.equal(isShellUrl('/empresas/editar/AbC123', rutas), true);
  // ruta de varios segmentos antes de su prefijo
  assert.equal(isShellUrl('/notificaciones/whatsapp/inbox', rutas), true);
  // fuera del marco
  assert.equal(isShellUrl('/', rutas), false);
  assert.equal(isShellUrl('', rutas), false);
  assert.equal(isShellUrl('/login', rutas), false);
  assert.equal(isShellUrl('/terms-conditions', rutas), false);
  assert.equal(isShellUrl('/registrarse', rutas), false);
  assert.equal(isShellUrl('/video-agent', rutas), false);
  assert.equal(isShellUrl('/s/mi-tienda', rutas), false);
  assert.equal(isShellUrl('/ruta-que-no-existe', rutas), false);
  assert.equal(isShellUrl('/ventas', null), false);
});

test('3. NavigationEnd: marco oscuro, pública clara con sesión oscura y NavigationCancel no cambia nada', () => {
  const { nav, router, navegar, oscuro } = montar({ pathname: '/login' });
  assert.equal(claseOscura(nav), false);
  navegar(rutaMarco, '/ventas');
  assert.equal(claseOscura(nav), true);
  assert.equal(oscuro(), true);
  navegar(rutaTerminos, '/terms-conditions');
  assert.equal(claseOscura(nav), false);
  assert.equal(oscuro(), false);
  navegar(rutaMarco, '/inventario');
  assert.equal(claseOscura(nav), true);
  // una navegación cancelada (p. ej. un guard que dice no) deja el tema como estaba
  router.routerState.snapshot.root = arbolActivado(rutaTerminos);
  router.events.next(new NavigationCancel(2, '/terms-conditions', 'guard'));
  assert.equal(claseOscura(nav), true);
  assert.equal(oscuro(), true);
});

test('4. una copia vieja del user con la misma identidad no cambia el tema; otro usuario sí relee', () => {
  const { nav, navegar, oscuro } = montar({ pathname: '/ventas' });
  assert.equal(oscuro(), true);
  // otro componente guarda la copia que leyó antes de que el usuario prendiera el oscuro
  nav.localStorage.setItem('user', JSON.stringify({ ...USUARIO, tema: false, lang: { code: 'en' } }));
  navegar(rutaMarco, '/inventario');
  assert.equal(oscuro(), true);
  assert.equal(claseOscura(nav), true);
  // entra otro usuario en el mismo navegador, con el claro elegido
  nav.localStorage.setItem('user', JSON.stringify({ ...USUARIO, email: 'luis@comercio.co', tema: false }));
  navegar(rutaMarco, '/ventas');
  assert.equal(oscuro(), false);
  assert.equal(claseOscura(nav), false);
  // y otra empresa con el oscuro
  nav.localStorage.setItem('user', JSON.stringify({ ...USUARIO, email: 'luis@comercio.co', company: 'OTRA', tema: true }));
  navegar(rutaMarco, '/ventas');
  assert.equal(oscuro(), true);
});

test('4. la sesión que termina deja el claro y la memoria vacía', () => {
  const { nav, navegar, oscuro } = montar({ pathname: '/ventas' });
  nav.localStorage.removeItem('user');
  navegar(rutaMarco, '/ventas');
  assert.equal(oscuro(), false);
  assert.equal(claseOscura(nav), false);
});

test('5. reset() quita la clase y el fondo en línea y deja el bundle claro', () => {
  const { nav, servicio, layout, oscuro } = montar({ pathname: '/ventas' });
  nav.document.body.style.backgroundColor = 'black'; // lo que dejaba el header viejo
  servicio.reset();
  assert.equal(claseOscura(nav), false);
  assert.equal(nav.document.body.style.backgroundColor, undefined);
  assert.equal(nav.link.href, 'lara-light-blue.css');
  assert.equal(layout.config.settings.layout_version, 'light');
  assert.equal(oscuro(), false);
});

// Tarea 2.5 (auth.service.ts es sensible): diff aprobado por Daniel el 2026-10-18 y aplicado.
test('5. SignOut() deja el claro sin recargar: sin clase, sin fondo en línea y con el bundle claro', () => {
  const { nav, servicio, oscuro } = montar({ pathname: '/ventas' });
  assert.equal(oscuro(), true);
  nav.document.body.style.backgroundColor = 'black';
  const utilidades = cargarTs('src/app/shared/utils/app-language.utils.ts');
  const AUTH = 'src/app/shared/services/firebase/auth.service.ts';
  const { AuthService } = cargarTs(AUTH, {
    modulos: {
      '../../utils/app-language.utils': utilidades,
      '../../../components/onboarding/utils/onboarding-v2.utils': { clearOnboardingStorage() {} },
    },
    globales: { document: nav.document, localStorage: nav.localStorage, sessionStorage: { removeItem() {} }, window: nav.window },
  });
  const rutasPedidas = [];
  const fakes = {
    services: {}, ngZone: {}, toster: {}, onboardingService: {}, navServices: {},
    router: { navigateByUrl: url => { rutasPedidas.push({ url, oscuro: claseOscura(nav) }); } },
    translate: { setDefaultLang() {}, use() {} },
    initializationService: { resetInitialization() {} },
    loaderService: { reset() {} },
    themeMode: servicio,
  };
  const auth = new AuthService(...parametrosConstructor(AUTH).map(nombre => fakes[nombre]));
  auth.SignOut();
  assert.deepEqual(rutasPedidas, [{ url: '/login', oscuro: false }], 'el claro se aplica antes de navegar');
  assert.equal(claseOscura(nav), false);
  assert.equal(nav.document.body.style.backgroundColor, undefined);
  assert.equal(nav.link.href, 'lara-light-blue.css');
  assert.equal(oscuro(), false);
  assert.equal(nav.usuario(), null);
});

test('5. apply quita el fondo en línea también al prender el oscuro', () => {
  const { nav, servicio } = montar({ pathname: '/ventas', user: { ...USUARIO, tema: false } });
  nav.document.body.style.backgroundColor = 'white';
  servicio.apply(true);
  assert.equal(nav.document.body.style.backgroundColor, undefined);
  assert.equal(claseOscura(nav), true);
});

test('5. setPreference cambia solo tema en el user guardado y aplica', () => {
  const { nav, servicio, oscuro } = montar({ pathname: '/ventas', user: { ...USUARIO, tema: false } });
  assert.equal(oscuro(), false);
  servicio.setPreference(true);
  assert.deepEqual(nav.usuario(), { ...USUARIO, tema: true });
  assert.equal(claseOscura(nav), true);
  assert.equal(oscuro(), true);
  // otro escritor cambió el idioma entre tanto: setPreference relee y no lo pisa
  nav.localStorage.setItem('user', JSON.stringify({ ...USUARIO, tema: true, lang: { code: 'pt' } }));
  servicio.setPreference(false);
  assert.deepEqual(nav.usuario(), { ...USUARIO, tema: false, lang: { code: 'pt' } });
  assert.equal(claseOscura(nav), false);
});

test('5. la preferencia elegida en la sesión sobrevive a navegar', () => {
  const { servicio, navegar, oscuro } = montar({ pathname: '/ventas', user: { ...USUARIO, tema: false } });
  servicio.setPreference(true);
  navegar(rutaMarco, '/inventario');
  assert.equal(oscuro(), true);
});

test('6. con el almacenamiento roto o bloqueado queda claro y no lanza', () => {
  const { nav, servicio, navegar, oscuro } = montar({ pathname: '/ventas', almacenamientoRoto: true });
  assert.equal(oscuro(), false);
  assert.equal(claseOscura(nav), false);
  assert.doesNotThrow(() => navegar(rutaMarco, '/inventario'));
  assert.doesNotThrow(() => servicio.setPreference(true));
  assert.doesNotThrow(() => servicio.reset());
  assert.equal(oscuro(), false);
});

test('6. user corrupto en localStorage: claro y sin lanzar', () => {
  servicioExiste();
  const nav = navegadorFalso({ pathname: '/ventas' });
  nav.localStorage.setItem('user', '{no es json');
  const { servicio } = crearServicioTema(nav, routerFalso(rutas));
  let ultimo = null;
  servicio.isDark$.subscribe(v => { ultimo = v; });
  assert.equal(ultimo, false);
});

test('6. navegar dentro del marco no vuelve a tocar el <link> del tema', () => {
  const { nav, navegar } = montar({ pathname: '/ventas' });
  const escrituras = nav.link.escrituras;
  navegar(rutaMarco, '/inventario');
  navegar(rutaMarco, '/despachos');
  navegar(rutaMarco, '/ventas/todos-los-pedidos');
  assert.equal(nav.link.escrituras, escrituras);
});

test('6. con index.html ya en lara-light-blue.css, arrancar en claro no toca el <link>', () => {
  servicioExiste();
  const nav = navegadorFalso({ pathname: '/login' });
  nav.link._href = 'lara-light-blue.css';
  crearServicioTema(nav, routerFalso(rutas));
  assert.equal(nav.link.escrituras, 0);
});
