/**
 * Flujo de «Traer mi tienda» (F5-30, tarea 8.3): lo que une los pasos de la pantalla. Puro y sin
 * Angular, para probarlo con `node --test`. NO pregunta por el proveedor: lo que cambia entre
 * tiendas (bases de redirección, si se necesita el paso de redirecciones) viene del perfil.
 * Los envíos reales se inyectan (`Envios`), así la pantalla pasa el servicio y la prueba un doble.
 */
import {
  CuerpoFotos,
  CuerpoLoteProductos,
  CuerpoRedirecciones,
  CuerpoSimulacion,
  GrupoEnvio,
  GuardaImportacion,
  OpcionesImportacion,
  ProductoDelLote,
  ProveedorTienda,
  RespuestaFotos,
  RespuestaLoteProductos,
  RespuestaRedirecciones,
  RespuestaSimulacion,
} from '../tipos';
import { AvanceLotes, OpcionesReintento, enviarConReintento, procesarLotes } from './errores';
import { LIMITES_SIMULACION, armarLotes, partirEn } from './lotes';
import { PerfilProveedor } from './perfiles';
import { TotalesProductos, TotalesSimulacion, sumarLotes, sumarSimulaciones } from './sumas';

export const IVA_PERMITIDOS: readonly number[] = Object.freeze([0, 5, 19]);
export const FOTOS_POR_LOTE = 10;
export const REDIRECCIONES_POR_ENVIO = 2000;

/** Lo que la persona elige en el primer paso. */
export interface ConfigImportacion {
  sitioId: string;
  /** Código de negocio de la bodega (BOD-xxx), nunca el id de documento. */
  bodega: string;
  ivaPercent: number;
  /** null = la persona aún no contestó. */
  preciosConIva: boolean | null;
  modo: 'create' | 'upsert';
  reemplazarExistencias: boolean;
}

export const CONFIG_INICIAL: ConfigImportacion = Object.freeze({
  sitioId: '',
  bodega: '',
  ivaPercent: 19,
  preciosConIva: null,
  modo: 'create',
  reemplazarExistencias: false,
}) as ConfigImportacion;

/** Identificador seguro para el servidor (`[A-Za-z0-9_-]{8,64}`), único por corrida. */
export function nuevoId(prefijo: string, aleatorio: () => number = Math.random, ahora: () => number = Date.now): string {
  const limpio = String(prefijo).replace(/[^A-Za-z0-9]/g, '').slice(0, 8) || 'id';
  const azar = Math.floor(aleatorio() * 36 ** 6).toString(36).padStart(6, '0');
  return `${limpio}-${ahora().toString(36)}-${azar}`.slice(0, 64);
}

export interface ErroresConfig {
  sitioId?: string;
  bodega?: string;
  ivaPercent?: string;
  preciosConIva?: string;
}

/** Un archivo de inventario exige bodega; los precios con o sin IVA siempre se preguntan (el servidor los pide). */
export function validarConfig(c: ConfigImportacion, hayInventario: boolean): ErroresConfig {
  const e: ErroresConfig = {};
  if (!c.sitioId.trim()) e.sitioId = 'Elige el sitio donde quedarán tus productos.';
  if (hayInventario && !c.bodega.trim()) e.bodega = 'Elige la bodega donde se cargarán las existencias.';
  if (!IVA_PERMITIDOS.includes(c.ivaPercent)) e.ivaPercent = 'Elige 0 %, 5 % o 19 %.';
  if (c.preciosConIva !== true && c.preciosConIva !== false) e.preciosConIva = 'Cuéntanos si los precios de tu archivo ya incluyen el IVA.';
  return e;
}

export const sinErrores = (e: ErroresConfig): boolean => Object.keys(e).length === 0;

export function opcionesDe(c: ConfigImportacion, hayInventario: boolean): OpcionesImportacion {
  const o: OpcionesImportacion = { ivaPercent: c.ivaPercent, pricesIncludeTax: c.preciosConIva === true };
  if (hayInventario && c.bodega.trim()) {
    o.warehouse = c.bodega.trim();
    o.replaceExistingStock = c.reemplazarExistencias === true;
  }
  return o;
}

export interface ContextoFlujo {
  migrationId: string;
  runId: string;
  proveedor: ProveedorTienda;
  config: ConfigImportacion;
  hayInventario: boolean;
  grupos: GrupoEnvio[];
  perfil: Pick<PerfilProveedor, 'basesRedireccion'>;
  idioma: 'es' | 'en' | null;
}

export function cuerposSimulacion(ctx: ContextoFlujo): { cuerpos: CuerpoSimulacion[]; sobrantes: ReturnType<typeof armarLotes>['sobrantes'] } {
  const { lotes, sobrantes } = armarLotes(ctx.grupos, LIMITES_SIMULACION);
  const options = opcionesDe(ctx.config, ctx.hayInventario);
  const cuerpos = lotes.map((groups) => ({
    migrationId: ctx.migrationId,
    source: ctx.proveedor,
    mode: ctx.config.modo,
    siteId: ctx.config.sitioId,
    options,
    groups,
  }));
  return { cuerpos, sobrantes };
}

export function cuerpoLote(ctx: ContextoFlujo, groups: GrupoEnvio[], lot: number): CuerpoLoteProductos {
  return {
    migrationId: ctx.migrationId,
    runId: ctx.runId,
    source: ctx.proveedor,
    mode: ctx.config.modo,
    options: opcionesDe(ctx.config, ctx.hayInventario),
    lot,
    groups,
  };
}

/** Códigos de guarda que impiden importar: el servidor los repite y respondería 409. */
export const GUARDAS_BLOQUEANTES: readonly string[] = Object.freeze(['FLOW_PUBLISHES_PRODUCTS', 'WOO_INTEGRATION_ACTIVE']);

export function guardasBloqueantes(guardas: GuardaImportacion[]): GuardaImportacion[] {
  return (guardas || []).filter((g) => GUARDAS_BLOQUEANTES.includes(g.code));
}

export interface EnviosSimulacion {
  simular(cuerpo: CuerpoSimulacion): Promise<RespuestaSimulacion>;
}

export type ResultadoSimulacion =
  | { ok: true; totales: TotalesSimulacion; sobrantes: ReturnType<typeof armarLotes>['sobrantes'] }
  | { ok: false; error: import('../tipos').ErrorImportador };

/** Simula todo el archivo (por partes si hace falta) y suma las respuestas. No escribe nada. */
export async function simularTodo(envios: EnviosSimulacion, ctx: ContextoFlujo, reintento: OpcionesReintento = {}): Promise<ResultadoSimulacion> {
  const { cuerpos, sobrantes } = cuerposSimulacion(ctx);
  const respuestas: RespuestaSimulacion[] = [];
  for (const cuerpo of cuerpos) {
    const r = await enviarConReintento(() => envios.simular(cuerpo), reintento);
    if ('error' in r) return { ok: false, error: r.error };
    respuestas.push(r.valor);
  }
  return { ok: true, totales: sumarSimulaciones(respuestas), sobrantes };
}

export interface EnviosImportacion {
  importarProductos(cuerpo: CuerpoLoteProductos): Promise<RespuestaLoteProductos>;
  crearRedirecciones(cuerpo: CuerpoRedirecciones): Promise<RespuestaRedirecciones>;
  copiarFotos(cuerpo: CuerpoFotos): Promise<RespuestaFotos>;
}

export type ProgresoImportacion = (etapa: 'productos' | 'redirecciones' | 'fotos', hecho: number, total: number) => void;

/** Paso 1 de la importación: productos por lotes. Se detiene en el primer lote que falla y permite reanudar. */
export async function importarProductosPorLotes(
  envios: Pick<EnviosImportacion, 'importarProductos'>,
  ctx: ContextoFlujo,
  opciones: OpcionesReintento & { desde?: number; previas?: RespuestaLoteProductos[]; progreso?: ProgresoImportacion } = {},
): Promise<{ avance: AvanceLotes<RespuestaLoteProductos>; totales: TotalesProductos; totalLotes: number; sobrantes: ReturnType<typeof armarLotes>['sobrantes'] }> {
  const { lotes, sobrantes } = armarLotes(ctx.grupos);
  const avance = await procesarLotes(lotes, (lote, numero) => envios.importarProductos(cuerpoLote(ctx, lote, numero)), {
    ...opciones,
    alTerminar: (n) => opciones.progreso && opciones.progreso('productos', n, lotes.length),
  });
  return { avance, totales: sumarLotes(avance.respuestas), totalLotes: lotes.length, sobrantes };
}

/** Productos que ya tienen `cd` en Katuq (creados, actualizados o ya traídos antes). */
export const conCd = (productos: ProductoDelLote[]): (ProductoDelLote & { cd: string })[] =>
  productos.filter((p): p is ProductoDelLote & { cd: string } => typeof p.cd === 'string' && p.cd !== '');

/** Las redirecciones solo se piden si el perfil no las necesita con bases propias; WooCommerce espera al `handle` del servidor. */
export function puedeRedirigir(ctx: Pick<ContextoFlujo, 'perfil'>): boolean {
  return ctx.perfil.basesRedireccion === null;
}

export function cuerposRedirecciones(ctx: ContextoFlujo, productos: ProductoDelLote[]): CuerpoRedirecciones[] {
  if (!puedeRedirigir(ctx)) return [];
  const lista = conCd(productos)
    .filter((p) => !p.splitFrom)
    .map((p) => ({ handle: p.key, cd: p.cd }));
  return partirEn(lista, REDIRECCIONES_POR_ENVIO).map((products) => ({
    migrationId: ctx.migrationId,
    source: ctx.proveedor,
    siteId: ctx.config.sitioId,
    products,
  }));
}

export interface ResultadoRedirecciones {
  generated: number;
  replaced: number;
  unchanged: number;
  conflictsWithManual: number;
  overCapacity: number;
  avisos: number;
  error: import('../tipos').ErrorImportador | null;
}

export async function crearRedireccionesDe(
  envios: Pick<EnviosImportacion, 'crearRedirecciones'>,
  ctx: ContextoFlujo,
  productos: ProductoDelLote[],
  reintento: OpcionesReintento = {},
): Promise<ResultadoRedirecciones> {
  const t: ResultadoRedirecciones = { generated: 0, replaced: 0, unchanged: 0, conflictsWithManual: 0, overCapacity: 0, avisos: 0, error: null };
  for (const cuerpo of cuerposRedirecciones(ctx, productos)) {
    const r = await enviarConReintento(() => envios.crearRedirecciones(cuerpo), reintento);
    if ('error' in r) {
      t.error = r.error;
      return t;
    }
    const v = r.valor;
    t.generated += v.generated || 0;
    t.replaced += v.replaced || 0;
    t.unchanged += v.unchanged || 0;
    t.conflictsWithManual += v.conflictsWithManual || 0;
    t.overCapacity += v.overCapacity || 0;
    t.avisos += Math.max(v.issuesTotal || 0, (v.issues || []).length);
  }
  return t;
}

export function lotesDeFotos(productos: ProductoDelLote[]): { cd: string }[][] {
  const vistos = new Set<string>();
  const cds: { cd: string }[] = [];
  for (const p of conCd(productos)) {
    if (p.action === 'skipped' && p.reason !== 'ALREADY_MIGRATED') continue;
    if (vistos.has(p.cd)) continue;
    vistos.add(p.cd);
    cds.push({ cd: p.cd });
  }
  return partirEn(cds, FOTOS_POR_LOTE);
}

export interface ResultadoFotos {
  copiadas: number;
  yaPropias: number;
  fallidas: number;
  cambiaronMientras: number;
  lotes: number;
  lotesHechos: number;
  error: import('../tipos').ErrorImportador | null;
}

/** Copia las fotos de los productos traídos. Un fallo no deshace nada: las fotos pendientes se retoman luego. */
export async function copiarFotosDe(
  envios: Pick<EnviosImportacion, 'copiarFotos'>,
  ctx: ContextoFlujo,
  productos: ProductoDelLote[],
  opciones: OpcionesReintento & { progreso?: ProgresoImportacion } = {},
): Promise<ResultadoFotos> {
  const lotes = lotesDeFotos(productos);
  const t: ResultadoFotos = { copiadas: 0, yaPropias: 0, fallidas: 0, cambiaronMientras: 0, lotes: lotes.length, lotesHechos: 0, error: null };
  const avance = await procesarLotes(lotes, (lote, numero) => envios.copiarFotos({ migrationId: ctx.migrationId, runId: ctx.runId, lot: numero, products: lote }), {
    ...opciones,
    alTerminar: (n) => opciones.progreso && opciones.progreso('fotos', n, lotes.length),
  });
  for (const r of avance.respuestas) {
    t.copiadas += r.copied || 0;
    t.yaPropias += r.alreadyOwn || 0;
    t.fallidas += (r.failed || []).length;
    t.cambiaronMientras += r.changedMeanwhile || 0;
  }
  t.lotesHechos = avance.respuestas.length;
  t.error = avance.detenido ? avance.detenido.error : null;
  return t;
}

/** Texto corto, sin jerga, de cada aviso del paso final de inventario. */
export function avisoInventario(t: TotalesProductos): string | null {
  const n = t.inventario.fallidas.length;
  if (n === 0) return null;
  return n === 1
    ? 'Un producto quedó creado pero sin sus existencias. Cárgalas con el importador de existencias de Inventario.'
    : `${n} productos quedaron creados pero sin sus existencias. Cárgalas con el importador de existencias de Inventario.`;
}
