import { EstadoEnVivo, EventoEnVivo, PedidoEnVivo, VistaEnVivo } from '../servicios/en-vivo.modelos';

/**
 * Tipos de "Repetir el día" (D-386, tarea 5.7). Todo puro: sin Angular y sin reloj propio (la hora
 * entra por parámetro), para probarlo con node suelto y un reloj virtual.
 */

/** Lo que dura "Repetir el día": unos 28 s (el spec pide "unos 30"). */
export const DURACION_REPETICION_MS = 28000;

/**
 * Cola de la repetición: los cambios de etapa SIN hora registrada se muestran al final, repartidos
 * en este tramo, ya en su etapa actual. Las llegadas y los cambios con hora ocupan el resto.
 */
export const COLA_FINAL_MS = 1500;

/** Cada cuánto avanza la repetición (~8 cuadros por segundo: sobra para cifras y reloj). */
export const PASO_REPETICION_MS = 120;

/** Hasta cuántos eventos por cuadro se animan uno a uno en las escenas; con más, la escena se coloca sin animar. */
export const MAX_EVENTOS_ANIMADOS_POR_CUADRO = 6;

/** Una cosa que pasa en la repetición: un evento (simulado) en su momento. */
export interface PasoRepeticion {
  /** Momento en la repetición, de 0 a `DURACION_REPETICION_MS`. */
  t: number;
  /** Hora real del evento (ms); en un cambio sin hora registrada, el instante final. */
  realMs: number;
  /** Evento simulado: el mismo contrato que los reales, con id propio (`rep-…`). */
  evento: EventoEnVivo;
  /** true = cambio de etapa SIN hora registrada, mostrado al final en su etapa actual. */
  alFinal: boolean;
}

/** El guion de la repetición: qué pasa y cuándo, más el reloj que acompaña. */
export interface PlanRepeticion {
  vista: VistaEnVivo;
  /** Primer instante real que cuenta (el comienzo de la hora de la primera llegada). */
  inicioMs: number;
  /** Último instante real que cuenta (ahora). */
  finMs: number;
  /** Total de la repetición. */
  duracionMs: number;
  /** Tramo en el que corre el reloj (todo menos la cola). */
  tramoMs: number;
  /** Del primero al último, ordenados por `t`. */
  pasos: ReadonlyArray<PasoRepeticion>;
  /** Pedidos nuevos que se reproducen (lo que cuenta el aviso de "no hay llegadas"). */
  llegadas: number;
  /** Cambios de etapa sin hora, mostrados al final. */
  cambiosAlFinal: number;
  /** Cuántos ms reales del día pasan por cada ms de repetición. */
  escala: number;
}

/**
 * Lo que sabe armar el estado que se ve en cada momento. Una implementación por vista (comercio y
 * toda Katuq). Empieza a cero, suma cada paso que se cumple y arma el estado visible para un
 * instante simulado.
 */
export interface Simulador {
  /** Incorpora un paso que ya ocurrió. */
  aplicar(paso: PasoRepeticion): void;
  /** El estado completo que se pinta en ese instante simulado (ms reales del día). */
  estadoEn(instanteMs: number): EstadoEnVivo;
  /** Los pedidos simulados, del más nuevo al más viejo (para colocar la escena sin animar). Vacío en toda Katuq. */
  pedidos(): ReadonlyArray<PedidoEnVivo>;
}

export interface Repeticion {
  plan: PlanRepeticion;
  simulador: Simulador;
}

/**
 * Lo que una escena 3D debe saber hacer para repetir el día. Las escenas se registran en
 * `EnVivoRepeticionService.registrarEscena()` al montarse y se quitan al destruirse.
 */
export interface EscenaRepetible {
  /** Anima un evento simulado (el mismo contrato que `aplicarEvento` de los reales). */
  aplicarEvento(evento: EventoEnVivo): void;
  /** Coloca estos pedidos sin animar (del más nuevo al más viejo, como la foto). */
  aplicarFoto(pedidos: ReadonlyArray<PedidoEnVivo>): void;
  /** Vacía la escena: la repetición empieza de cero. */
  reiniciar(): void;
  /** Vuelve a dejar la escena igual al estado real. */
  sincronizar(): void;
}
