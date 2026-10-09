import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { instanteEn } from './cronograma';
import { armarPlanComercio, pedidosDeHoy } from './plan-comercio';
import { armarPlanKatuq } from './plan-katuq';
import {
  EscenaRepetible,
  MAX_EVENTOS_ANIMADOS_POR_CUADRO,
  PASO_REPETICION_MS,
  PasoRepeticion,
  PlanRepeticion,
  Repeticion,
  Simulador,
} from './repeticion.tipos';
import { SimuladorComercio } from './simulacion-comercio';
import { SimuladorKatuq } from './simulacion-katuq';
import { diaDeColombia } from '../servicios/en-vivo-reglas';
import { EstadoEnVivo } from '../servicios/en-vivo.modelos';

/**
 * Lo que "Repetir el día" necesita del mundo para correr: un reloj monótono (en ms) y un
 * temporizador. Se inyecta para probar con reloj virtual; en la pantalla es `performance.now()` y
 * `setInterval` fuera de la zona de Angular.
 */
export interface RelojRepeticion {
  ahora(): number;
  /** Llama `fn` cada `ms`; devuelve cómo pararlo. */
  cada(ms: number, fn: () => void): () => void;
}

export const AVISO_SIN_LLEGADAS = 'Hoy todavía no hay pedidos para repetir';
export const AVISO_SIN_DATOS = 'Todavía no hay datos del día para repetir';

export type ResultadoRepeticion =
  | { iniciada: true; plan: PlanRepeticion }
  | { iniciada: false; motivo: 'ya-repitiendo' | 'sin-datos' | 'sin-llegadas' };

/** Arma el plan y el simulador según la vista del estado real. null = nada que repetir. */
export function armarRepeticion(real: EstadoEnVivo, ahoraMs: number): Repeticion | null {
  if (real.vista === 'katuq') {
    const plan = armarPlanKatuq(real, ahoraMs);
    return plan ? { plan, simulador: new SimuladorKatuq(real, ahoraMs) } : null;
  }
  const plan = armarPlanComercio(real, ahoraMs);
  if (!plan) return null;
  const dia = real.cifras?.dia || diaDeColombia(ahoraMs);
  return { plan, simulador: new SimuladorComercio(real, pedidosDeHoy(real, dia), ahoraMs) };
}

/**
 * Corre UNA repetición del día (D-386, tarea 5.7). Sin Angular: habla con `EnVivoEstadoService` y
 * `EnVivoInteraccionService` y recibe las escenas y el reloj.
 *
 * Cómo no pierde nada: el estado REAL nunca se toca. La repetición pone un estado sustituto
 * (`fijarSustituto`) que alimenta a todo lo que se ve; el canal sigue aplicando los mensajes reales
 * al estado real en paralelo. Al terminar se quita el sustituto y la pantalla queda igual al estado
 * real de ese momento, con todo lo que llegó mientras tanto.
 *
 * Orden de las dos señales (importa a las escenas): al empezar primero se avisa `activa: true` y
 * luego se pone el sustituto; al terminar primero se quita el sustituto y luego se avisa
 * `activa: false` (las escenas se sincronizan con el estado real en ese aviso).
 */
export class EjecutorRepeticion {
  private pararReloj: (() => void) | null = null;
  private repeticion: Repeticion | null = null;
  private inicioMs = 0;
  private siguiente = 0;
  private emitiendo = false;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly escenas: () => ReadonlyArray<EscenaRepetible>,
    private readonly reloj: RelojRepeticion,
    private readonly cuadroMs: number = PASO_REPETICION_MS
  ) {}

  get activa(): boolean {
    return this.repeticion !== null;
  }

  /** Empieza la repetición con el estado real de ahora. `ahoraMs` es la hora real (Date.now). */
  iniciar(ahoraMs: number): ResultadoRepeticion {
    if (this.repeticion || this.interaccion.repitiendo) return { iniciada: false, motivo: 'ya-repitiendo' };
    const real = this.estado.estado;
    if (!real.cargado || real.disponible === false) {
      this.estado.avisar(AVISO_SIN_DATOS);
      return { iniciada: false, motivo: 'sin-datos' };
    }
    const repeticion = armarRepeticion(real, ahoraMs);
    if (!repeticion) {
      this.estado.avisar(AVISO_SIN_LLEGADAS);
      return { iniciada: false, motivo: 'sin-llegadas' };
    }

    this.repeticion = repeticion;
    this.inicioMs = this.reloj.ahora();
    this.siguiente = 0;
    const { plan, simulador } = repeticion;
    // 1) avisar que se repite (las escenas y el resto se callan), 2) poner el día a cero.
    this.interaccion.fijarRepeticion({ activa: true, instanteMs: plan.inicioMs, progreso: 0, escala: plan.escala });
    this.estado.fijarSustituto(simulador.estadoEn(plan.inicioMs));
    for (const escena of this.escenas()) escena.reiniciar();
    this.pararReloj = this.reloj.cada(this.cuadroMs, () => this.cuadro());
    return { iniciada: true, plan };
  }

  /** Corta la repetición y deja todo en el estado real (la pantalla se destruye, cambia de comercio, etc.). */
  cancelar(): void {
    this.terminar();
  }

  /** Un cuadro: cumple los pasos que ya les toca, publica el estado simulado y mueve el reloj. */
  cuadro(): void {
    const repeticion = this.repeticion;
    if (!repeticion || this.emitiendo) return;
    // Si alguien quitó el estado simulado o cerró la repetición por fuera (cambió de comercio, salió), se acabó.
    if (!this.estado.enSustituto || !this.interaccion.repitiendo) {
      this.terminar();
      return;
    }
    this.emitiendo = true;
    try {
      const { plan, simulador } = repeticion;
      const t = Math.min(plan.duracionMs, Math.max(0, this.reloj.ahora() - this.inicioMs));
      const cumplidos: PasoRepeticion[] = [];
      while (this.siguiente < plan.pasos.length && plan.pasos[this.siguiente].t <= t) {
        const paso = plan.pasos[this.siguiente++];
        simulador.aplicar(paso);
        cumplidos.push(paso);
      }
      const instante = instanteEn(plan, t);
      // El estado simulado primero, y luego el reloj y los eventos: así quien reacciona al evento ya ve las cifras nuevas.
      this.estado.fijarSustituto(simulador.estadoEn(instante));
      this.interaccion.fijarRepeticion({ activa: true, instanteMs: instante, progreso: t / plan.duracionMs, escala: plan.escala });
      this.alimentarEscenas(cumplidos, simulador);
      for (const paso of cumplidos) this.estado.anunciarSimulado(paso.evento);
      if (t >= plan.duracionMs) this.terminar();
    } finally {
      this.emitiendo = false;
    }
  }

  private alimentarEscenas(cumplidos: ReadonlyArray<PasoRepeticion>, simulador: Simulador): void {
    if (cumplidos.length === 0) return;
    const escenas = this.escenas();
    if (escenas.length === 0) return;
    if (cumplidos.length <= MAX_EVENTOS_ANIMADOS_POR_CUADRO) {
      for (const escena of escenas) for (const paso of cumplidos) escena.aplicarEvento(paso.evento);
    } else {
      // Demasiadas llegadas en un cuadro: se coloca la escena como va el día, sin animar una por una.
      const pedidos = simulador.pedidos();
      for (const escena of escenas) escena.aplicarFoto(pedidos);
    }
  }

  private terminar(): void {
    if (!this.repeticion) return;
    this.pararReloj?.();
    this.pararReloj = null;
    this.repeticion = null;
    // Primero se quita el estado simulado (todo vuelve al real, con lo que llegó mientras tanto) y luego se avisa el fin.
    this.estado.fijarSustituto(null);
    this.interaccion.fijarRepeticion({ activa: false, instanteMs: null, progreso: null, escala: null });
    for (const escena of this.escenas()) escena.sincronizar();
  }
}
