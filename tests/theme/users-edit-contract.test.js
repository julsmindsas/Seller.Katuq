'use strict';

// D-502 (ticket 1180), Art. VIII: contrato del botón de tema con POST /v1/users/edit.
// El payload es exactamente { identificacion, tema }. Si el backend lo rechaza (403 de rol o 5xx),
// el tema se queda en el navegador, la clase no se revierte y no se cierra la sesión.
// Nunca llama al backend: MaestroService.updateUser va simulado.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const rxjs = require('rxjs');
const {
  cargarTs, navegadorFalso, cargarRutasApp, routerFalso, layoutFalso, crearServicioTema, parametrosConstructor,
} = require('./cargar-ts');

const HEADER = 'src/app/shared/components/header/header.component.ts';
const USUARIO = { email: 'ana@comercio.co', company: 'COMERCIO', nit: '900123', token: 'a.b.c', rol: 'Vendedor', tema: false };

// Un error que nadie atiende en el header no debe tumbar la prueba: se anota y se revisa.
const sinAtender = [];
rxjs.config.onUnhandledError = err => { sinAtender.push(err); };

const { rutas } = cargarRutasApp();

function montarHeader(respuesta) {
  const nav = navegadorFalso({ pathname: '/ventas', user: USUARIO });
  const router = routerFalso(rutas);
  const layout = layoutFalso();
  const tema = crearServicioTema(nav, router, layout);
  const llamadas = [];
  const cierres = [];
  const fakes = {
    layout,
    navServices: { collapseSidebar: false },
    ngpService: { switchTheme() {} },
    service: { updateUser: item => { llamadas.push(JSON.parse(JSON.stringify(item))); return respuesta(); } },
    document: nav.document,
    notificationService: { getNotifications: () => rxjs.of([]), markAsRead: () => Promise.resolve() },
    tourNavigationService: { showTourMenu() {} },
    subscriptionService: {},
    modal: {},
    authService: { SignOut: () => cierres.push(1) },
    themeMode: tema && tema.servicio,
  };
  const { HeaderComponent } = cargarTs(HEADER, {
    globales: { document: nav.document, localStorage: nav.localStorage, window: nav.window },
  });
  const args = parametrosConstructor(HEADER).map(nombre => {
    assert.ok(nombre in fakes, `parámetro sin simular en el header: ${nombre}`);
    return fakes[nombre];
  });
  const header = new HeaderComponent(...args);
  header.ngOnInit();
  return { header, nav, llamadas, cierres };
}

test('el botón llama updateUser con exactamente { identificacion, tema }', () => {
  const { header, llamadas } = montarHeader(() => rxjs.of({ ok: true }));
  header.layoutToggle();
  assert.deepEqual(llamadas, [{ identificacion: '900123', tema: true }]);
  header.layoutToggle();
  assert.deepEqual(llamadas[1], { identificacion: '900123', tema: false });
  header.ngOnDestroy();
});

test('con respuesta buena: tema queda guardado, la clase puesta y aria-pressed acompaña', () => {
  const { header, nav } = montarHeader(() => rxjs.of({ ok: true }));
  header.layoutToggle();
  assert.equal(nav.usuario().tema, true);
  assert.equal(nav.document.body.classList.contains('dark-only'), true);
  assert.equal(header.dark, true); // la plantilla pinta [attr.aria-pressed]="dark"
  header.ngOnDestroy();
});

for (const [nombre, status] of [['403 de rol', 403], ['5xx', 500]]) {
  test(`ante un ${nombre}: tema se queda en el navegador, la clase no se revierte y no se cierra la sesión`, async () => {
    sinAtender.length = 0;
    const { header, nav, cierres } = montarHeader(() => rxjs.throwError(() => ({ status })));
    header.layoutToggle();
    await new Promise(listo => setTimeout(listo, 5)); // rxjs avisa los errores sueltos en el siguiente turno
    assert.equal(nav.usuario().tema, true, 'tema debe quedar en localStorage aunque el backend rechace');
    assert.equal(nav.document.body.classList.contains('dark-only'), true);
    assert.equal(header.dark, true);
    assert.equal(cierres.length, 0);
    // el resto del user queda intacto
    assert.deepEqual({ ...nav.usuario(), tema: false }, USUARIO);
    assert.equal(sinAtender.length, 0, 'el rechazo debe atenderse en el header, sin error suelto');
    header.ngOnDestroy();
  });
}
