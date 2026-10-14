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
 * - Opttia propone (D-422): con una propuesta viva deja su ronda, va a lo que la propuesta toca y su
 *   señal queda FIJA (sin vencer) hasta que se retire. La ronda de 16 s, el recorrido automático de
 *   la TV y los pedidos "Con Opttia" no la pisan; un recorrido pedido por la persona o la respuesta a
 *   una pregunta sí, y al terminar la propuesta vuelve. `cortar()` suelta la señal pero no la propuesta.
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
  /** Cuánto dura (con `fija`, no cuenta). */
  ms: number;
  /** Señal de una propuesta: no vence sola (sin la red de seguridad del orbe). */
  fija?: boolean;
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

/** Solo suelta la cámara (la persona la arrastra); la señal de la propuesta se queda. */
export interface OrdenSoltarCamara {
  tipo: 'soltar-camara';
}

export type OrdenOrbe = OrdenSenalar | OrdenSoltar | OrdenSoltarCamara;

/** Lo que el orbe señala de una propuesta de Opttia (la arma el servicio con la propuesta de la tarjeta). */
export interface PropuestaGuia {
  obj: ObjetivoOrbe | null;
  alterno: ObjetivoOrbe | null;
  texto: string;
  titulo: string;
  tono: string;
}

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
  private propuesta: PropuestaGuia | null = null;
  /** La señal de la propuesta está puesta ahora mismo. */
  private propuestaVisible = false;
  /** La próxima vez que se señale la propuesta, la cámara se acerca (solo la primera). */
  private camaraPropuesta = false;

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

  /** Hay una propuesta de Opttia viva (la señale o no en este momento). */
  get conPropuesta(): boolean {
    return this.propuesta !== null;
  }

  /** Aparece (o vuelve a aparecer) en una escena: la primera señal tarda `primeraMs` (una propuesta viva vuelve en el siguiente paso). */
  empezar(ahoraMs: number): void {
    this.siguienteMs = ahoraMs + this.cfg.primeraMs;
    this.senal = null;
    this.recorrido = null;
    this.proximoAutoMs = null;
    this.propuestaVisible = false;
  }

  /**
   * Opttia propone: el orbe deja la ronda (y el recorrido) y va a lo que toca la propuesta, con la
   * cámara la primera vez. Su señal queda fija hasta `retirarPropuesta`. Con una ficha abierta o
   * repitiendo el día espera, y la muestra en cuanto se pueda.
   */
  proponer(ahoraMs: number, p: PropuestaGuia, ctx: ContextoGuia): OrdenOrbe[] {
    const habia = this.recorrido !== null || this.senal !== null || this.propuestaVisible;
    this.propuesta = p;
    this.recorrido = null;
    this.senal = null;
    this.propuestaVisible = false;
    this.camaraPropuesta = true;
    const ordenes: OrdenOrbe[] = habia ? [{ tipo: 'soltar' }] : [];
    if (ctx.hayEscena && !ctx.ficha && !ctx.repitiendo) ordenes.push(this.senalarPropuesta());
    this.siguienteMs = Math.max(this.siguienteMs, ahoraMs + this.cfg.periodoMs);
    return ordenes;
  }

  /**
   * La señal fija de la propuesta no se alcanzó a dibujar (no había una escena corriendo): no se da
   * por puesta, así que el siguiente paso con escena la vuelve a señalar, con la cámara si la llevaba.
   */
  propuestaNoVista(camara: boolean): void {
    if (!this.propuesta) return;
    this.propuestaVisible = false;
    if (camara) this.camaraPropuesta = true;
  }

  /** La propuesta se fue (aprobada, pospuesta o sin tarjeta): el orbe la suelta y vuelve a su ronda tras una pausa. */
  retirarPropuesta(ahoraMs: number): OrdenOrbe[] {
    if (!this.propuesta) return [];
    const estaba = this.propuestaVisible;
    this.propuesta = null;
    this.propuestaVisible = false;
    this.camaraPropuesta = false;
    this.siguienteMs = Math.max(this.siguienteMs, ahoraMs + this.cfg.primeraMs);
    return estaba ? [{ tipo: 'soltar' }] : [];
  }

  /**
   * La persona arrastra la cámara: corta el recorrido y las señales de siempre, pero si lo que se ve
   * es la propuesta, solo suelta la cámara y la señal se queda.
   */
  arrastre(): OrdenOrbe[] {
    if (this.propuesta && this.propuestaVisible && !this.recorrido && !this.senal) {
      this.camaraPropuesta = false;
      return [{ tipo: 'soltar-camara' }];
    }
    return this.cortar();
  }

  /** Un cuadro (o un turno de reloj): devuelve lo que hay que hacer ahora. */
  paso(ahoraMs: number, ctx: ContextoGuia, fuentes: FuentesGuia): OrdenOrbe[] {
    const ordenes: OrdenOrbe[] = [];

    if (this.recorrido && (ctx.ficha || ctx.repitiendo)) return this.cortar();

    if (this.recorrido) {
      if (ahoraMs >= this.recorrido.proximoMs) this.avanzarRecorrido(ahoraMs, ctx, ordenes);
      return ordenes;
    }

    // Con una propuesta viva no hay ronda ni recorrido automático: la propuesta manda.
    if (this.propuesta) return this.pasoConPropuesta(ahoraMs, ctx);

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

  /** Con una propuesta viva: se muestra fija cuando se puede y espera a que termine una respuesta en curso. */
  private pasoConPropuesta(ahoraMs: number, ctx: ContextoGuia): OrdenOrbe[] {
    const ordenes: OrdenOrbe[] = [];
    if (this.senal) {
      if (ahoraMs <= this.senal.hastaMs) return ordenes;
      this.senal = null;
      ordenes.push({ tipo: 'soltar' });
    }
    if (ctx.ficha || ctx.repitiendo || !ctx.hayEscena) {
      if (this.propuestaVisible) {
        this.propuestaVisible = false;
        ordenes.push({ tipo: 'soltar' });
      }
      return ordenes;
    }
    if (!this.propuestaVisible) ordenes.push(this.senalarPropuesta());
    return ordenes;
  }

  private senalarPropuesta(): OrdenSenalar {
    const p = this.propuesta as PropuestaGuia;
    const camara = this.camaraPropuesta;
    this.camaraPropuesta = false;
    this.propuestaVisible = true;
    return { tipo: 'senalar', obj: p.obj, alterno: p.alterno, texto: p.texto, ms: 0, fija: true, camara, titulo: p.titulo, tono: p.tono, destello: false };
  }

  private iniciarRecorrido(ahoraMs: number, ctx: ContextoGuia, fuentes: FuentesGuia): OrdenOrbe[] {
    const puntos = fuentes.puntos().slice(0, this.cfg.maxPuntos);
    this.senal = null;
    this.propuestaVisible = false;
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
      // Con una propuesta viva, el recorrido termina volviendo a ella.
      if (this.propuesta) ordenes.push(this.senalarPropuesta());
      else ordenes.push(this.hablar(ahoraMs, 'Eso es lo importante por ahora. Te aviso si algo cambia.', 4000));
      return;
    }
    const p = r.puntos[r.i];
    r.i++;
    r.proximoMs = ahoraMs + this.cfg.pasoMs;
    ordenes.push(this.senalarPunto(ahoraMs, p, SENAL_RECORRIDO_MS, `Opttia · ${r.i} de ${r.puntos.length}`, true));
  }

  /**
   * Corta el recorrido (y la señal): abrir una ficha, repetir el día, quitar la escena. Una propuesta
   * viva NO se retira: se deja de señalar y vuelve en el siguiente paso en que se pueda.
   */
  cortar(): OrdenOrbe[] {
    const habia = this.recorrido !== null || this.senal !== null || this.propuestaVisible;
    this.recorrido = null;
    this.senal = null;
    this.propuestaVisible = false;
    return habia ? [{ tipo: 'soltar' }] : [];
  }

  /**
   * Llega un pedido "Con Opttia": el orbe va a donde llega, con un destello. No interrumpe un
   * recorrido ni una señal en curso, ni repite antes de `entregaMs`.
   */
  entrega(ahoraMs: number, destino: { obj: ObjetivoOrbe; alterno: ObjetivoOrbe | null; texto: string }, ctx: ContextoGuia): OrdenOrbe[] {
    if (this.recorrido || this.propuesta || ctx.repitiendo || ahoraMs - this.ultimaEntregaMs < this.cfg.entregaMs) return [];
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
    this.propuestaVisible = false;
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

