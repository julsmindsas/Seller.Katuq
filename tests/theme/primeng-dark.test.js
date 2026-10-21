'use strict';

// D-502 F1 (ticket 1180, tarea 3.7, bloque TEMA-B06): PrimeNG oscuro `katuq-dark` sobre lara-dark-purple.
//   1) El claro compila idéntico: el bloque de tamaños de theme-lara-light-blue.scss:19-55 se mudó a
//      _primeng-katuq-base.scss y se importa en la misma posición (base fija 35717c33).
//   2) Los tamaños no cambian al alternar: la geometría final (por selector exacto, con la cascada de
//      cada bundle completo: theme.css de lara + lo compilado) es la misma en los dos temas.
//   3) El botón primario de PrimeNG es #5F3FE0 con texto blanco en oscuro y sigue #8b5cf6 en claro
//      (asimetría declarada, valor por defecto 8).
//   4) Ninguna superficie, texto o acento de lara-dark-purple (azul marino y lila #C4B5FD) queda como
//      valor final en los componentes que usa la app; todo color de _primeng-dark.scss es var(--ds-*), y
//      los textos con fondo propio dan >= 4,5:1 con los tokens oscuros. Los componentes salen de las
//      plantillas (no de la lista del generador) y p-selectButton/p-toggleButton se miden con especificidad.
//   5) Cableado: angular.json, ThemeModeService, el tema viejo borrado, firebase.json sin caché y con el
//      redirect del nombre viejo.
// Sin build: compila con el sass del front, lee el theme.css de node_modules y simula la cascada.

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const sass = require('sass');
const postcss = require('postcss');
const { leerTokens, compararVersiones } = require('./comparar-claro');
const gen = require('./primeng-dark-generar');

const RAIZ = path.resolve(__dirname, '../..');
const SCSS = 'src/assets/scss';
const CLARO = `${SCSS}/theme-lara-light-blue.scss`;
const OSCURO = `${SCSS}/theme-katuq-dark.scss`;
const BASE_PARCIAL = `${SCSS}/_primeng-katuq-base.scss`;
const DARK_PARCIAL = `${SCSS}/_primeng-dark.scss`;
const VIEJO = `${SCSS}/theme-md-dark-deeppurple.scss`;
const TOKENS = 'src/app/shared/styles/_theme-tokens.scss';
const LARA = {
  claro: 'node_modules/primeng/resources/themes/lara-light-blue/theme.css',
  oscuro: 'node_modules/primeng/resources/themes/lara-dark-purple/theme.css',
};
// Punta antes de este bloque: referencia fija del claro.
const BASE = '35717c33';

const GEOMETRIA = /^(font-size|font-weight|font-family|line-height|padding(-[a-z]+)?|margin(-[a-z]+)?|(min-|max-)?(width|height)|border(-[a-z]+)?-width|border(-[a-z]+)*-radius|gap|top|right|bottom|left|--p-[a-z-]+|--content-padding|--inline-spacing|--border-radius)$/;

function abs(rel) {
  return path.join(RAIZ, rel);
}

function leer(rel) {
  return fs.existsSync(abs(rel)) ? fs.readFileSync(abs(rel), 'utf8') : null;
}

function enBase(rel) {
  try {
    return execFileSync('git', ['-C', RAIZ, 'show', `${BASE}:${rel}`], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  } catch {
    return null;
  }
}

const opcionesSass = url => ({
  style: 'expanded',
  url,
  loadPaths: [abs('src'), abs('node_modules')],
  importers: [{ findFileUrl: u => (u.startsWith('~') ? pathToFileURL(abs(`node_modules/${u.slice(1)}`)) : null) }],
  logger: sass.Logger.silent,
});

const cacheCss = new Map();
function compilar(rel) {
  if (!cacheCss.has(rel)) cacheCss.set(rel, sass.compile(abs(rel), opcionesSass()).css);
  return cacheCss.get(rel);
}

let cacheTokens = null;
function tokens() {
  if (!cacheTokens) {
    const css = sass.compile(abs(TOKENS), { style: 'expanded' }).css;
    cacheTokens = { claro: leerTokens(css, 'claro'), oscuro: leerTokens(css, 'oscuro') };
  }
  return cacheTokens;
}

// Bundle completo como lo arma Angular: el @import del theme.css de lara se reemplaza por su contenido.
function bundle(tema) {
  const css = compilar(tema === 'claro' ? CLARO : OSCURO);
  const importLara = new RegExp(`@import ["'](~?)${LARA[tema].replace('node_modules/', '').replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}["'];`);
  assert.match(css, importLara, `el bundle ${tema} debe importar ${LARA[tema]}`);
  return css.replace(importLara, () => fs.readFileSync(abs(LARA[tema]), 'utf8'));
}

function contexto(nodo) {
  const partes = [];
  for (let p = nodo.parent; p && p.type !== 'root'; p = p.parent) {
    if (p.type === 'atrule') partes.unshift(`@${p.name} ${p.params.replace(/\s+/g, ' ')}`);
  }
  return partes.join(' > ');
}

const sel = s => s.trim().replace(/\s+/g, ' ');

// Declaraciones en orden: { clave: «contexto|selector», prop, valor, important, orden }.
function declaraciones(css) {
  const salida = [];
  let orden = 0;
  postcss.parse(css).walkDecls(d => {
    if (d.parent.type !== 'rule') return;
    if (d.parent.parent.type === 'atrule' && /keyframes/.test(d.parent.parent.name)) return;
    const ctx = contexto(d.parent);
    for (const s of d.parent.selectors) {
      salida.push({ clave: `${ctx}|${sel(s)}`, prop: d.prop, valor: d.value.trim(), important: d.important, orden: orden++ });
    }
  });
  return salida;
}

// Valor final por «clave|prop»: !important gana; a igual importancia, el último.
function cascada(decls, filtro = () => true) {
  const final = new Map();
  for (const d of decls) {
    if (!filtro(d)) continue;
    const k = `${d.clave}|${d.prop}`;
    const previo = final.get(k);
    if (!previo || d.important || !previo.important) final.set(k, d);
  }
  return final;
}

// ---------- color ----------

function hexARgb(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function luminancia([r, g, b]) {
  const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// var(--ds-X) y rgba(var(--ds-X-rgb), α) con los tokens oscuros -> { rgb, alfa }; null si no es un color.
function resolverOscuro(valor) {
  const t = tokens().oscuro;
  const v = valor.trim();
  let m = v.match(/^var\(--ds-([a-z0-9-]+)\)$/);
  if (m) {
    const hex = t.get(m[1]);
    return hex && /^#/.test(hex) ? { rgb: hexARgb(hex), alfa: 1 } : null;
  }
  m = v.match(/^rgba\(var\(--ds-([a-z0-9-]+)\),\s*([\d.]+)\)$/);
  if (m) return { rgb: t.get(m[1]).split(',').map(n => Number(n.trim())), alfa: Number(m[2]) };
  return null;
}

function sobre(color, fondoRgb) {
  return color.rgb.map((c, i) => Math.round(c * color.alfa + fondoRgb[i] * (1 - color.alfa)));
}

// ---------- 1. claro idéntico ----------

test('el claro compila idéntico a la base: el bloque de tamaños solo se mudó a _primeng-katuq-base (3.7)', t => {
  const fuenteBase = enBase(CLARO);
  if (fuenteBase === null) { t.skip(`el clon no tiene ${BASE}`); return; }
  // La base se compila con los parciales de hoy: primeng-overrides no cambia en este bloque.
  const cssBase = sass.compileString(fuenteBase, opcionesSass(pathToFileURL(abs(CLARO)))).css;
  const r = compararVersiones(cssBase, tokens().claro, compilar(CLARO), tokens().claro);
  assert.ok(!r.vacio, 'sin declaraciones que comparar');
  assert.ok(r.igual, `el claro cambió:\nsolo base:\n${r.soloBase.join('\n')}\nsolo hoy:\n${r.soloActual.join('\n')}\norden: ${r.ordenCambio}`);
});

test('los dos temas importan _primeng-katuq-base en la misma posición y _primeng-dark va de último', () => {
  const imports = rel => [...leer(rel).matchAll(/^@import\s+["']([^"']+)["']/gm)].map(m => m[1]);
  const claro = imports(CLARO);
  const oscuro = imports(OSCURO);
  assert.deepEqual(claro, ['primeng/resources/themes/lara-light-blue/theme.css', './primeng-overrides.scss', './primeng-katuq-base']);
  assert.deepEqual(oscuro, ['primeng/resources/themes/lara-dark-purple/theme.css', './primeng-overrides.scss', './primeng-katuq-base', './primeng-dark']);
  assert.ok(!/\.p-component\s*\{/.test(leer(CLARO)), 'el bloque de tamaños sigue también en theme-lara-light-blue.scss');
  assert.match(leer(BASE_PARCIAL), /\.p-component\s*\{\s*font-size:\s*0\.7rem !important;/);
});

test('.backColorSwitch y .bg-swayp conservan los valores del oscuro anterior', () => {
  const css = compilar(OSCURO);
  assert.match(css, /\.backColorSwitch \{[^}]*background-color: #471f5d !important;/);
  assert.match(css, /\.bg-swayp \{\s*background-color: #1f465d !important;/);
});

// ---------- 2. tamaños ----------

test('tamaños y espaciados iguales en los dos temas: misma geometría final por selector (criterio de 3.7)', () => {
  const geo = tema => {
    const final = cascada(declaraciones(bundle(tema)), d => GEOMETRIA.test(d.prop));
    return new Map([...final].map(([k, d]) => [k, `${d.valor}${d.important ? ' !important' : ''}`]));
  };
  const claro = geo('claro');
  const oscuro = geo('oscuro');
  const distintas = [];
  for (const [k, v] of claro) if (oscuro.get(k) !== v) distintas.push(`${k}: claro ${v} / oscuro ${oscuro.get(k)}`);
  for (const k of oscuro.keys()) if (!claro.has(k)) distintas.push(`${k}: solo en oscuro (${oscuro.get(k)})`);
  assert.ok(claro.size > 1000, `geometría del claro sospechosamente corta: ${claro.size}`);
  assert.deepEqual(distintas, [], `la geometría cambia al alternar:\n${distintas.slice(0, 30).join('\n')}`);
});

test('font-size y padding de .p-button, .p-inputtext y las celdas de p-table, iguales y con el valor de Katuq', () => {
  for (const tema of ['claro', 'oscuro']) {
    const final = cascada(declaraciones(bundle(tema)));
    const valor = (clave, prop) => { const d = final.get(`|${clave}|${prop}`); return d && `${d.valor}${d.important ? '!' : ''}`; };
    assert.equal(valor('.p-button', 'font-size'), '0.7rem!', `${tema}: .p-button font-size`);
    assert.equal(valor('.p-button', 'padding'), 'var(--p-padding-sm)!', `${tema}: .p-button padding`);
    assert.equal(valor('.p-inputtext', 'font-size'), '0.7rem!', `${tema}: .p-inputtext font-size`);
    assert.equal(valor('.p-datatable .p-datatable-tbody > tr > td', 'padding'), '0.5rem!', `${tema}: td padding`);
    assert.equal(valor('.p-datatable .p-datatable-thead > tr > th', 'font-size'), '0.7rem!', `${tema}: th font-size`);
  }
});

// ---------- 3. botón primario ----------

const PRIMARIO = '.p-button:not(.p-button-secondary):not(.p-button-success):not(.p-button-info):not(.p-button-warning):not(.p-button-danger):not(.p-button-help):not(.p-button-text):not(.p-button-outlined):not(.p-button-link)';

test('botón primario de PrimeNG: #5F3FE0 con texto blanco en oscuro y #8b5cf6 en claro (asimetría declarada)', () => {
  const oscuro = cascada(declaraciones(bundle('oscuro')));
  const claro = cascada(declaraciones(bundle('claro')));
  for (const s of ['.p-button.p-button-primary', PRIMARIO]) {
    assert.equal(oscuro.get(`|${s}|background`).valor, 'var(--ds-accent)');
    assert.equal(oscuro.get(`|${s}|border-color`).valor, 'var(--ds-accent)');
    assert.equal(oscuro.get(`|${s}|color`).valor, 'var(--ds-on-accent)');
    assert.equal(oscuro.get(`|${s}:enabled:hover|background`).valor, 'var(--ds-accent-hover)');
    assert.equal(oscuro.get(`|${s}:focus|box-shadow`).valor, '0 0 0 2px var(--ds-surface), 0 0 0 4px var(--ds-focus)');
    assert.equal(claro.get(`|${s}|background`).valor.toLowerCase(), '#8b5cf6');
  }
  const t = tokens().oscuro;
  assert.equal(t.get('accent').toLowerCase(), '#5f3fe0');
  assert.ok(contraste(hexARgb(t.get('on-accent')), hexARgb(t.get('accent'))) >= 4.5);
  assert.ok(contraste(hexARgb(t.get('on-accent')), hexARgb(t.get('accent-hover'))) >= 4.5);
});

test('el secundario del splitbutton deja #64748b: texto body y borde control-border', () => {
  const oscuro = cascada(declaraciones(bundle('oscuro')));
  for (const s of ['.p-splitbutton.p-button-secondary > .p-button', '.p-splitbutton.p-button-outlined > .p-button']) {
    assert.equal(oscuro.get(`|${s}|color`).valor, 'var(--ds-body)');
    assert.equal(oscuro.get(`|${s}|border-color`).valor, 'var(--ds-control-border)');
    assert.equal(oscuro.get(`|${s}:enabled:hover|color`).valor, 'var(--ds-body)');
  }
});

// ---------- 4. superficies y tokens ----------

test('la región generada de _primeng-dark.scss es la que produce primeng-dark-generar.js', () => {
  const generado = gen.generarSuperficies(fs.readFileSync(abs(LARA.oscuro), 'utf8'));
  const region = gen.regionActual(leer(DARK_PARCIAL));
  assert.ok(region !== null, 'faltan los marcadores de la región generada');
  assert.ok(generado.split('\n').length > 200, 'la región generada salió casi vacía');
  assert.equal(region, generado, 'la región no coincide: correr node tests/theme/primeng-dark-generar.js');
});

// Propiedades cuyo color pisa a cada propiedad de lara.
function pisanColor(prop) {
  const lado = (prop.match(/^border-(top|right|bottom|left)/) || [])[1];
  if (/^border/.test(prop)) return lado ? [`border-${lado}`, `border-${lado}-color`, 'border', 'border-color'] : ['border', 'border-color'];
  if (/^outline/.test(prop)) return ['outline', 'outline-color'];
  if (/^background/.test(prop)) return ['background', 'background-color'];
  return [prop];
}

test('ningún color de lara-dark-purple queda como valor final en los componentes que usa la app', () => {
  const decls = declaraciones(bundle('oscuro'));
  const porClave = new Map();
  for (const d of decls) {
    if (!porClave.has(d.clave)) porClave.set(d.clave, []);
    porClave.get(d.clave).push(d);
  }
  const lara = declaraciones(fs.readFileSync(abs(LARA.oscuro), 'utf8'));
  const quedan = [];
  let revisadas = 0;
  for (const d of lara) {
    const [ctx, selector] = d.clave.split('|');
    if (ctx) continue;
    const componente = (selector.match(/\.p-[a-z-]+/) || [''])[0].slice(1);
    if (!gen.seccionDe(componente) || gen.EXCLUIDOS.test(selector) || !gen.COLORES_LARA.test(d.valor)) continue;
    if (!/^(background|background-color|color|border(-(top|right|bottom|left))?(-color)?|box-shadow|outline(-color)?)$/.test(d.prop)) continue;
    revisadas++;
    const props = pisanColor(d.prop);
    const candidatas = porClave.get(d.clave).filter(x => props.includes(x.prop));
    const ganadora = candidatas.reduce((g, x) => (!g || x.important || !g.important ? x : g), null);
    if (gen.COLORES_LARA.test(ganadora.valor)) quedan.push(`${selector} { ${ganadora.prop}: ${ganadora.valor} }`);
  }
  assert.ok(revisadas > 300, `se revisaron pocas declaraciones de lara: ${revisadas}`);
  assert.deepEqual(quedan, [], `colores de lara que siguen ganando:\n${quedan.slice(0, 30).join('\n')}`);
});

// Componentes que usa la app, sacados de las plantillas (no de la lista del generador): etiquetas <p-*> y
// las directivas que ponen clases .p-*. Cada uno se traduce a las clases raíz que usa lara.
const ALIAS_PLANTILLA = {
  table: ['datatable', 'column-filter', 'column-filter-overlay', 'column-filter-overlay-menu', 'column-filter-menu-button', 'column-filter-clear-button'],
  columnfilter: ['column-filter', 'column-filter-overlay', 'column-filter-overlay-menu', 'column-filter-menu-button', 'column-filter-clear-button'],
  sorticon: ['datatable'], tablecheckbox: ['checkbox'], tableheadercheckbox: ['checkbox'],
  treetablecelleditor: ['treetable'], treetabletoggler: ['treetable'],
  tabpanel: ['tabview'], accordiontab: ['accordion'], confirmdialog: ['dialog'],
  calendar: ['calendar', 'datepicker'], inputnumber: ['inputnumber', 'inputnumber-clearable'],
  fileupload: ['fileupload', 'fileupload-choose'], avatar: ['avatar', 'avatar-group'],
  dropdown: ['dropdown', 'dropdown-panel'], multiselect: ['multiselect', 'multiselect-panel'],
  autocomplete: ['autocomplete', 'autocomplete-panel'], treeselect: ['treeselect', 'treeselect-panel'],
  password: ['password', 'password-panel'], picklist: ['picklist', 'picklist-item'],
  button: ['button'], pbutton: ['button'], pinputtext: ['inputtext'], pinputtextarea: ['inputtext'], ptooltip: ['tooltip'],
};
function componentesDePlantillas() {
  const usados = new Set();
  const recorrer = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.(html|ts)$/.test(e.name)) {
        const texto = fs.readFileSync(p, 'utf8');
        for (const [, t] of texto.matchAll(/<p-([a-zA-Z]+)/g)) usados.add(t.toLowerCase());
        for (const [, t] of texto.matchAll(/\s(pButton|pInputText|pInputTextarea|pTooltip)\b/g)) usados.add(t.toLowerCase());
      }
    }
  };
  recorrer(abs('src/app'));
  return usados;
}

test('cada componente PrimeNG de las plantillas con colores de lara-dark-purple tiene su sección en el generador', () => {
  const usados = componentesDePlantillas();
  for (const t of ['selectbutton', 'togglebutton', 'avatar', 'organizationchart', 'table']) assert.ok(usados.has(t), `no se encontró <p-${t}> en src/app`);
  // Clases raíz de lara con colores que este archivo reemplaza.
  const conColor = new Set();
  postcss.parse(fs.readFileSync(abs(LARA.oscuro), 'utf8')).walkRules(r => {
    if (r.parent.type !== 'root' || gen.EXCLUIDOS.test(r.selector)) return;
    if (!r.nodes.some(n => n.type === 'decl' && gen.COLORES_LARA.test(n.value))) return;
    conColor.add((r.selector.match(/\.p-[a-z-]+/) || [''])[0].slice(1));
  });
  const faltan = [];
  for (const u of usados) {
    for (const c of ALIAS_PLANTILLA[u] || [u]) {
      if (conColor.has(`p-${c}`) && !gen.seccionDe(`p-${c}`)) faltan.push(`<p-${u}> -> .p-${c}`);
    }
  }
  assert.deepEqual(faltan, [], `componentes de la app que conservan colores de lara-dark-purple:\n${faltan.join('\n')}`);
});

// Cascada real para elementos de muestra: coincidencia de selectores (css-select) y especificidad, no solo
// el orden por selector exacto. Detecta reglas más específicas que pisan la región generada.
const cssSelect = require('css-select');
const { Element } = require('domhandler');
const selectorParser = require('postcss-selector-parser');

function especificidad(selector) {
  const e = [0, 0, 0];
  const contar = nodos => nodos.each(n => {
    if (n.type === 'id') e[0]++;
    else if (n.type === 'class' || n.type === 'attribute') e[1]++;
    else if (n.type === 'pseudo') {
      if (/^:(not|is|has)$/.test(n.value)) {
        // La de su argumento más específico.
        const maximo = n.nodes.map(sub => especificidad(String(sub))).reduce((a, b) => (comparar(a, b) >= 0 ? a : b), [0, 0, 0]);
        e[0] += maximo[0]; e[1] += maximo[1]; e[2] += maximo[2];
      } else if (n.value.startsWith('::')) e[2]++;
      else e[1]++;
    } else if (n.type === 'tag') e[2]++;
  });
  selectorParser(raiz => raiz.each(s => contar(s))).processSync(selector);
  return e;
}

function comparar(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

// div con clases dentro de una cadena de ancestros: [[tag, clases], …, [tag, clases]] (el último es el elemento).
function elemento(cadena) {
  let padre = null;
  let nodo = null;
  for (const [tag, clases] of cadena) {
    nodo = new Element(tag, { class: clases }, []);
    if (padre) { nodo.parent = padre; padre.children.push(nodo); }
    padre = nodo;
  }
  return nodo;
}

const CANALES = { fondo: ['background', 'background-color'], texto: ['color'], borde: ['border', 'border-color'] };

// Valor final de cada canal para el elemento en reposo (sin :hover/:focus/:active). Los div no son
// :enabled ni :disabled (css-select los aceptaría), así que esas reglas no aplican.
function valoresFinales(css, nodo) {
  const ganador = {};
  let orden = 0;
  postcss.parse(css).walkRules(regla => {
    if (regla.parent.type !== 'root') return;
    const partes = regla.selectors.filter(s => !/:(hover|focus|focus-visible|focus-within|active|enabled|disabled)\b|::/.test(s));
    let mejor = null;
    for (const s of partes) {
      let coincide = false;
      try { coincide = cssSelect.is(nodo, s); } catch { coincide = false; }
      if (coincide) { const e = especificidad(s); if (!mejor || comparar(e, mejor) > 0) mejor = e; }
    }
    regla.each(d => {
      orden++;
      if (d.type !== 'decl' || !mejor) return;
      for (const [canal, props] of Object.entries(CANALES)) {
        if (!props.includes(d.prop)) continue;
        const actual = ganador[canal];
        const cand = { valor: d.value.trim(), imp: d.important, esp: mejor, orden, regla: regla.selector.replace(/\s+/g, ' ').slice(0, 120) };
        const gana = !actual || (cand.imp !== actual.imp ? cand.imp : comparar(cand.esp, actual.esp) >= 0);
        if (gana) ganador[canal] = cand;
      }
    });
  });
  return ganador;
}

test('p-selectButton y p-toggleButton en oscuro: la opción marcada se distingue de la que no (cascada con especificidad)', () => {
  const css = bundle('oscuro');
  const casos = {
    'selectbutton sin marcar': [['body', 'dark-only'], ['div', 'p-selectbutton p-buttonset p-component'], ['div', 'p-button p-component']],
    'selectbutton marcada': [['body', 'dark-only'], ['div', 'p-selectbutton p-buttonset p-component'], ['div', 'p-button p-component p-highlight']],
    'togglebutton apagado': [['body', 'dark-only'], ['div', 'p-button p-togglebutton p-component']],
    'togglebutton encendido': [['body', 'dark-only'], ['div', 'p-button p-togglebutton p-component p-highlight']],
  };
  const esperado = {
    'selectbutton sin marcar': ['var(--ds-surface)', 'var(--ds-ink-2)'],
    'selectbutton marcada': ['var(--ds-accent)', 'var(--ds-on-accent)'],
    'togglebutton apagado': ['var(--ds-surface)', 'var(--ds-ink-2)'],
    'togglebutton encendido': ['var(--ds-accent)', 'var(--ds-on-accent)'],
  };
  const fallas = [];
  for (const [nombre, cadena] of Object.entries(casos)) {
    const v = valoresFinales(css, elemento(cadena));
    const [fondo, texto] = esperado[nombre];
    if (v.fondo?.valor !== fondo) fallas.push(`${nombre}: fondo ${v.fondo?.valor} (de ${v.fondo?.regla}), se esperaba ${fondo}`);
    if (v.texto?.valor !== texto) fallas.push(`${nombre}: texto ${v.texto?.valor} (de ${v.texto?.regla}), se esperaba ${texto}`);
  }
  // Control: el botón primario normal sigue en accent.
  const boton = valoresFinales(css, elemento([['body', 'dark-only'], ['button', 'p-button p-component']]));
  if (boton.fondo?.valor !== 'var(--ds-accent)') fallas.push(`botón primario: fondo ${boton.fondo?.valor}`);
  assert.deepEqual(fallas, []);
});

test('especificidad: el primario de 10 clases le gana a .p-selectbutton .p-button.p-highlight', () => {
  assert.deepEqual(especificidad(PRIMARIO), [0, 10, 0]);
  assert.deepEqual(especificidad('.p-selectbutton .p-button.p-highlight'), [0, 3, 0]);
  assert.deepEqual(especificidad('p-inputnumber.p-x .p-y:hover'), [0, 3, 1]);
});

test('_primeng-dark.scss solo pinta con var(--ds-*) existentes, sin literales, gradientes ni primarios prohibidos', () => {
  const css = sass.compileString(leer(DARK_PARCIAL), { style: 'expanded', logger: sass.Logger.silent }).css;
  const { claro, oscuro } = tokens();
  const malos = [];
  postcss.parse(css).walkDecls(d => {
    if (GEOMETRIA.test(d.prop)) return;
    const sinTokens = d.value.replace(/rgba\(var\(--ds-[a-z0-9-]+-rgb\),\s*[\d.]+\)/g, '').replace(/var\(--ds-[a-z0-9-]+\)/g, '');
    if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|\b(white|black)\b/i.test(sinTokens)) malos.push(`${d.parent.selector} { ${d.prop}: ${d.value} }`);
    for (const [, nombre] of d.value.matchAll(/var\(--ds-([a-z0-9-]+)\)/g)) {
      if (!claro.has(nombre) || !oscuro.has(nombre)) malos.push(`token inexistente --ds-${nombre}`);
    }
  });
  assert.deepEqual(malos, []);
  for (const rel of [DARK_PARCIAL, BASE_PARCIAL, OSCURO, CLARO]) {
    const texto = leer(rel);
    assert.equal((texto.match(/(linear|radial)-gradient\(/gi) || []).length, 0, `${rel}: gradiente`);
    assert.equal((texto.match(/#(2196f3|4361ee|2563eb|5c6ac4|667eea|3b82f6|1d4ed8|6366f1|1976d2|7366ff)\b|rgba\(\s*102\s*,\s*126\s*,\s*234/gi) || []).length, 0, `${rel}: primario prohibido`);
  }
});

// on-accent sin fondo en la misma regla: elementos que van ENCIMA de un relleno accent (el ícono del
// checkbox marcado, la etiqueta sobre la barra de progreso y los íconos del selectbutton activo).
const ON_ACCENT_SIN_FONDO = [/\.p-checkbox-icon$/, /\.p-progressbar-label$/, /^\.p-(selectbutton \.p-button|togglebutton\.p-button)\.p-highlight(:hover)? \.p-button-icon-(left|right)$/];

test('en oscuro, cada texto con fondo propio da >= 4,5:1, y on-accent solo va sobre el relleno', () => {
  const css = sass.compileString(leer(DARK_PARCIAL), { style: 'expanded', logger: sass.Logger.silent }).css;
  const superficie = hexARgb(tokens().oscuro.get('surface'));
  const fallas = [];
  let medidas = 0;
  postcss.parse(css).walkRules(regla => {
    const props = new Map();
    regla.walkDecls(d => props.set(d.prop, d.value));
    const texto = props.get('color');
    const fondo = props.get('background') || props.get('background-color');
    if (texto === 'var(--ds-on-accent)' && !fondo && !regla.selectors.every(s => ON_ACCENT_SIN_FONDO.some(p => p.test(s.trim())))) {
      fallas.push(`${regla.selector}: on-accent sin relleno`);
    }
    if (!texto || !fondo) return;
    const t = resolverOscuro(texto);
    const f = resolverOscuro(fondo);
    if (!t || !f) return;
    medidas++;
    const fondoRgb = sobre(f, superficie);
    const c = contraste(sobre(t, fondoRgb), fondoRgb);
    if (c < 4.5) fallas.push(`${regla.selector}: ${texto} sobre ${fondo} = ${c.toFixed(2)}`);
  });
  assert.ok(medidas > 40, `se midieron pocas reglas: ${medidas}`);
  assert.deepEqual(fallas, []);
});

test('las variables de lara que usa la app (--surface-*, --text-color*) apuntan a tokens en body.dark-only', () => {
  const usadas = new Set();
  const recorrer = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.(scss|css|html|ts)$/.test(e.name)) {
        for (const [, v] of fs.readFileSync(p, 'utf8').matchAll(/var\(\s*--((?:surface-[a-z0-9]+)|text-color(?:-secondary)?)\s*[,)]/g)) usadas.add(v);
      }
    }
  };
  recorrer(abs('src/app'));
  assert.ok(usadas.has('surface-50') && usadas.has('text-color'), 'no se encontraron los usos conocidos');
  const css = sass.compileString(leer(DARK_PARCIAL), { style: 'expanded', logger: sass.Logger.silent }).css;
  const definidas = new Map();
  postcss.parse(css).walkRules(regla => {
    if (regla.selector.trim() !== 'body.dark-only') return;
    regla.walkDecls(/^--/, d => definidas.set(d.prop.slice(2), d.value));
  });
  for (const v of usadas) {
    assert.ok(definidas.has(v), `--${v} se usa en src/app y no tiene valor oscuro`);
    assert.match(definidas.get(v), /^var\(--ds-[a-z0-9-]+\)$/, `--${v} no apunta a un token`);
  }
});

// ---------- 5. cableado ----------

test('angular.json, ThemeModeService y el tema viejo: el bundle oscuro es katuq-dark', () => {
  const angular = JSON.parse(leer('angular.json'));
  const estilos = Object.values(angular.projects).flatMap(p => (p.architect?.build?.options?.styles || []));
  const entrada = estilos.find(e => typeof e === 'object' && e.bundleName === 'katuq-dark');
  assert.ok(entrada, 'falta la entrada katuq-dark en angular.json');
  assert.equal(entrada.input, OSCURO);
  assert.equal(entrada.inject, false);
  assert.ok(!estilos.some(e => typeof e === 'object' && /md-dark/.test(e.bundleName + e.input)), 'sigue el bundle md-dark-deeppurple');
  assert.match(leer('src/app/shared/services/theme-mode.service.ts'), /const BUNDLE_OSCURO = 'katuq-dark';/);
  assert.equal(leer(VIEJO), null, `${VIEJO} debe estar borrado`);
  assert.ok(fs.existsSync(abs(LARA.oscuro)), 'lara-dark-purple no está instalado');
});

// Glob de firebase.json -> RegExp (los patrones que usa este repo: **, *, @(a|b)).
function globARegex(glob) {
  let r = '';
  for (let i = 0; i < glob.length; i++) {
    if (glob.startsWith('**', i)) { r += '.*'; i++; } else if (glob[i] === '*') r += '[^/]*';
    else if (glob.startsWith('@(', i)) { const f = glob.indexOf(')', i); r += `(${glob.slice(i + 2, f)})`; i = f; } else r += glob[i].replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${r}$`);
}

function cacheDe(ruta) {
  const hosting = JSON.parse(leer('firebase.json')).hosting;
  const reglas = (Array.isArray(hosting) ? hosting[0] : hosting).headers;
  // Firebase aplica la última regla que coincide (comentario de firebase.json).
  const ultima = reglas.filter(r => globARegex(r.source).test(ruta)).pop();
  return ultima && ultima.headers.find(h => h.key === 'Cache-Control').value;
}

test('firebase.json sirve katuq-dark.css sin caché (el patrón de dos puntos no lo atrapa)', () => {
  assert.equal(cacheDe('/main.8832f778.js'), 'public, max-age=31536000, immutable', 'el glob no reproduce el patrón de hash');
  assert.equal(cacheDe('/katuq-dark.css'), 'no-cache');
  assert.equal(cacheDe('/lara-light-blue.css'), 'no-cache');
});

test('firebase.json redirige el nombre viejo md-dark-deeppurple.css a katuq-dark.css (sesiones abiertas antes de publicar)', () => {
  const hosting = JSON.parse(leer('firebase.json')).hosting;
  const r = (hosting.redirects || []).find(x => x.source === '/md-dark-deeppurple.css');
  assert.ok(r, 'falta el redirect del bundle viejo: el catch-all respondería index.html y PrimeNG quedaría sin tema');
  assert.equal(r.destination, '/katuq-dark.css');
  assert.equal(r.type, 302);
});

// ---------- funciones puras del generador ----------

test('primeng-dark-generar: roles de cada color de lara', () => {
  assert.equal(gen.tokenPara('#071426', { fondo: true }), 'var(--ds-surface)');
  assert.equal(gen.tokenPara('#0b213f', { borde: true, campo: true }), 'var(--ds-control-border)');
  assert.equal(gen.tokenPara('#0b213f', { borde: true }), 'var(--ds-line-strong)');
  assert.equal(gen.tokenPara('#C4B5FD', { fondo: true }), 'var(--ds-accent)');
  assert.equal(gen.tokenPara('#C4B5FD', { borde: true, relleno: true }), 'var(--ds-accent)');
  assert.equal(gen.tokenPara('#C4B5FD', { borde: true, relleno: true, campo: true }), 'var(--ds-accent-ink)');
  assert.equal(gen.tokenPara('#C4B5FD', {}), 'var(--ds-accent-ink)');
  assert.equal(gen.tokenPara('#C4B5FD', { sobreClaro: true }), 'var(--ds-accent)');
  assert.equal(gen.tokenPara('rgba(255, 255, 255, 0.87)', { resaltado: true }), 'var(--ds-ink)');
  assert.equal(gen.tokenPara('rgba(196, 181, 253, 0.16)', { fondo: true }), 'rgba(var(--ds-accent-ink-rgb), 0.16)');
  assert.equal(gen.tokenPara('#3B82F6', {}), null);
  // Bordes: solo el color, nunca el shorthand (no cambia anchos).
  assert.deepEqual(gen.overridesDeRegla('.p-dropdown', [{ prop: 'border', value: '1px solid #0b213f' }]), [['border-color', 'var(--ds-control-border)']]);
  assert.deepEqual(gen.overridesDeRegla('.p-dialog', [{ prop: 'width', value: '10px' }]), []);
  assert.deepEqual(gen.overridesDeRegla('.p-inputtext:enabled:focus', [{ prop: 'box-shadow', value: '0 0 0 0.2rem rgba(196, 181, 253, 0.5)' }]),
    [['box-shadow', '0 0 0 2px var(--ds-surface), 0 0 0 4px var(--ds-focus)']]);
});
