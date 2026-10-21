'use strict';

// D-502 (ticket 1180), bloque TEMA-B02: enumeración de las pantallas del marco con menú para el
// barrido --todas de auditoria-tema.js (cola de «todas las páginas» y prueba de F2a, tarea 4.1).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { cargarTs } = require('./cargar-ts');
const {
  enumerarRutasMarco, urlDeMuestra, rutasDelMarco, VALOR_PARAMETRO, archivosConfigPagina, banderasDeGuards,
} = require('./rutas-marco');
const { PANTALLAS_F2A_MANUAL, revisionManualF2a, coberturaCfg } = require('./auditoria-puras');

class Marco {}
class Pantalla {}

// Config simulada con los casos del router: marco, hijos en línea, perezosos, redirecciones,
// comodín, :param, contenedores y una ruta pública con el mismo path que un hijo del marco.
function configSimulada() {
  const moduloA = () => 'a';
  const moduloRoto = () => 'roto';
  const moduloB = () => 'b';
  const config = [
    { path: 'login', component: Pantalla },
    { path: 'publica', component: Pantalla },
    {
      path: 'agentes', component: Marco, data: { shell: true, requiresPremium: true },
      children: [{ path: '', loadChildren: moduloB }],
    },
    {
      path: '', component: Marco, data: { shell: true },
      children: [
        { path: 'inicio', component: Pantalla },
        { path: 'viejo', redirectTo: 'inicio' },
        { path: 'publica', component: Pantalla },
        { path: 'ventas', loadChildren: moduloA },
        { path: 'roto', loadChildren: moduloRoto },
        { path: 'grupo', children: [{ path: 'uno', component: Pantalla }, { path: 'dos/:id', component: Pantalla }] },
        { path: 'inicio', component: Pantalla }, // repetida: cuenta una vez
        { path: '**', component: Pantalla },
      ],
    },
    { path: '**', component: Pantalla },
  ];
  const hijos = new Map([
    [moduloA, { archivo: 'src/app/components/ventas/ventas.module.ts', rutas: [
      { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
      { path: 'pedidos', component: Pantalla },
      { path: 'pedidos/:id', component: Pantalla },
      { path: 'lazy', loadComponent: () => Pantalla },
    ] }],
    [moduloB, { archivo: 'src/app/modules/agentes/agentes.module.ts', rutas: [{ path: '', component: Pantalla, data: { requiresPremium: true } }] }],
  ]);
  const cargarHijos = ruta => {
    if (!hijos.has(ruta.loadChildren)) throw new Error('chunk roto');
    return hijos.get(ruta.loadChildren);
  };
  return { config, cargarHijos };
}

test('enumera solo las pantallas dentro de data.shell, con su módulo y sus parámetros', () => {
  const { config, cargarHijos } = configSimulada();
  const { pantallas, omitidas, errores } = enumerarRutasMarco(config, { cargarHijos });
  assert.deepEqual(pantallas.map(p => p.ruta), [
    '/agentes', '/inicio', '/publica', '/ventas/pedidos', '/ventas/pedidos/:id', '/ventas/lazy', '/grupo/uno', '/grupo/dos/:id',
  ]);
  const porRuta = Object.fromEntries(pantallas.map(p => [p.ruta, p]));
  assert.equal(porRuta['/ventas/pedidos'].modulo, 'components/ventas');
  assert.equal(porRuta['/ventas/pedidos'].archivoModulo, 'src/app/components/ventas/ventas.module.ts');
  assert.equal(porRuta['/ventas/pedidos/:id'].conParametros, true);
  assert.equal(porRuta['/grupo/uno'].conParametros, false);
  assert.equal(porRuta['/inicio'].modulo, null);
  assert.equal(porRuta['/agentes'].modulo, 'modules/agentes');
  assert.equal(porRuta['/agentes'].premium, true);
  assert.ok(!pantallas.some(p => p.ruta === '/login' || p.ruta === '/' || p.ruta === '/viejo' || p.ruta === '/ventas'));
  assert.deepEqual(omitidas, [{ ruta: '/**', motivo: 'comodín' }]);
  assert.deepEqual(errores, [{ ruta: '/roto', error: 'chunk roto' }]);
});

test('esMarco descarta lo que en la app real atiende una ruta de primer nivel fuera del marco', () => {
  const { config, cargarHijos } = configSimulada();
  const urls = [];
  const { pantallas, omitidas } = enumerarRutasMarco(config, {
    cargarHijos,
    esMarco: url => { urls.push(url); return url !== '/publica'; },
  });
  assert.ok(!pantallas.some(p => p.ruta === '/publica'));
  assert.ok(omitidas.some(o => o.ruta === '/publica'));
  // recibe la URL de muestra, con el :param ya reemplazado
  assert.ok(urls.includes(`/ventas/pedidos/${VALOR_PARAMETRO}`));
});

test('urlDeMuestra reemplaza cada :param y deja lo demás', () => {
  assert.equal(urlDeMuestra('/flows/runs/:flowId'), `/flows/runs/${VALOR_PARAMETRO}`);
  assert.equal(urlDeMuestra('/a/:x/b/:y', 'z'), '/a/z/b/z');
  assert.equal(urlDeMuestra('/ventas/pedidos'), '/ventas/pedidos');
});

test('con la configuración real: pantallas del marco enumeradas sin errores ni descartes silenciosos', () => {
  const { pantallas, omitidas, errores } = rutasDelMarco();
  assert.deepEqual(errores, [], 'todos los módulos perezosos se leen');
  assert.ok(pantallas.length >= 120, `solo ${pantallas.length} pantallas`);
  // Lo único que se omite hoy es el comodín de integraciones. Si `esMarco` (isShellUrl) empieza a
  // descartar rutas marcadas con data.shell, o el lector deja de marcar el marco, aparece aquí.
  assert.deepEqual(omitidas, [{ ruta: '/integrations/**', motivo: 'comodín' }]);
  const conjunto = new Set(pantallas.map(p => p.ruta));
  for (const ruta of ['/ventas/pedidos', '/proceso/ocasiones', '/inventario/bodegas', '/despachos', '/welcome', '/agenda', '/pricing', '/billing']) {
    assert.ok(conjunto.has(ruta), `falta ${ruta}`);
  }
  for (const ruta of ['/login', '/terms-conditions', '/']) assert.ok(!conjunto.has(ruta), `${ruta} no es del marco`);
  assert.equal(conjunto.size, pantallas.length, 'sin repetidas');
  // Módulo de cada ruta (para el reporte) y la base cfg-* de F2a detectada en su SCSS.
  assert.equal(pantallas.find(p => p.ruta === '/ventas/pedidos').modulo, 'components/ventas');
  assert.equal(pantallas.find(p => p.ruta === '/proceso/ocasiones').usaCfg, true);
  assert.ok(pantallas.filter(p => p.usaCfg).length >= 80, 'la mayoría de las pantallas cfg-* aparece en el barrido');
  // `loadComponent` (/kuvo) y parciales importados (/integrations → _integrations-directorio.scss).
  const kuvo = pantallas.find(p => p.ruta === '/kuvo');
  assert.equal(kuvo.componente, 'KuvoComponent');
  assert.equal(kuvo.scss, 'src/app/components/kuvo/kuvo.component.scss');
  assert.equal(kuvo.usaCfg, true);
  const integraciones = pantallas.find(p => p.ruta === '/integrations');
  assert.equal(integraciones.usaCfg, true);
  assert.ok(integraciones.hojasCfg.includes('src/app/components/integrations/_integrations-directorio.scss'));
  // El shell de NPS (contenedor con hijos) cuenta con cada pantalla que envuelve.
  assert.ok(pantallas.find(p => p.ruta === '/nps/encuestas').hojasCfg.includes('src/app/components/nps/shell/nps-shell.component.scss'));
});

test('con la configuración real: cobertura de las hojas con config-pagina y lista de las que no son pantalla', () => {
  const { pantallas } = rutasDelMarco();
  const archivos = archivosConfigPagina();
  assert.ok(archivos.length >= 110, `solo ${archivos.length} hojas con config-pagina`);
  assert.ok(!archivos.includes('src/app/shared/styles/_config-pagina.scss'), 'la base no es pantalla');
  assert.ok(!archivos.includes('src/app/components/nps/_nps.scss'), 'un comentario no cuenta');
  const cobertura = coberturaCfg(pantallas, archivos);
  assert.equal(cobertura.alcanzadas.length + cobertura.sinRuta.length, archivos.length);
  // Hijos y diálogos que el barrido no abre: van a la revisión manual de F2a con su nombre.
  for (const hoja of [
    'src/app/components/ventas/borradores-venta/borradores-venta.component.scss',
    'src/app/components/formas-entrega/horario-entrega/horario-entrega.component.scss',
  ]) assert.ok(cobertura.sinRuta.includes(hoja), `${hoja} debería salir sin ruta`);
  for (const hoja of [
    'src/app/components/kuvo/kuvo.component.scss',
    'src/app/components/integrations/_integrations-directorio.scss',
    'src/app/components/agenda/_agenda.scss',
    'src/app/components/nps/shell/nps-shell.component.scss',
  ]) assert.ok(cobertura.alcanzadas.includes(hoja), `${hoja} debería alcanzarse por su ruta`);
  // Sin `:param`, algunas solo se alcanzan con el valor de muestra: por eso el barrido las incluye por defecto.
  assert.ok(coberturaCfg(pantallas, archivos, { sinParametros: true }).soloConParametros.length > 0);
});

test('banderas de los guards: las que prende el barrido por defecto', () => {
  const banderas = banderasDeGuards();
  for (const b of ['serviceAgenda', 'pickingAlistamiento']) assert.ok(banderas.includes(b), `falta ${b}`);
  const { COMPANY_FEATURE_FLAGS } = cargarTs('src/app/shared/services/company-features.service.ts');
  for (const b of banderas) assert.ok(COMPANY_FEATURE_FLAGS.includes(b), `${b} no está en el catálogo`);
  assert.ok(banderas.length < COMPANY_FEATURE_FLAGS.length, 'no prende el catálogo entero');
});

test('la lista de revisión manual de F2a encuentra rutas reales en cada grupo', () => {
  const { pantallas } = rutasDelMarco();
  const lista = revisionManualF2a(pantallas);
  assert.deepEqual(lista.map(g => g.grupo), PANTALLAS_F2A_MANUAL.map(g => g.grupo));
  assert.deepEqual(lista.map(g => g.grupo), ['Ventas', 'POS', 'Formas de pago', 'Despachos', 'Inventarios', 'Bodegas', 'Ocasiones']);
  for (const grupo of lista) assert.ok(grupo.rutas.length > 0, `${grupo.grupo} sin rutas`);
});
