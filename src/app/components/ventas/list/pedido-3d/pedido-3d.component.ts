import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input,
  NgZone, OnChanges, OnDestroy, ViewChild,
} from '@angular/core';
import type { AnclaZona } from '../../../../shared/escena-3d/escena-base';
import type { EstadoRecorrido, EtiquetaRecorrido, PedidoRecorridoEscena } from './pedido-recorrido.scene';

/**
 * Recorrido 3D del pedido en el panel de detalle (producción → empaque → despacho → casa).
 * Solo presentación: recibe lo que el panel ya muestra. Si el equipo no tiene WebGL
 * el bloque no aparece y queda la línea de progreso de siempre.
 */
@Component({
  selector: 'app-pedido-3d',
  templateUrl: './pedido-3d.component.html',
  styleUrls: ['./pedido-3d.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pedido3dComponent implements OnChanges, AfterViewInit, OnDestroy {
  /** Resultado de getProgresoCompletados(): 0..4, -1 = rechazado. */
  @Input() completados = 0;
  @Input() estadoProceso: string | null | undefined = null;
  @Input() carrito: Array<{ cantidad?: number | string }> | null | undefined = null;
  @Input() ciudad: string | null | undefined = null;
  @Input() transportador: string | null | undefined = null;
  @Input() urgente = false;

  @ViewChild('stage', { static: true }) private stageRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('actual', { static: true }) private actualRef!: ElementRef<HTMLElement>;
  @ViewChild('destino', { static: true }) private destinoRef!: ElementRef<HTMLElement>;

  /** null = cargando; false = sin WebGL (el bloque se oculta). */
  webglOk: boolean | null = null;

  private escena: PedidoRecorridoEscena | null = null;
  private resizeObs: ResizeObserver | null = null;
  private interObs: IntersectionObserver | null = null;
  private visible = true;
  private destruido = false;

  constructor(private readonly zone: NgZone, private readonly cdr: ChangeDetectorRef) {}

  /** Texto de la etapa en la que va el pedido. */
  get etapa(): string {
    const c = this.completados;
    if (c < 0) return 'Rechazado';
    if (c === 4) return 'Entregado';
    if (c === 3) return this.transportador ? `En camino · ${this.transportador}` : 'En camino';
    if (c === 2) return this.estadoProceso === 'ParaDespachar' ? 'Listo para despachar' : 'Empacado';
    if (c === 1) return 'Producido';
    return this.estadoProceso === 'ProducidoParcialmente' ? 'Producción parcial' : 'En producción';
  }

  get unidades(): number {
    return (this.carrito || []).reduce((s, it) => s + (Number(it?.cantidad) || 0), 0);
  }

  ngOnChanges(): void {
    this.escena?.actualizar(this.estadoEscena());
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => { void this.montar(); });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.resizeObs?.disconnect();
    this.interObs?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilidad);
    this.escena?.destruir();
    this.escena = null;
  }

  private estadoEscena(): EstadoRecorrido {
    const u = this.unidades;
    return {
      completados: this.completados,
      cajas: u <= 1 ? 1 : u <= 3 ? 2 : u <= 6 ? 3 : 4,
      urgente: !!this.urgente,
    };
  }

  private async montar(): Promise<void> {
    if (!this.soportaWebgl()) { this.sinWebgl(); return; }
    try {
      // Carga diferida: three y la escena bajan solo cuando se abre un pedido.
      const [T, rb, mod] = await Promise.all([
        import('three'),
        import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        import('./pedido-recorrido.scene'),
      ]);
      if (this.destruido) return;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const escena = new mod.PedidoRecorridoEscena(T, rb.RoundedBoxGeometry, {
        canvas: this.canvasRef.nativeElement,
        reducirMovimiento: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        calidadBaja: !!window.matchMedia?.('(pointer: coarse)').matches
          || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4,
        onHover: () => undefined,
        onClick: () => undefined,
        onFrame: (a) => this.posicionar(a),
      });
      escena.iniciar();
      this.escena = escena;
      escena.actualizar(this.estadoEscena());

      const stage = this.stageRef.nativeElement;
      this.resizeObs = new ResizeObserver(() => escena.redimensionar(stage.clientWidth, stage.clientHeight));
      this.resizeObs.observe(stage);
      escena.redimensionar(stage.clientWidth, stage.clientHeight);
      this.interObs = new IntersectionObserver((e) => { this.visible = e.some((x) => x.isIntersecting); this.pausa(); });
      this.interObs.observe(stage);
      document.addEventListener('visibilitychange', this.onVisibilidad);
      this.zone.run(() => { this.webglOk = true; this.cdr.markForCheck(); });
    } catch {
      this.escena?.destruir();
      this.escena = null;
      this.sinWebgl();
    }
  }

  private readonly onVisibilidad = (): void => this.pausa();

  private pausa(): void {
    this.escena?.pausar(!this.visible || document.visibilityState === 'hidden');
  }

  private posicionar(anclas: Partial<Record<EtiquetaRecorrido, AnclaZona>>): void {
    const ancho = this.stageRef.nativeElement.clientWidth;
    const act = this.actualRef.nativeElement;
    const des = this.destinoRef.nativeElement;
    // Medir antes de mover; si la ciudad choca con la etapa, gana la etapa.
    const [wa, ha, wd, hd] = [act.offsetWidth, act.offsetHeight, des.offsetWidth, des.offsetHeight];
    const pa = anclas.actual, pd = anclas.destino;
    const ok = (p?: AnclaZona) => !!p && p.x > 8 && p.x < ancho - 8;
    let verDestino = ok(pd);
    if (verDestino && ok(pa)) {
      const ra = [pa!.x - wa / 2, pa!.y - ha - 6, pa!.x + wa / 2, pa!.y];
      const rd = [pd!.x - wd / 2, pd!.y - hd - 6, pd!.x + wd / 2, pd!.y];
      verDestino = !(ra[0] < rd[2] && ra[2] > rd[0] && ra[1] < rd[3] && ra[3] > rd[1]);
    }
    this.mover(act, ok(pa) ? pa : undefined, wa, ha, ancho);
    this.mover(des, verDestino ? pd : undefined, wd, hd, ancho);
  }

  /** Mueve la etiqueta a su ancla sin dejar que se salga del recuadro. */
  private mover(el: HTMLElement, p: AnclaZona | undefined, w: number, h: number, ancho: number): void {
    if (!p) { el.style.opacity = '0'; return; }
    const x = Math.min(ancho - w / 2 - 6, Math.max(w / 2 + 6, p.x));
    const y = Math.max(h + 6, p.y);
    el.style.opacity = '1';
    el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -100%)`;
  }

  private soportaWebgl(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  private sinWebgl(): void {
    this.zone.run(() => { this.webglOk = false; this.cdr.markForCheck(); });
  }
}
