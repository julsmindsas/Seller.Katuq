import { ObjetivoOrbe, PuntoOrbe } from './opttia-puntos';

/**
 * El "cerebro" del orbe de Opttia (D-386, 5.14), puro: decide qué señalar y cuándo, y devuelve
 * órdenes para quien las ejecute (el servicio mueve el orbe 3D o marca la tarjeta). Sin Angular,
 * sin three y sin reloj propio (la hora entra por parámetro), para probarlo con node suelto.
 *
 * - Cada `periodoMs` (16 s) pasa al siguiente punto de su lista y lo señala `senalMs` (7 s).
 * - Recorrido: hasta 5 puntos, `pasoMs` (8 s) cada uno, con "Opttia · 1 de 5"; al final suelta la
 *   cámara y dice una despedida. Lo cortan: arrastrar la cámara, abrir una ficha, "Repetir el día",
 *   tocar el orbe de nuevo o quitar la escena. En modo pantalla arranca solo cada `autoMs` (4 min).
 * - Un pedido "Con Opttia" lo lleva a donde llega, salvo con un recorrido o una señal en curso.
 * - La respuesta de una pregunta lo lleva a lo que menciona (corta el recorrido).
 * Nunca señala mientras hay una ficha abierta o se repite el día.
 */

export interface ConfigGuia {
  /** Cada cuánto señala lo siguiente de su lista. */
  periodoMs: number;
  /** Cuánto dura una señal de la lista. */
  senalMs: number;
  /** Espera antes de la primera señal tras aparecer en una escena. */
  primeraMs: number;
  /** Duración de cada punto del recorrido. */
  pasoMs: number;
  /** Puntos que cubre un recorrido. */
  maxPuntos: number;
  /** Cada cuánto hace un recorrido solo en modo pantalla. */
  autoMs: number;
  /** Tiempo mínimo entre dos visitas por pedidos "Con Opttia". */
  entregaMs: number;
}

export const CONFIG_GUIA: Readonly<ConfigGuia> = {
  periodoMs: 16000,
  senalMs: 7000,
  primeraMs: 7000,
  pasoMs: 8000,
  maxPuntos: 5,
  autoMs: 240000,
  entregaMs: 6000,
};

/** Cuánto dura la señal de cada punto del recorrido (un poco menos que el paso: hay un respiro). */
const SENAL_RECORRIDO_MS = 7600;
const SENAL_RESPUESTA_MS = 9000;
const SENAL_ENTREGA_MS = 3200;

export type VistaGuia = 'comercio' | 'katuq';

/** Lo que pasa en la pantalla y condiciona al orbe. */
export interface ContextoGuia {
  vista: VistaGuia;
  /** Hay una escena 3D a la vista (si no, las señales marcan tarjetas). */
  hayEscena: boolean;
  /** Hay una ficha abierta. */
  ficha: boolean;
  /** Se está repitiendo el día. */
  repitiendo: boolean;
  /** Modo pantalla (televisor). */
  pantalla: boolean;
}

export interface OrdenSenalar {
  tipo: 'senalar';
  obj: ObjetivoOrbe | null;
  alterno: ObjetivoOrbe | null;
  texto: string;
  ms: number;
  /** La cámara viaja al lugar (recorrido y respuestas). */
  camara: boolean;
  titulo: string;
  tono: string;
  /** Pulso y confeti al llegar (pedido "Con Opttia"). */
  destello: boolean;
}

/** Quita la señal, la burbuja, la marca y suelta la cámara. */
export interface OrdenSoltar {
  tipo: 'soltar';
}

export type OrdenOrbe = OrdenSenalar | OrdenSoltar;

/** Dónde va el recorrido: "1 de 5". */
export interface AvanceRecorrido {
  paso: number;
  total: number;
}

export interface FuentesGuia {
  puntos: () => ReadonlyArray<PuntoOrbe>;
  /** Lo que dice cuando no tiene nada que señalar. */
  lineas: () => ReadonlyArray<string>;
}

interface Recorrido {
  puntos: ReadonlyArray<PuntoOrbe>;
  i: number;
  proximoMs: number;
}

interface SenalActiva {
  hastaMs: number;
}

export class GuiaOpttia {
  private readonly cfg: ConfigGuia;
  private indice = 0;
  private indiceLinea = 0;
  private siguienteMs = 0;
  private senal: SenalActiva | null = null;
  private recorrido: Recorrido | null = null;
  private ultimaEntregaMs = -Infinity;
  private proximoAutoMs: number | null = null;

  constructor(cfg: Partial<ConfigGuia> = {}) {
    this.cfg = { ...CONFIG_GUIA, ...cfg };
  }

  get enRecorrido(): boolean {
    return this.recorrido !== null;
  }

  /** "1 de 5" mientras dura el recorrido; null si no hay. */
  get avance(): AvanceRecorrido | null {
    const r = this.recorrido;
    return r ? { paso: Math.min(r.i, r.puntos.length), total: r.puntos.length } : null;
  }

  get hayRecorridoOSenal(): boolean {
    return this.recorrido !== null || this.senal !== null;
  }

  /** Aparece (o vuelve a aparecer) en una escena: la primera señal tarda `primeraMs`. */
  empezar(ahoraMs: number): void {
    this.siguienteMs = ahoraMs + this.cfg.primeraMs;
    this.senal = null;
    this.recorrido = null;
    this.proximoAutoMs = null;
  }

  /** Un cuadro (o un turno de reloj): devuelve lo que hay que hacer ahora. */
  paso(ahoraMs: number, ctx: ContextoGuia, fuentes: FuentesGuia): OrdenOrbe[] {
    const ordenes: OrdenOrbe[] = [];

    if (this.recorrido && (ctx.ficha || ctx.repitiendo)) return this.cortar();

    if (this.recorrido) {
      if (ahoraMs >= this.recorrido.proximoMs) this.avanzarRecorrido(ahoraMs, ctx, ordenes);
      return ordenes;
    }

    if (this.senal && ahoraMs > this.senal.hastaMs) {
      this.senal = null;
      ordenes.push({ tipo: 'soltar' });
    }

    // Modo pantalla: un recorrido solo cada 4 minutos.
    if (ctx.pantalla && ctx.hayEscena) {
      if (this.proximoAutoMs === null) this.proximoAutoMs = ahoraMs + this.cfg.autoMs;
      else if (ahoraMs >= this.proximoAutoMs && !ctx.ficha && !ctx.repitiendo) {
        this.proximoAutoMs = ahoraMs + this.cfg.autoMs;
        return ordenes.concat(this.iniciarRecorrido(ahoraMs, ctx, fuentes));
      }
    } else {
      this.proximoAutoMs = null;
    }

    // Cada 16 s señala lo siguiente de su lista (sin ficha abierta ni repetición).
    if (ahoraMs > this.siguienteMs && !ctx.ficha && !ctx.repitiendo) {
      this.siguienteMs = ahoraMs + this.cfg.periodoMs;
      const puntos = fuentes.puntos();
      if (puntos.length) {
        const p = puntos[this.indice++ % puntos.length];
        ordenes.push(this.senalarPunto(ahoraMs, p, this.cfg.senalMs, 'Opttia', false));
      } else {
        const lineas = fuentes.lineas();
        if (lineas.length) {
          const texto = lineas[this.indiceLinea++ % lineas.length];
          ordenes.push(this.hablar(ahoraMs, texto, 6000));
        }
      }
    }
    return ordenes;
  }

  /**
   * Empieza el recorrido (o lo corta si ya iba). Sin nada que señalar, dice que todo está en orden.
   */
  alternarRecorrido(ahoraMs: number, ctx: ContextoGuia, fuentes: FuentesGuia): OrdenOrbe[] {
    if (this.recorrido) return this.cortar();
    return this.iniciarRecorrido(ahoraMs, ctx, fuentes);
  }

  private iniciarRecorrido(ahoraMs: number, ctx: ContextoGuia, fuentes: FuentesGuia): OrdenOrbe[] {
    const puntos = fuentes.puntos().slice(0, this.cfg.maxPuntos);
    this.senal = null;
    if (!puntos.length) {
      const texto =
        ctx.vista === 'katuq'
          ? 'Todo en orden: ningún comercio necesita atención ahora.'
          : 'Todo al día: nada atascado, demorado ni sin cobrar.';
      return [{ tipo: 'soltar' }, this.hablar(ahoraMs, texto, 5000)];
    }
    this.recorrido = { puntos, i: 0, proximoMs: ahoraMs };
    const ordenes: OrdenOrbe[] = [{ tipo: 'soltar' }];
    this.avanzarRecorrido(ahoraMs, ctx, ordenes);
    return ordenes;
  }

  private avanzarRecorrido(ahoraMs: number, _ctx: ContextoGuia, ordenes: OrdenOrbe[]): void {
    const r = this.recorrido;
    if (!r) return;
    if (r.i >= r.puntos.length) {
      this.recorrido = null;
      this.siguienteMs = ahoraMs + this.cfg.periodoMs;
      ordenes.push({ tipo: 'soltar' });
      ordenes.push(this.hablar(ahoraMs, 'Eso es lo importante por ahora. Te aviso si algo cambia.', 4000));
      return;
    }
    const p = r.puntos[r.i];
    r.i++;
    r.proximoMs = ahoraMs + this.cfg.pasoMs;
    ordenes.push(this.senalarPunto(ahoraMs, p, SENAL_RECORRIDO_MS, `Opttia · ${r.i} de ${r.puntos.length}`, true));
  }

  /** Corta el recorrido (y la señal): arrastrar la cámara, abrir una ficha, repetir el día, quitar la escena. */
  cortar(): OrdenOrbe[] {
    const habia = this.recorrido !== null || this.senal !== null;
    this.recorrido = null;
    this.senal = null;
    return habia ? [{ tipo: 'soltar' }] : [];
  }

  /**
   * Llega un pedido "Con Opttia": el orbe va a donde llega, con un destello. No interrumpe un
   * recorrido ni una señal en curso, ni repite antes de `entregaMs`.
   */
  entrega(ahoraMs: number, destino: { obj: ObjetivoOrbe; alterno: ObjetivoOrbe | null; texto: string }, ctx: ContextoGuia): OrdenOrbe[] {
    if (this.recorrido || ctx.repitiendo || ahoraMs - this.ultimaEntregaMs < this.cfg.entregaMs) return [];
    if (this.senal && ahoraMs < this.senal.hastaMs) return [];
    this.ultimaEntregaMs = ahoraMs;
    this.senal = { hastaMs: ahoraMs + SENAL_ENTREGA_MS };
    return [
      {
        tipo: 'senalar',
        obj: destino.obj,
        alterno: destino.alterno,
        texto: destino.texto,
        ms: SENAL_ENTREGA_MS,
        camara: false,
        titulo: 'Opttia · por WhatsApp',
        tono: 'pack',
        destello: true,
      },
    ];
  }

  /** Una respuesta de Opttia que menciona algo con lugar: lo señala con la cámara (y corta el recorrido). */
  respuesta(ahoraMs: number, obj: ObjetivoOrbe, texto: string): OrdenOrbe[] {
    this.recorrido = null;
    this.senal = { hastaMs: ahoraMs + SENAL_RESPUESTA_MS };
    this.siguienteMs = Math.max(this.siguienteMs, ahoraMs + SENAL_RESPUESTA_MS);
    return [
      { tipo: 'soltar' },
      {
        tipo: 'senalar',
        obj,
        alterno: null,
        texto,
        ms: SENAL_RESPUESTA_MS,
        camara: true,
        titulo: 'Opttia · tu pregunta',
        tono: 'pack',
        destello: false,
      },
    ];
  }

  private senalarPunto(ahoraMs: number, p: PuntoOrbe, ms: number, titulo: string, camara: boolean): OrdenSenalar {
    this.senal = { hastaMs: ahoraMs + ms };
    return {
      tipo: 'senalar',
      obj: p.obj,
      alterno: p.alterno ?? null,
      texto: p.texto,
      ms,
      camara,
      titulo,
      tono: p.tono,
      destello: false,
    };
  }

  /** Habla desde donde está, sin señalar nada. */
  private hablar(ahoraMs: number, texto: string, ms: number): OrdenSenalar {
    this.senal = { hastaMs: ahoraMs + ms };
    return { tipo: 'senalar', obj: null, alterno: null, texto, ms, camara: false, titulo: 'Opttia', tono: 'pack', destello: false };
  }
}

