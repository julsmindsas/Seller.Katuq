'use strict';

// D-502 F2a (ticket 1180, tarea 4.1, bloque TEMA-B07): la base _config-pagina.scss sobre los tokens --ds-*.
// Ver openspec/changes/modo-oscuro-seller/design-f2a.md. Compila con `sass` un componente sintético que
// importa la base (`@include config-pagina`) y comprueba:
//   1) cada $cfg-* apunta a su token (tabla de design-f2a.md) y $cfg-accent-ink existe;
//   2) claro idéntico: el CSS del sintético es igual a la referencia fija tests/theme/fixtures/
//      config-pagina-claro-4ac9a459.css (compilada en el commit anterior a F2a), con var(--ds-*) sustituido
//      por su valor claro (funciones de comparar-claro.js). Sin git: vale también en un clon superficial;
//   3) oscuro: ningún fondo #fff ni casi blanco (fuera de lo pendiente), cada texto con su fondo >= 4,5:1,
//      bordes de controles e indicadores >= 3:1 (con los pendientes de Daniel nombrados), el acento de
//      relleno nunca es color de texto y el de texto nunca es relleno; lo mismo en Ocasiones, Géneros y
//      Tipos de cliente (escenario del delta);
//   4) la base no tiene blancos literales, gradientes, primarios prohibidos ni clases propias con «p-»,
//      y el título de las pestañas PrimeNG hereda el color;
//   5) ningún consumidor aplica funciones de color de Sass, aritmética ni condiciones a $cfg-* (ni a sus
//      alias), las interpolaciones #{$cfg-*} solo van en propiedades personalizadas y todos compilan;
//   6) compuerta de publicación: las reglas de los consumidores que en oscuro quedan con fondo claro literal
//      y texto con token (ilegibles al publicar la base sola) no suben de su techo por archivo. Hasta que
//      lleguen a 0, la base no se publica sola (tasks.md 4.1.4).

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sass = require('sass');
const postcss = require('postcss');
const { leerTokens, compararVersiones, sustituirTokens, normalizarValor } = require('./comparar-claro');

const RAIZ = path.resolve(__dirname, '../..');
const SRC = path.join(RAIZ, 'src');
const BASE_REL = 'src/app/shared/styles/_config-pagina.scss';
const TOKENS_REL = 'src/app/shared/styles/_theme-tokens.scss';
// Referencia fija del claro: el sintético compilado en 4ac9a459, el último commit con los $cfg-* en hex.
const FIXTURE_CLARO = path.join(__dirname, 'fixtures/config-pagina-claro-4ac9a459.css');

// design-f2a.md: $cfg-* -> --ds-*.
const MAPEO = {
  'cfg-accent': 'accent', 'cfg-accent-hover': 'accent-hover', 'cfg-accent-ink': 'accent-ink', 'cfg-accent-2': 'focus',
  'cfg-accent-soft': 'accent-soft', 'cfg-ink': 'ink', 'cfg-body': 'body', 'cfg-muted': 'muted', 'cfg-line': 'line',
  'cfg-line-soft': 'line-soft', 'cfg-chip-bg': 'chip-bg', 'cfg-chip-border': 'control-border', 'cfg-tint': 'surface-2',
  'cfg-row-hover': 'row-hover', 'cfg-tile': 'tile', 'cfg-ok': 'ok', 'cfg-ok-soft': 'ok-soft', 'cfg-warn': 'warn',
  'cfg-warn-soft': 'warn-soft', 'cfg-err': 'err', 'cfg-err-soft': 'err-soft', 'cfg-info': 'info',
  'cfg-info-soft': 'info-soft', 'cfg-shadow-panel': 'shadow-panel', 'cfg-shadow-btn': 'shadow-btn',
};

// Pendiente de Daniel (design-f2a.md, «Preguntas para Daniel»; NO es una decisión tomada): literales claros
// sin token con su mismo valor claro. Un fondo casi blanco nuevo en oscuro hace fallar la prueba.
const PENDIENTE_CASI_BLANCO = new Set(['.cfg-pill--neutro']);

// Bordes de controles e indicadores que se miden a 3:1 en oscuro (spec, requisito de oscuro y delta F2a):
// [selector exacto del CSS compilado, propiedad, fondos contra los que se mide].
const CONTROLES = [
  ['.cfg-form .form-control, .cfg-form .form-select', 'border', ['chip-bg', 'surface']],
  ['.cfg-form .form-check-input:checked', 'border-color', ['surface', 'chip-bg']],
  ['.cfg-btn--sec', 'border-color', ['surface']],
  [':host ::ng-deep .cfg-pagina .p-tabview .p-tabview-nav li.p-highlight .p-tabview-nav-link', 'border-color', ['canvas', 'surface']],
  [':host ::ng-deep .cfg-pagina .p-tabview .p-tabview-ink-bar', 'background', ['canvas', 'surface']],
  [':host ::ng-deep .cfg-card .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider', 'background', ['surface']],
];
// Por debajo de 3:1 y abiertos como pregunta para Daniel (design-f2a.md): el borde de --sec usa line-strong
// (mismo caso que el punto 2 de la tarea 3.5) y el carril del interruptor es un relleno sin texto (nota de
// TEMA-B03 en la tarea 3.4). Cuando Daniel decida, se corrigen y se sacan de aquí.
const PENDIENTE_3_A_1 = new Set(['.cfg-btn--sec', ':host ::ng-deep .cfg-card .p-inputswitch.p-inputswitch-checked .p-inputswitch-slider']);

// Escenario «Ocasiones en oscuro» del delta: hojas que se revisan como el sintético. Lo pendiente es de su
// bloque de consumidores y entra en la compuerta de 4.1.4: en Tipos de cliente, la descripción con texto
// literal #211F3A sin fondo propio (1,1:1 sobre la fila oscura) y el badge de precio base en #f2eefe.
const PANTALLAS_OCASIONES = {
  'src/app/components/proceso/ocasiones/ocasiones.component.scss': [],
  'src/app/components/proceso/generos/generos.component.scss': [],
  'src/app/components/proceso/tipos-cliente/tipos-cliente.component.scss': ['.descripcion-recortada', '.badge-precio-base'],
};

// Compuerta (6): reglas de consumidores con fondo claro literal y texto con token, por archivo, medidas el
// 2026-10-21 sobre el árbol de F2a (42 en 25 archivos). Solo pueden bajar: al migrar cada pantalla
// (TEMA-B08 a B10 y B17) se baja su número aquí.
const TECHO_FONDO_CLARO_TEXTO_TOKEN = {
  'src/app/components/agenda/cita-form/cita-form.component.scss': 2,
  'src/app/components/agenda/cita-panel/cita-panel.component.scss': 2,
  'src/app/components/agenda/config/agenda-config.component.scss': 3,
  'src/app/components/agenda/pagina/agenda-page.component.scss': 4,
  'src/app/components/billing/billing.component.scss': 2,
  'src/app/components/cotizaciones/catalogos-link/detalle/catalogo-link-detalle.component.scss': 1,
  'src/app/components/ecomerce/categorias/categoria-atributos/categoria-atributos.component.scss': 2,
  'src/app/components/ecomerce/categorias/list/list.component.scss': 2,
  'src/app/components/empresas/crearEmpresa/crear-empresa/crear-empresa.component.scss': 2,
  'src/app/components/integrations/facturacion/facturacion-hub.component.scss': 1,
  'src/app/components/integrations/messaging-lines/messaging-lines.component.scss': 1,
  'src/app/components/integrations/siigo-config/siigo-config.component.scss': 1,
  'src/app/components/inventarios/historial-movimientos/historial-movimientos.component.scss': 1,
  'src/app/components/inventarios/recepcion-mercancia/recepcion-mercancia.component.scss': 1,
  'src/app/components/inventarios/traslados/traslados.component.scss': 2,
  'src/app/components/nps/encuestas/encuesta-editor.component.scss': 2,
  'src/app/components/nps/encuestas/encuestas-lista.component.scss': 1,
  'src/app/components/nps/seguimiento/caso.component.scss': 1,
  'src/app/components/productos/crear-productos/especificaciones-producto/especificaciones-producto.component.scss': 1,
  'src/app/components/ventas/borradores-venta/borradores-venta.component.scss': 1,
  'src/app/modules/agent-builder/library/library.component.scss': 1,
  'src/app/modules/agent-builder/monitoring/a2a-monitor.component.scss': 4,
  'src/app/modules/agent-builder/wizard/wizard.component.scss': 2,
  'src/app/modules/marketing/components/pauta-embudo/pauta-embudo.component.scss': 1,
  'src/app/modules/video-agent/components/appointments-list/appointments-list.component.scss': 1,
};

const SINTETICO = "@import 'app/shared/styles/config-pagina';\n@include config-pagina;\n";
const GRADIENTE = /(linear|radial)-gradient\(/gi;
const PRIMARIOS = /#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(\s*102\s*,\s*126\s*,\s*234/gi;

// ---------- utilidades ----------

function sinComentarios(scss) {
  return scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function compilarSintetico() {
  return sass.compileString(SINTETICO, {
    style: 'expanded', logger: sass.Logger.silent, loadPaths: [SRC], url: pathToFileURL(path.join(SRC, 'app/sintetico.scss')),
  }).css;
}

const NM = path.join(RAIZ, 'node_modules');
const OPCIONES_CONSUMIDOR = {
  style: 'expanded',
  loadPaths: [SRC, NM],
  importers: [{ findFileUrl: url => (url.startsWith('~') ? pathToFileURL(path.join(NM, url.slice(1))) : null) }],
  logger: sass.Logger.silent,
};
const cssConsumidores = new Map();
function compilarConsumidor(rel) {
  if (!cssConsumidores.has(rel)) cssConsumidores.set(rel, sass.compile(path.join(RAIZ, rel), OPCIONES_CONSUMIDOR).css);
  return cssConsumidores.get(rel);
}

function tokensDeFuente(scss, tema) {
  return leerTokens(sass.compileString(scss, { style: 'expanded' }).css, tema);
}

let cache = null;
function datos() {
  if (cache) return cache;
  const fuenteTokens = fs.readFileSync(path.join(RAIZ, TOKENS_REL), 'utf8');
  cache = {
    fuente: fs.readFileSync(path.join(RAIZ, BASE_REL), 'utf8'),
    css: compilarSintetico(),
    claro: tokensDeFuente(fuenteTokens, 'claro'),
    oscuro: tokensDeFuente(fuenteTokens, 'oscuro'),
  };
  return cache;
}

function hexARgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function luminancia(hex) {
  const [r, g, b] = hexARgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const esHex = v => /^#[0-9a-f]{6}$/i.test(v);

// Reglas del CSS compilado con sus valores resueltos en un juego de tokens: [{ selector, decl: {prop: valor} }].
function reglasResueltas(css, tokens) {
  const reglas = [];
  postcss.parse(css).walkRules(regla => {
    const decl = {};
    regla.walkDecls(d => {
      if (d.parent !== regla) return;
      decl[d.prop] = normalizarValor(sustituirTokens(d.value, tokens));
    });
    reglas.push({ selector: regla.selector.replace(/\s+/g, ' ').trim(), decl });
  });
  return reglas;
}

function fondoDe(decl) {
  return decl['background-color'] ?? decl.background;
}

const sinImportant = v => v?.replace(/ !important$/, '');
// Color de un borde: de border-color o del shorthand border (el primer hex).
const colorDe = v => sinImportant(v)?.match(/#[0-9a-f]{6}\b/i)?.[0];

/**
 * Revisión en oscuro de un CSS compilado (pura): fondos #fff o casi blancos, y texto < 4,5:1 contra su fondo
 * propio o, sin fondo propio, contra cada superficie donde puede caer. Devuelve [{ selector, motivo }].
 */
function revisarOscuro(css, oscuro, { casiBlancoPermitido = new Set() } = {}) {
  const superficies = ['canvas', 'surface', 'surface-2', 'row-hover', 'tile', 'chip-bg'].map(s => oscuro.get(s));
  const fallos = [];
  let pares = 0;
  for (const { selector, decl } of reglasResueltas(css, oscuro)) {
    for (const prop of ['background', 'background-color']) {
      const hex = sinImportant(decl[prop]);
      if (!hex || !esHex(hex)) continue;
      if (hex === '#ffffff') fallos.push({ selector, motivo: `${prop}: #fff` });
      else if (luminancia(hex) >= 0.8 && !casiBlancoPermitido.has(selector)) fallos.push({ selector, motivo: `${prop}: ${hex} (casi blanco)` });
    }
    if (/:disabled/.test(selector)) continue; // deshabilitado: exento (WCAG 1.4.3)
    const color = sinImportant(decl.color);
    if (!color || !esHex(color)) continue;
    const fondo = sinImportant(fondoDe(decl));
    for (const f of fondo && esHex(fondo) ? [fondo] : superficies) {
      pares++;
      const c = contraste(color, f);
      if (c < 4.5) fallos.push({ selector, motivo: `${color} sobre ${f} = ${c.toFixed(2)}` });
    }
  }
  return { fallos, pares };
}

// Consumidores: archivos .scss de src/ que importan la base o usan $cfg-* (sin la base ni el parcial de tokens).
// Recorrido con fs (sin grep): test:theme también corre en Windows (design-pruebas.md).
function consumidores() {
  const lista = [];
  const recorrer = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.scss') && /config-pagina|\$cfg-/.test(fs.readFileSync(p, 'utf8'))) lista.push(path.relative(RAIZ, p).split(path.sep).join('/'));
    }
  };
  recorrer(SRC);
  return lista.filter(f => f !== BASE_REL && f !== TOKENS_REL).sort();
}

/**
 * Compuerta (6), pura: reglas de un CSS compilado con fondo claro literal (#fff, white o casi blanco) y un
 * texto con token que en oscuro es claro. Al publicar la base, ese texto queda claro sobre blanco.
 */
const TEXTO_TOKEN = /var\(--ds-(ink|ink-2|body|muted|err|ok|warn|info|accent-ink)\)/;
function fondoClaroConTextoToken(css) {
  const hallazgos = [];
  postcss.parse(css).walkRules(regla => {
    const decl = {};
    regla.each(n => { if (n.type === 'decl') decl[n.prop] = n.value; });
    const fondo = sinImportant(fondoDe(decl))?.trim().toLowerCase();
    if (!fondo || !decl.color || !TEXTO_TOKEN.test(decl.color)) return;
    const claroLiteral = fondo === 'white' || (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(fondo) && luminancia(fondo) >= 0.8);
    if (claroLiteral) hallazgos.push(regla.selector.replace(/\s+/g, ' ').trim());
  });
  return hallazgos;
}

const FUNCIONES_COLOR = /\b(rgba?|hsla?|lighten|darken|mix|transparentize|opacify|fade-in|fade-out|adjust-hue|saturate|desaturate|adjust-color|scale-color|change-color|grayscale|complement|invert|alpha|opacity|red|green|blue|hue|saturation|lightness|ie-hex-str|color\.[a-z-]+|tint|shade)\s*\(/gi;

/**
 * Busca en un .scss usos de $cfg-* (y de sus alias, transitivos) que no aceptan var(): funciones de color de
 * Sass, aritmética y condiciones, y las interpolaciones #{…} fuera de una propiedad personalizada.
 * Pura: recibe el texto y devuelve la lista de hallazgos «línea: tipo: texto».
 */
function usosIncompatibles(scss) {
  const texto = sinComentarios(scss);
  const alias = new Set();
  for (let crecio = true; crecio;) {
    crecio = false;
    for (const m of texto.matchAll(/\$([a-z0-9_-]+)\s*:\s*([^;]+);/gi)) {
      const [, nombre, valor] = m;
      if (nombre.startsWith('cfg-') || alias.has(nombre)) continue;
      if (/\$cfg-/.test(valor) || [...alias].some(a => new RegExp(`\\$${a}(?![\\w-])`).test(valor))) {
        alias.add(nombre);
        crecio = true;
      }
    }
  }
  const nombres = ['cfg-[a-z0-9-]+', ...[...alias].map(a => a.replace(/[-]/g, '\\-'))].join('|');
  const usa = new RegExp(`\\$(${nombres})(?![\\w-])`, 'i');
  const hallazgos = [];
  texto.split('\n').forEach((linea, i) => {
    if (!usa.test(linea)) return;
    for (const m of linea.matchAll(FUNCIONES_COLOR)) {
      let profundidad = 0;
      let fin = m.index + m[0].length - 1;
      const inicio = fin;
      for (; fin < linea.length; fin++) {
        if (linea[fin] === '(') profundidad++;
        else if (linea[fin] === ')' && --profundidad === 0) break;
      }
      if (usa.test(linea.slice(inicio, fin))) hallazgos.push(`${i + 1}: función: ${linea.trim()}`);
    }
    if (/@if\b|@else\b|==|!=/.test(linea)) hallazgos.push(`${i + 1}: condición: ${linea.trim()}`);
    if (new RegExp(`\\$(${nombres})(?![\\w-])\\s*[*/+%]|[*+%]\\s*\\$(${nombres})(?![\\w-])`, 'i').test(linea)) hallazgos.push(`${i + 1}: aritmética: ${linea.trim()}`);
    if (new RegExp(`#\\{[^}]*\\$(${nombres})`, 'i').test(linea) && !/^\s*(\.[^{]*\{\s*)?--[\w-]+\s*:\s*#\{/.test(linea)) {
      // Solo se acepta `--propiedad: #{$cfg-*}` (también dentro de una regla en la misma línea).
      const fueraDeCustom = linea.split(';').some(parte => new RegExp(`#\\{[^}]*\\$(${nombres})`, 'i').test(parte) && !/--[\w-]+\s*:\s*#\{/.test(parte));
      if (fueraDeCustom) hallazgos.push(`${i + 1}: interpolación: ${linea.trim()}`);
    }
  });
  return hallazgos;
}

// ---------- 1) mapeo ----------

test('1) cada $cfg-* apunta a su token --ds-* (design-f2a.md) y el token existe en los dos juegos', () => {
  const { fuente, claro, oscuro } = datos();
  for (const [variable, token] of Object.entries(MAPEO)) {
    const m = fuente.match(new RegExp(`^\\$${variable}\\s*:\\s*([^;]+);`, 'm'));
    assert.ok(m, `falta $${variable} en _config-pagina.scss`);
    assert.equal(m[1].trim(), `var(--ds-${token})`, `$${variable}`);
    assert.ok(claro.has(token) && oscuro.has(token), `--ds-${token} no está en _theme-tokens.scss`);
  }
  const declaradas = [...fuente.matchAll(/^\$(cfg-[a-z0-9-]+)\s*:/gm)].map(m => m[1]);
  assert.deepEqual(declaradas.filter(v => !(v in MAPEO)), [], 'variables $cfg-* sin fila en el mapeo');
});

// ---------- 2) claro idéntico ----------

test('2) claro idéntico: el sintético compila igual que la referencia fija de antes de F2a', () => {
  const { css, claro } = datos();
  const r = compararVersiones(fs.readFileSync(FIXTURE_CLARO, 'utf8'), claro, css, claro, 'claro');
  assert.equal(r.vacio, false, 'el sintético no produjo declaraciones');
  assert.deepEqual({ soloBase: r.soloBase, soloActual: r.soloActual, ordenCambio: r.ordenCambio }, { soloBase: [], soloActual: [], ordenCambio: false });
  assert.ok(r.declaraciones > 150, `pocas declaraciones: ${r.declaraciones}`);
});

test('2) el cambio es real: en la referencia el sintético tenía hex y ahora tiene var(--ds-*)', () => {
  assert.doesNotMatch(fs.readFileSync(FIXTURE_CLARO, 'utf8'), /var\(--ds-/);
  assert.ok((datos().css.match(/var\(--ds-/g) || []).length > 60, 'el sintético actual casi no usa tokens');
});

// ---------- 3) oscuro ----------

test('3) oscuro: ningún fondo #fff ni casi blanco (fuera de lo pendiente) y cada texto >= 4,5:1 sobre su fondo o sobre cada superficie', () => {
  const { css, oscuro } = datos();
  const { fallos, pares } = revisarOscuro(css, oscuro, { casiBlancoPermitido: PENDIENTE_CASI_BLANCO });
  assert.ok(pares > 40, `pocos pares medidos: ${pares}`);
  assert.deepEqual(fallos.map(f => `${f.selector}: ${f.motivo}`), []);
});

test('3) oscuro: bordes de controles e indicadores >= 3:1; los que están por debajo son solo los pendientes de Daniel', () => {
  const { css, oscuro } = datos();
  const reglas = reglasResueltas(css, oscuro);
  const fallos = [];
  const pendientesBajo = [];
  for (const [selector, prop, fondos] of CONTROLES) {
    const regla = reglas.find(r => r.selector === selector && r.decl[prop]);
    assert.ok(regla, `falta ${selector} { ${prop} }`);
    const color = colorDe(regla.decl[prop]);
    assert.ok(color, `${selector} { ${prop} } sin color medible`);
    const minimo = Math.min(...fondos.map(f => contraste(color, oscuro.get(f))));
    if (minimo >= 3) continue;
    (PENDIENTE_3_A_1.has(selector) ? pendientesBajo : fallos).push(`${selector} { ${prop}: ${color} } = ${minimo.toFixed(2)}`);
  }
  assert.deepEqual(fallos, []);
  // Si un pendiente ya pasa, se saca de PENDIENTE_3_A_1 y de design-f2a.md.
  assert.equal(pendientesBajo.length, PENDIENTE_3_A_1.size, `pendientes que ya pasan 3:1: revisar PENDIENTE_3_A_1 (${pendientesBajo.join('; ')})`);
});

test('3) escenario «Ocasiones en oscuro»: Ocasiones, Géneros y Tipos de cliente sin fondos blancos y con texto >= 4,5:1', () => {
  const { oscuro } = datos();
  for (const [rel, pendientes] of Object.entries(PANTALLAS_OCASIONES)) {
    const { fallos } = revisarOscuro(compilarConsumidor(rel), oscuro, { casiBlancoPermitido: PENDIENTE_CASI_BLANCO });
    const selectores = [...new Set(fallos.map(f => f.selector))];
    assert.deepEqual(selectores.filter(s => !pendientes.includes(s)), [], `${rel}: ${fallos.map(f => `${f.selector}: ${f.motivo}`).join('; ')}`);
    assert.deepEqual(pendientes.filter(s => !selectores.includes(s)), [], `${rel}: pendientes ya resueltos, sacarlos de PANTALLAS_OCASIONES`);
  }
});

test('3) acento de relleno y de texto separados: $cfg-accent nunca es color de texto, $cfg-accent-ink nunca es relleno', () => {
  const fuente = sinComentarios(datos().fuente);
  const mixin = fuente.slice(fuente.indexOf('@mixin config-pagina'));
  const fallos = [];
  for (const m of mixin.matchAll(/([a-z-]+)\s*:\s*([^;{}]+);/g)) {
    const [, prop, valor] = m;
    if (prop === 'color' && /\$cfg-accent(?![\w-])/.test(valor)) fallos.push(`color con el acento de relleno: ${m[0].trim()}`);
    if (/^background/.test(prop) && /\$cfg-accent-ink\b/.test(valor) && !/ink-bar/.test(mixin.slice(Math.max(0, m.index - 80), m.index))) {
      fallos.push(`relleno con el acento de texto: ${m[0].trim()}`);
    }
  }
  assert.deepEqual(fallos, []);
});

test('3) sobre un relleno de acento, el texto es on-accent (blanco) en los dos temas', () => {
  const { css, claro, oscuro } = datos();
  for (const [nombre, tokens] of [['claro', claro], ['oscuro', oscuro]]) {
    const acento = normalizarValor(tokens.get('accent'));
    const conTexto = reglasResueltas(css, tokens).filter(r => fondoDe(r.decl)?.replace(/ !important$/, '') === acento && r.decl.color);
    assert.ok(conTexto.length >= 2, `${nombre}: esperaba el botón y el paginador`);
    for (const r of conTexto) assert.equal(r.decl.color.replace(/ !important$/, ''), '#ffffff', `${nombre}: ${r.selector}`);
  }
});

// ---------- 4) higiene de la base ----------

test('4) la base no tiene blancos literales, gradientes ni primarios prohibidos', () => {
  const fuente = sinComentarios(datos().fuente);
  assert.deepEqual(fuente.match(/#fff\b|#ffffff\b|\bwhite\b(?!-space)/gi) || [], [], 'blancos literales: pasan a var(--ds-surface) o var(--ds-on-accent)');
  assert.equal((fuente.match(GRADIENTE) || []).length, 0, 'gradientes');
  assert.equal((fuente.match(PRIMARIOS) || []).length, 0, 'primarios prohibidos');
});

test('4) ninguna clase propia de la base contiene «p-» y el título de las pestañas hereda el color', () => {
  const { css } = datos();
  const propias = new Set();
  const reglas = [];
  postcss.parse(css).walkRules(regla => {
    reglas.push(regla);
    for (const m of regla.selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)) if (m[1].startsWith('cfg')) propias.add(m[1]);
  });
  assert.ok(propias.size > 20, `pocas clases cfg: ${propias.size}`);
  assert.deepEqual([...propias].filter(c => c.includes('p-')), []);
  const titulo = reglas.find(r => /\.cfg-pagina .*\.p-tabview-title/.test(r.selector));
  assert.ok(titulo, 'falta la regla de .p-tabview-title');
  const decl = titulo.nodes.find(n => n.type === 'decl' && n.prop === 'color');
  assert.equal(decl?.value, 'inherit');
  assert.equal(decl?.important, true);
});

// ---------- 5) consumidores ----------

test('5) usosIncompatibles detecta funciones, alias, aritmética e interpolación fuera de una propiedad personalizada', () => {
  const hoja = [
    '$primario: $cfg-accent;',
    '$otro: $primario;',
    '.a { background: rgba($cfg-accent, .1); }',
    '.b { color: darken($otro, 10%); }',
    '.c { width: $cfg-line * 2; }',
    '.d { content: "#{$cfg-ink}"; }',
    '.e { --kc-ink: #{$cfg-ink}; }',
    ':host { --kc-accent: #{$cfg-accent}; }',
    '.f { color: $cfg-accent; box-shadow: 0 0 0 3px rgba(124, 92, 255, .15); }',
    '// rgba($cfg-accent, .2) en un comentario no cuenta',
    '@if $cfg-ok == #1E874B { .g { color: red; } }',
  ].join('\n');
  const tipos = usosIncompatibles(hoja).map(h => h.split(':').slice(0, 2).join(':'));
  assert.deepEqual(tipos, ['3: función', '4: función', '5: aritmética', '6: interpolación', '11: condición']);
});

test('5) ningún consumidor aplica funciones de color de Sass, aritmética ni condiciones a $cfg-* o sus alias', () => {
  const lista = consumidores();
  assert.ok(lista.length >= 120, `solo ${lista.length} consumidores`);
  const fallos = [];
  for (const rel of lista) {
    for (const h of usosIncompatibles(fs.readFileSync(path.join(RAIZ, rel), 'utf8'))) fallos.push(`${rel}:${h}`);
  }
  assert.deepEqual(fallos, []);
});

test('5) todos los consumidores compilan con sass y no dejan funciones CSS inválidas sobre tokens', () => {
  const directos = consumidores().filter(rel => /\$cfg-/.test(fs.readFileSync(path.join(RAIZ, rel), 'utf8')));
  assert.ok(directos.length >= 50, `solo ${directos.length} archivos con $cfg-* directo`);
  const errores = [];
  let compilados = 0;
  for (const rel of consumidores()) {
    if (path.basename(rel).startsWith('_')) continue; // parciales: se compilan dentro de su consumidor
    try {
      const css = compilarConsumidor(rel);
      compilados++;
      const invalidas = (css.match(/[a-z-]+\(var\(--ds-[a-z0-9-]+/g) || []).filter(f => !/^rgba?\(var\(--ds-[a-z0-9-]+-rgb$/.test(f));
      if (invalidas.length) errores.push(`${rel}: ${[...new Set(invalidas)].join(', ')}`);
      if (/\$cfg-/.test(css)) errores.push(`${rel}: quedó $cfg- sin resolver`);
    } catch (error) {
      errores.push(`${rel}: ${error.message.split('\n')[0]}`);
    }
  }
  assert.deepEqual(errores, []);
  assert.ok(compilados >= 115, `solo ${compilados} consumidores compilados`);
});

// ---------- 6) compuerta de publicación ----------

test('6) fondoClaroConTextoToken detecta fondo claro literal con texto de token', () => {
  const css = [
    '.a { background: #fff; color: var(--ds-ink); }',
    '.b { background-color: white; color: var(--ds-body) !important; }',
    '.c { background: var(--ds-surface); color: var(--ds-ink); }',
    '.d { background: #fff; color: #211F3A; }',
    '.e { background: #faf9fe; color: var(--ds-muted); }',
    '.f { background: #5F3FE0; color: var(--ds-on-accent); }',
  ].join('\n');
  assert.deepEqual(fondoClaroConTextoToken(css), ['.a', '.b', '.e']);
});

test('6) compuerta: las reglas con fondo claro literal y texto con token no suben de su techo por archivo', () => {
  const fallos = [];
  let total = 0;
  for (const rel of consumidores()) {
    if (path.basename(rel).startsWith('_')) continue;
    const n = fondoClaroConTextoToken(compilarConsumidor(rel)).length;
    total += n;
    const techo = TECHO_FONDO_CLARO_TEXTO_TOKEN[rel] ?? 0;
    if (n > techo) fallos.push(`${rel}: ${n} > techo ${techo}`);
  }
  assert.deepEqual(fallos, []);
  assert.ok(total <= 42, `total ${total}`);
});

module.exports = { usosIncompatibles, revisarOscuro, fondoClaroConTextoToken };
