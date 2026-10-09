import { PasoRepeticion, PlanRepeticion, COLA_FINAL_MS, DURACION_REPETICION_MS } from './repeticion.tipos';
import { VistaEnVivo } from '../servicios/en-vivo.modelos';

/**
 * Cronograma de "Repetir el día": pone cada paso en su momento de la repetición. Todo el día real,
 * de la hora de la primera llegada a ahora, se comprime en ~26,5 s; lo que no tiene hora se reparte
 * en la cola (~1,5 s) y queda al final. Puro.
 */

/** Un paso todavía sin momento: hora real (o null si no se registró) y el evento. */
export interface PasoCrudo {
  realMs: number | null;
  evento: PasoRepeticion['evento'];
}

export const HORA_MS = 3600000;

/** Inicio de la hora (hora de Colombia: UTC-5 es un número entero de horas, así que coincide con la hora UTC). */
export function inicioDeHora(ms: number): number {
  return Math.floor(ms / HORA_MS) * HORA_MS;
}

/** Primer instante del día de Colombia (`AAAA-MM-DD`). */
export function inicioDelDia(dia: string): number {
  return Date.parse(`${dia}T00:00:00-05:00`);
}

interface OpcionesCronograma {
  vista: VistaEnVivo;
  /** Ahora (real). El reloj de la repetición termina aquí. */
  ahoraMs: number;
  /** Pedidos nuevos entre los pasos (para el aviso y la comprobación de "no hay llegadas"). */
  llegadas: number;
  /** Desde cuándo cuenta el día; por defecto, la hora de la primera llegada. */
  desdeMs?: number;
  duracionMs?: number;
  colaMs?: number;
}

/**
 * Arma el cronograma. Los pasos con hora se escalan entre `inicioMs` y `finMs`; los que no la
 * tienen (`realMs: null`) van al final, en el orden en que llegaron, repartidos en la cola.
 * Devuelve null si no hay nada que reproducir.
 */
export function armarCronograma(crudos: ReadonlyArray<PasoCrudo>, opciones: OpcionesCronograma): PlanRepeticion | null {
  const duracionMs = opciones.duracionMs ?? DURACION_REPETICION_MS;
  const colaMs = opciones.colaMs ?? COLA_FINAL_MS;

  const conHora = crudos.filter((p): p is PasoCrudo & { realMs: number } => p.realMs !== null && Number.isFinite(p.realMs));
  const sinHora = crudos.filter((p) => p.realMs === null || !Number.isFinite(p.realMs));
  // Sin pasos solo hay repetición si se dijo desde cuándo contar (toda Katuq cuenta con las cifras por hora).
  if (conHora.length === 0 && sinHora.length === 0 && opciones.desdeMs === undefined) return null;

  // Sin `Math.min(...lista)`: con miles de pasos desbordaría la pila.
  const primero = conHora.reduce((m, p) => Math.min(m, p.realMs), conHora.length > 0 ? conHora[0].realMs : opciones.desdeMs ?? opciones.ahoraMs);
  const ultimo = conHora.reduce((m, p) => Math.max(m, p.realMs), conHora.length > 0 ? conHora[0].realMs : opciones.ahoraMs);
  const inicioMs = inicioDeHora(opciones.desdeMs !== undefined ? Math.min(opciones.desdeMs, primero) : primero);
  const finMs = Math.max(opciones.ahoraMs, ultimo, inicioMs + 1);

  // Con cola solo si hay algo que poner en ella: si no, el reloj usa todo el tiempo.
  const cola = sinHora.length > 0 ? Math.min(colaMs, duracionMs / 2) : 0;
  const tramoMs = duracionMs - cola;
  const escala = (finMs - inicioMs) / tramoMs;

  const pasos: PasoRepeticion[] = conHora
    .map((p, orden) => ({ p, orden }))
    .sort((a, b) => a.p.realMs - b.p.realMs || a.orden - b.orden)
    .map(({ p }) => ({
      t: Math.min(tramoMs, Math.max(0, (p.realMs - inicioMs) / escala)),
      realMs: p.realMs,
      evento: p.evento,
      alFinal: false,
    }));

  sinHora.forEach((p, i) => {
    pasos.push({
      t: tramoMs + ((i + 1) / sinHora.length) * cola,
      realMs: finMs,
      evento: p.evento,
      alFinal: true,
    });
  });

  return {
    vista: opciones.vista,
    inicioMs,
    finMs,
    duracionMs,
    tramoMs,
    pasos,
    llegadas: opciones.llegadas,
    cambiosAlFinal: sinHora.length,
    escala,
  };
}

/**
 * Instante real que marca el reloj cuando la repetición va en `t` ms. Dentro del tramo avanza
 * parejo de `inicioMs` a `finMs`; en la cola se queda en `finMs` (ahora).
 */
export function instanteEn(plan: PlanRepeticion, t: number): number {
  if (t <= 0) return plan.inicioMs;
  if (t >= plan.tramoMs) return plan.finMs;
  return Math.round(plan.inicioMs + t * plan.escala);
}
