import type * as ThreeNS from 'three';
import type { AnclaZona } from '../../../shared/escena-3d/escena-base';

/**
 * Etiquetas HTML ancladas a puntos 3D de una escena (conteos de estación, tarjeta de pedido
 * nuevo, nombre del vehículo). Viven FUERA de Angular: la escena las crea y las mueve en cada
 * cuadro con `transform`, sin tocar la detección de cambios. El contenedor debe ser
 * `position: absolute; inset: 0; pointer-events: none`.
 *
 * Todo texto que viene de un pedido pasa por `esc()` antes de entrar al HTML.
 */

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

export interface OpcionesEtiqueta {
  /** Clase de forma: `eve-lbl--st`, `eve-lbl--pop`, `eve-lbl--veh`, `eve-lbl--mini`, `eve-lbl--hover`. */
  clase: string;
  html: string;
  /** Punto del mundo (se evalúa en cada cuadro); null = no se ve ahora. */
  pos: () => ThreeNS.Vector3 | null;
  /** Vida en ms; 0 = fija hasta que se quite. */
  ms?: number;
  /** Tono semántico (`accent`, `ok`...): pone la clase `t-<tono>`. */
  tono?: string;
}

export interface EtiquetaH {
  readonly id: string;
  readonly el: HTMLElement;
  readonly interior: HTMLElement;
  pos: () => ThreeNS.Vector3 | null;
  /** performance.now() en que vence; 0 = fija. */
  hasta: number;
  /** Corrimiento vertical (px) para no encimar tarjetas que salen casi juntas. */
  dy: number;
  html: string;
}

export class GestorEtiquetas {
  private readonly lista = new Map<string, EtiquetaH>();
  private contador = 0;

  constructor(private readonly contenedor: HTMLElement, private reducido: boolean) {}

  fijarReducido(reducido: boolean): void {
    this.reducido = reducido;
  }

  get cantidad(): number {
    return this.lista.size;
  }

  /** Cuántas tarjetas pasajeras (`eve-lbl--pop`) hay vivas. */
  get popsVivos(): number {
    let n = 0;
    this.lista.forEach((e) => { if (e.hasta && e.el.classList.contains('eve-lbl--pop')) n++; });
    return n;
  }

  crear(o: OpcionesEtiqueta): EtiquetaH {
    const el = document.createElement('div');
    el.className = `eve-lbl ${o.clase}${o.tono ? ' t-' + o.tono : ''}${o.ms ? '' : ' is-fixed'}`;
    const interior = document.createElement('div');
    interior.className = 'eve-lbl__in';
    interior.innerHTML = o.html;
    el.appendChild(interior);
    el.style.visibility = 'hidden';
    this.contenedor.appendChild(el);
    const id = `l${++this.contador}`;
    const dy = o.ms && o.clase.includes('eve-lbl--pop') ? Math.min(2, this.popsVivos) * 16 : 0;
    const e: EtiquetaH = { id, el, interior, pos: o.pos, hasta: o.ms ? performance.now() + o.ms : 0, dy, html: o.html };
    this.lista.set(id, e);
    if (o.ms) requestAnimationFrame(() => el.classList.add('is-in'));
    return e;
  }

  /** Cambia el contenido solo si cambió (no repinta el DOM en cada cuadro). */
  actualizarHtml(e: EtiquetaH, html: string): void {
    if (e.html === html) return;
    e.html = html;
    e.interior.innerHTML = html;
  }

  quitar(e: EtiquetaH | null | undefined): void {
    if (!e || !this.lista.has(e.id)) return;
    this.lista.delete(e.id);
    e.el.classList.remove('is-in');
    e.el.classList.add('is-out');
    if (this.reducido) { e.el.remove(); return; }
    setTimeout(() => e.el.remove(), 320);
  }

  /** Quita las pasajeras (tarjetas y avisos con vida limitada); las fijas se quedan. */
  quitarPasajeras(): void {
    this.lista.forEach((e) => { if (e.hasta) { this.lista.delete(e.id); e.el.remove(); } });
  }

  /** Quita las que ya vencieron. Devuelve true si quitó alguna (hay que repintar). */
  expirar(ahora: number): boolean {
    let quito = false;
    this.lista.forEach((e) => {
      if (e.hasta && ahora > e.hasta) { this.quitar(e); quito = true; }
    });
    return quito;
  }

  /** Los puntos del mundo de las etiquetas visibles (para que la base los proyecte a píxeles). */
  *anclas(): Iterable<[string, ThreeNS.Vector3]> {
    for (const e of this.lista.values()) {
      const p = e.pos();
      if (p) yield [e.id, p];
    }
  }

  posicionar(a: Partial<Record<string, AnclaZona>>, ancho: number, alto: number): void {
    this.lista.forEach((e) => {
      const z = a[e.id];
      if (!z) { e.el.style.visibility = 'hidden'; return; }
      const x = z.x;
      const y = z.y - e.dy;
      const visible = x > 8 && x < ancho - 8 && y > 40 && y < alto - 24;
      e.el.style.visibility = visible ? 'visible' : 'hidden';
      if (visible) e.el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -100%)`;
    });
  }

  limpiar(): void {
    this.lista.forEach((e) => e.el.remove());
    this.lista.clear();
  }
}
