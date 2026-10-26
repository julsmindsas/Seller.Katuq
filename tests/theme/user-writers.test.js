'use strict';

// D-502 (ticket 1180): los escritores de localStorage['user'] con copia vieja. Guardar el idioma
// (languages) o el prompt de KAI (edit-profile) no debe pisar un `tema` cambiado después de montar
// el componente. Nunca llama al backend: updateUser va simulado.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const rxjs = require('rxjs');
const { cargarTs, navegadorFalso } = require('./cargar-ts');

const USUARIO = {
  email: 'ana@comercio.co', company: 'COMERCIO', nit: '900123', token: 'a.b.c', rol: 'Administrador',
  name: 'Ana María Pérez', image: 'foto.png', lang: { language: 'Español', code: 'es', type: 'CO', icon: 'co' }, tema: false,
};

// D-540 (IDI-B01b): edit-profile recibe TranslateService para sus avisos; en estas pruebas el
// traductor devuelve la clave, así que lo que se comprueba (qué se guarda en `user`) no cambia.
const TRADUCTOR = { instant: clave => clave };

function cambiarTemaPorFuera(nav, tema) {
  // lo que hace el botón del header (ThemeModeService.setPreference) con el componente ya montado
  nav.localStorage.setItem('user', JSON.stringify({ ...nav.usuario(), tema }));
}

test('languages: guardar el idioma no pisa un tema cambiado después de montar', () => {
  const nav = navegadorFalso({ pathname: '/ventas', user: USUARIO });
  const utilidades = cargarTs('src/app/shared/utils/app-language.utils.ts');
  const { LanguagesComponent } = cargarTs('src/app/shared/components/header/elements/languages/languages.component.ts', {
    modulos: { '../../../../utils/app-language.utils': utilidades },
    globales: { document: nav.document, localStorage: nav.localStorage, window: nav.window },
  });
  const enviados = [];
  const componente = new LanguagesComponent(
    { setDefaultLang() {}, use() {} },
    {},
    { updateUser: item => { enviados.push(JSON.parse(JSON.stringify(item))); return rxjs.of({ ok: true }); } },
  );
  componente.ngOnInit();
  cambiarTemaPorFuera(nav, true);
  componente.changeLanguage('en');
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].lang.code, 'en');
  const guardado = nav.usuario();
  assert.equal(guardado.tema, true, 'el idioma no debe devolver el tema anterior');
  assert.equal(guardado.lang.code, 'en');
  // no cambia nada más
  assert.deepEqual({ ...guardado, lang: USUARIO.lang }, { ...USUARIO, tema: true });
  componente.ngOnDestroy();
});

test('edit-profile: guardar el prompt de KAI no pisa un tema cambiado después de montar', () => {
  const nav = navegadorFalso({ pathname: '/usuarios/perfil', user: USUARIO });
  const { EditProfileComponent } = cargarTs('src/app/components/usuarios/edit-profile/edit-profile.component.ts', {
    modulos: { sweetalert2: { __esModule: true, default: { fire: () => Promise.resolve({}) } } },
    globales: { document: nav.document, localStorage: nav.localStorage, window: nav.window },
  });
  const enviados = [];
  const componente = new EditProfileComponent(
    {}, {},
    { updateUser: item => { enviados.push(JSON.parse(JSON.stringify(item))); return rxjs.of({ ok: true }); } },
    {}, {}, {}, {}, {}, TRADUCTOR,
  );
  componente.ngOnInit();
  cambiarTemaPorFuera(nav, true);
  componente.kaiPrompt = 'Responde corto';
  componente.saveKaiPrompt();
  assert.deepEqual(enviados, [{ identificacion: '900123', kaiPersonalitityUserPrompt: 'Responde corto' }]);
  const guardado = nav.usuario();
  assert.equal(guardado.tema, true, 'el prompt no debe devolver el tema anterior');
  assert.equal(guardado.kaiPersonalitityUserPrompt, 'Responde corto');
  assert.deepEqual(guardado, { ...USUARIO, tema: true, kaiPersonalitityUserPrompt: 'Responde corto' });
});

// La respuesta llega después de SignOut(): releer y no encontrar `user` no debe revivir la sesión
// con la copia montada (y su token).
test('languages: si la sesión terminó mientras se guardaba, no revive el user', () => {
  const nav = navegadorFalso({ pathname: '/ventas', user: USUARIO });
  const utilidades = cargarTs('src/app/shared/utils/app-language.utils.ts');
  const { LanguagesComponent } = cargarTs('src/app/shared/components/header/elements/languages/languages.component.ts', {
    modulos: { '../../../../utils/app-language.utils': utilidades },
    globales: { document: nav.document, localStorage: nav.localStorage, window: nav.window },
  });
  const respuesta = new rxjs.Subject();
  const componente = new LanguagesComponent({ setDefaultLang() {}, use() {} }, {}, { updateUser: () => respuesta });
  componente.ngOnInit();
  componente.changeLanguage('en');
  nav.localStorage.removeItem('user'); // SignOut()
  respuesta.next({ ok: true });
  assert.equal(nav.usuario(), null);
  componente.ngOnDestroy();
});

test('edit-profile: si la sesión terminó mientras se guardaba el prompt, no revive el user', () => {
  const nav = navegadorFalso({ pathname: '/usuarios/perfil', user: USUARIO });
  const avisos = [];
  const { EditProfileComponent } = cargarTs('src/app/components/usuarios/edit-profile/edit-profile.component.ts', {
    modulos: { sweetalert2: { __esModule: true, default: { fire: opciones => { avisos.push(opciones); return Promise.resolve({}); } } } },
    globales: { document: nav.document, localStorage: nav.localStorage, window: nav.window },
  });
  const respuesta = new rxjs.Subject();
  const componente = new EditProfileComponent({}, {}, { updateUser: () => respuesta }, {}, {}, {}, {}, {}, TRADUCTOR);
  componente.ngOnInit();
  componente.kaiPrompt = 'Responde corto';
  componente.saveKaiPrompt();
  nav.localStorage.removeItem('user'); // SignOut()
  respuesta.next({ ok: true });
  assert.equal(nav.usuario(), null, 'no vuelve a escribir el user con el token viejo');
  assert.deepEqual(avisos, [], 'sin sesión no muestra el aviso de guardado');
});

test('edit-profile: si el backend responde con error no escribe el user', () => {
  const nav = navegadorFalso({ pathname: '/usuarios/perfil', user: USUARIO });
  const { EditProfileComponent } = cargarTs('src/app/components/usuarios/edit-profile/edit-profile.component.ts', {
    modulos: { sweetalert2: { __esModule: true, default: { fire: () => Promise.resolve({}) } } },
    globales: { document: nav.document, localStorage: nav.localStorage, window: nav.window },
  });
  const componente = new EditProfileComponent({}, {}, { updateUser: () => rxjs.of({ error: true }) }, {}, {}, {}, {}, {}, TRADUCTOR);
  componente.ngOnInit();
  cambiarTemaPorFuera(nav, true);
  componente.kaiPrompt = 'Otro';
  componente.saveKaiPrompt();
  assert.deepEqual(nav.usuario(), { ...USUARIO, tema: true });
});
