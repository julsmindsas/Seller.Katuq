'use strict';

// D-546 (F2, D8): el modo del menú (abierto o compacto) se recuerda por usuario, sin guardar el correo en claro.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/app/shared/components/sidebar/menu-modo.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { hashCorreo, leerModo, guardarModo, modoInicial, modoHeredado, CLAVE_MODO_MENU } = context.exports;

function almacen(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return { datos, getItem: k => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => datos.set(k, String(v)) };
}

test('dos correos guardan modos distintos y no se pisan', () => {
  const a = almacen();
  guardarModo(a, 'ana@almara.co', 'compacto');
  guardarModo(a, 'beto@almara.co', 'abierto');
  assert.equal(leerModo(a, 'ana@almara.co'), 'compacto');
  assert.equal(leerModo(a, 'beto@almara.co'), 'abierto');
  assert.equal(leerModo(a, 'otro@almara.co'), null);
  guardarModo(a, 'ana@almara.co', 'abierto');
  assert.equal(leerModo(a, 'ana@almara.co'), 'abierto');
  assert.equal(leerModo(a, 'beto@almara.co'), 'abierto');
});

test('el correo no queda en claro y mayúsculas y espacios no cambian la identidad', () => {
  const a = almacen();
  guardarModo(a, 'Ana@Almara.co ', 'compacto');
  const crudo = a.getItem(CLAVE_MODO_MENU);
  assert(!/ana|almara/i.test(crudo), crudo);
  assert.equal(leerModo(a, ' ana@almara.CO'), 'compacto');
  assert.match(hashCorreo('ana@almara.co'), /^[0-9a-f]{8}$/);
  assert.notEqual(hashCorreo('ana@almara.co'), hashCorreo('ana@almara.com'));
});

test('sin preferencia se migra el estado de antes una sola vez y no se borran las claves viejas', () => {
  for (const viejo of [{ sidebarCollapsed: 'true' }, { sidebarCompactMode: 'true' }, { katuq_sidebar_state: JSON.stringify({ isCollapsed: true }) }, { katuq_sidebar_state: JSON.stringify({ isCompactMode: true }) }]) {
    const a = almacen(viejo);
    assert.equal(modoInicial(a, 'ana@almara.co'), 'compacto', JSON.stringify(viejo));
    assert.equal(leerModo(a, 'ana@almara.co'), 'compacto', 'queda guardado');
    for (const clave of Object.keys(viejo)) assert(a.datos.has(clave), `${clave} sigue ahí`);
    // Si luego el usuario lo abre, lo de antes ya no manda.
    guardarModo(a, 'ana@almara.co', 'abierto');
    assert.equal(modoInicial(a, 'ana@almara.co'), 'abierto');
  }
  assert.equal(modoInicial(almacen({ sidebarCollapsed: 'false' }), 'ana@almara.co'), 'abierto');
  assert.equal(modoInicial(almacen(), 'ana@almara.co'), 'abierto');
  assert.equal(modoHeredado(almacen({ katuq_sidebar_state: 'no es json' })), null);
});

test('un almacén dañado o sin permiso no rompe el menú', () => {
  const roto = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(modoHeredado(roto), null);
  assert.doesNotThrow(() => guardarModo(roto, 'ana@almara.co', 'compacto'));
  assert.equal(almacen({ [CLAVE_MODO_MENU]: '[1,2]' }).getItem(CLAVE_MODO_MENU), '[1,2]');
  assert.equal(leerModo(almacen({ [CLAVE_MODO_MENU]: '[1,2]' }), 'ana@almara.co'), null);
  assert.equal(leerModo(almacen({ [CLAVE_MODO_MENU]: '{"x":"raro"}' }), 'ana@almara.co'), null);
});

test('cerrar sesión conserva katuqMenuModo (el resto del navegador se limpia)', () => {
  const fuente = fs.readFileSync(path.join(root, 'src/app/shared/services/servicios.service.ts'), 'utf8');
  const signOut = fuente.slice(fuente.indexOf('signOut() {'), fuente.indexOf('// ***************************************** ORDENES'));
  assert.match(signOut, /getItem\('katuqMenuModo'\)/);
  assert(signOut.indexOf("getItem('katuqMenuModo')") < signOut.indexOf('localStorage.clear()'));
  assert.match(signOut, /localStorage\.clear\(\);[\s\S]*setItem\('katuqMenuModo', modoMenu\)/);
  assert.equal(CLAVE_MODO_MENU, 'katuqMenuModo');
});
