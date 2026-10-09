import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { ClaveLista } from '../utilidades/tarjetas';

/**
 * Lo que la persona hace en la pantalla "En vivo" y que otras piezas pueden atender
 * (la ficha, las escenas, la repetición del día). El shell es la ruta, así que los
 * componentes que se enchufan en sus slots no pueden recibir `@Output`: se hablan por aquí.
 */
export type AccionPantalla =
  /** Tocó una cifra, una etapa, un canal o una ciudad: abrir la lista de esos pedidos. */
  | { tipo: 'abrir-lista'; clave: ClaveLista }
  /** Tocó un evento o una tarjeta de pedido: abrir su ficha. */
  | { tipo: 'abrir-pedido'; pedidoId: string; empresa?: string | null }
  /** Tocó un mensajero o una transportadora. */
  | { tipo: 'abrir-mensajero'; nombre: string; pedidoIds: string[] }
  /**
   * Abrir el tablero de un comercio desde toda Katuq (con `?empresa=`). Misma forma que `AccionUi`
   * de `en-vivo-acciones.ts`, así que lo que arma `accionOpttiaAUi` se pasa tal cual a `emitir`.
   * La ficha lo atiende cerrándose y avisando por su `@Output() abrirTablero`.
   */
  | { tipo: 'abrir-comercio'; empresa: string; nombre: string; foco?: 'atascados' }
  /** Puntero sobre un evento: resaltar esos pedidos en la escena (null = quitar el resaltado). */
  | { tipo: 'resaltar-pedidos'; ids: string[] | null }
  /** Botón "Repetir el día" (lo atiende `EnVivoRepeticionService`, tarea 5.7). */
  | { tipo: 'repetir-dia' }
  /**
   * Una pieza (p. ej. los logros de toda Katuq con su `(celebrar)`) pide celebrar con aviso y confeti.
   * El shell la atiende; nunca celebra durante "Repetir el día".
   */
  | { tipo: 'celebrar'; texto: string }
  /** El modo pantalla se encendió o se apagó. */
  | { tipo: 'modo-pantalla'; activo: boolean };

/** Una opción del selector de vista de la escena ("Mi operación", "Mi país", "Pedidos", "Muro"). */
export interface OpcionVista {
  id: string;
  etiqueta: string;
}

/** Estado de "Repetir el día": mientras `activa`, no hay sonidos ni celebraciones. */
export interface EstadoRepeticion {
  activa: boolean;
  /** Instante simulado (ms) que muestra el reloj mientras se repite; null = el real. */
  instanteMs: number | null;
  /** Avance de la repetición, de 0 a 1 (la barra de progreso). */
  progreso?: number | null;
  /** Cuántos ms reales del día pasan por cada ms de repetición (para que el pulso escale su ventana). */
  escala?: number | null;
}

const SIN_REPETICION: EstadoRepeticion = { activa: false, instanteMs: null };

/**
 * Puente entre el shell de "En vivo" y lo que se enchufa en él. Singleton, pero el shell lo
 * deja limpio al salir (`reiniciar`). Solo UI: no guarda nada de pedidos ni escribe en el servidor.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoInteraccionService {
  private readonly accionesSubject = new Subject<AccionPantalla>();
  private readonly opcionesSubject = new BehaviorSubject<ReadonlyArray<OpcionVista>>([]);
  private readonly opcionActivaSubject = new BehaviorSubject<string | null>(null);
  private readonly repeticionSubject = new BehaviorSubject<EstadoRepeticion>(SIN_REPETICION);
  private readonly modoPantallaSubject = new BehaviorSubject<boolean>(false);

  /** Lo que hace la persona. El shell emite; quien atiende (ficha, escenas...) se suscribe. */
  readonly acciones$: Observable<AccionPantalla> = this.accionesSubject.asObservable();
  /** Opciones del selector de vista del encabezado. Quien enchufa una escena las registra. */
  readonly opciones$: Observable<ReadonlyArray<OpcionVista>> = this.opcionesSubject.asObservable();
  /** Opción elegida (la última que usó la persona, o la que se fijó por código). */
  readonly opcionActiva$: Observable<string | null> = this.opcionActivaSubject.asObservable();
  readonly repeticion$: Observable<EstadoRepeticion> = this.repeticionSubject.asObservable();
  readonly modoPantalla$: Observable<boolean> = this.modoPantallaSubject.asObservable();

  get opciones(): ReadonlyArray<OpcionVista> {
    return this.opcionesSubject.value;
  }

  get opcionActiva(): string | null {
    return this.opcionActivaSubject.value;
  }

  get repitiendo(): boolean {
    return this.repeticionSubject.value.activa;
  }

  get modoPantalla(): boolean {
    return this.modoPantallaSubject.value;
  }

  emitir(accion: AccionPantalla): void {
    this.accionesSubject.next(accion);
  }

  /** Registra las opciones del selector. Si la elegida ya no existe, queda la primera. */
  fijarOpciones(opciones: ReadonlyArray<OpcionVista>): void {
    this.opcionesSubject.next(opciones);
    const actual = this.opcionActivaSubject.value;
    if (opciones.length > 0 && (actual === null || !opciones.some((o) => o.id === actual))) {
      this.opcionActivaSubject.next(opciones[0].id);
    }
  }

  /** Cambia la opción elegida (no la guarda: eso lo hace el shell con las preferencias). */
  elegirOpcion(id: string): void {
    if (this.opcionesSubject.value.some((o) => o.id === id)) this.opcionActivaSubject.next(id);
  }

  /** Quien maneja "Repetir el día" avisa aquí que empezó, el instante simulado y cuándo terminó. */
  fijarRepeticion(estado: EstadoRepeticion): void {
    this.repeticionSubject.next(estado);
  }

  /** Lo llama el shell al encender o apagar el modo pantalla. */
  fijarModoPantalla(activo: boolean): void {
    if (this.modoPantallaSubject.value === activo) return;
    this.modoPantallaSubject.next(activo);
    this.emitir({ tipo: 'modo-pantalla', activo });
  }

  /** El shell lo llama al destruirse: nada queda de una visita a otra. */
  reiniciar(): void {
    this.opcionesSubject.next([]);
    this.opcionActivaSubject.next(null);
    this.repeticionSubject.next(SIN_REPETICION);
    this.modoPantallaSubject.next(false);
  }
}
