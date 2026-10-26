'use strict';

// D-502 (ticket 1180), bloque TEMA-B02: funciones puras de la auditoría en navegador
// (auditoria-tema.js). No dependen de Playwright ni del build, así se prueban con `node --test`
// en auditoria-puras.test.js.

// ---------- F1 ----------

// Relleno del botón principal en oscuro (design-f1.md §1: `--ds-accent` con `--ds-on-accent`).
const RELLENO_PRIMARIO = 'rgb(95, 63, 224)';
const TEXTO_BLANCO = 'rgb(255, 255, 255)';

// Botón primario de PrimeNG: `.p-button` sin severidad ni variante.
const VARIANTES_P_BUTTON = [
  'secondary', 'success', 'info', 'warning', 'warn', 'help', 'danger', 'contrast',
  'text', 'outlined', 'link', 'plain', 'raised-text',
];
const SELECTOR_P_BUTTON_PRIMARIO = `.p-button${VARIANTES_P_BUTTON.map(v => `:not(.p-button-${v})`).join('')}:not(.p-disabled):not(:disabled)`;

const GRUPOS_RELLENO = {
  btnPrimary: '.btn-primary:not(:disabled):not(.disabled)',
  badgePrimary: '.badge.bg-primary',
  pButtonPrimario: SELECTOR_P_BUTTON_PRIMARIO,
};

function rellenoPrimarioOk(medida) {
  return !!medida && medida.fondo === RELLENO_PRIMARIO && medida.texto === TEXTO_BLANCO;
}

// Tamaños de PrimeNG que no deben cambiar al alternar el tema (requisito «los tamaños son los mismos»).
const SELECTORES_TAMANO = {
  pButton: '.p-button',
  pInputtext: '.p-inputtext',
  thTabla: '.p-datatable .p-datatable-thead > tr > th',
  tdTabla: '.p-datatable .p-datatable-tbody > tr > td',
};
const PROPIEDADES_TAMANO = ['fontSize', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];

/**
 * Compara las medidas de un mismo elemento en claro y en oscuro.
 * @param {Record<string, Record<string,string>|null>} claro  selector → medidas (o null si no está)
 * @param {Record<string, Record<string,string>|null>} oscuro
 * @returns {{ ok: boolean|null, diferencias: object[], sinMedir: string[] }}
 */
function compararTamanos(claro, oscuro) {
  const diferencias = [];
  const sinMedir = [];
  const claves = [...new Set([...Object.keys(claro || {}), ...Object.keys(oscuro || {})])];
  for (const clave of claves) {
    const a = claro && claro[clave];
    const b = oscuro && oscuro[clave];
    if (!a || !b) { sinMedir.push(clave); continue; }
    for (const propiedad of PROPIEDADES_TAMANO) {
      if (a[propiedad] !== b[propiedad]) diferencias.push({ elemento: clave, propiedad, claro: a[propiedad], oscuro: b[propiedad] });
    }
  }
  const medidos = claves.length - sinMedir.length;
  return { ok: medidos ? diferencias.length === 0 : null, diferencias, sinMedir };
}

// Familia del azul heredado de dark-mode.scss (design-f1.md §2) como la devuelve getComputedStyle.
const AZUL_HEREDADO = {
  '#6AB5E8': [106, 181, 232],
  '#5AA5D8': [90, 165, 216],
  '#8AC5F8': [138, 197, 248],
  '#4A95C8': [74, 149, 200],
};
const PATRON_AZUL = new RegExp(
  `rgba?\\(\\s*(${Object.values(AZUL_HEREDADO).map(c => c.join('\\s*,\\s*')).join('|')})\\s*[,)]`,
  'i',
);

/** El hex de la familia del azul que aparece en un valor computado, o null. */
function azulHeredadoEn(valor) {
  const m = PATRON_AZUL.exec(String(valor || ''));
  if (!m) return null;
  const canales = m[1].split(',').map(n => Number(n.trim()));
  return Object.keys(AZUL_HEREDADO).find(hex => AZUL_HEREDADO[hex].every((c, i) => c === canales[i])) || null;
}

// Propiedades computadas que se revisan en cada elemento del marco (y en ::before y ::after).
const PROPIEDADES_COLOR = [
  'color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderRightColor', 'borderBottomColor',
  'borderLeftColor', 'outlineColor', 'textDecorationColor', 'boxShadow', 'fill', 'stroke',
];

// ---------- barrido de «todas las páginas» (--todas) ----------

// Criterio 3: paneles, tarjetas y filas que no deben quedar en #fff en oscuro.
const SELECTOR_FONDOS = [
  '.card', '.card-body', '.cfg-card', '.cfg-cabeza', '.cfg-stat', '.cfg-form', '.cfg-aviso', '.cfg-vacio',
  '.modal-content', '.page-header', '.p-card', '.p-panel', '.p-panel-content', '.p-dialog-content',
  '.p-tabview-panels', '.p-datatable-tbody > tr', '.p-datatable-thead > tr > th', '.table tbody tr',
  '.table thead th', '.list-group-item', '.dropdown-menu',
].join(', ');

// Pantallas de F2a con revisión manual (tarea 4.1, pregunta 1): la base también las pinta y son
// módulos sensibles o con reglas propias de oscuro. Se listan aunque el barrido no las alcance. Las
// piezas de la base que no son pantalla de ninguna ruta (borradores de venta y otros diálogos) salen en
// `coberturaCfg(...).sinRuta`.
const PANTALLAS_F2A_MANUAL = [
  { grupo: 'Ventas', prefijos: ['/ventas'], nota: 'borradores, carga de ventas y clientes; sensible, diff aprobado' },
  { grupo: 'POS', prefijos: ['/pos', '/extras/pos'], nota: 'lista de POS y formas de pago del POS; sensible' },
  { grupo: 'Formas de pago', prefijos: ['/extras/formasPago'], nota: 'formas de pago generales; pagos, sensible (tarea 4.1)' },
  { grupo: 'Despachos', prefijos: ['/despachos'], nota: 'sensible; F3 depende también de F2a' },
  { grupo: 'Inventarios', prefijos: ['/inventario', '/compras'], nota: 'sensible (D-134 no aplica: solo SCSS)' },
  { grupo: 'Bodegas', prefijos: ['/inventario/bodegas', '/inventario/bodega-detalle', '/proceso/bodegas-por-canal'], nota: ':host-context(body.dark-only) propio (bodegas.component.scss)' },
  { grupo: 'Ocasiones', prefijos: ['/proceso/ocasiones'], nota: 'fondos #fff en oscuro medidos en F0' },
];

function bajoPrefijo(ruta, prefijo) {
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`);
}

/** Grupo de revisión manual de F2a de una ruta (el prefijo más largo gana), o null. */
function grupoF2aManual(ruta) {
  let mejor = null;
  for (const { grupo, prefijos } of PANTALLAS_F2A_MANUAL) {
    for (const prefijo of prefijos) {
      if (bajoPrefijo(ruta, prefijo) && (!mejor || prefijo.length > mejor.largo)) mejor = { grupo, largo: prefijo.length };
    }
  }
  return mejor ? mejor.grupo : null;
}

/** La lista explícita, con las rutas enumeradas que cae en cada grupo. */
function revisionManualF2a(pantallas) {
  return PANTALLAS_F2A_MANUAL.map(({ grupo, prefijos, nota }) => ({
    grupo,
    prefijos,
    nota,
    rutas: pantallas.map(p => p.ruta).filter(ruta => grupoF2aManual(ruta) === grupo),
  }));
}

// Superficies casi blancas en oscuro (`$cfg-tint`, `$cfg-chip-bg`, #fafafa, #f8f9fa…): el criterio 3
// solo nombra #fff, pero estas se ven igual de claras sobre el lienzo oscuro.
const LUMINANCIA_CASI_BLANCO = 0.8;
// Controles cuyo borde (o fondo) debe separarse 3:1 del fondo de alrededor (WCAG 1.4.11). axe
// color-contrast no lo mide. El indicador de foco lo cubre theme-tokens.test.js con los tokens.
const SELECTOR_CONTROLES = [
  '.form-control', '.form-select', '.p-inputtext', '.p-dropdown', '.p-multiselect', '.p-inputnumber-input',
  '.ng-select .ng-select-container', '.form-check-input', '.p-checkbox-box', '.p-radiobutton-box',
].join(', ');
const CONTRASTE_MINIMO_CONTROL = 3;

// parseRgb, luminanciaRgb, contrasteRgb, esCasiBlanco y controlSeDistingue solo usan las dos constantes de
// arriba y entre ellas: auditoria-tema.js las inyecta juntas en el navegador (inyectarColor).

/** Canales y alfa de un `rgb()`/`rgba()` computado, o null. */
function parseRgb(valor) {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(String(valor || '').trim());
  if (!m) return null;
  let alfa = m[4] === undefined ? 1 : parseFloat(m[4]);
  if (m[4] && m[4].endsWith('%')) alfa /= 100;
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: alfa };
}

/** Luminancia relativa (WCAG) de un color computado; null si no se puede leer. */
function luminanciaRgb(valor) {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(String(valor || '').trim());
  if (!m) return null;
  const canal = c => { const v = Number(c) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * canal(m[1]) + 0.7152 * canal(m[2]) + 0.0722 * canal(m[3]);
}

/** Contraste WCAG entre dos colores computados opacos; null si alguno no se puede leer. */
function contrasteRgb(a, b) {
  const lum = valor => {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(String(valor || '').trim());
    if (!m) return null;
    const canal = c => { const v = Number(c) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * canal(m[1]) + 0.7152 * canal(m[2]) + 0.0722 * canal(m[3]);
  };
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Un fondo opaco casi blanco que no es #fff (ese ya cuenta en el criterio 3). */
function esCasiBlanco(valor) {
  const c = parseRgb(valor);
  if (!c || c.a < 0.9) return false;
  if (c.r === 255 && c.g === 255 && c.b === 255) return false;
  return luminanciaRgb(valor) >= LUMINANCIA_CASI_BLANCO;
}

/**
 * Un control se distingue si su borde o su propio fondo da ≥ 3:1 contra el fondo de alrededor.
 * @param {{ borde: string|null, fondoControl: string|null, fondoExterior: string }} medida
 */
function controlSeDistingue({ borde, fondoControl, fondoExterior }) {
  const contrastes = [borde, fondoControl].filter(Boolean).map(c => contrasteRgb(c, fondoExterior)).filter(v => v !== null);
  if (!contrastes.length) return null;
  return Math.max(...contrastes) >= CONTRASTE_MINIMO_CONTROL;
}

/**
 * Violaciones de una medida: nodos de axe color-contrast + fondos #fff + fondos casi blancos + controles
 * que no se distinguen 3:1 + 1 si hay scroll horizontal.
 * null si no midió la pantalla pedida: hubo error, un guard la desvió a otra ruta o quedó fuera del
 * marco (sin `dark-only`).
 */
function violacionesDe(fila) {
  if (!fila || fila.error || fila.redirigida || fila.oscuro === false) return null;
  if (typeof fila.axeColorContrast !== 'number') return null;
  return fila.axeColorContrast + (fila.fondosBlancos || 0) + (fila.fondosCasiBlancos || 0)
    + (fila.controlesSinContraste || 0) + (fila.scrollHorizontal ? 1 : 0);
}

/**
 * Orden del reporte: más violaciones primero; empate por ruta y ancho. Las filas sin medir
 * (error, o la pantalla no cargó) van al final, porque no se sabe cuánto pesan.
 */
function ordenarReporte(filas) {
  return filas
    .map(fila => ({ ...fila, violaciones: violacionesDe(fila) }))
    .sort((a, b) => {
      const va = a.violaciones === null ? -1 : a.violaciones;
      const vb = b.violaciones === null ? -1 : b.violaciones;
      if (va !== vb) return vb - va;
      if (a.ruta !== b.ruta) return a.ruta < b.ruta ? -1 : 1;
      return (b.ancho || 0) - (a.ancho || 0);
    });
}

/** Suma por módulo, para priorizar la cola de «todas las páginas» por lotes. */
function resumenPorModulo(filas) {
  const porModulo = new Map();
  for (const fila of filas) {
    const clave = fila.modulo || '(sin módulo)';
    const actual = porModulo.get(clave) || {
      modulo: clave, pantallas: 0, violaciones: 0, sinMedir: 0, axeColorContrast: 0, fondosBlancos: 0,
      fondosCasiBlancos: 0, controlesSinContraste: 0, scrollHorizontal: 0,
    };
    const v = violacionesDe(fila);
    actual.pantallas++;
    if (v === null) actual.sinMedir++;
    else {
      actual.violaciones += v;
      actual.axeColorContrast += fila.axeColorContrast;
      actual.fondosBlancos += fila.fondosBlancos || 0;
      actual.fondosCasiBlancos += fila.fondosCasiBlancos || 0;
      actual.controlesSinContraste += fila.controlesSinContraste || 0;
      actual.scrollHorizontal += fila.scrollHorizontal ? 1 : 0;
    }
    porModulo.set(clave, actual);
  }
  return [...porModulo.values()].sort((a, b) => b.violaciones - a.violaciones || (a.modulo < b.modulo ? -1 : 1));
}

/**
 * Cobertura del barrido sobre las hojas que incluyen `config-pagina` (las «pantallas cfg-*» de F2a).
 * @param {object[]} pantallas  enumeradas, cada una con `hojasCfg` y `conParametros`
 * @param {string[]} archivos   todas las hojas con el mixin (rutas-marco.js, archivosConfigPagina)
 * @param {{ sinParametros?: boolean }} opciones  si el barrido omitió las rutas con `:param`
 * @returns {{ archivos: number, alcanzadas: string[], soloConParametros: string[], sinRuta: string[] }}
 *   `sinRuta`: hijos y diálogos que no son pantalla de ninguna ruta; el barrido no los abre y van a la
 *   revisión manual de F2a.
 */
function coberturaCfg(pantallas, archivos, { sinParametros = false } = {}) {
  const enRutas = new Set();
  const enRutasSinParametro = new Set();
  for (const p of pantallas) {
    for (const hoja of p.hojasCfg || []) {
      enRutas.add(hoja);
      if (!p.conParametros) enRutasSinParametro.add(hoja);
    }
  }
  const alcanzadas = archivos.filter(a => (sinParametros ? enRutasSinParametro : enRutas).has(a));
  const soloConParametros = sinParametros ? archivos.filter(a => enRutas.has(a) && !enRutasSinParametro.has(a)) : [];
  return { archivos: archivos.length, alcanzadas, soloConParametros, sinRuta: archivos.filter(a => !enRutas.has(a)) };
}

// Medidas de un tercero que no deben subir frente a la base (tarea 3.8: «ninguno empeora frente a 0.2»).
const MEDIDAS_TERCERO = ['axeColorContrast', 'fondosBlancos'];

/**
 * Compara un tercero con la misma corrida sobre el build de la base, tema por tema.
 * @returns {{ comparable: boolean, empeora: boolean|null, detalle: object[] }}
 */
function compararTerceroConBase(actual, base) {
  const detalle = [];
  for (const tema of ['claro', 'oscuro']) {
    const a = actual && actual.temas && actual.temas[tema];
    const b = base && base.temas && base.temas[tema];
    if (!a || !b || a.error || b.error || !a.presente || !b.presente) continue;
    for (const medida of MEDIDAS_TERCERO) {
      if (typeof a[medida] !== 'number' || typeof b[medida] !== 'number') continue;
      detalle.push({ tema, medida, base: b[medida], actual: a[medida], empeora: a[medida] > b[medida] });
    }
  }
  if (!detalle.length) return { comparable: false, empeora: null, detalle };
  return { comparable: true, empeora: detalle.some(d => d.empeora), detalle };
}

/** Nombre de archivo para una ruta: `/ventas/pedidos` → `ventas__pedidos`. */
function nombreArchivoRuta(ruta) {
  return String(ruta).replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9_-]+/g, '__') || 'raiz';
}

module.exports = {
  RELLENO_PRIMARIO, TEXTO_BLANCO, SELECTOR_P_BUTTON_PRIMARIO, GRUPOS_RELLENO, rellenoPrimarioOk,
  SELECTORES_TAMANO, PROPIEDADES_TAMANO, compararTamanos,
  AZUL_HEREDADO, azulHeredadoEn, PROPIEDADES_COLOR,
  SELECTOR_FONDOS, PANTALLAS_F2A_MANUAL, grupoF2aManual, revisionManualF2a,
  LUMINANCIA_CASI_BLANCO, SELECTOR_CONTROLES, CONTRASTE_MINIMO_CONTROL,
  parseRgb, luminanciaRgb, contrasteRgb, esCasiBlanco, controlSeDistingue,
  violacionesDe, ordenarReporte, resumenPorModulo, coberturaCfg, MEDIDAS_TERCERO, compararTerceroConBase,
  nombreArchivoRuta,
};
