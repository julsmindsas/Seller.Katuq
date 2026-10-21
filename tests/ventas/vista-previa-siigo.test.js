'use strict';
/**
 * Ticket 1229 (D-504, tarea 1b.2): cuando el backend manda `enSiigo` (bandera
 * `siigoProductEquivalence` encendida y línea revisada), la vista previa de la
 * factura SIIGO pinta en cada línea el código del producto y si existe, va con un
 * equivalente (A → B: código de Katuq abajo, el de SIIGO en el chip, tal cual),
 * se creará o no se pudo revisar. Sin `enSiigo` la celda queda igual que hoy
 * (spec EARS: con la bandera apagada la vista previa SHALL quedar igual).
 *
 * La celda del producto se parsea con el compilador de Angular y se pinta con un
 * intérprete mínimo (ngIf, ngSwitch/ngSwitchCase, interpolación) para probar lo
 * que el comercio ve con cada respuesta. El SCSS se compila con sass.
 *
 *   node --test tests/ventas/vista-previa-siigo.test.js
 */
const assert = require('node:assert/strict');
const { test, before } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.resolve(__dirname, '../../src/app/components/ventas/list');
const RAIZ = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(DIR, 'list.component.html'), 'utf8');
const scssFuente = fs.readFileSync(path.join(DIR, 'list.component.scss'), 'utf8');

let ng; // @angular/compiler (ESM)
let celda; // nodos R3 de la celda del producto

/** Primer <td> de la fila de líneas de la vista previa (la celda del producto). */
function fuenteCelda() {
  const bloque = html.indexOf('<div class="factura-vista-previa mt-3" *ngIf="facturaVistaPrevia as vp">');
  assert.ok(bloque >= 0, 'no se encontró el bloque de la vista previa');
  const fila = html.indexOf('<tr *ngFor="let l of vp.lineas">', bloque);
  assert.ok(fila >= 0, 'no se encontró la fila de líneas de la vista previa');
  const abre = html.indexOf('<td>', fila);
  const cierra = html.indexOf('</td>', abre);
  return html.slice(abre, cierra + '</td>'.length);
}

// ---------- intérprete mínimo de la plantilla ----------

function evaluar(ast, ctx) {
  if (ast instanceof ng.ASTWithSource) return evaluar(ast.ast, ctx);
  if (ast instanceof ng.Interpolation) {
    let s = ast.strings[0];
    ast.expressions.forEach((e, i) => {
      const v = evaluar(e, ctx);
      s += (v === null || v === undefined ? '' : String(v)) + ast.strings[i + 1];
    });
    return s;
  }
  if (ast instanceof ng.ImplicitReceiver) return ctx;
  if (ast instanceof ng.SafePropertyRead) {
    const r = evaluar(ast.receiver, ctx);
    return r === null || r === undefined ? undefined : r[ast.name];
  }
  if (ast instanceof ng.PropertyRead) {
    const r = evaluar(ast.receiver, ctx);
    return r[ast.name];
  }
  if (ast instanceof ng.LiteralPrimitive) return ast.value;
  if (ast instanceof ng.PrefixNot) return !evaluar(ast.expression, ctx);
  if (ast instanceof ng.Conditional) {
    return evaluar(ast.condition, ctx) ? evaluar(ast.trueExp, ctx) : evaluar(ast.falseExp, ctx);
  }
  if (ast instanceof ng.Binary) {
    const a = () => evaluar(ast.left, ctx);
    const b = () => evaluar(ast.right, ctx);
    switch (ast.operation) {
      case '||': return a() || b();
      case '&&': return a() && b();
      case '+': return a() + b();
      case '>': return a() > b();
      case '===': return a() === b();
      default: throw new Error(`operador no soportado: ${ast.operation}`);
    }
  }
  if (ast instanceof ng.BindingPipe) return `[${ast.name}:${evaluar(ast.exp, ctx)}]`;
  throw new Error(`expresión no soportada: ${ast.constructor.name}`);
}

/** Pinta nodos R3 a una lista plana de elementos {tag, clases, texto}. */
function pintar(nodos, ctx, salida = [], sw = { activo: false }) {
  for (const n of nodos) {
    if (n instanceof ng.TmplAstText) continue;
    if (n instanceof ng.TmplAstBoundText) continue; // el texto lo junta textoDe
    if (n instanceof ng.TmplAstTemplate) {
      const attrs = n.templateAttrs || [];
      const si = attrs.find((a) => a.name === 'ngIf');
      if (si && !evaluar(si.value, ctx)) continue;
      const caso = attrs.find((a) => a.name === 'ngSwitchCase');
      if (caso) {
        assert.ok(sw.activo, 'ngSwitchCase fuera de un ngSwitch');
        if (evaluar(caso.value, ctx) !== sw.valor) continue;
      }
      pintar(n.children, ctx, salida, sw);
      continue;
    }
    if (n instanceof ng.TmplAstElement) {
      const swIn = n.inputs.find((i) => i.name === 'ngSwitch');
      const swHijos = swIn ? { activo: true, valor: evaluar(swIn.value, ctx) } : sw;
      if (n.name !== 'ng-container') {
        const clase = n.attributes.find((a) => a.name === 'class');
        salida.push({ tag: n.name, clases: clase ? clase.value.split(/\s+/) : [], texto: textoDe(n.children, ctx, swHijos) });
      }
      pintar(n.children, ctx, salida, swHijos);
    }
  }
  return salida;
}

/** Texto visible de unos nodos; los espacios se normalizan una vez, al final. */
function textoDe(nodos, ctx, sw) {
  return textoCrudo(nodos, ctx, sw).replace(/\s+/g, ' ').trim();
}

function textoCrudo(nodos, ctx, sw) {
  let s = '';
  for (const n of nodos) {
    if (n instanceof ng.TmplAstText) s += n.value;
    else if (n instanceof ng.TmplAstBoundText) s += evaluar(n.value, ctx);
    else if (n instanceof ng.TmplAstElement) {
      const swIn = n.inputs.find((i) => i.name === 'ngSwitch');
      s += textoCrudo(n.children, ctx, swIn ? { activo: true, valor: evaluar(swIn.value, ctx) } : sw);
    } else if (n instanceof ng.TmplAstTemplate) {
      const attrs = n.templateAttrs || [];
      const si = attrs.find((a) => a.name === 'ngIf');
      if (si && !evaluar(si.value, ctx)) continue;
      const caso = attrs.find((a) => a.name === 'ngSwitchCase');
      if (caso && evaluar(caso.value, ctx) !== sw.valor) continue;
      s += textoCrudo(n.children, ctx, sw);
    }
  }
  return s;
}

const base = { descripcion: 'Bomba sumergible 4"', precioUnitario: 100, descuento: 0, cantidad: 1 };
const pintarLinea = (l) => pintar(celda, { l: { ...base, ...l } });
const chips = (els) => els.filter((e) => e.clases.includes('fv-siigo'));
const codigoDe = (els) => els.find((e) => e.clases.includes('fv-codigo'));

before(async () => {
  ng = await import(path.join(RAIZ, 'node_modules/@angular/compiler/fesm2015/compiler.mjs'));
  const r = ng.parseTemplate(fuenteCelda(), 'list.component.html', { preserveWhitespaces: false });
  assert.equal(r.errors && r.errors.length ? r.errors.map(String).join('\n') : null, null, 'la celda no parsea');
  celda = r.nodes;
});

// ---------- lo que ve el comercio ----------

const casos = [
  ['existente', { codigo: 'GLD-01-4SSFR', enSiigo: 'existente' }, 'GLD-01-4SSFR', 'En SIIGO', 'fv-siigo--ok'],
  ['equivalente', { codigo: 'GLD-00-01-4SSFR', codigoSiigo: 'GLD-01-4SSFR', enSiigo: 'equivalente' }, 'GLD-00-01-4SSFR', 'En SIIGO como GLD-01-4SSFR', 'fv-siigo--ok'],
  ['nuevo', { codigo: 'XYZ-00-9', enSiigo: 'nuevo' }, 'XYZ-00-9', 'Se creará en SIIGO', 'fv-siigo--nuevo'],
  ['ambiguo', { codigo: 'ABC-00-01-1', enSiigo: 'ambiguo' }, 'ABC-00-01-1', 'Se creará: varios posibles en SIIGO', 'fv-siigo--nuevo'],
  ['error', { codigo: 'ABC-02', enSiigo: 'error' }, 'ABC-02', 'No se pudo revisar en SIIGO', 'fv-siigo--sin'],
];

for (const [estado, linea, codigo, texto, modificador] of casos) {
  test(`enSiigo '${estado}': código «${codigo}» y un solo chip «${texto}»`, () => {
    const els = pintarLinea(linea);
    assert.equal(codigoDe(els)?.texto, codigo);
    const c = chips(els);
    assert.equal(c.length, 1, `se esperaba un chip y salieron ${c.length}`);
    assert.equal(c[0].texto, texto);
    assert.ok(c[0].clases.includes(modificador), `el chip debe llevar ${modificador}: ${c[0].clases}`);
  });
}

test('equivalente sin codigoSiigo (defensivo): dice «En SIIGO» sin dejar el texto colgado', () => {
  const els = pintarLinea({ codigo: 'GLD-00-01-4SSFR', enSiigo: 'equivalente' });
  assert.equal(chips(els)[0].texto, 'En SIIGO');
  assert.equal(codigoDe(els).texto, 'GLD-00-01-4SSFR');
});

test('equivalente: el código de SIIGO del chip va en su span, sin pasar a mayúsculas', () => {
  const els = pintarLinea({ codigo: 'gld-00-01-4ssfr', codigoSiigo: 'gld-01-4ssfr', enSiigo: 'equivalente' });
  const cod = els.filter((e) => e.clases.includes('fv-siigo-cod'));
  assert.equal(cod.length, 1);
  assert.equal(cod[0].texto, 'gld-01-4ssfr');
  assert.equal(codigoDe(els).texto, 'gld-00-01-4ssfr');
});

test('sin enSiigo (bandera apagada, backend viejo u otro proveedor): la celda queda igual que hoy', () => {
  const els = pintarLinea({ codigo: 'GLD-00-01-4SSFR' });
  assert.equal(els.some((e) => e.clases.some((c) => c.startsWith('fv-'))), false, 'ni código ni chip');
  assert.equal(els.find((e) => e.clases.includes('fvp-producto'))?.texto, base.descripcion);
});

test('estado desconocido: no inventa un chip', () => {
  assert.equal(chips(pintarLinea({ codigo: 'A-1', enSiigo: 'otro' })).length, 0);
});

test('línea sin código ni enSiigo (backend viejo): la celda queda como antes', () => {
  const els = pintarLinea({});
  assert.equal(els.some((e) => e.clases.some((c) => c.startsWith('fv-'))), false);
  assert.equal(els.find((e) => e.clases.includes('fvp-producto'))?.texto, base.descripcion);
  assert.ok(els.some((e) => e.tag === 'small' && /c\/u/.test(e.texto)), 'el precio unitario sigue saliendo');
});

test('el código va debajo de la descripción y antes del precio', () => {
  const els = pintarLinea({ codigo: 'A-1', enSiigo: 'nuevo' });
  const i = (pred) => els.findIndex(pred);
  const desc = i((e) => e.clases.includes('fvp-producto'));
  const cod = i((e) => e.clases.includes('fv-codigo'));
  const precio = i((e) => e.tag === 'small' && /c\/u/.test(e.texto));
  assert.ok(desc < cod && cod < precio, `orden inesperado: ${desc}, ${cod}, ${precio}`);
});

// ---------- regla de diseño Katuq ----------

test('clases nuevas sin la secuencia "p-" (regla global [class*="p-"])', () => {
  const src = fuenteCelda();
  const abre = src.indexOf('<div class="fv-siigo-fila"');
  assert.ok(abre >= 0, 'falta la fila del código SIIGO');
  const bloque = src.slice(abre, src.indexOf('</ng-container>', abre));
  const nuevas = [...bloque.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
  assert.ok(nuevas.filter((c) => c.startsWith('fv-')).length >= 4, `pocas clases fv-: ${nuevas}`);
  assert.deepEqual(nuevas.filter((c) => c.includes('p-')), []);
});

test('SCSS: chips con fondo suave y texto propio, radio de chip, sin gradientes ni border-left', () => {
  const sass = require(path.join(RAIZ, 'node_modules/sass'));
  const css = sass.compile(path.join(DIR, 'list.component.scss'), {
    loadPaths: [path.join(RAIZ, 'src'), path.join(RAIZ, 'node_modules')],
    quietDeps: true,
    logger: sass.Logger.silent,
  }).css;
  const regla = (sel) => {
    const m = css.match(new RegExp(`\\.factura-vista-previa \\.fvp-tabla \\.${sel} \\{([^}]*)\\}`));
    assert.ok(m, `falta la regla .${sel}`);
    return m[1];
  };
  const chip = regla('fv-siigo');
  assert.match(chip, /border-radius: 20px/);
  assert.match(chip, /font-size: 10\.5px/);
  const pares = { 'fv-siigo--ok': ['#E6F7EE', '#1E874B'], 'fv-siigo--nuevo': ['#FFF1DF', '#8a5300'], 'fv-siigo--sin': ['#eef0f3', '#5A6B78'] };
  for (const [sel, [fondo, texto]] of Object.entries(pares)) {
    const r = regla(sel);
    assert.match(r, new RegExp(`background: ${fondo}`), `${sel} sin fondo suave`);
    assert.match(r, new RegExp(`color: ${texto}`), `${sel} sin color propio (span.ng-star-inserted lo pintaría de azul)`);
  }
  const codigo = regla('fv-codigo');
  assert.match(codigo, /color: #8f8bab/);
  assert.match(codigo, /font-size: 11\.5px/);
  assert.match(codigo, /letter-spacing: normal/);
  assert.match(chip, /text-transform: uppercase/);
  const codSiigo = regla('fv-siigo-cod');
  assert.match(codSiigo, /text-transform: none/, 'el código de SIIGO no se transforma');
  assert.match(codSiigo, /color: inherit/);
  assert.match(codSiigo, /font-size: inherit/);
  const bloque = [chip, codigo, codSiigo, regla('fv-siigo-fila'), ...Object.keys(pares).map(regla)].join('\n');
  assert.doesNotMatch(bloque, /gradient\(|border-left/);
});

test('gradientes y primarios prohibidos de la pantalla no suben (antes: scss 3/0, html 0/0)', () => {
  const prohibidos = /#2196f3|#4361ee|#2563eb|#5c6ac4|#667eea|#3b82f6|#1d4ed8|#6366f1|#1976d2|#7366ff|rgba\(102, ?126, ?234/gi;
  const contar = (s, re) => (s.match(re) || []).length;
  assert.ok(contar(scssFuente, /(linear|radial)-gradient\(/g) <= 3);
  assert.equal(contar(scssFuente, prohibidos), 0);
  assert.equal(contar(html, /(linear|radial)-gradient\(/g), 0);
  assert.equal(contar(html, prohibidos), 0);
});
