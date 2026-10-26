/**
 * Ampliación D-518 del importador (F5-30, F530-F03, tarea 14.16): reglas puras de la pantalla.
 * Clases de impuesto de WooCommerce, base de las direcciones, direcciones reales pegadas, formato
 * detectado y textos de fotos y de la lista Público. Sin Angular; las prueba `tests/migracion/`.
 * NO pregunta por el proveedor: lo que cambia entre tiendas viene del perfil y de la simulación.
 */
import { GrupoEnvio } from '../tipos';

export type TarifaIva = 0 | 5 | 19;
export const TARIFAS_CLASE: readonly TarifaIva[] = Object.freeze([0, 5, 19]) as readonly TarifaIva[];
export const MAX_DIRECCIONES_PEGADAS = 2000;

// ── Clases de impuesto ─────────────────────────────────────────────────────────────
export interface ClaseImpuesto {
  clase: string;
  productos: number;
  tarifa: TarifaIva | null;
}

/** Clases que la simulación pidió asignar, con la tarifa que la persona ya eligió (o null). */
export function clasesParaAsignar(clasesImpuesto: { [clase: string]: number }, mapa: { [clase: string]: TarifaIva }): ClaseImpuesto[] {
  return Object.keys(clasesImpuesto || {})
    .sort((a, b) => a.localeCompare(b))
    .map((clase) => ({ clase, productos: clasesImpuesto[clase] || 0, tarifa: esTarifa(mapa[clase]) ? mapa[clase] : null }));
}

export const esTarifa = (v: unknown): v is TarifaIva => v === 0 || v === 5 || v === 19;

/** Mapa listo para enviar: solo tarifas válidas; nada si no hay ninguna. */
export function mapaDeClases(mapa: { [clase: string]: unknown }): { [clase: string]: TarifaIva } | undefined {
  const salida: { [clase: string]: TarifaIva } = {};
  for (const [clase, tarifa] of Object.entries(mapa || {})) if (clase && esTarifa(tarifa)) salida[clase] = tarifa;
  return Object.keys(salida).length ? salida : undefined;
}

export const clasesSinAsignar = (clases: ClaseImpuesto[]): ClaseImpuesto[] => clases.filter((c) => c.tarifa === null);

export function textoClasesSinAsignar(clases: ClaseImpuesto[]): string | null {
  const sin = clasesSinAsignar(clases);
  if (!sin.length) return null;
  const productos = sin.reduce((s, c) => s + c.productos, 0);
  return `${productos} producto(s) usan una clase de impuesto sin IVA asignado y no se traerán. Asigna el IVA de cada clase y revisa de nuevo.`;
}

// ── Base de las direcciones ────────────────────────────────────────────────────────
const BASE_VALIDA = /^\/[a-z0-9_\-\/.%]*\/$/i;

/** Una base es una ruta del propio sitio: empieza y termina en «/», sin «//», «..» ni esquemas. */
export function normalizarBase(texto: string): string | null {
  let t = String(texto === undefined || texto === null ? '' : texto).trim();
  if (!t) return null;
  if (!t.startsWith('/')) t = `/${t}`;
  if (!t.endsWith('/')) t = `${t}/`;
  if (t.includes('//') || t.includes('..') || !BASE_VALIDA.test(t)) return null;
  return t.length > 100 ? null : t;
}

/** Ruta (sin dominio, consulta ni ancla) de una dirección o de una ruta pegada; null si no es del propio sitio. */
export function rutaDeDireccion(texto: string): string | null {
  let t = String(texto === undefined || texto === null ? '' : texto).trim();
  if (!t || /[\s<>"'\\]/.test(t)) return null;
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(t);
  if (esquema) {
    if (!/^https?$/i.test(esquema[1])) return null;
    t = t.replace(/^https?:\/\/[^/?#]+/i, '');
  } else if (t.startsWith('//')) {
    return null;
  }
  t = t.split(/[?#]/)[0];
  if (!t.startsWith('/')) return null;
  if (t.includes('//') || t.includes('..')) return null;
  return t;
}

function segmentos(ruta: string): string[] {
  return ruta.split('/').filter(Boolean);
}

/** `/producto/camisa-azul/` → `/producto/`. Con varios niveles (`/tienda/producto/x/`) conserva todos menos el último. */
export function baseDeEjemplo(texto: string): string | null {
  const ruta = rutaDeDireccion(texto);
  if (!ruta) return null;
  const s = segmentos(ruta);
  if (s.length < 2) return null;
  return normalizarBase(`/${s.slice(0, -1).join('/')}/`);
}

export function slugDeDireccion(texto: string): string | null {
  const ruta = rutaDeDireccion(texto);
  if (!ruta) return null;
  const s = segmentos(ruta);
  if (!s.length) return null;
  let slug = s[s.length - 1];
  try {
    slug = decodeURIComponent(slug);
  } catch (e) {
    return null;
  }
  return slug || null;
}

/** Regla `sanitize_title` de WordPress (la misma del servidor): «Men's Shirt» → `mens-shirt`. */
export function slugProbable(nombre: string): string {
  return String(nombre === undefined || nombre === null ? '' : nombre)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[./ –—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9 _-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

export interface DireccionPegada {
  desde: string;
  slug: string;
}

export interface LecturaDirecciones {
  validas: DireccionPegada[];
  invalidas: number;
  sobrantes: number;
}

/** Una dirección real por línea. Las repetidas se cuentan una vez; las que no son del sitio se descartan. */
export function leerDireccionesPegadas(texto: string): LecturaDirecciones {
  const vistas = new Set<string>();
  const validas: DireccionPegada[] = [];
  let invalidas = 0;
  let sobrantes = 0;
  for (const linea of String(texto || '').split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const ruta = rutaDeDireccion(linea);
    const slug = ruta ? slugDeDireccion(ruta) : null;
    if (!ruta || !slug || segmentos(ruta).length < 2) {
      invalidas++;
      continue;
    }
    const desde = ruta.length > 1 && ruta.endsWith('/') ? ruta.slice(0, -1) : ruta;
    if (vistas.has(desde)) continue;
    vistas.add(desde);
    if (validas.length >= MAX_DIRECCIONES_PEGADAS) sobrantes++;
    else validas.push({ desde, slug });
  }
  return { validas, invalidas, sobrantes };
}

/** Base que sugiere la primera dirección pegada que la permite. */
export function baseSugeridaPorDirecciones(lectura: LecturaDirecciones): string | null {
  for (const d of lectura.validas) {
    const b = baseDeEjemplo(d.desde);
    if (b) return b;
  }
  return null;
}

// ── Nombre de un producto para armar su dirección probable ─────────────────────────
const COLUMNAS_NOMBRE = ['Name', 'Nombre', 'Title', 'Título', 'Titulo'];

/** Nombre del producto de un grupo: la primera celda con nombre entre sus filas. */
export function nombreDeGrupo(grupo: GrupoEnvio): string {
  for (const fila of grupo.rows) {
    for (const col of COLUMNAS_NOMBRE) {
      const v = fila[col];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return '';
}

// ── Textos ─────────────────────────────────────────────────────────────────────────
export function textoFormato(formato: 'current' | 'legacy' | 'mixed' | null | undefined): string | null {
  if (formato === 'current') return 'Formato del archivo: el actual de Shopify.';
  if (formato === 'legacy') return 'Formato del archivo: el anterior de Shopify. Lo entendemos igual.';
  if (formato === 'mixed') return 'El archivo mezcla encabezados nuevos y anteriores. Lo entendemos, pero revisa que sea el export completo.';
  return null;
}

export const AVISO_NO_CERRAR_TIENDA = 'No cierres tu tienda anterior hasta que termine la copia de fotos.';

export function textoListaPublico(estado: 'found' | 'missing' | 'ambiguous' | null | undefined, ofertas: number): string | null {
  if (ofertas <= 0) return null;
  if (estado === 'missing') return 'Tus productos traen ofertas, pero en Katuq no hay un tipo de cliente «Público». Créalo y revisa de nuevo; si no, los productos entran sin la oferta.';
  if (estado === 'ambiguous') return 'Tus productos traen ofertas, pero en Katuq hay varios tipos de cliente «Público». Deja uno solo y revisa de nuevo; si no, los productos entran sin la oferta.';
  return null;
}

export function textoFotosPendientes(migraciones: { migrationId: string; photosPending: number }[] | null | undefined): { migrationId: string; texto: string } | null {
  const con = (migraciones || []).filter((m) => m && m.photosPending > 0);
  if (!con.length) return null;
  const m = con[0];
  return {
    migrationId: m.migrationId,
    texto: `Quedaron ${m.photosPending} foto(s) por copiar de una importación anterior. Sube el mismo archivo y copia las que faltan; no se repite nada más.`,
  };
}

export function textoBaseRedireccion(base: string | null, hayPegadas: boolean): string {
  if (!base) return 'Escribe cómo empiezan las direcciones de tus productos, por ejemplo /producto/.';
  return hayPegadas
    ? `Las direcciones de tus productos empiezan por ${base}. Las que pegaste se usan tal cual.`
    : `Supondremos que las direcciones de tus productos empiezan por ${base}. Si tu tienda usa otra, pega unas direcciones reales.`;
}
