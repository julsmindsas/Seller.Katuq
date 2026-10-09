import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { ClaveLista } from '../utilidades/tarjetas';
import { claveDeVista, mismaVista, VistaFicha } from './ficha.modelos';
import { claveListaValida } from './utilidades/lista';

/** Cuántas fichas se recuerdan para el botón "Atrás". */
const MAX_PILA = 12;

/** Cuánto vale la reserva de "abrir este pedido al llegar al tablero del comercio". */
const VIGENCIA_PEDIDO_PENDIENTE_MS = 30000;

interface SituacionFicha {
  actual: VistaFicha | null;
  pila: ReadonlyArray<VistaFicha>;
}

/** Lo que mira la ficha y si se puede volver a la anterior. */
export interface EstadoFicha {
  vista: VistaFicha | null;
  puedeVolver: boolean;
}

interface PedidoPendiente {
  pedidoId: string;
  empresa: string;
  hasta: number;
}

/**
 * Qué está mirando la ficha de "En vivo" y por dónde se llegó ("Atrás"). Es la API para quien la
 * integra: la cámara 3D se suscribe a `vistaActual$` para seguir el pedido, el mensajero o la
 * estación de la lista; la escena llama `abrirPedido` al tocar una caja y `cerrar` al tocar un lugar
 * vacío. `<app-en-vivo-ficha>` pinta lo que diga este servicio y lo abre y cierra escuchando
 * `EnVivoInteraccionService.acciones$`.
 *
 * Solo guarda QUÉ se mira (ids y claves): los datos salen de `EnVivoEstadoService` y del detalle que
 * pide el componente. Solo lectura: nada aquí cambia pedidos ni escribe en el servidor.
 *
 * Mientras se repite el día (`EnVivoInteraccionService.repitiendo`) no se abren fichas: la escena
 * muestra un día simulado y la ficha mostraría datos reales.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoFichaService {
  private readonly situacion$ = new BehaviorSubject<SituacionFicha>({ actual: null, pila: [] });
  private pendiente: PedidoPendiente | null = null;

  /** Lo que se mira ahora; null = cerrada. Solo emite cuando cambia la vista. */
  readonly vistaActual$: Observable<VistaFicha | null> = this.situacion$.pipe(
    map((s) => s.actual),
    distinctUntilChanged(mismaVista)
  );

  /** La vista y si hay una anterior a la que volver. Es lo que pinta `<app-en-vivo-ficha>`. */
  readonly estadoFicha$: Observable<EstadoFicha> = this.situacion$.pipe(
    map((s): EstadoFicha => ({ vista: s.actual, puedeVolver: s.pila.length > 0 })),
    distinctUntilChanged(
      (a, b) => a.puedeVolver === b.puedeVolver && (a.vista === null || b.vista === null ? a.vista === b.vista : mismaVista(a.vista, b.vista))
    )
  );

  /** Hay una ficha abierta. */
  readonly abierta$: Observable<boolean> = this.situacion$.pipe(
    map((s) => s.actual !== null),
    distinctUntilChanged()
  );

  constructor(private readonly interaccion: EnVivoInteraccionService) {}

  get vistaActual(): VistaFicha | null {
    return this.situacion$.value.actual;
  }

  get abierta(): boolean {
    return this.situacion$.value.actual !== null;
  }

  get puedeVolver(): boolean {
    return this.situacion$.value.pila.length > 0;
  }

  // ── Abrir ─────────────────────────────────────────────────────────────────

  /**
   * Abre la ficha de un pedido. `empresa` solo sirve con una sesión de Katuq (el comercio dueño).
   * `apilar`: se llegó desde otra ficha y se puede volver con "Atrás" (las filas de las listas).
   */
  abrirPedido(id: string, empresa?: string | null, apilar = false): void {
    const limpio = typeof id === 'string' ? id.trim() : '';
    if (!limpio) return;
    this.abrir({ tipo: 'pedido', id: limpio, empresa: empresa ? empresa : null }, apilar);
  }

  /** Abre la lista de una cifra: `todos` · `prep` · `ia` · `etapa:<id>` · `canal:<canal>` · `ciudad:<ciudad>`. Una clave que no se entiende no abre nada. */
  abrirLista(clave: ClaveLista, apilar = false): void {
    if (!claveListaValida(clave)) return;
    this.abrir({ tipo: 'lista', clave: clave.trim() }, apilar);
  }

  /** Abre la ficha de un mensajero propio o de una transportadora, por su nombre. */
  abrirMensajero(nombre: string, apilar = false): void {
    const limpio = typeof nombre === 'string' ? nombre.trim() : '';
    if (!limpio) return;
    this.abrir({ tipo: 'mensajero', nombre: limpio }, apilar);
  }

  /** Vuelve a la ficha anterior; si no hay, cierra. */
  atras(): void {
    const { pila } = this.situacion$.value;
    if (pila.length === 0) {
      this.cerrar();
      return;
    }
    this.situacion$.next({ actual: pila[pila.length - 1], pila: pila.slice(0, -1) });
  }

  /** Cierra la ficha y olvida el recorrido. La cámara vuelve a su encuadre. */
  cerrar(): void {
    const { actual, pila } = this.situacion$.value;
    if (actual === null && pila.length === 0) return;
    this.situacion$.next({ actual: null, pila: [] });
  }

  private abrir(vista: VistaFicha, apilar: boolean): void {
    if (this.interaccion.repitiendo) return;
    const { actual, pila } = this.situacion$.value;
    // Ya es la que se está mirando: no se vuelve a pedir ni se apila.
    if (actual !== null && claveDeVista(actual) === claveDeVista(vista)) return;
    const siguientePila = apilar && actual !== null ? [...pila, actual].slice(-MAX_PILA) : [];
    this.situacion$.next({ actual: vista, pila: siguientePila });
  }

  // ── De toda Katuq al tablero de un comercio ───────────────────────────────

  /**
   * Antes de pasar de toda Katuq al tablero de un comercio, deja anotado qué pedido estaba abierto: la
   * ficha del tablero nuevo (otra instancia, otra pantalla) lo abre al cargar ("Ver el tablero de Moda
   * Ceiba" abre el tablero con la ficha de ese pedido). Vale 30 segundos.
   */
  dejarPedidoPendiente(pedidoId: string, empresa: string): void {
    if (!pedidoId || !empresa) return;
    this.pendiente = { pedidoId, empresa, hasta: Date.now() + VIGENCIA_PEDIDO_PENDIENTE_MS };
  }

  /** El pedido anotado, si sigue vigente. No lo consume. */
  pedidoPendiente(): { pedidoId: string; empresa: string } | null {
    const pendiente = this.pendiente;
    if (!pendiente) return null;
    if (Date.now() > pendiente.hasta) {
      this.pendiente = null;
      return null;
    }
    return { pedidoId: pendiente.pedidoId, empresa: pendiente.empresa };
  }

  consumirPedidoPendiente(): void {
    this.pendiente = null;
  }
}
