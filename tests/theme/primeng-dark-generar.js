#!/usr/bin/env node
'use strict';

// D-502 F1 (ticket 1180, tarea 3.7, bloque TEMA-B06): superficies del PrimeNG oscuro sobre tokens --ds-*.
//
// theme-katuq-dark.scss importa lara-dark-purple, que trae sus colores escritos a mano (azul marino #071426,
// #040d19, #0b213f, #091a32 y #233752, y el lila #C4B5FD con sus hovers). Este script lee ese theme.css y
// escribe, entre los marcadores «<superficies-generadas>» de src/assets/scss/_primeng-dark.scss, un override
// EXPLÍCITO por regla: el mismo selector (así gana por orden, con la misma especificidad) y solo las
// propiedades de color, con cada literal cambiado por el token de su rol.
//
//   - Solo los componentes que usa la app (las plantillas de src/app; primeng-dark.test.js saca la lista de
//     las etiquetas <p-*> y las directivas pButton/pInputText/pTooltip y exige que cada una esté aquí o
//     en su lista de excluidos con razón). Las variantes de severidad
//     (secondary, success, info, warning, danger, help, contrast), el modo `p-input-filled` (sin uso) y
//     `p-button-plain` quedan como los trae lara: no usan los colores de arriba como superficie.
//   - Bordes: solo el color (`border` → `border-color`, `border-top` → `border-top-color`, …); nunca el
//     shorthand, para no tocar anchos ni estilos (los tamaños no cambian al alternar).
//   - Roles (design-f1.md §1 y §2):
//       fondo #071426 / #040d19 → surface; #091a32 → surface-2; #0b213f / #233752 → line-strong;
//       borde #0b213f → control-border en campos y line-strong en lo demás (decorativo);
//       #C4B5FD como relleno → accent; como borde de botón → accent; como borde de un control marcado o
//       como texto/ícono → accent-ink (criterio de TEMA-B03); como texto sobre fondo #1c2127 → accent;
//       #b3a0fc / #a28bfc (hover del relleno) → accent-hover, y como borde de control → accent-ink;
//       #1c2127 (texto sobre el lila) → on-accent;
//       rgba(255,255,255,.87) → ink-2 (ink sobre una fila resaltada; on-accent como fondo, la perilla);
//       rgba(255,255,255,.6) → muted (body como fondo); rgba(255,255,255,.03) → row-hover;
//       rgba(196,181,253,α) → rgba(var(--ds-accent-ink-rgb), α);
//       anillo de foco (rgba(196,181,253,.5), o la sombra lila de un selector :focus) →
//       `0 0 0 2px var(--ds-surface), 0 0 0 4px var(--ds-focus)` (el `inset` conserva su ancho con
//       var(--ds-focus)); `outline` → `outline-color: var(--ds-focus)`.
//
// Uso (desde la raíz del front):
//   node tests/theme/primeng-dark-generar.js            reescribe la región generada de _primeng-dark.scss
//   node tests/theme/primeng-dark-generar.js --revisar  sale con 1 si la región no es la que genera hoy
// La prueba tests/theme/primeng-dark.test.js corre la misma función y exige que la región coincida.

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '../..');
const TEMA = path.join(RAIZ, 'node_modules/primeng/resources/themes/lara-dark-purple/theme.css');
const DESTINO = path.join(RAIZ, 'src/assets/scss/_primeng-dark.scss');
const INICIO = '// <superficies-generadas>';
const FIN = '// </superficies-generadas>';

const SECCIONES = [
  ['Campos', /^p-(inputtext|inputnumber(?:-clearable)?|dropdown|multiselect|autocomplete|calendar|checkbox|radiobutton|inputswitch|chips|treeselect|inputgroup-addon|float-label|input-icon-left|input-icon-right|text-secondary|link|password)$/],
  ['Paneles flotantes', /^p-(dropdown-panel|multiselect-panel|autocomplete-panel|treeselect-panel|password-panel|datepicker|column-filter-overlay|column-filter-overlay-menu|column-filter-menu-button|column-filter-clear-button|overlaypanel|menu|confirm-popup|sidebar|tooltip)$/],
  ['Tablas y paginador', /^p-(datatable|paginator|treetable|tree|picklist|picklist-item)$/],
  ['Contenedores', /^p-(card|dialog|tabview|accordion|panel|toolbar|divider|fileupload|fileupload-choose|steps|timeline|organizationchart|message|toast)$/],
  ['Botones e indicadores', /^p-(button|splitbutton|selectbutton|togglebutton|badge|tag|chip|avatar|avatar-group|slider|progressbar)$/],
];
const CAMPOS = /^p-(inputtext|inputnumber(?:-clearable)?|dropdown|multiselect|autocomplete|calendar|checkbox|radiobutton|inputswitch|chips|treeselect|inputgroup-addon|password)$/;
const EXCLUIDOS = /-(secondary|success|info|warning|warn|danger|help|error|contrast)\b|p-input-filled|p-button-plain/;
// Colores de lara-dark-purple que este archivo reemplaza.
const COLORES_LARA = /#071426|#040d19|#0b213f|#091a32|#233752|#c4b5fd|#1c2127|#b3a0fc|#a28bfc|rgba\(196, 181, 253|rgba\(255, 255, 255, 0\.(87|6|03)\)/i;
const LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;
const ANILLO = '0 0 0 2px var(--ds-surface), 0 0 0 4px var(--ds-focus)';

function requerir(modulo) {
  try {
    return require(path.join(RAIZ, 'node_modules', modulo));
  } catch (error) {
    throw new Error(`no se encontró «${modulo}» en node_modules (llega con @angular-devkit/build-angular): ${error.message}`);
  }
}

// ---------- funciones puras ----------

// Token para un literal de lara según su papel: ctx = { fondo, borde, campo, resaltado, relleno, sobreClaro }.
function tokenPara(literal, ctx) {
  const v = literal.toLowerCase();
  if (v === '#071426' || v === '#040d19') {
    if (ctx.borde) return ctx.campo ? 'var(--ds-control-border)' : 'var(--ds-line-strong)';
    return 'var(--ds-surface)';
  }
  if (v === '#091a32') return ctx.borde ? 'var(--ds-line-strong)' : 'var(--ds-surface-2)';
  if (v === '#0b213f' || v === '#233752') {
    if (ctx.borde) return ctx.campo ? 'var(--ds-control-border)' : 'var(--ds-line-strong)';
    return 'var(--ds-line-strong)';
  }
  if (v === '#c4b5fd') {
    if (ctx.fondo) return 'var(--ds-accent)';
    if (ctx.borde) return ctx.relleno && !ctx.campo ? 'var(--ds-accent)' : 'var(--ds-accent-ink)';
    return ctx.sobreClaro ? 'var(--ds-accent)' : 'var(--ds-accent-ink)';
  }
  if (v === '#b3a0fc' || v === '#a28bfc') {
    if (ctx.borde) return ctx.campo ? 'var(--ds-accent-ink)' : 'var(--ds-accent-hover)';
    return ctx.fondo ? 'var(--ds-accent-hover)' : 'var(--ds-accent-ink)';
  }
  if (v === '#1c2127') return 'var(--ds-on-accent)';
  let m = v.match(/^rgba\(255, 255, 255, (0\.\d+)\)$/);
  if (m) {
    if (m[1] === '0.87') return ctx.fondo ? 'var(--ds-on-accent)' : (ctx.resaltado ? 'var(--ds-ink)' : 'var(--ds-ink-2)');
    if (m[1] === '0.6') return ctx.fondo ? 'var(--ds-body)' : 'var(--ds-muted)';
    if (m[1] === '0.03') return 'var(--ds-row-hover)';
  }
  m = v.match(/^rgba\(196, 181, 253, (0?\.\d+)\)$/);
  if (m) return `rgba(var(--ds-accent-ink-rgb), ${m[1]})`;
  return null;
}

function reemplazar(valor, ctx) {
  return valor.replace(LITERAL, literal => tokenPara(literal, ctx) || literal);
}

function seccionDe(componente) {
  const s = SECCIONES.find(([, patron]) => patron.test(componente));
  return s ? s[0] : null;
}

// Declaraciones nuevas para una regla de lara: [[prop, valor]]; vacío si no tiene colores de lara.
function overridesDeRegla(selector, decls) {
  const componente = (selector.match(/\.p-[a-z-]+/) || [''])[0].slice(1);
  const fondo = (decls.find(d => /^background(-color)?$/.test(d.prop)) || {}).value || '';
  const ctx = {
    campo: CAMPOS.test(componente),
    resaltado: /rgba\(196, 181, 253, 0\.16\)/.test(fondo),
    relleno: /#c4b5fd|#b3a0fc|#a28bfc/i.test(fondo),
    sobreClaro: /#1c2127/i.test(fondo),
  };
  const salida = [];
  for (const d of decls) {
    if (!COLORES_LARA.test(d.value)) continue;
    const p = d.prop;
    if (/^background(-color)?$/.test(p)) salida.push([p, reemplazar(d.value, { ...ctx, fondo: true })]);
    else if (p === 'color') salida.push([p, reemplazar(d.value, ctx)]);
    else if (/^border(-(top|right|bottom|left))?$/.test(p)) {
      const colores = (d.value.match(LITERAL) || []).map(l => tokenPara(l, { ...ctx, borde: true })).filter(Boolean);
      if (colores.length) salida.push([`${p}-color`, colores[0]]);
    } else if (/^border(-(top|right|bottom|left))?-color$/.test(p)) salida.push([p, reemplazar(d.value, { ...ctx, borde: true })]);
    else if (p === 'box-shadow') {
      // Anillo de foco: el lila a .5, o cualquier sombra lila en un selector :focus (el de .p-button va a .7).
      const foco = /rgba\(196, 181, 253, 0\.5\)/.test(d.value) || (/:focus/.test(selector) && /rgba\(196, 181, 253/.test(d.value));
      if (foco) {
        salida.push([p, /inset/.test(d.value) ? d.value.replace(/rgba\(196, 181, 253, 0?\.\d+\)/, 'var(--ds-focus)') : ANILLO]);
      } else salida.push([p, reemplazar(d.value, { ...ctx, borde: true })]);
    } else if (p === 'outline' || p === 'outline-color') salida.push(['outline-color', 'var(--ds-focus)']);
  }
  return salida;
}

// Texto de la región generada a partir del CSS de lara-dark-purple.
function generarSuperficies(css) {
  const postcss = requerir('postcss');
  const porSeccion = new Map(SECCIONES.map(([nombre]) => [nombre, []]));
  postcss.parse(css).walkRules(regla => {
    if (regla.parent.type !== 'root') return;
    const componente = (regla.selector.match(/\.p-[a-z-]+/) || [''])[0].slice(1);
    const seccion = seccionDe(componente);
    if (!seccion || EXCLUIDOS.test(regla.selector)) return;
    const decls = regla.nodes.filter(n => n.type === 'decl');
    const nuevas = overridesDeRegla(regla.selector, decls);
    if (nuevas.length) porSeccion.get(seccion).push({ selectores: regla.selectors.map(s => s.trim().replace(/\s+/g, ' ')), decls: nuevas });
  });
  const partes = [];
  for (const [nombre, reglas] of porSeccion) {
    partes.push(`\n// ${nombre}`);
    // Junta reglas SEGUIDAS con el mismo bloque: no cambia el orden de la cascada.
    const grupos = [];
    for (const r of reglas) {
      const clave = JSON.stringify(r.decls);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.clave === clave) ultimo.selectores.push(...r.selectores);
      else grupos.push({ clave, selectores: [...r.selectores], decls: r.decls });
    }
    for (const g of grupos) {
      partes.push(`${g.selectores.join(',\n')} { ${g.decls.map(([p, v]) => `${p}: ${v};`).join(' ')} }`);
    }
  }
  return partes.join('\n').replace(/^\n/, '') + '\n';
}

function regionActual(texto) {
  const i = texto.indexOf(INICIO);
  const f = texto.indexOf(FIN);
  if (i < 0 || f < i) return null;
  return texto.slice(texto.indexOf('\n', i) + 1, f);
}

function conRegion(texto, region) {
  const i = texto.indexOf(INICIO);
  const f = texto.indexOf(FIN);
  if (i < 0 || f < i) throw new Error(`faltan los marcadores ${INICIO} / ${FIN} en ${DESTINO}`);
  return texto.slice(0, texto.indexOf('\n', i) + 1) + region + texto.slice(f);
}

function main(argv) {
  const generado = generarSuperficies(fs.readFileSync(TEMA, 'utf8'));
  const texto = fs.readFileSync(DESTINO, 'utf8');
  if (argv.includes('--revisar')) {
    const igual = regionActual(texto) === generado;
    process.stdout.write(igual ? 'región generada al día\n' : 'la región generada no coincide: correr sin --revisar\n');
    return igual ? 0 : 1;
  }
  fs.writeFileSync(DESTINO, conRegion(texto, generado));
  process.stdout.write(`región generada escrita en ${path.relative(RAIZ, DESTINO)}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { TEMA, DESTINO, INICIO, FIN, COLORES_LARA, EXCLUIDOS, seccionDe, tokenPara, overridesDeRegla, generarSuperficies, regionActual, conRegion };
