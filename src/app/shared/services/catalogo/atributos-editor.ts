import {
  AtributoEfectivo,
  AttributeDef,
  AttributeType,
  PATRON_CLAVE,
  TOPE_ATRIBUTOS_POR_RUTA,
  ValorAtributo,
} from './atributos-categoria';

/**
 * Atributos por categoría (D-495, ticket 1234): lógica pura de las dos pantallas
 * (el modal «Atributos» de Maestros > Categorías y la pestaña «Especificaciones» del
 * producto). Sin Angular, para probarla con node --test. El servidor vuelve a validar
 * todo; aquí solo se evita mandar lo que seguro rechaza.
 */

export const TIPOS: { valor: AttributeType; texto: string }[] = [
  { valor: 'text', texto: 'Texto' },
  { valor: 'number', texto: 'Número' },
  { valor: 'option', texto: 'Lista de opciones' },
  { valor: 'boolean', texto: 'Sí / No' },
];

/** Definición en edición: `nueva` permite cambiar la clave (las guardadas no cambian). */
export interface DefinicionEditable extends AttributeDef {
  nueva: boolean;
  opcionesTexto: string;
}

export interface ErrorLocal {
  indice: number;
  mensaje: string;
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** «Tecnología WiFi» → `tecnologia_wifi`, sin chocar con las ya usadas en la rama. */
export function claveDesdeEtiqueta(etiqueta: string, usadas: string[]): string {
  let base = sinTildes(String(etiqueta || '').toLowerCase())
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) base = 'atributo';
  if (!/^[a-z]/.test(base)) base = `a_${base}`;
  base = base.slice(0, 40).replace(/_+$/g, '');
  let clave = base;
  for (let n = 2; usadas.includes(clave); n++) {
    const sufijo = `_${n}`;
    clave = base.slice(0, 40 - sufijo.length) + sufijo;
  }
  return clave;
}

export function opcionesDesdeTexto(texto: string): string[] {
  const salida: string[] = [];
  for (const parte of String(texto || '').split(/[,\n]/)) {
    const t = parte.trim();
    if (t && !salida.some((x) => x.toLowerCase() === t.toLowerCase())) salida.push(t);
  }
  return salida;
}

export function nuevaDefinicion(orden: number): DefinicionEditable {
  return {
    key: '',
    label: '',
    type: 'text',
    required: false,
    filterable: false,
    comparable: false,
    section: 'specs',
    order: orden,
    nueva: true,
    opcionesTexto: '',
  };
}

export function paraEditar(defs: AttributeDef[]): DefinicionEditable[] {
  return (defs || []).map((d) => ({ ...d, nueva: false, opcionesTexto: (d.options || []).join(', ') }));
}

/** Lo que se manda al servidor: sin campos de edición, opciones solo en listas y unidad solo en números. */
export function limpiarDefinicion(d: DefinicionEditable, orden: number): AttributeDef {
  const limpia: AttributeDef = {
    key: d.key,
    label: String(d.label || '').trim(),
    type: d.type,
    required: d.required === true,
    filterable: d.filterable === true,
    comparable: d.comparable === true,
    section: d.section === 'compatibility' ? 'compatibility' : 'specs',
    order: orden,
  };
  if (d.type === 'option') {
    limpia.options = opcionesDesdeTexto(d.opcionesTexto);
    limpia.multiple = d.multiple === true;
  }
  if (d.type === 'number' && String(d.unit || '').trim()) limpia.unit = String(d.unit).trim();
  return limpia;
}

/** Revisión rápida antes de mandar: nombre, clave, opciones, repetidas y el tope de 30. */
export function erroresLocales(propias: DefinicionEditable[], heredadas: AtributoEfectivo[]): ErrorLocal[] {
  const errores: ErrorLocal[] = [];
  const heredadasPorClave = new Map(heredadas.map((h) => [h.key, h]));
  const vistas = new Set<string>();
  propias.forEach((d, indice) => {
    const nombre = String(d.label || '').trim();
    if (!nombre) errores.push({ indice, mensaje: 'Ponle un nombre al atributo.' });
    else if (nombre.length > 60) errores.push({ indice, mensaje: `«${nombre.slice(0, 20)}…» pasa de 60 caracteres.` });
    if (!PATRON_CLAVE.test(d.key)) errores.push({ indice, mensaje: `La clave de «${nombre || 'atributo'}» no sirve.` });
    const h = heredadasPorClave.get(d.key);
    if (h) {
      errores.push({
        indice,
        mensaje: h.type !== d.type
          ? `«${h.label}» viene de una categoría superior: no se puede cambiar su tipo aquí.`
          : `«${h.label}» ya viene de una categoría superior.`,
      });
    }
    if (vistas.has(d.key)) errores.push({ indice, mensaje: `La clave «${d.key}» está repetida.` });
    vistas.add(d.key);
    if (d.type === 'option') {
      const opciones = opcionesDesdeTexto(d.opcionesTexto);
      if (!opciones.length) errores.push({ indice, mensaje: `«${nombre || 'La lista'}» necesita al menos una opción.` });
      if (opciones.length > 40) errores.push({ indice, mensaje: `«${nombre}» pasa de 40 opciones.` });
      if (opciones.some((o) => o.length > 60 || /[;|]/.test(o))) {
        errores.push({ indice, mensaje: `Una opción de «${nombre}» pasa de 60 caracteres o usa ; o |.` });
      }
    }
    if (d.type === 'number' && String(d.unit || '').trim().length > 12) {
      errores.push({ indice, mensaje: `La unidad de «${nombre}» pasa de 12 caracteres.` });
    }
  });
  if (heredadas.length + propias.length > TOPE_ATRIBUTOS_POR_RUTA) {
    errores.push({ indice: -1, mensaje: `Una categoría admite máximo ${TOPE_ATRIBUTOS_POR_RUTA} atributos, contando los heredados.` });
  }
  return errores;
}

export interface FilaVistaPrevia {
  etiqueta: string;
  ejemplo: string;
  unidad: string;
  seccion: string;
  heredado: boolean;
}

/** Cómo se vería la ficha: un ejemplo por atributo, en el orden real. */
export function vistaPrevia(heredadas: AtributoEfectivo[], propias: DefinicionEditable[]): FilaVistaPrevia[] {
  const ejemplo = (d: AttributeDef | DefinicionEditable): string => {
    if (d.type === 'number') return '10';
    if (d.type === 'boolean') return 'Sí';
    if (d.type === 'option') {
      const opciones = 'opcionesTexto' in d ? opcionesDesdeTexto(d.opcionesTexto) : d.options || [];
      return opciones[0] || '—';
    }
    return 'Texto';
  };
  const fila = (d: AttributeDef | DefinicionEditable, heredado: boolean): FilaVistaPrevia => ({
    etiqueta: String(d.label || '').trim() || 'Sin nombre',
    ejemplo: ejemplo(d),
    unidad: d.type === 'number' ? String(d.unit || '').trim() : '',
    seccion: d.section === 'compatibility' ? 'Compatibilidad' : 'Especificaciones',
    heredado,
  });
  return [...heredadas.map((h) => fila(h, true)), ...propias.map((p) => fila(p, false))];
}

// ── Renombres del árbol (Maestros > Categorías) ─────────────────────────────

const nombreDeNodo = (n: any): string => String((n && n.data && n.data.nombre) || (n && n.label) || '').trim();

/**
 * Nombres de cada nivel de cada nodo, recorriendo desde las raíces (no depende de
 * `parent`, que los nodos importados no traen).
 */
export function rutasPorNodo(arbol: unknown): Map<object, string[]> {
  const salida = new Map<object, string[]>();
  const visitar = (lista: unknown, padres: string[], nivel: number) => {
    if (!Array.isArray(lista) || nivel > 10) return;
    for (const n of lista) {
      if (!n || typeof n !== 'object') continue;
      const nombres = [...padres, nombreDeNodo(n)];
      salida.set(n, nombres);
      visitar((n as any).children, nombres, nivel + 1);
    }
  };
  visitar(arbol, [], 1);
  return salida;
}

export interface Renombre {
  de: string[];
  a: string[];
}

/**
 * Los nodos que existían al cargar y cuya ruta cambió (`originales` es el WeakMap de
 * nodo → ruta al cargar). Los más profundos primero; el servidor mueve los esquemas
 * y deja alias. Los nodos nuevos o borrados no son renombres.
 */
export function renombresDelArbol(arbol: unknown, originales: WeakMap<object, string[]>): Renombre[] {
  const salida: Renombre[] = [];
  rutasPorNodo(arbol).forEach((actual, nodo) => {
    const antes = originales.get(nodo);
    if (!antes) return;
    const clave = (r: string[]) => r.map((x) => String(x || '').trim().replace(/\s+/g, ' ').toLowerCase()).join(' > ');
    if (clave(antes) !== clave(actual)) salida.push({ de: [...antes], a: [...actual] });
  });
  return salida.sort((x, y) => y.de.length - x.de.length);
}

// ── Valores del producto (pestaña «Especificaciones») ───────────────────────

export type ValorDeFormulario = string | number | boolean | string[] | null;

const vacio = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

/** Valor guardado → valor del control (lo que no corresponde al tipo queda vacío; el servidor lo conserva). */
export function valorInicial(def: AttributeDef, guardado: unknown): ValorDeFormulario {
  switch (def.type) {
    case 'number':
      return typeof guardado === 'number' && Number.isFinite(guardado) ? guardado : null;
    case 'boolean':
      return typeof guardado === 'boolean' ? guardado : null;
    case 'option':
      if (def.multiple) return Array.isArray(guardado) ? guardado.filter((x) => (def.options || []).includes(x)) : [];
      return typeof guardado === 'string' && (def.options || []).includes(guardado) ? guardado : '';
    default:
      return typeof guardado === 'string' ? guardado : '';
  }
}

export function valoresIniciales(esquema: AttributeDef[], guardados: Record<string, unknown> | null | undefined): Record<string, ValorDeFormulario> {
  const salida: Record<string, ValorDeFormulario> = {};
  for (const d of esquema || []) salida[d.key] = valorInicial(d, guardados ? guardados[d.key] : undefined);
  return salida;
}

function normalizar(def: AttributeDef, v: unknown): ValorAtributo {
  if (vacio(v)) return null;
  if (def.type === 'number') {
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  }
  if (def.type === 'text') return String(v).trim();
  return v as ValorAtributo;
}

const iguales = (a: ValorAtributo, b: ValorAtributo) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Solo lo que cambió respecto a lo que se cargó: un campo vaciado va como null (se
 * borra); uno que no se tocó no se manda (así no se borra un valor que el formulario
 * no supo mostrar). Sin cambios → objeto vacío y no se llama al servidor.
 */
export function valoresParaGuardar(
  esquema: AttributeDef[],
  formulario: Record<string, ValorDeFormulario>,
  iniciales: Record<string, ValorDeFormulario>,
): Record<string, ValorAtributo> {
  const salida: Record<string, ValorAtributo> = {};
  for (const d of esquema || []) {
    const actual = normalizar(d, formulario ? formulario[d.key] : null);
    const antes = normalizar(d, iniciales ? iniciales[d.key] : null);
    if (!iguales(actual, antes)) salida[d.key] = actual;
  }
  return salida;
}

export function obligatoriosFaltantes(esquema: AttributeDef[], formulario: Record<string, ValorDeFormulario>): string[] {
  return (esquema || []).filter((d) => d.required && vacio(normalizar(d, formulario ? formulario[d.key] : null))).map((d) => d.label);
}

/** Mensaje para la persona a partir del error HTTP de los endpoints de atributos. */
export function mensajeDeError(err: any): string {
  const status = err && typeof err.status === 'number' ? err.status : 0;
  const cuerpo = (err && err.error) || {};
  if (status === 0) return 'No hay conexión con Katuq. Revisa tu internet e intenta de nuevo.';
  if (status === 409) return 'Alguien más guardó atributos mientras editabas. Recarga para ver la versión vigente; no se guardó nada.';
  const detalle = Array.isArray(cuerpo.errores) ? cuerpo.errores : Array.isArray(cuerpo.invalidos) ? cuerpo.invalidos : [];
  const mensajes = detalle.map((e: any) => e && e.mensaje).filter(Boolean);
  if (mensajes.length) return mensajes.slice(0, 5).join(' ');
  if (typeof cuerpo.message === 'string' && cuerpo.message) return cuerpo.message;
  return 'No se pudo guardar. Intenta de nuevo.';
}
