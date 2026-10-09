import {
  AlertaRadar,
  ComercioEnVivo,
  RadarEnVivo,
  TipoAlertaRadar,
  TonoEnVivo,
} from '../../servicios/en-vivo.modelos';
import { IconoId } from '../../utilidades/iconos';
import { claseTono } from '../../utilidades/tonos';
import { nombreVisible } from './nombres';

/**
 * Radar de atención de toda Katuq (spec `radar-en-vivo`): qué comercio necesita ayuda o está en
 * racha. Las alertas, las sugerencias y los umbrales los calcula el SERVIDOR (`radar.alertas`);
 * aquí solo se rotulan, se enmascaran los nombres y se congela durante "Repetir el día". Todo puro.
 */

// ── Congelado durante "Repetir el día" ──────────────────────────────────────

/**
 * `radar` es lo último que se mostró; `fijado` dice si ya hubo una primera lectura. Mientras se
 * repite el día, la proyección, los récords, los tiempos y las alertas NO cambian (el día está a
 * medias y el radar compararía contra un día que no es el real).
 */
export interface RadarCongelado {
  radar: RadarEnVivo | null;
  fijado: boolean;
}

export const RADAR_SIN_LEER: RadarCongelado = { radar: null, fijado: false };

/**
 * Siguiente radar a mostrar. Con la repetición activa se queda el que ya había; en cuanto termina,
 * toma el real más reciente. La primera lectura siempre entra (no hay nada que conservar).
 */
export function reducirRadarCongelado(
  previo: RadarCongelado,
  entrada: { radar: RadarEnVivo | null; repitiendo: boolean }
): RadarCongelado {
  if (entrada.repitiendo && previo.fijado) return previo;
  return { radar: entrada.radar, fijado: true };
}

// ── Alertas ─────────────────────────────────────────────────────────────────

export interface AlertaVista {
  /** `empresa|tipo`: identifica la alerta entre lecturas (para marcar las nuevas). */
  clave: string;
  empresa: string | null;
  /** Nombre ya enmascarado si hace falta. */
  nombre: string;
  /** Nombre real, solo para avisar al abrir el tablero. */
  nombreReal: string;
  titulo: string;
  texto: string;
  sugerencia: string;
  /** `t-bad`, `t-warn`, `t-ok`... */
  clase: string;
  icono: IconoId;
  sev: 1 | 2 | 3;
  /** Trae "Ver los pedidos": pedidos listos que esperan hace rato. */
  atascado: boolean;
  /** Apareció desde la lectura anterior: entra resaltada. */
  nuevo: boolean;
}

export interface VistaRadar {
  alertas: AlertaVista[];
  /** "3 por revisar" o "Todo en orden". */
  resumen: string;
  /** Cuántas son para revisar (gravedad 2 o 3). */
  porRevisar: number;
  /** Llaves de esta lectura, para compararlas con la siguiente. */
  claves: ReadonlySet<string>;
}

const ICONO_POR_TIPO: Readonly<Record<TipoAlertaRadar, IconoId>> = {
  silencio: 'reloj',
  atascado: 'alerta',
  rechazos: 'equis',
  racha: 'fuego',
  listo: 'caja',
  demorado: 'reloj',
  mensajero: 'moto',
  sin_pago: 'tarjeta',
};

/** "Sin pedidos hace 1 h" → igual; "vende 2,4 veces" → "Vende 2,4 veces". */
export function conMayusculaInicial(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

export function iconoDeAlerta(tipo: TipoAlertaRadar | string): IconoId {
  return ICONO_POR_TIPO[tipo as TipoAlertaRadar] ?? 'alerta';
}

function buscarComercio(comercios: ReadonlyArray<ComercioEnVivo>, empresa: string | null | undefined): ComercioEnVivo | undefined {
  return empresa ? comercios.find((c) => c.empresa === empresa) : undefined;
}

/**
 * Alertas listas para pintar, de la más grave a la menos grave (el servidor ya las manda así; el
 * orden estable de `sort` respeta su desempate). `clavesPrevias` = null en la primera lectura: no
 * se marca ninguna como nueva.
 */
export function armarRadar(
  radar: RadarEnVivo | null | undefined,
  comercios: ReadonlyArray<ComercioEnVivo>,
  ocultar: boolean,
  clavesPrevias: ReadonlySet<string> | null
): VistaRadar {
  const crudas: ReadonlyArray<AlertaRadar> = radar?.alertas ?? [];
  const claves = new Set<string>();
  const alertas = crudas
    .map((a, indice) => ({ a, indice }))
    .sort((x, y) => y.a.sev - x.a.sev || x.indice - y.indice)
    .map(({ a }): AlertaVista => {
      const comercio = buscarComercio(comercios, a.empresa);
      const identidad = { nombre: comercio?.nombre ?? a.comercio, ciudad: comercio?.ciudad ?? null };
      const clave = `${a.empresa ?? a.comercio ?? ''}|${a.tipo}`;
      claves.add(clave);
      return {
        clave,
        empresa: a.empresa ?? null,
        nombre: nombreVisible(identidad, ocultar),
        nombreReal: String(a.comercio ?? comercio?.nombre ?? '').trim() || (a.empresa ?? 'Comercio'),
        titulo: conMayusculaInicial(a.titulo),
        texto: a.texto,
        sugerencia: a.sugerencia,
        clase: claseTono(a.tono),
        icono: iconoDeAlerta(a.tipo),
        sev: a.sev,
        atascado: a.tipo === 'atascado',
        nuevo: clavesPrevias !== null && !clavesPrevias.has(clave),
      };
    });

  const porRevisar = alertas.filter((a) => a.sev >= 2).length;
  return {
    alertas,
    porRevisar,
    resumen: porRevisar > 0 ? `${porRevisar} por revisar` : 'Todo en orden',
    claves,
  };
}

/**
 * Qué comercios tienen una alerta para revisar (gravedad 2 o 3) y con qué tono: el muro las marca
 * con un borde y un anillo del color. Si un comercio tiene varias, queda la más grave.
 */
export function alertasPorEmpresa(radar: RadarEnVivo | null | undefined): Map<string, TonoEnVivo> {
  const mapa = new Map<string, TonoEnVivo>();
  const alertas = (radar?.alertas ?? [])
    .map((a, indice) => ({ a, indice }))
    .sort((x, y) => y.a.sev - x.a.sev || x.indice - y.indice);
  for (const { a } of alertas) {
    if (a.sev >= 2 && a.empresa && !mapa.has(a.empresa)) mapa.set(a.empresa, a.tono);
  }
  return mapa;
}
