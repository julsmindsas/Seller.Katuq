import { ComparacionKatuq, TiemposOperacion, TramoComparacion } from '../../servicios/en-vivo.modelos';
import { duracion } from '../../utilidades/formato';

/**
 * Tiempos de hoy del comercio y su comparación con la mediana de los comercios de Katuq
 * (diseño 18). El SERVIDOR calcula las medianas y el veredicto (`radar.tiempos`,
 * `radar.comparacion`); aquí solo se escriben. La comparación nunca nombra a otro comercio: no
 * hay de dónde sacar un nombre, porque el servidor no lo manda. Todo puro.
 */

export interface TramoTiempo {
  id: TramoComparacion;
  nombre: string;
  /** "12 min" o "—". */
  valor: string;
  /** Peso del tramo en la barra (0 a 1 del total de los tres). */
  crecer: number;
  /** Color del tema para la barra y el punto de la leyenda. */
  color: string;
}

export interface TextoComparacion {
  /** Clase del tema: `t-ok` (más rápido), `t-warn` (más lento), `t-accent` (igual). */
  clase: string;
  texto: string;
}

export interface VistaTiempos {
  /** "45 min" o "—" mientras no haya entregas con mensajero propio. */
  ciclo: string;
  leyenda: string;
  tramos: TramoTiempo[];
  /** null si el servidor no mandó comparación (menos de 5 comercios o sin ciclo). */
  comparacion: TextoComparacion | null;
}

const SIN_DATO = '—';

const TEXTO_TRAMO: Readonly<Record<TramoComparacion, string>> = {
  preparacion: 'en preparación',
  espera: 'esperando mensajero',
  entrega: 'en la entrega',
};

/**
 * "Vas 20 % más lento que el promedio de los comercios de Katuq (35 min). Donde más se te va el
 * tiempo: esperando mensajero." El tramo sale de `tramoDondePierde` (y, si no, del más largo).
 */
export function textoComparacion(c: ComparacionKatuq): TextoComparacion {
  const promedio = `el promedio de los comercios de Katuq (${duracion(c.medianaKatuq)})`;
  if (c.veredicto === 'mas_rapido') {
    return { clase: 't-ok', texto: `Vas ${c.diferenciaPct} % más rápido que ${promedio}.` };
  }
  if (c.veredicto === 'mas_lento') {
    const tramo = c.tramoDondePierde ?? c.tramoMasLargo;
    const donde = tramo ? ` Donde más se te va el tiempo: ${TEXTO_TRAMO[tramo]}.` : '';
    return { clase: 't-warn', texto: `Vas ${c.diferenciaPct} % más lento que ${promedio}.${donde}` };
  }
  return { clase: 't-accent', texto: `Vas igual que ${promedio}.` };
}

function valorDe(ms: number | null | undefined): number {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0;
}

function textoDe(ms: number | null | undefined): string {
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= 0 ? duracion(ms) : SIN_DATO;
}

export function armarTiempos(
  tiempos: TiemposOperacion | null | undefined,
  comparacion: ComparacionKatuq | null | undefined
): VistaTiempos {
  const prep = valorDe(tiempos?.prep);
  const espera = valorDe(tiempos?.espera);
  const entrega = valorDe(tiempos?.entrega);
  const total = prep + espera + entrega || 1;
  const entregas = tiempos?.n ?? 0;

  const tramos: TramoTiempo[] = [
    { id: 'preparacion', nombre: 'Preparación', valor: textoDe(tiempos?.prep), crecer: prep / total, color: 'var(--ev-warn)' },
    { id: 'espera', nombre: 'Espera para salir', valor: textoDe(tiempos?.espera), crecer: espera / total, color: 'var(--ev-accent)' },
    { id: 'entrega', nombre: 'Entrega', valor: textoDe(tiempos?.entrega), crecer: entrega / total, color: 'var(--ev-info)' },
  ];

  const ciclo = entregas > 0 ? textoDe(tiempos?.ciclo) : SIN_DATO;
  const leyenda =
    entregas > 0
      ? `de punta a punta con tus mensajeros · ${entregas} ${entregas === 1 ? 'entrega' : 'entregas'} hoy`
      : 'todavía sin entregas con tus mensajeros hoy';

  return { ciclo, leyenda, tramos, comparacion: comparacion ? textoComparacion(comparacion) : null };
}
