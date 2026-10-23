'use strict';

// D-546 (7.3): la «foto» de qué rutas ve cada rol en el menú, para comprobar que reordenar, renombrar y
// mover entradas (F3) no le da ni le quita acceso a nadie.
//
//   node tests/navigation/fixtures/generar-menu-rutas.js --escribir
//
// Se corrió con el `MENUITEMS` de ANTES de F3 y produjo `menu-rutas-antes-f3.json`. No se vuelve a
// generar: `menu-permisos-f3.test.js` repite cada escenario con el menú nuevo y compara. Cada escenario
// es un rol y sus rutas autorizadas, con las banderas de la empresa encendidas o apagadas.
const fs = require('node:fs');
const path = require('node:path');
const { fixture } = require('../nav-fixture');

const ARCHIVO = path.join(__dirname, 'menu-rutas-antes-f3.json');
const BANDERAS = { pickingAlistamiento: true, serviceAgenda: true, npsModulo: true };

/** Las rutas que el menú muestra como pantallas (enlaces con ruta, en cualquier nivel). */
function rutasVisibles(menu) {
  const rutas = [];
  const recorrer = items => {
    for (const item of items || []) {
      if (item.path && item.type !== 'info') rutas.push(item.path);
      if (item.children) recorrer(item.children);
    }
  };
  recorrer(menu);
  return [...new Set(rutas)].sort();
}

function visibles(escenario) {
  const { nav } = fixture(1440, {
    user: escenario.user,
    paths: escenario.paths,
    flags: escenario.banderas ? BANDERAS : {},
    dropshipping: !!escenario.banderas,
  });
  const resultado = rutasVisibles(nav.getMenuItems());
  nav.ngOnDestroy();
  return resultado;
}

/** Todas las rutas que declara el menú (con su forma exacta), para armar un escenario por cada una. */
function todasLasRutas() {
  const { nav } = fixture(1440, { user: { rol: 'Administrador', company: 'Julsmind' }, flags: BANDERAS, dropshipping: true });
  const rutas = [];
  const recorrer = items => items.forEach(item => { if (item.path) rutas.push(item.path); if (item.children) recorrer(item.children); });
  recorrer(nav.ALLMENUITEMS);
  nav.ngOnDestroy();
  return [...new Set(rutas)].sort();
}

/** Los escenarios: cada rol de los que mira el menú, con las banderas apagadas y encendidas, y cada ruta sola. */
function escenarios(rutas) {
  const roles = [
    ['administrador', { rol: 'Administrador', company: 'QA' }, []],
    ['comodín', { rol: 'Vendedor', company: 'QA' }, ['*']],
    ['super administrador', { rol: 'Super Administrador', company: 'QA' }, []],
    ['administrador de Julsmind', { rol: 'Administrador', company: 'Julsmind' }, []],
    ['super administrador de Julsmind', { rol: 'Super Administrador', company: 'Julsmind' }, []],
    ['contador', { rol: 'Contador', company: 'QA' }, []],
    ['rol sin rutas', { rol: 'Vendedor', company: 'QA' }, []],
  ];
  const lista = [];
  for (const [nombre, user, paths] of roles) {
    for (const banderas of [false, true]) {
      lista.push({ nombre: `${nombre}, banderas ${banderas ? 'encendidas' : 'apagadas'}`, user, paths, banderas });
    }
  }
  for (const ruta of rutas) {
    for (const banderas of [false, true]) {
      lista.push({ nombre: `solo «${ruta}», banderas ${banderas ? 'encendidas' : 'apagadas'}`, user: { rol: 'Vendedor', company: 'QA' }, paths: [ruta], banderas });
    }
  }
  return lista;
}

module.exports = { visibles, rutasVisibles, todasLasRutas, escenarios, ARCHIVO };

if (require.main === module) {
  if (!process.argv.includes('--escribir')) {
    console.error('Esta foto es de ANTES de F3 y no se regenera. Para escribirla de nuevo (solo con el menú de antes de F3): --escribir');
    process.exit(1);
  }
  const rutas = todasLasRutas();
  const foto = escenarios(rutas).map(e => ({ ...e, visibles: visibles(e) }));
  fs.writeFileSync(ARCHIVO, `${JSON.stringify({ generadoAntesDeF3: true, rutas, escenarios: foto }, null, 1)}\n`);
  console.log(`${foto.length} escenarios, ${rutas.length} rutas -> ${path.relative(process.cwd(), ARCHIVO)}`);
}
