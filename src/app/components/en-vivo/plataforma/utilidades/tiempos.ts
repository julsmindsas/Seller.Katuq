import { ComercioEnVivo, TiemposOperacion } from '../../servicios/en-vivo.modelos';
import { duracion, entero } from '../../utilidades/formato';
import { nombreVisible } from './nombres';

/**
 * Tiempos de la operación de toda Katuq: la mediana del ciclo completo con mensajero propio (de la
 * llegada a la entrega) y sus tres partes, el comercio más rápido y la entrega con transportadora.
 * Puro: las medianas las calcula el servidor (`radar.tiempos`); los tramos sin hora registrada
 * llegan en `null` y NO cuentan.
 */

export type ClaveTramo = 'prep' | 'espera' | 'entrega';

export interface TramoTiempo {
  clave: ClaveTramo;
  etiqueta: string;
  /** "12 min" o "—" si no hay tramos con hora. */
  texto: string;
  /** Peso en la barra (la parte de la suma). 0 = no se dibuja. */
  flex: number;
}

export interface VistaTiempos {
  /** Hay algo que mostrar (alguna mediana o alguna entrega). */
  hayDatos: boolean;
  /** "1 h 10 min", o "—". */
  ciclo: string;
  /** "de punta a punta con mensajero propio · 24 entregas". */
  nota: string;
  tramos: TramoTiempo[];
  rapido: { nombre: string; texto: string; empresa: string } | null;
  /** "34 min", o null si no hay entregas con transportadora. */
  camion: string | null;
}

const ETIQUETAS: Readonly<Record<ClaveTramo, string>> = {
  prep: 'Preparación',
  espera: 'Espera para salir',
  entrega: 'Entrega',
};

function medianaValida(ms: number | null | undefined): ms is number {
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= 0;
}

export function armarTiempos(
  tiempos: TiemposOperacion | null | undefined,
  comercios: ReadonlyArray<ComercioEnVivo>,
  ocultar: boolean
): VistaTiempos {
  if (!tiempos) {
    return { hayDatos: false, ciclo: '—', nota: 'Todavía no hay entregas con hora registrada hoy.', tramos: [], rapido: null, camion: null };
  }

  const valores: Record<ClaveTramo, number | null> = {
    prep: medianaValida(tiempos.prep) ? tiempos.prep : null,
    espera: medianaValida(tiempos.espera) ? tiempos.espera : null,
    entrega: medianaValida(tiempos.entrega) ? tiempos.entrega : null,
  };
  const claves: ClaveTramo[] = ['prep', 'espera', 'entrega'];
  const total = claves.reduce((suma, k) => suma + (valores[k] ?? 0), 0);

  const tramos = claves.map(
    (k): TramoTiempo => {
      const valor = valores[k];
      return {
        clave: k,
        etiqueta: ETIQUETAS[k],
        texto: valor === null ? '—' : duracion(valor),
        flex: valor !== null && total > 0 ? valor / total : 0,
      };
    }
  );

  const entregas = tiempos.n > 0 ? tiempos.n : 0;
  let rapido: VistaTiempos['rapido'] = null;
  if (tiempos.rapido && medianaValida(tiempos.rapido.mediana)) {
    const fila = comercios.find((c) => c.empresa === tiempos.rapido?.empresa);
    const identidad = { nombre: fila?.nombre ?? tiempos.rapido.nombre ?? tiempos.rapido.empresa, ciudad: fila?.ciudad ?? null };
    rapido = {
      empresa: tiempos.rapido.empresa,
      nombre: nombreVisible(identidad, ocultar),
      texto: duracion(tiempos.rapido.mediana),
    };
  }

  return {
    hayDatos: medianaValida(tiempos.ciclo) || entregas > 0 || valores.prep !== null || valores.espera !== null || valores.entrega !== null,
    ciclo: medianaValida(tiempos.ciclo) ? duracion(tiempos.ciclo) : '—',
    nota: `de punta a punta con mensajero propio · ${entero(entregas)} ${entregas === 1 ? 'entrega' : 'entregas'}`,
    tramos,
    rapido,
    camion: medianaValida(tiempos.camion) ? duracion(tiempos.camion) : null,
  };
}
