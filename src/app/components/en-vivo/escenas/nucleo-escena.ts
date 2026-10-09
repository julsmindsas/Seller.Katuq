import type * as ThreeNS from 'three';
import type { AnclaZona, Three } from '../../../shared/escena-3d/escena-base';
import { EtapaId, EtapaInfo, tonoCss } from '../servicios/en-vivo.modelos';
import { IconoId, trazosDe } from '../utilidades/iconos';
import { ETAPAS_POR_DEFECTO } from '../utilidades/tonos';
import { EfectosEscena } from './efectos-escena';
import { Tokens } from './escena-tokens';
import { EtiquetaH, GestorEtiquetas, esc } from './etiquetas-html';
import { KitEscena } from './kit-escena';
import { AccionesCamara, CamaraAutomatica, DetectorRafaga } from './pais.utilidades';
import { Tweens } from './tweens';

type V3 = ThreeNS.Vector3;

/** Icono de línea del tablero como SVG para una etiqueta de la escena (clase eve-ico). */
export function svgEscena(id: IconoId): string {
  const trazos = trazosDe(id).map((d) => '<path d="' + d + '"/>').join('');
  return '<svg class="eve-ico" viewBox="0 0 24 24" aria-hidden="true">' + trazos + '</svg>';
}

/** Cuántas tarjetas pasajeras puede haber a la vez en las escenas de mapa y ciudad (la spec dice a lo sumo 3). */
export const MAX_TARJETAS = 3;

export interface OpcionesNucleo {
  etiquetas: HTMLElement;
  reducirMovimiento: boolean;
  tokens: () => Tokens;
}

/**
 * Lo que comparten las tres escenas nuevas (mapa del comercio, país de Katuq, ciudad de Katuq):
 * tweens, etiquetas HTML, kit de materiales con tokens, efectos, tonos de etapa, privacidad,
 * detector de ráfagas y cámara automática. La escena lo crea en el constructor y lo arma en
 * `construir()`, cuando ya existe three. No guarda pedidos: eso es de cada escena.
 */
export class NucleoEscena {
  readonly tw: Tweens;
  readonly etq: GestorEtiquetas;
  readonly rafaga = new DetectorRafaga();
  readonly camara: CamaraAutomatica;
  kit!: KitEscena;
  fx!: EfectosEscena;
  privado = false;
  reducir: boolean;
  private etapas = new Map<EtapaId, EtapaInfo>(ETAPAS_POR_DEFECTO.map((e) => [e.id, e]));
  private etqHover: EtiquetaH | null = null;
  private readonly fijas = new Map<string, { e: EtiquetaH; prioridad: number; ancho: number; alto: number; html: string }>();

  constructor(private readonly cfg: OpcionesNucleo, camara: AccionesCamara) {
    this.reducir = cfg.reducirMovimiento;
    this.tw = new Tweens(cfg.reducirMovimiento);
    this.etq = new GestorEtiquetas(cfg.etiquetas, cfg.reducirMovimiento);
    this.camara = new CamaraAutomatica(camara);
  }

  /** Se llama desde `construir()` de la escena. */
  armar(
    T: Three,
    geoCache: Map<string, ThreeNS.BufferGeometry>,
    escena: ThreeNS.Object3D,
    registrarTextura: <Tx extends ThreeNS.Texture>(tex: Tx) => Tx,
  ): void {
    this.kit = new KitEscena(T, geoCache, this.cfg.tokens, registrarTextura);
    this.fx = new EfectosEscena(T, this.kit, this.tw, geoCache, escena);
  }

  get tokens(): Tokens {
    return this.kit.tokens;
  }

  // ---------------------------------------------------------------- opciones

  fijarReducirMovimiento(reducir: boolean): void {
    this.reducir = reducir;
    this.tw.fijarCorto(reducir);
    this.etq.fijarReducido(reducir);
  }

  /** Etapas con su tono, tal como las manda el servidor (los pulsos de cambio de etapa usan el tono de la etapa nueva). */
  fijarEtapas(etapas: ReadonlyArray<EtapaInfo>): void {
    for (const e of etapas) this.etapas.set(e.id, e);
  }

  /** Token de color de una etapa (`info`, `warn`...). */
  tonoDeEtapa(id: string | null | undefined): string {
    return tonoCss(this.etapas.get(id as EtapaId)?.tono);
  }

  // --------------------------------------------------------------- tarjetas

  /**
   * Tarjeta pasajera sobre un punto (3.4 s). A lo sumo `MAX_TARJETAS` a la vez: con más, no se crea
   * (el pulso sí sale). Devuelve true si se creó.
   */
  tarjeta(pos: () => V3 | null, tono: string, pill: string, cuerpo: string, ms = 3400): boolean {
    if (this.etq.popsVivos >= MAX_TARJETAS) return false;
    this.etq.crear({ clase: 'eve-lbl--pop', tono, html: `<span class="eve-pill">${esc(pill)}</span>${cuerpo}`, pos, ms });
    return true;
  }

  /**
   * Etiqueta pequeña que no se va (nombre fijo de una ciudad o de un comercio líder). Con `prioridad`
   * más alta gana el lugar si dos nombres se encimarían en pantalla: el otro se esconde (y aparece al
   * pasar el puntero por su ciudad o comercio).
   */
  fija(html: string, pos: () => V3 | null, prioridad = 0, tono?: string): EtiquetaH {
    const e = this.etq.crear({ clase: 'eve-lbl--mini', html, pos, tono });
    this.fijas.set(e.id, { e, prioridad, ancho: 0, alto: 0, html: '' });
    return e;
  }

  /** Cambia la prioridad de una etiqueta fija (p. ej. cuando su comercio pasa a vender más). */
  prioridadDe(e: EtiquetaH, prioridad: number): void {
    const f = this.fijas.get(e.id);
    if (f) f.prioridad = prioridad;
  }

  /** Quita una etiqueta fija. */
  quitarFija(e: EtiquetaH | null | undefined): void {
    if (!e) return;
    this.fijas.delete(e.id);
    this.etq.quitar(e);
  }

  /**
   * Coloca las etiquetas en pantalla y esconde los nombres fijos que se encimarían con otro de más
   * prioridad (ciudades vecinas en un mapa pequeño). `a` son los puntos ya proyectados a píxeles.
   */
  posicionar(a: Partial<Record<string, AnclaZona>>, ancho: number, alto: number): void {
    this.etq.posicionar(a, ancho, alto);
    if (this.fijas.size < 2) return;
    const orden = [...this.fijas.values()].sort((x, y) => y.prioridad - x.prioridad);
    const ocupados: Array<{ l: number; r: number; t: number; b: number }> = [];
    for (const f of orden) {
      const z = a[f.e.id];
      if (!z || f.e.el.style.visibility === 'hidden') continue;
      if (f.html !== f.e.html) {
        f.html = f.e.html;
        f.ancho = f.e.interior.offsetWidth;
        f.alto = f.e.interior.offsetHeight;
      }
      const caja = { l: z.x - f.ancho / 2 - 2, r: z.x + f.ancho / 2 + 2, t: z.y - f.e.dy - f.alto - 2, b: z.y - f.e.dy + 2 };
      if (ocupados.some((o) => caja.l < o.r && o.l < caja.r && caja.t < o.b && o.t < caja.b)) f.e.el.style.visibility = 'hidden';
      else ocupados.push(caja);
    }
  }

  /** Muestra (o cambia) la tarjeta oscura del puntero; `null` la quita. */
  hover(html: string | null, pos?: () => V3 | null): void {
    if (this.etqHover) { this.etq.quitar(this.etqHover); this.etqHover = null; }
    if (html && pos) this.etqHover = this.etq.crear({ clase: 'eve-lbl--hover', html, pos });
  }

  // ------------------------------------------------------------------ ciclo

  /** Cuadro común: tweens y efectos por cuadro. Devuelve true si había algo en marcha. */
  paso(dt: number): boolean {
    const a = this.tw.paso(dt);
    const b = this.fx.paso(dt);
    return a || b;
  }

  /** Quita todo lo animado (reiniciar la escena): tweens, efectos y tarjetas pasajeras. */
  limpiar(): void {
    this.tw.limpiar();
    this.fx.limpiar();
    this.etq.quitarPasajeras();
    this.hover(null);
    this.rafaga.limpiar();
  }

  destruir(): void {
    this.tw.limpiar();
    this.fx?.limpiar();
    this.etq.limpiar();
  }
}
