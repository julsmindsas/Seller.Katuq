/**
 * Suma de las respuestas de los lotes (F5-30, tarea 8.1): lo que la pantalla muestra al terminar.
 * Puro. Los avisos se limitan para no crecer sin fin; el total real va en `issuesTotal`.
 */
import { AvisoImportacion, GuardaImportacion, ProductoDelLote, RespuestaLoteProductos, RespuestaSimulacion } from '../tipos';

export const TOPE_AVISOS = 5000;

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export interface TotalesProductos {
  lotes: number;
  lotesRepetidos: number;
  creados: number;
  actualizados: number;
  omitidos: number;
  omitidosPorMotivo: { [motivo: string]: number };
  productos: ProductoDelLote[];
  inventario: { cargadas: number; sinCargar: number; fallidas: { key: string; referencia?: string; code: string }[] };
  fotos: { validas: number; rechazadas: number; sobrantes: number; porCopiar: number };
  categoriasCreadas: string[];
  ofertas: { cargadas: number; conservadas: number; omitidas: number };
  avisos: AvisoImportacion[];
  avisosTotal: number;
}

export function sumarLotes(respuestas: RespuestaLoteProductos[]): TotalesProductos {
  const t: TotalesProductos = {
    lotes: respuestas.length,
    lotesRepetidos: 0,
    creados: 0,
    actualizados: 0,
    omitidos: 0,
    omitidosPorMotivo: {},
    productos: [],
    inventario: { cargadas: 0, sinCargar: 0, fallidas: [] },
    fotos: { validas: 0, rechazadas: 0, sobrantes: 0, porCopiar: 0 },
    categoriasCreadas: [],
    ofertas: { cargadas: 0, conservadas: 0, omitidas: 0 },
    avisos: [],
    avisosTotal: 0,
  };
  const categorias = new Set<string>();
  for (const r of respuestas) {
    if (r.replayed) t.lotesRepetidos++;
    for (const p of r.products || []) {
      t.productos.push(p);
      if (p.action === 'created') t.creados++;
      else if (p.action === 'updated') t.actualizados++;
      else {
        t.omitidos++;
        const motivo = p.reason || 'UNKNOWN';
        t.omitidosPorMotivo[motivo] = (t.omitidosPorMotivo[motivo] || 0) + 1;
      }
    }
    const inv = r.inventory;
    if (inv) {
      t.inventario.cargadas += n(inv.loaded);
      t.inventario.sinCargar += n(inv.notLoaded);
      t.inventario.fallidas.push(...(inv.failed || []));
    }
    if (r.photos) {
      t.fotos.validas += n(r.photos.valid);
      t.fotos.rechazadas += n(r.photos.rejected);
      t.fotos.sobrantes += n(r.photos.overLimit);
    }
    t.fotos.porCopiar += n(r.photosPending);
    for (const c of (r.categories && r.categories.created) || []) categorias.add(c);
    if (r.offers) {
      t.ofertas.cargadas += n(r.offers.loaded);
      t.ofertas.conservadas += n(r.offers.kept);
      t.ofertas.omitidas += n(r.offers.skipped);
    }
    const avisos = r.issues || [];
    t.avisosTotal += Math.max(n(r.issuesTotal), avisos.length);
    for (const a of avisos) if (t.avisos.length < TOPE_AVISOS) t.avisos.push(a);
  }
  t.categoriasCreadas = [...categorias];
  return t;
}

export interface TotalesSimulacion {
  formato: 'current' | 'legacy' | 'mixed' | null;
  productos: { [contador: string]: number };
  fotos: { validas: number; rechazadas: number; sobrantes: number; porCopiar: number };
  categoriasNuevas: string[];
  inventario: { bodega: string | null; unidades: number; reemplaza: number };
  redirecciones: { [contador: string]: number } | null;
  ofertas: { listaPublico: 'found' | 'missing' | 'ambiguous' | null; cantidad: number; programadas: number; vencidas: number };
  plan: RespuestaSimulacion['plan'];
  seo: { conSeo: number; conAlt: number };
  clasesImpuesto: { [clase: string]: number };
  guardas: GuardaImportacion[];
  avisos: AvisoImportacion[];
  avisosTotal: number;
}

const sumarContadores = (dest: { [k: string]: number }, origen: { [k: string]: number } | null | undefined): void => {
  for (const [k, v] of Object.entries(origen || {})) dest[k] = (dest[k] || 0) + n(v);
};

/** Suma las simulaciones de varios envíos (un archivo de más de 2.000 productos se simula por partes). */
export function sumarSimulaciones(respuestas: RespuestaSimulacion[]): TotalesSimulacion {
  const t: TotalesSimulacion = {
    formato: null,
    productos: {},
    fotos: { validas: 0, rechazadas: 0, sobrantes: 0, porCopiar: 0 },
    categoriasNuevas: [],
    inventario: { bodega: null, unidades: 0, reemplaza: 0 },
    redirecciones: null,
    ofertas: { listaPublico: null, cantidad: 0, programadas: 0, vencidas: 0 },
    plan: null,
    seo: { conSeo: 0, conAlt: 0 },
    clasesImpuesto: {},
    guardas: [],
    avisos: [],
    avisosTotal: 0,
  };
  const categorias = new Set<string>();
  const guardas = new Set<string>();
  for (const r of respuestas) {
    if (r.format) t.formato = t.formato && t.formato !== r.format ? 'mixed' : r.format;
    sumarContadores(t.productos, r.products);
    if (r.photos) {
      t.fotos.validas += n(r.photos.valid);
      t.fotos.rechazadas += n(r.photos.rejected);
      t.fotos.sobrantes += n(r.photos.overLimit);
      t.fotos.porCopiar += n(r.photos.toCopy);
    }
    for (const c of (r.categories && r.categories.new) || []) categorias.add(c);
    if (r.inventory) {
      t.inventario.bodega = r.inventory.warehouse || t.inventario.bodega;
      t.inventario.unidades += n(r.inventory.units);
      t.inventario.reemplaza += n(r.inventory.replacesExisting);
    }
    if (r.redirects) {
      t.redirecciones = t.redirecciones || {};
      // La capacidad es del sitio, no se suma.
      const { capacity, ...resto } = r.redirects;
      sumarContadores(t.redirecciones, resto);
      if (capacity !== undefined) t.redirecciones['capacity'] = n(capacity);
    }
    if (r.offers) {
      t.ofertas.listaPublico = r.offers.publicList || t.ofertas.listaPublico;
      t.ofertas.cantidad += n(r.offers.count);
      t.ofertas.programadas += n(r.offers.scheduled);
      t.ofertas.vencidas += n(r.offers.expired);
    }
    if (r.plan) t.plan = r.plan;
    if (r.seo) {
      t.seo.conSeo += n(r.seo.withSeo);
      t.seo.conAlt += n(r.seo.withAlt);
    }
    for (const c of r.taxClasses || []) t.clasesImpuesto[c.class] = (t.clasesImpuesto[c.class] || 0) + n(c.products);
    for (const g of r.guards || []) {
      if (!guardas.has(g.code)) {
        guardas.add(g.code);
        t.guardas.push(g);
      }
    }
    const avisos = r.issues || [];
    t.avisosTotal += Math.max(n(r.issuesTotal), avisos.length);
    for (const a of avisos) if (t.avisos.length < TOPE_AVISOS) t.avisos.push(a);
  }
  t.categoriasNuevas = [...categorias];
  return t;
}
