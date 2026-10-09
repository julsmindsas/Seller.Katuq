import type { EventoEnVivo } from '../servicios/en-vivo.modelos';

/**
 * Director de animaciones de la escena de la operación (D-386, tarea 5.2).
 *
 * Decide CUÁNDO se anima cada evento, no CÓMO (eso lo hace la escena). Es puro: sin three, sin DOM
 * y sin reloj propio (el tiempo entra por parámetro), para probarlo con node suelto.
 *
 * Reglas:
 * - A lo sumo `maxSimultaneas` (6) animaciones completas a la vez; el resto espera en cola.
 * - Los eventos de un mismo pedido nunca se saltan el orden ni se pisan: el segundo espera a que
 *   termine el primero. Igual con un mismo vehículo (una moto carga una salida a la vez).
 * - Con más de `umbralCola` (8) trabajos en cola, los que sobran se aplican con desvanecido (modo
 *   `desvanecido`: el estado final con un fundido corto, sin viaje) para que la escena alcance al
 *   servidor sin amontonar movimiento.
 * - Las salidas del mismo transportador se agrupan en UN trabajo (una sola moto o camión con "+N":
 *   el despacho masivo). Una salida espera `ventanaGrupoMs` por si llegan hermanas.
 */

export type ModoTrabajo = 'animado' | 'desvanecido';

/** Lo que el director necesita saber de un evento. */
export interface DescripcionEvento {
  tipo: string;
  /** Ids de los pedidos que toca (el orden entre trabajos de un mismo pedido se respeta). */
  pedidos: string[];
  /** Clave del vehículo que usa (los trabajos de un mismo vehículo se hacen uno tras otro). */
  vehiculo?: string | null;
  /** Salidas con la misma clave se agrupan en un solo trabajo. null = no se agrupa. */
  grupo?: string | null;
}

export interface Trabajo<E> {
  id: number;
  tipo: string;
  eventos: E[];
  pedidos: string[];
  vehiculo: string | null;
  grupo: string | null;
  /** Instante (ms) en que se encoló el primer evento del trabajo. */
  encoladoMs: number;
}

export interface OpcionesDirector<E> {
  describir: (evento: E) => DescripcionEvento;
  /**
   * Hace el trabajo y llama `fin()` cuando ya no ocupa a sus pedidos ni a su vehículo.
   * Con `desvanecido` debe dejar el estado final cuanto antes (fundido corto, sin viaje).
   */
  ejecutar: (trabajo: Trabajo<E>, modo: ModoTrabajo, fin: () => void) => void;
  maxSimultaneas?: number;
  umbralCola?: number;
  ventanaGrupoMs?: number;
}

export const MAX_SIMULTANEAS = 6;
export const UMBRAL_COLA = 8;
export const VENTANA_GRUPO_MS = 600;

interface Activo<E> {
  trabajo: Trabajo<E>;
  modo: ModoTrabajo;
}

export class Director<E> {
  private readonly cola: Trabajo<E>[] = [];
  private readonly activos: Activo<E>[] = [];
  private generacion = 0;
  private siguienteId = 1;
  private readonly max: number;
  private readonly umbral: number;
  private readonly ventana: number;
  private picoSimultaneas = 0;
  private desvanecidos = 0;

  constructor(private readonly opts: OpcionesDirector<E>) {
    this.max = opts.maxSimultaneas ?? MAX_SIMULTANEAS;
    this.umbral = opts.umbralCola ?? UMBRAL_COLA;
    this.ventana = opts.ventanaGrupoMs ?? VENTANA_GRUPO_MS;
  }

  /** Animaciones completas en marcha (las que cuentan para el tope de 6). */
  get animadas(): number {
    return this.activos.filter((a) => a.modo === 'animado').length;
  }

  /** Trabajos en marcha, de cualquier modo. */
  get enMarcha(): number {
    return this.activos.length;
  }

  get enCola(): number {
    return this.cola.length;
  }

  /** Lo más alto que llegó el número de animaciones completas a la vez. */
  get pico(): number {
    return this.picoSimultaneas;
  }

  /** Cuántos trabajos se aplicaron con desvanecido. */
  get totalDesvanecidos(): number {
    return this.desvanecidos;
  }

  get ocupado(): boolean {
    return this.cola.length > 0 || this.activos.length > 0;
  }

  /** Pone un evento en la cola (agrupándolo si es una salida hermana de otra que aún no arranca). */
  encolar(evento: E, ahoraMs: number): void {
    const d = this.opts.describir(evento);
    const grupo = d.grupo ?? null;
    const vehiculo = d.vehiculo ?? null;
    if (grupo !== null) {
      for (let i = this.cola.length - 1; i >= 0; i--) {
        const t = this.cola[i];
        if (t.grupo !== grupo || t.tipo !== d.tipo) continue;
        // Solo se une si ningún trabajo POSTERIOR toca estos pedidos: no se salta el orden de nadie.
        const salta = this.cola.slice(i + 1).some((otro) => otro.pedidos.some((p) => d.pedidos.includes(p)));
        if (salta) break;
        t.eventos.push(evento);
        d.pedidos.forEach((p) => { if (t.pedidos.indexOf(p) < 0) t.pedidos.push(p); });
        return;
      }
    }
    this.cola.push({
      id: this.siguienteId++,
      tipo: d.tipo,
      eventos: [evento],
      pedidos: d.pedidos.slice(),
      vehiculo,
      grupo,
      encoladoMs: ahoraMs,
    });
  }

  /** Arranca lo que se pueda. Se llama en cada cuadro de la escena. */
  avanzar(ahoraMs: number): void {
    // 1) Lo que sobra del umbral se aplica con desvanecido (en orden, sin saltarse conflictos).
    while (this.cola.length > this.umbral) {
      const i = this.primeroElegible(ahoraMs, true);
      if (i < 0) break;
      this.arrancar(this.cola.splice(i, 1)[0], 'desvanecido');
    }
    // 2) Animaciones completas hasta llenar el tope.
    while (this.animadas < this.max) {
      const i = this.primeroElegible(ahoraMs, false);
      if (i < 0) break;
      this.arrancar(this.cola.splice(i, 1)[0], 'animado');
    }
  }

  /** Olvida la cola y suelta lo que estaba en marcha (sus `fin` tardíos ya no cuentan). */
  limpiar(): void {
    this.generacion++;
    this.cola.length = 0;
    this.activos.length = 0;
  }

  // ── Interno ───────────────────────────────────────────────────────────────

  /** Índice del primer trabajo de la cola que puede arrancar ya, o -1. */
  private primeroElegible(ahoraMs: number, ignorarVentana: boolean): number {
    const pedidosOcupados = new Set<string>();
    const vehiculosOcupados = new Set<string>();
    for (const a of this.activos) {
      a.trabajo.pedidos.forEach((p) => pedidosOcupados.add(p));
      if (a.trabajo.vehiculo) vehiculosOcupados.add(a.trabajo.vehiculo);
    }
    // Lo que quedó esperando delante bloquea a los posteriores que toquen lo mismo.
    const pedidosBloqueados = new Set<string>();
    const vehiculosBloqueados = new Set<string>();
    for (let i = 0; i < this.cola.length; i++) {
      const t = this.cola[i];
      const choca =
        t.pedidos.some((p) => pedidosOcupados.has(p) || pedidosBloqueados.has(p)) ||
        (t.vehiculo !== null && (vehiculosOcupados.has(t.vehiculo) || vehiculosBloqueados.has(t.vehiculo)));
      const retenido = !ignorarVentana && t.grupo !== null && ahoraMs - t.encoladoMs < this.ventana;
      if (!choca && !retenido) return i;
      t.pedidos.forEach((p) => pedidosBloqueados.add(p));
      if (t.vehiculo) vehiculosBloqueados.add(t.vehiculo);
    }
    return -1;
  }

  private arrancar(trabajo: Trabajo<E>, modo: ModoTrabajo): void {
    const activo: Activo<E> = { trabajo, modo };
    this.activos.push(activo);
    if (modo === 'desvanecido') this.desvanecidos++;
    this.picoSimultaneas = Math.max(this.picoSimultaneas, this.animadas);
    const generacion = this.generacion;
    let terminado = false;
    const fin = (): void => {
      if (terminado || generacion !== this.generacion) return;
      terminado = true;
      const i = this.activos.indexOf(activo);
      if (i >= 0) this.activos.splice(i, 1);
    };
    this.opts.ejecutar(trabajo, modo, fin);
  }
}

/**
 * Cómo ve el director a cada evento real del canal: qué pedido toca, qué vehículo usa y con quién
 * se agrupa. Las salidas se agrupan por transportador (mismo nombre y mismo tipo): el despacho
 * masivo de un mensajero es UNA moto con "+N", no N motos.
 */
export function describirEventoEnVivo(ev: EventoEnVivo): DescripcionEvento {
  if (ev.tipo === 'salida') {
    const nombre = (ev.transportador ?? '').trim().toLowerCase();
    const tipo = ev.tipoTransportador === 'transportadora' ? 'transportadora' : 'mensajero';
    const clave = `${tipo}:${nombre}`;
    return { tipo: 'salida', pedidos: [ev.pedidoId], vehiculo: clave, grupo: `salida:${clave}` };
  }
  return { tipo: ev.tipo, pedidos: [ev.pedidoId], vehiculo: null, grupo: null };
}
