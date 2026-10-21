'use strict';

// D-502 (ticket 1180): funciones puras de tests/theme/comparar-claro.js, el chequeo «claro idéntico» sin build.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  esSelectorOscuro, sustituirTokens, normalizarValor, normalizarCss, leerTokens, leerTokensClaros, compararLineas,
  compararVersiones,
} = require('./comparar-claro');

const TOKENS = new Map([
  ['surface', '#fff'],
  ['accent', '#5F3FE0'],
  ['accent-ink-rgb', '95, 63, 224'],
  ['shadow-panel', '0 1px 3px rgba(30, 20, 80, .04)'],
]);

test('esSelectorOscuro: body.dark-only, .dark-only y :host-context(...) sí; el claro no', () => {
  assert.equal(esSelectorOscuro('body.dark-only .cfg-card'), true);
  assert.equal(esSelectorOscuro('  .dark-only .x'), true);
  assert.equal(esSelectorOscuro(':host-context(body.dark-only) .barra'), true);
  assert.equal(esSelectorOscuro(':host-context(.dark-only) .barra'), true);
  assert.equal(esSelectorOscuro('.cfg-card'), false);
  assert.equal(esSelectorOscuro(':where(body:not(.dark-only)) .chat'), false);
  assert.equal(esSelectorOscuro('.panel .dark-only'), false);
});

test('sustituirTokens: var(--ds-X) y var(--ds-X, respaldo) pasan al valor claro', () => {
  assert.equal(sustituirTokens('var(--ds-surface)', TOKENS), '#fff');
  assert.equal(sustituirTokens('1px solid var(--ds-accent, #000)', TOKENS), '1px solid #5F3FE0');
  assert.equal(sustituirTokens('rgba(var(--ds-accent-ink-rgb), .12)', TOKENS), 'rgba(95, 63, 224, .12)');
  assert.equal(sustituirTokens('var(--ds-shadow-panel), 0 0 0 1px var(--ds-accent)', TOKENS),
    '0 1px 3px rgba(30, 20, 80, .04), 0 0 0 1px #5F3FE0');
  assert.equal(sustituirTokens('var(--ds-surface, rgba(0, 0, 0, .1))', TOKENS), '#fff');
});

test('sustituirTokens: deja igual las variables ajenas y los tokens desconocidos', () => {
  assert.equal(sustituirTokens('var(--primary-color)', TOKENS), 'var(--primary-color)');
  assert.equal(sustituirTokens('var(--ds-no-existe)', TOKENS), 'var(--ds-no-existe)');
  assert.equal(sustituirTokens('var(--x, var(--ds-surface))', TOKENS), 'var(--x, var(--ds-surface))');
  assert.equal(sustituirTokens('var(--ds-surface)', { surface: '#fafafa' }), '#fafafa');
});

test('normalizarValor: hex, nombres, rgb, decimales, espacios e !important', () => {
  assert.equal(normalizarValor('#FFF'), '#ffffff');
  assert.equal(normalizarValor('#5F3FE0'), '#5f3fe0');
  assert.equal(normalizarValor('#5f3fe0ff'), '#5f3fe0');
  assert.equal(normalizarValor('white'), '#ffffff');
  assert.equal(normalizarValor('1px solid black'), '1px solid #000000');
  assert.equal(normalizarValor('nowrap'), 'nowrap');
  assert.equal(normalizarValor('rgb(95,63,224)'), '#5f3fe0');
  assert.equal(normalizarValor('rgba(95, 63, 224, 1)'), '#5f3fe0');
  assert.equal(normalizarValor('rgba(95,63,224,.12)'), 'rgba(95, 63, 224, 0.12)');
  assert.equal(normalizarValor('rgba(30, 20, 80, 0.040)'), 'rgba(30, 20, 80, 0.04)');
  assert.equal(normalizarValor('translateY(-.5px)'), 'translateY(-0.5px)');
  assert.equal(normalizarValor('1.0'), '1');
  assert.equal(normalizarValor('10px'), '10px');
  assert.equal(normalizarValor('  0   8px  18px  '), '0 8px 18px');
  assert.equal(normalizarValor('#fff!important'), '#ffffff !important');
});

test('valor por token y valor literal normalizan igual (base $cfg-* vs actual var(--ds-*))', () => {
  const antes = normalizarValor('rgba(95, 63, 224, 0.12)');
  const despues = normalizarValor(sustituirTokens('rgba(var(--ds-accent-ink-rgb), .12)', TOKENS));
  assert.equal(despues, antes);
  assert.equal(normalizarValor(sustituirTokens('var(--ds-surface)', TOKENS)), normalizarValor('#ffffff'));
});

test('leerTokensClaros: solo el juego de :root', () => {
  const tokens = leerTokensClaros(':root{--ds-surface:#fff;--otra:1}body.dark-only{--ds-surface:#1b1826}');
  assert.deepEqual([...tokens], [['surface', '#fff']]);
});

test('normalizarCss: descarta lo oscuro y las definiciones --ds-* de :root, conserva el claro', () => {
  const css = `
    :root { --ds-surface: #fff; --primary-color: #7c5cff; }
    body.dark-only { --ds-surface: #1b1826; }
    /* comentario */
    .cfg-card { background: var(--ds-surface); color: #211F3A; }
    body.dark-only .cfg-card, .otra { color: #f2f0fa; }
    @media (max-width: 768px) { :host-context(body.dark-only) .x { color: red; } .y { margin: .5rem !important; } }
    @import url("x.css");
  `;
  assert.deepEqual(normalizarCss(css, TOKENS), [
    ':root { --primary-color: #7c5cff }',
    '.cfg-card { background: #ffffff }',
    '.cfg-card { color: #211f3a }',
    '.otra { color: #f2f0fa }',
    '@media (max-width: 768px) | .y { margin: 0.5rem !important }',
    '@import url("x.css")',
  ]);
});

test('normalizarCss: migrar $cfg-* literal a var(--ds-*) no cambia el claro', () => {
  const base = '.cfg-card{background:#FFF;box-shadow:0 1px 3px rgba(30,20,80,.04)}';
  const actual = '.cfg-card{background:var(--ds-surface);box-shadow:var(--ds-shadow-panel)}'
    + 'body.dark-only .cfg-card{background:#1b1826}';
  assert.equal(compararLineas(normalizarCss(base, TOKENS), normalizarCss(actual, TOKENS)).igual, true);
});

test('compararLineas: igual, distinto y mismo conjunto en otro orden', () => {
  assert.deepEqual(compararLineas(['a', 'b'], ['a', 'b']), { soloBase: [], soloActual: [], ordenCambio: false, igual: true });
  const distinto = compararLineas(['a', 'b', 'b'], ['a', 'b', 'c']);
  assert.deepEqual(distinto.soloBase, ['b']);
  assert.deepEqual(distinto.soloActual, ['c']);
  assert.equal(distinto.igual, false);
  const orden = compararLineas(['a', 'b'], ['b', 'a']);
  assert.equal(orden.ordenCambio, true);
  assert.equal(orden.igual, false);
});

test('compararVersiones: cada lado con sus tokens; cambiar el valor claro de un token se detecta', () => {
  const css = '.cfg-sub{color:var(--ds-muted)}';
  const antes = new Map([['muted', '#8f8bab']]);
  const despues = new Map([['muted', '#6b6790']]);
  assert.equal(compararVersiones(css, antes, css, antes).igual, true);
  const r = compararVersiones(css, antes, css, despues);
  assert.equal(r.igual, false);
  assert.deepEqual(r.soloBase, ['.cfg-sub { color: #8f8bab }']);
  assert.deepEqual(r.soloActual, ['.cfg-sub { color: #6b6790 }']);
});

test('compararVersiones: sin declaraciones en ningún lado es «vacío», no «idéntico» a secas', () => {
  const r = compararVersiones('', TOKENS, '/* solo mixins */', TOKENS);
  assert.equal(r.vacio, true);
  assert.equal(compararVersiones(null, TOKENS, '.x{color:red}', TOKENS).vacio, false);
});

// --tema oscuro (tarea 3.6, bloque TEMA-B05): «mismo valor» al pasar un literal oscuro a token.
const PARCIAL = ':root{--ds-surface:#fff;--ds-line:#ececf4;--ds-canvas-rgb:244, 243, 250;--ds-accent:#5F3FE0}'
  + 'body.dark-only{--ds-surface:#1b1826;--ds-line:#262233;--ds-canvas-rgb:20, 18, 28}';

test('leerTokens oscuro: el de body.dark-only encima del claro; lo que no redefine hereda el claro', () => {
  const oscuro = leerTokens(PARCIAL, 'oscuro');
  assert.equal(oscuro.get('surface'), '#1b1826');
  assert.equal(oscuro.get('canvas-rgb'), '20, 18, 28');
  assert.equal(oscuro.get('accent'), '#5F3FE0');
  assert.equal(leerTokens(PARCIAL).get('surface'), '#fff');
  assert.throws(() => leerTokens(PARCIAL, 'gris'), /tema desconocido/);
});

test('normalizarCss oscuro: conserva las reglas oscuras y las claras, descarta las definiciones --ds-*', () => {
  const oscuro = leerTokens(PARCIAL, 'oscuro');
  const css = PARCIAL + '.x{color:#211F3A}body.dark-only .x{background:var(--ds-surface)}'
    + 'body.dark-only{--glass-bg:var(--ds-surface)}';
  assert.deepEqual(normalizarCss(css, oscuro, 'oscuro'), [
    '.x { color: #211f3a }',
    'body.dark-only .x { background: #1b1826 }',
    'body.dark-only { --glass-bg: #1b1826 }',
  ]);
  assert.deepEqual(normalizarCss(css, leerTokens(PARCIAL), 'claro'), ['.x { color: #211f3a }']);
});

test('compararVersiones oscuro: literal -> token con el mismo valor es idéntico; con otro valor, no', () => {
  const oscuro = leerTokens(PARCIAL, 'oscuro');
  const base = 'body.dark-only .page-header{background:rgba(20, 18, 28, .72)!important;border-bottom:1px solid #262233}';
  const igual = 'body.dark-only .page-header{background:rgba(var(--ds-canvas-rgb), 0.72)!important;'
    + 'border-bottom:1px solid var(--ds-line)}';
  assert.equal(compararVersiones(base, oscuro, igual, oscuro, 'oscuro').igual, true);
  // En claro las dos no tienen nada que comparar: el oscuro se descarta.
  assert.equal(compararVersiones(base, oscuro, igual, oscuro, 'claro').vacio, true);
  const otro = igual.replace('var(--ds-line)', 'var(--ds-surface)');
  const r = compararVersiones(base, oscuro, otro, oscuro, 'oscuro');
  assert.equal(r.igual, false);
  assert.deepEqual(r.soloActual, ['body.dark-only .page-header { border-bottom: 1px solid #1b1826 }']);
});
