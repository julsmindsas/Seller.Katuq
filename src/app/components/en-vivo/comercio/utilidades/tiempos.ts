import { ComparacionKatuq, TiemposOperacion, TramoComparacion } from '../../servicios/en-vivo.modelos';
import { duracion } from '../../utilidades/formato';
import { Traductor } from '../../utilidades/traductor';

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

/** Clave del tramo dentro de la frase ("Donde más se te va el tiempo: …"). */
const CLAVE_TRAMO: Readonly<Record<TramoComparacion, string>> = {
  preparacion: 'enVivo.comercio.tiempos.tramoPreparacion',
  espera: 'enVivo.comercio.tiempos.tramoEspera',
  entrega: 'enVivo.comercio.tiempos.tramoEntrega',
};

/**
 * "Vas 20 % más lento que el promedio de los comercios de Katuq (35 min). Donde más se te va el
 * tiempo: esperando mensajero." El tramo sale de `tramoDondePierde` (y, si no, del más largo).
 */
export function textoComparacion(c: ComparacionKatuq, t: Traductor): TextoComparacion {
  const params = { pct: c.diferenciaPct, mediana: duracion(c.medianaKatuq, t) };
  if (c.veredicto === 'mas_rapido') {
    return { clase: 't-ok', texto: t('enVivo.comercio.tiempos.masRapido', params) };
  }
  if (c.veredicto === 'mas_lento') {
    const tramo = c.tramoDondePierde ?? c.tramoMasLargo;
    return {
      clase: 't-warn',
      texto: tramo
        ? t('enVivo.comercio.tiempos.masLentoTramo', { ...params, tramo: t(CLAVE_TRAMO[tramo]) })
        : t('enVivo.comercio.tiempos.masLento', params),
    };
  }
  return { clase: 't-accent', texto: t('enVivo.comercio.tiempos.igual', params) };
}

function valorDe(ms: number | null | undefined): number {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0;
}

function textoDe(ms: number | null | undefined, t: Traductor): string {
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= 0 ? duracion(ms, t) : SIN_DATO;
}

export function armarTiempos(
  tiempos: TiemposOperacion | null | undefined,
  comparacion: ComparacionKatuq | null | undefined,
  t: Traductor
): VistaTiempos {
  const prep = valorDe(tiempos?.prep);
  const espera = valorDe(tiempos?.espera);
  const entrega = valorDe(tiempos?.entrega);
  const total = prep + espera + entrega || 1;
  const entregas = tiempos?.n ?? 0;

  const tramos: TramoTiempo[] = [
    { id: 'preparacion', nombre: t('enVivo.comercio.tiempos.preparacion'), valor: textoDe(tiempos?.prep, t), crecer: prep / total, color: 'var(--ev-warn)' },
    { id: 'espera', nombre: t('enVivo.comercio.tiempos.espera'), valor: textoDe(tiempos?.espera, t), crecer: espera / total, color: 'var(--ev-accent)' },
    { id: 'entrega', nombre: t('enVivo.comercio.tiempos.entrega'), valor: textoDe(tiempos?.entrega, t), crecer: entrega / total, color: 'var(--ev-info)' },
  ];

  const ciclo = entregas > 0 ? textoDe(tiempos?.ciclo, t) : SIN_DATO;
  const leyenda =
    entregas > 0
      ? t(entregas === 1 ? 'enVivo.comercio.tiempos.leyendaUna' : 'enVivo.comercio.tiempos.leyendaVarias', { n: entregas })
      : t('enVivo.comercio.tiempos.leyendaSin');

  return { ciclo, leyenda, tramos, comparacion: comparacion ? textoComparacion(comparacion, t) : null };
}
