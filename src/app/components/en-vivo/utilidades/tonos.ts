import { EtapaId, EtapaInfo, TonoEnVivo } from '../servicios/en-vivo.modelos';

/**
 * Tono visual: los del servidor (`TonoEnVivo`) más `pack`, que solo usa el front para lo que
 * arma Opttia ("Con Opttia"). Cada uno es un par fuerte / fondo suave del tema canónico.
 */
export type TonoVisual = TonoEnVivo | 'pack';

const CLASE_POR_TONO: Record<TonoVisual, string> = {
  neutro: 't-slate',
  info: 't-info',
  aviso: 't-warn',
  acento: 't-accent',
  ok: 't-ok',
  peligro: 't-bad',
  pack: 't-pack',
};

/** Clase CSS (`t-accent`, `t-ok`...) que fija `--tone` y `--tone-soft`. Ver el mixin `ev-tonos`. */
export function claseTono(tono: TonoVisual | null | undefined): string {
  return (tono && CLASE_POR_TONO[tono]) || 't-slate';
}

/** Las etapas de la banda, en orden, para cuando la foto aún no las trae. */
export const ETAPAS_POR_DEFECTO: ReadonlyArray<EtapaInfo> = [
  { id: 'recibido', nombre: 'Sin producir', tono: 'neutro' },
  { id: 'produccion', nombre: 'En producción', tono: 'info' },
  { id: 'producido', nombre: 'Producido', tono: 'aviso' },
  { id: 'empacado', nombre: 'Empacado', tono: 'aviso' },
  { id: 'listo', nombre: 'Para despachar', tono: 'acento' },
  { id: 'camino', nombre: 'Despachado', tono: 'info' },
  { id: 'entregado', nombre: 'Entregado', tono: 'ok' },
  { id: 'rechazado', nombre: 'Rechazado', tono: 'peligro' },
  { id: 'cancelado', nombre: 'Cancelado', tono: 'peligro' },
];

/** Etapas de la franja de la operación (sin rechazado ni cancelado). */
export const ETAPAS_DE_LA_BANDA: ReadonlyArray<EtapaId> = [
  'recibido',
  'produccion',
  'producido',
  'empacado',
  'listo',
  'camino',
  'entregado',
];

/** Mapa id → etapa. La foto manda; lo que falte sale de las etapas por defecto. */
export function mapaDeEtapas(etapas: ReadonlyArray<EtapaInfo> | null | undefined): Map<EtapaId, EtapaInfo> {
  const mapa = new Map<EtapaId, EtapaInfo>();
  for (const etapa of ETAPAS_POR_DEFECTO) mapa.set(etapa.id, etapa);
  for (const etapa of etapas ?? []) mapa.set(etapa.id, etapa);
  return mapa;
}
