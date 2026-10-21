/**
 * Textos y conteos que muestran los pasos de «Traer mi tienda» (F5-30, tarea 8.3). Puro. Nada de
 * jerga: «plan», «oferta» y «redirección» se explican en una frase. El detalle de cada código
 * sale de la misma tabla del reporte, para que pantalla y archivo digan lo mismo.
 */
import { DETALLE_POR_CODIGO } from './reporte';
import { TotalesProductos, TotalesSimulacion } from './sumas';
import { RespuestaSimulacion } from '../tipos';

export const MENSAJES_SIMULACION: { [codigo: string]: string } = DETALLE_POR_CODIGO;

export interface Contador {
  etiqueta: string;
  valor: number;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Conteos de la simulación. Los que valen cero no se muestran, salvo los productos nuevos. */
export function contadoresDeSimulacion(t: TotalesSimulacion): Contador[] {
  const p = t.productos;
  const lista: Contador[] = [
    { etiqueta: 'Productos nuevos', valor: num(p['toCreate']) },
    { etiqueta: 'Productos que se actualizan', valor: num(p['toUpdate']) },
    { etiqueta: 'Productos que se omiten', valor: num(p['skipped']) },
    { etiqueta: 'Variantes', valor: num(p['variants']) },
    { etiqueta: 'Productos partidos por precio', valor: num(p['splitByPrice']) },
    { etiqueta: 'Fotos válidas', valor: t.fotos.validas },
    { etiqueta: 'Fotos que se copiarán a Katuq', valor: t.fotos.porCopiar },
    { etiqueta: 'Fotos que no se pueden traer', valor: t.fotos.rechazadas + t.fotos.sobrantes },
    { etiqueta: 'Categorías nuevas', valor: t.categoriasNuevas.length },
    { etiqueta: 'Unidades en existencias', valor: t.inventario.unidades },
    { etiqueta: 'Precios de oferta', valor: t.ofertas.cantidad },
    { etiqueta: 'Ofertas programadas', valor: t.ofertas.programadas },
    { etiqueta: 'Ofertas vencidas', valor: t.ofertas.vencidas },
    { etiqueta: 'Productos con textos para Google', valor: t.seo.conSeo },
    { etiqueta: 'Descripciones de fotos', valor: t.seo.conAlt },
    { etiqueta: 'Direcciones que se redirigen', valor: num(t.redirecciones && t.redirecciones['generated']) },
  ];
  return lista.filter((c, i) => i === 0 || c.valor > 0);
}

/** Explica el plan gratis sin jerga; null si el plan no limita nada. */
export function mensajePlan(plan: RespuestaSimulacion['plan']): string | null {
  if (!plan) return null;
  const ocultos = num(plan.hiddenAfterImport);
  if (ocultos <= 0) return null;
  const limite = num(plan.visibleLimit);
  return `Tu plan muestra ${limite} productos en la tienda. ${ocultos} de los que traes quedarán guardados pero ocultos hasta que cambies de plan. Tus productos actuales siguen visibles.`;
}

export interface LineaResumen {
  etiqueta: string;
  valor: number;
}

/** Resumen final de la importación para el paso del reporte. */
export function resumenDeImportacion(t: TotalesProductos): LineaResumen[] {
  const lista: LineaResumen[] = [
    { etiqueta: 'Productos creados', valor: t.creados },
    { etiqueta: 'Productos actualizados', valor: t.actualizados },
    { etiqueta: 'Productos omitidos', valor: t.omitidos },
    { etiqueta: 'Existencias cargadas', valor: t.inventario.cargadas },
    { etiqueta: 'Sin existencias por falla', valor: t.inventario.fallidas.length },
    { etiqueta: 'Categorías nuevas', valor: t.categoriasCreadas.length },
    { etiqueta: 'Ofertas cargadas', valor: t.ofertas.cargadas },
    { etiqueta: 'Fotos por copiar', valor: t.fotos.porCopiar },
  ];
  return lista.filter((l, i) => i < 3 || l.valor > 0);
}
