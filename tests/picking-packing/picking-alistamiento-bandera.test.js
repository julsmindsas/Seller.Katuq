/**
 * Alistamiento (picking y packing): nace APAGADO por comercio.
 *
 * Qué protege esta prueba (sin compilar Angular: carga los .ts reales con el compilador de
 * TypeScript y los ejecuta con dobles de prueba, como tests/navigation/nav-responsive.test.js):
 *
 *  1. La bandera `pickingAlistamiento` está en el catálogo del front.
 *  2. TODAS las rutas del módulo (picking y packing) cuelgan de una ruta con el guard: ninguna
 *     pantalla del alistamiento se abre sin la bandera de la empresa.
 *  3. El guard: sin bandera avisa con claridad y lleva a la página de inicio; con bandera deja pasar.
 *  4. El menú: sin la bandera NO aparece "Picking y packing"; con ella sí; si la bandera llega
 *     después del inicio de sesión, el menú se recalcula; si no cambia, no se recalcula nada.
 *  5. La pantalla de detalle reconoce "picking/nuevo" por su RUTA (no tiene :id).
 *
 * Correr desde la raíz del repo:
 *   node --test tests/picking-packing/picking-alistamiento-bandera.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const rxjs = require('rxjs');
const operators = require('rxjs/operators');

const leer = (ruta) => fs.readFileSync(path.resolve(ruta), 'utf8');

function compilar(ruta) {
  return ts.transpileModule(leer(ruta), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, experimentalDecorators: true },
  }).outputText;
}

// ── picking-mensajes.ts (funciones puras) ─────────────────────────────────────────────────
const mensajes = { exports: {} };
new Function('require', 'module', 'exports', compilar('src/app/components/picking-packing/picking-mensajes.ts'))(
  require,
  mensajes,
  mensajes.exports,
);
const { destinoDelDetalle } = mensajes.exports;

// ── 1. Catálogo ───────────────────────────────────────────────────────────────────────────
test('la bandera pickingAlistamiento está en el catálogo del front', () => {
  assert.match(leer('src/app/shared/services/company-features.service.ts'), /'pickingAlistamiento'/);
});

// ── 2. Todas las rutas del módulo piden la bandera ────────────────────────────────────────

/** Convierte el arreglo `routes` del módulo de rutas en objetos simples (los identificadores quedan como { ref }). */
function leerRutas() {
  const archivo = path.resolve('src/app/components/picking-packing/picking-packing-routing.module.ts');
  const fuente = ts.createSourceFile(archivo, leer(archivo), ts.ScriptTarget.Latest, true);
  let arreglo = null;
  fuente.forEachChild((nodo) => {
    if (ts.isVariableStatement(nodo)) {
      for (const d of nodo.declarationList.declarations) {
        if (d.name.getText(fuente) === 'routes') arreglo = d.initializer;
      }
    }
  });
  assert.ok(arreglo, 'no se encontró const routes');
  const valor = (n) => {
    if (ts.isArrayLiteralExpression(n)) return n.elements.map(valor);
    if (ts.isObjectLiteralExpression(n)) {
      return Object.fromEntries(n.properties.map((p) => [p.name.getText(fuente), valor(p.initializer)]));
    }
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isIdentifier(n)) return { ref: n.text };
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    throw new Error(`no sé leer ${ts.SyntaxKind[n.kind]}`);
  };
  return valor(arreglo);
}

function aplanar(rutas, prefijo = '') {
  return rutas.flatMap((ruta) => {
    const completa = [prefijo, ruta.path].filter((x) => x !== '').join('/');
    return [{ ...ruta, completa }, ...(ruta.children ? aplanar(ruta.children, completa) : [])];
  });
}

test('todas las rutas del módulo cuelgan de UNA ruta con el guard del alistamiento', () => {
  const rutas = leerRutas();
  assert.equal(rutas.length, 1, 'la única ruta de primer nivel es la que lleva el guard');
  assert.equal(rutas[0].path, '');
  assert.deepEqual(rutas[0].canActivate, [{ ref: 'PickingAlistamientoGuard' }]);
  assert.deepEqual(rutas[0].children.map((r) => r.path), ['picking', 'packing']);

  const conComponente = aplanar(rutas).filter((r) => r.component);
  assert.ok(conComponente.length >= 8, 'las pantallas de picking y de packing');
  // Ninguna pantalla queda fuera del padre con el guard (aplanar solo recorre lo que cuelga de él)
  assert.deepEqual(
    conComponente.map((r) => r.completa).sort(),
    [
      'picking',
      'picking/:id',
      'picking/nuevo',
      'picking/orden/:id',
      'packing',
      'packing/:id',
      'packing/nuevo',
      'packing/orden/:id',
    ].sort(),
  );
});

test('el guard está en el módulo de rutas y se declara una sola vez', () => {
  const fuente = leer('src/app/components/picking-packing/picking-packing-routing.module.ts');
  assert.match(fuente, /import \{ PickingAlistamientoGuard \} from '\.\/picking-alistamiento\.guard';/);
  assert.equal((fuente.match(/canActivate:/g) || []).length, 1);
});

// ── 3. El guard ───────────────────────────────────────────────────────────────────────────
function cargarGuard() {
  const modulo = { exports: {} };
  const requireFalso = (id) => {
    if (id === '@angular/core') return { Injectable: () => (clase) => clase };
    throw new Error(`el guard no debería importar ${id} como valor`);
  };
  new Function('require', 'module', 'exports', compilar('src/app/components/picking-packing/picking-alistamiento.guard.ts'))(
    requireFalso,
    modulo,
    modulo.exports,
  );
  return modulo.exports.PickingAlistamientoGuard;
}

test('el guard sin la bandera avisa con claridad, no deja pasar y lleva a la página de inicio', () => {
  const Guard = cargarGuard();
  const consultas = [];
  const avisos = [];
  const guard = new Guard(
    { isEnabled: (bandera) => (consultas.push(bandera), false) },
    { createUrlTree: (comandos) => ({ arbol: comandos }) },
    { info: (mensaje, titulo) => avisos.push({ mensaje, titulo }) },
  );
  const resultado = guard.canActivate();
  assert.deepEqual(consultas, ['pickingAlistamiento']);
  assert.deepEqual(resultado, { arbol: ['/welcome'] });
  assert.equal(avisos.length, 1);
  assert.equal(
    avisos[0].mensaje,
    'Esta función todavía no está activa para tu empresa. Escríbenos por soporte y te la activamos.',
  );
  assert.doesNotMatch(avisos[0].mensaje + avisos[0].titulo, /\b(sku|id|json|tenant|http|status|firestore|api|token|picking|packing)\b|FEATURE/i);
});

test('el guard con la bandera prendida deja pasar y no avisa nada', () => {
  const Guard = cargarGuard();
  const avisos = [];
  const guard = new Guard(
    { isEnabled: () => true },
    { createUrlTree: () => assert.fail('no debe redirigir') },
    { info: () => avisos.push(1) },
  );
  assert.equal(guard.canActivate(), true);
  assert.equal(avisos.length, 0);
});

// ── 4. El menú ────────────────────────────────────────────────────────────────────────────
const RUTAS_DEL_MENU = ['picking-packing/picking', 'picking-packing/packing', 'productos', 'despachos'];

function crearMenu({ prendida }) {
  const archivo = path.resolve('src/app/shared/services/nav.service.ts');
  const fuente = ts.createSourceFile(archivo, leer(archivo), ts.ScriptTarget.Latest, true);
  const clase = fuente.statements.find((nodo) => ts.isClassDeclaration(nodo));
  const compilado = ts.transpileModule(clase.getText(fuente), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true },
  }).outputText;

  const almacen = {
    user: JSON.stringify({ rol: 'Administrador', company: 'FLORECER' }),
    authorizedMenuItems: JSON.stringify(RUTAS_DEL_MENU.map((ruta) => ({ path: ruta }))),
  };
  const viewport = new EventTarget();
  viewport.innerWidth = 1366;
  const contexto = {
    exports: {},
    ...rxjs,
    ...operators,
    Injectable: () => (objetivo) => objetivo,
    window: viewport,
    localStorage: { getItem: (clave) => (clave in almacen ? almacen[clave] : null) },
  };
  vm.runInNewContext(compilado, contexto);

  const estado = { prendida };
  const cambios = new rxjs.BehaviorSubject(prendida);
  const consultas = [];
  const features = {
    isEnabled: (bandera) => (consultas.push(bandera), bandera === 'pickingAlistamiento' && estado.prendida),
    isEnabled$: (bandera) => cambios.pipe(operators.map(() => bandera === 'pickingAlistamiento' && estado.prendida), operators.distinctUntilChanged()),
  };
  const nav = new contexto.exports.NavService(
    { events: new rxjs.Subject() },
    { refreshCart: () => rxjs.of([]) },
    { deepClone: (valor) => JSON.parse(JSON.stringify(valor)) },
    features,
  );
  const prender = (valor) => {
    estado.prendida = valor;
    cambios.next(valor);
  };
  return { nav, prender, consultas };
}

const grupo = (nav, titulo) => nav.getMenuItems().find((item) => item.title === titulo);

test('el menú SIN la bandera no ofrece Picking y packing (pero el resto del menú sigue igual)', () => {
  const { nav, consultas } = crearMenu({ prendida: false });
  assert.equal(grupo(nav, 'Picking y packing'), undefined);
  assert.ok(grupo(nav, 'Productos'), 'los demás grupos autorizados siguen');
  assert.ok(grupo(nav, 'Logística') || JSON.stringify(nav.getMenuItems()).includes('despachos'));
  assert.doesNotMatch(JSON.stringify(nav.getMenuItems()), /picking-packing/);
  assert.ok(consultas.includes('pickingAlistamiento'));
  nav.ngOnDestroy();
});

test('el menú CON la bandera ofrece las dos entradas del alistamiento', () => {
  const { nav } = crearMenu({ prendida: true });
  const alistamiento = grupo(nav, 'Picking y packing');
  assert.ok(alistamiento);
  assert.deepEqual(alistamiento.children.map((hijo) => hijo.path), ['picking-packing/picking', 'picking-packing/packing']);
  nav.ngOnDestroy();
});

test('si la bandera llega después de iniciar sesión, el menú se recalcula; si no cambia, no se toca', () => {
  const { nav, prender } = crearMenu({ prendida: false });
  let emisiones = 0;
  nav.items.subscribe(() => emisiones++);
  const base = emisiones; // el valor actual al suscribirse

  prender(false); // la empresa se carga y la bandera sigue apagada: nada que recalcular
  assert.equal(emisiones, base, 'sin cambio de bandera no se vuelve a calcular el menú');
  assert.equal(grupo(nav, 'Picking y packing'), undefined);

  prender(true); // la empresa llegó con la bandera prendida
  assert.equal(emisiones, base + 1);
  assert.ok(grupo(nav, 'Picking y packing'));

  prender(false); // se apagó
  assert.equal(emisiones, base + 2);
  assert.equal(grupo(nav, 'Picking y packing'), undefined);
  nav.ngOnDestroy();
});

// ── 5. "picking/nuevo" se reconoce por su ruta ────────────────────────────────────────────
test('el detalle reconoce picking/nuevo por la ruta y todas las rutas del componente tienen destino', () => {
  const rutas = aplanar(leerRutas()).filter((r) => r.component && r.component.ref === 'PickingDetailComponent');
  assert.deepEqual(rutas.map((r) => r.path).sort(), [':id', 'nuevo', 'orden/:id']);

  for (const ruta of rutas) {
    // En "nuevo" Angular no entrega ningún :id; en las otras dos entrega el número del pedido
    const id = ruta.path === 'nuevo' ? undefined : 'FLO-000001';
    const destino = destinoDelDetalle(ruta.path, id);
    if (ruta.path === 'nuevo') {
      assert.deepEqual(destino, { eligePedido: true, nroPedido: '' }, 'nuevo -> elegir el pedido');
    } else {
      assert.deepEqual(destino, { eligePedido: false, nroPedido: 'FLO-000001' }, `${ruta.path} -> el pedido de la URL`);
    }
  }
});

test('el componente decide "nuevo" con la ruta, no solo con :id', () => {
  const fuente = leer('src/app/components/picking-packing/picking-detail/picking-detail.component.ts');
  assert.match(fuente, /destinoDelDetalle\(this\.route\.snapshot\.routeConfig\?\.path, params\['id'\]\)/);
  assert.doesNotMatch(fuente, /id === 'nuevo'/, 'la comparación con :id sola nunca se cumple en picking/nuevo');
});
