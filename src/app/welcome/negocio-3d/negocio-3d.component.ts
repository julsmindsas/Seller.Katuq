import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input,
  NgZone, OnChanges, OnDestroy, QueryList, ViewChild, ViewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { CotizacionesService } from '../../components/cotizaciones/cotizaciones.service';
import type { AnclaZona, EstadoEscena, FuenteLogo, LogoId, NegocioEscena, Tono, ZonaId } from './negocio-3d.scene';

const LOGO_KATUQ = 'assets/images/logo/Katuq/katuq-logo-solo.png';

// Mismos objetos que ya arma WelcomeComponent (valor null = el endpoint falló → "—").
export interface VentasHoy { cargando: boolean; total: number | null; pedidos: number | null; }
export interface DespachosHoy { cargando: boolean; paraDespacho: number | null; urgentes: number | null; }
export interface StockCritico { cargando: boolean; sinStock: number | null; bajoStock: number | null; sinDatos: number | null; }
export interface CrmTareas { cargando: boolean; vencidas: number | null; paraHoy: number | null; }
export interface ClientesResumen { cargando: boolean; nuevosMes: number | null; enAlerta: number | null; total: number | null; }

interface FilaNegocio {
  clave: string;
  zona: ZonaId;
  icono: string;
  titulo: string;
  valor: string;
  detalle: string;
  tono: Tono;
  estado: string;
  link: string | null;
  cargando: boolean;
  ayuda?: string;
}

interface EtiquetaZona {
  zona: ZonaId;
  icono: string;
  titulo: string;
  valor: string;
  tono: Tono;
  link: string | null;
  cargando: boolean;
}

/**
 * "Tu negocio hoy" como maqueta 3D: la escena muestra el negocio (tienda,
 * bodega, estibas, oficina, clientes) y el panel lateral da las cifras reales.
 * El panel es la versión accesible y la que queda si el equipo no tiene WebGL.
 */
@Component({
  selector: 'app-negocio-3d',
  templateUrl: './negocio-3d.component.html',
  styleUrls: ['./negocio-3d.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Negocio3dComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() empresa: string | null | undefined = null;
  /** imgUrlLogo de la empresa activa; sin logo la placa muestra sus iniciales. */
  @Input() logoComercio: string | null | undefined = null;
  @Input() soloMisMetricas = false;
  @Input() ventasHoyLink: string | null = null;

  @Input() showVentas = false;
  @Input() showDespachos = false;
  @Input() showStock = false;
  @Input() showCrm = false;
  @Input() showClientes = false;

  @Input() ventasHoy!: VentasHoy;
  @Input() despachosHoy!: DespachosHoy;
  @Input() stockCritico!: StockCritico;
  @Input() crmTareas!: CrmTareas;
  @Input() clientesResumen!: ClientesResumen;

  @ViewChild('stage', { static: true }) private stageRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('panel', { static: true }) private panelRef!: ElementRef<HTMLElement>;
  @ViewChildren('etiqueta') private etiquetasRef!: QueryList<ElementRef<HTMLElement>>;

  filas: FilaNegocio[] = [];
  etiquetas: EtiquetaZona[] = [];
  zonaActiva: ZonaId | null = null;
  /** null = todavía cargando la librería; false = sin WebGL (queda solo el panel). */
  webglOk: boolean | null = null;
  readonly fecha = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date());
  hora = '';

  private escena: NegocioEscena | null = null;
  private resizeObs: ResizeObserver | null = null;
  private interObs: IntersectionObserver | null = null;
  private visibleEnPantalla = true;
  /** Borde derecho útil para etiquetas (antes del panel flotante); se recalcula al redimensionar. */
  private limiteX = Number.POSITIVE_INFINITY;
  private destruido = false;
  private readonly moneda = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  private readonly fuentesLogo = new Map<LogoId, FuenteLogo>();
  private logoPedido: string | null | undefined = undefined;
  /** El logo del comercio no cargó en el panel: se muestran iniciales. */
  logoRoto = false;

  constructor(
    private readonly zone: NgZone,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly cotizacionesService: CotizacionesService,
  ) {}

  get iniciales(): string {
    return (this.empresa || 'K').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase();
  }

  ngOnChanges(): void {
    this.construirFilas();
    this.escena?.actualizar(this.estadoEscena());
    if (this.logoComercio !== this.logoPedido) {
      this.logoPedido = this.logoComercio;
      this.logoRoto = false;
      this.cargarLogoComercio(this.logoComercio);
    }
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => { void this.montarEscena(); });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.resizeObs?.disconnect();
    this.interObs?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilidad);
    this.escena?.destruir();
    this.escena = null;
  }

  // ------------------------------------------------------------- acciones

  acercar(): void { this.escena?.acercar(1.2); }
  alejar(): void { this.escena?.acercar(1 / 1.2); }
  girar(grados: number): void { this.escena?.girar(grados); }
  centrar(): void { this.escena?.centrar(); }

  resaltar(zona: ZonaId | null): void {
    this.zonaActiva = zona;
    this.escena?.resaltar(zona);
  }

  trackFila = (_: number, f: FilaNegocio) => f.clave;
  trackEtiqueta = (_: number, e: EtiquetaZona) => e.zona;

  // ---------------------------------------------------------------- escena

  private async montarEscena(): Promise<void> {
    if (!this.soportaWebgl()) { this.marcarSinWebgl(); return; }
    try {
      // Carga diferida: three solo baja cuando el welcome lo necesita.
      const [T, rb, mod] = await Promise.all([
        import('three'),
        import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        import('./negocio-3d.scene'),
      ]);
      if (this.destruido) return;

      const reducir = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const calidadBaja = !!window.matchMedia?.('(pointer: coarse)').matches
        || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;

      const escena = new mod.NegocioEscena(T, rb.RoundedBoxGeometry, {
        canvas: this.canvasRef.nativeElement,
        reducirMovimiento: reducir,
        calidadBaja,
        onHover: (z) => this.zone.run(() => { this.zonaActiva = z; this.cdr.markForCheck(); }),
        onClick: (z) => this.zone.run(() => this.abrir(z)),
        onFrame: (a) => this.posicionarEtiquetas(a),
      });
      escena.iniciar();
      this.escena = escena;
      escena.actualizar(this.estadoEscena());
      this.fuentesLogo.forEach((f, id) => escena.ponerLogo(id, f));
      this.cargarImagen(LOGO_KATUQ, (img) => this.aplicarLogo('katuq', { imagen: img, texto: 'Katuq' }));

      this.resizeObs = new ResizeObserver(() => this.ajustarTamano());
      this.resizeObs.observe(this.stageRef.nativeElement);
      this.ajustarTamano();

      this.interObs = new IntersectionObserver((entries) => {
        this.visibleEnPantalla = entries.some((e) => e.isIntersecting);
        this.actualizarPausa();
      });
      this.interObs.observe(this.stageRef.nativeElement);
      document.addEventListener('visibilitychange', this.onVisibilidad);

      this.zone.run(() => { this.webglOk = true; this.cdr.markForCheck(); });
    } catch {
      this.escena?.destruir();
      this.escena = null;
      this.marcarSinWebgl();
    }
  }

  // ------------------------------------------------------------------ logos

  private aplicarLogo(id: LogoId, fuente: FuenteLogo): void {
    this.fuentesLogo.set(id, fuente);
    this.escena?.ponerLogo(id, fuente);
  }

  /**
   * Una imagen de otro dominio no se puede usar en WebGL sin CORS (y el Storage
   * de los logos no lo tiene), así que se pide por el proxy que ya usa la orden
   * de venta. Si no hay logo o falla, la placa muestra las iniciales.
   */
  private cargarLogoComercio(url: string | null | undefined): void {
    const iniciales: FuenteLogo = { imagen: null, texto: this.empresa || '' };
    this.aplicarLogo('comercio', iniciales);
    if (!url) return;
    let mismoOrigen = url.startsWith('data:');
    try { mismoOrigen = mismoOrigen || new URL(url, window.location.href).origin === window.location.origin; } catch { return; }
    const usar = (src: string) => this.cargarImagen(src, (img) => {
      if (this.logoPedido === url) this.aplicarLogo('comercio', { imagen: img, texto: this.empresa || '' });
    });
    if (mismoOrigen) { usar(url); return; }
    this.cotizacionesService.imageToBase64(url).subscribe({
      next: (r) => { if (r?.success && r.dataUrl) usar(r.dataUrl); },
      error: () => { /* quedan las iniciales */ },
    });
  }

  private cargarImagen(src: string, ok: (img: HTMLImageElement) => void): void {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { if (!this.destruido) ok(img); };
    img.src = src;
  }

  private soportaWebgl(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  private marcarSinWebgl(): void {
    this.zone.run(() => { this.webglOk = false; this.cdr.markForCheck(); });
  }

  private readonly onVisibilidad = (): void => this.actualizarPausa();

  private actualizarPausa(): void {
    this.escena?.pausar(!this.visibleEnPantalla || document.visibilityState === 'hidden');
  }

  /** El panel flota sobre la maqueta solo en pantallas anchas; ahí la escena se corre a la izquierda. */
  private ajustarTamano(): void {
    const stage = this.stageRef.nativeElement;
    const panel = this.panelRef.nativeElement;
    const flotante = getComputedStyle(panel).position === 'absolute';
    const margen = flotante
      ? Math.max(0, stage.getBoundingClientRect().right - panel.getBoundingClientRect().left + 12) : 0;
    this.limiteX = stage.clientWidth - margen;
    this.escena?.redimensionar(stage.clientWidth, stage.clientHeight, margen);
  }

  private posicionarEtiquetas(anclas: Partial<Record<ZonaId, AnclaZona>>): void {
    const alto = this.stageRef.nativeElement.clientHeight;
    const limiteX = this.limiteX;
    this.etiquetasRef?.forEach(({ nativeElement: el }) => {
      const p = anclas[el.dataset['zona'] as ZonaId];
      const dentro = !!p && p.x > 12 && p.x < limiteX - 12 && p.y > 44 && p.y < alto + 8;
      if (!p || !dentro) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; }
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.transform = `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0) translate(-50%, -100%)`;
    });
  }

  abrir(zona: ZonaId): void {
    const link = this.etiquetas.find((e) => e.zona === zona)?.link;
    if (link) void this.router.navigateByUrl(link);
  }

  // ------------------------------------------------------------------ datos

  private estadoEscena(): EstadoEscena {
    const d = this.despachosHoy;
    const s = this.stockCritico;
    const tono = (zona: ZonaId) => this.filas.find((f) => f.zona === zona)?.tono ?? 'accent';
    const escala = (n: number | null | undefined) => (!n ? 0 : n >= 10 ? 2 : 1);
    return {
      zonas: {
        ventas: { visible: this.showVentas, tono: tono('ventas') },
        despachos: { visible: this.showDespachos, tono: tono('despachos') },
        inventario: { visible: this.showStock, tono: tono('inventario') },
        crm: { visible: this.showCrm, tono: tono('crm') },
        clientes: { visible: this.showClientes, tono: 'accent' },
      },
      camionesEnMuelle: this.showDespachos ? Math.min(3, d?.paraDespacho ?? 0) : 1,
      urgentes: this.showDespachos && (d?.urgentes ?? 0) > 0,
      estibasVacias: this.showStock ? escala(s?.sinStock) : 0,
      estibasBajas: this.showStock ? escala(s?.bajoStock) : 0,
    };
  }

  private construirFilas(): void {
    const filas: FilaNegocio[] = [];
    const etiquetas: EtiquetaZona[] = [];
    const mis = this.soloMisMetricas;

    if (this.showVentas && this.ventasHoy) {
      const v = this.ventasHoy;
      const valor = v.total !== null ? `$${this.moneda.format(v.total)}` : '—';
      filas.push({
        clave: 'ventas', zona: 'ventas', icono: 'pi pi-shopping-bag',
        titulo: mis ? 'Mis ventas de hoy' : 'Ventas de hoy', valor,
        detalle: v.pedidos !== null ? `${v.pedidos} ${v.pedidos === 1 ? 'pedido' : 'pedidos'}` : 'Ver analíticas',
        tono: 'accent', estado: v.pedidos ? 'Vendiendo' : 'Sin ventas aún', link: this.ventasHoyLink, cargando: v.cargando,
      });
      etiquetas.push({ zona: 'ventas', icono: 'pi pi-shopping-bag', titulo: 'Ventas hoy',
        valor: v.total !== null ? this.compacto(v.total) : '—', tono: 'accent', link: this.ventasHoyLink, cargando: v.cargando });
    }

    if (this.showDespachos && this.despachosHoy) {
      const d = this.despachosHoy;
      const tono: Tono = (d.urgentes ?? 0) > 0 ? 'warning' : (d.paraDespacho ?? 0) > 0 ? 'accent' : 'success';
      filas.push({
        clave: 'despachos', zona: 'despachos', icono: 'pi pi-truck',
        titulo: mis ? 'Mis pedidos por despachar' : 'Por despachar',
        valor: d.paraDespacho !== null ? String(d.paraDespacho) : '—',
        detalle: d.urgentes !== null ? `${d.urgentes} con entrega hoy o vencida` : 'Cola completa de despachos',
        tono, estado: tono === 'warning' ? 'Urgentes' : tono === 'success' ? 'Al día' : 'En cola',
        link: '/despachos', cargando: d.cargando,
      });
      etiquetas.push({ zona: 'despachos', icono: 'pi pi-truck', titulo: 'Por despachar',
        valor: d.paraDespacho !== null ? String(d.paraDespacho) : '—', tono, link: '/despachos', cargando: d.cargando });
    }

    if (this.showStock && this.stockCritico) {
      const s = this.stockCritico;
      const tono: Tono = (s.sinStock ?? 0) > 0 ? 'danger' : (s.bajoStock ?? 0) > 0 ? 'warning' : 'success';
      const detalle = (s.bajoStock !== null ? `${s.bajoStock} en bajo stock` : 'Inventario')
        + (s.sinDatos ? ` · ${s.sinDatos} sin datos` : '');
      filas.push({
        clave: 'stock', zona: 'inventario', icono: 'pi pi-box', titulo: 'Sin stock',
        valor: s.sinStock !== null ? String(s.sinStock) : '—', detalle,
        tono, estado: tono === 'danger' ? 'Reponer' : tono === 'warning' ? 'Revisar' : 'Al día',
        link: '/inventario/inventario-catalogo', cargando: s.cargando,
      });
      etiquetas.push({ zona: 'inventario', icono: 'pi pi-box', titulo: 'Sin stock',
        valor: s.sinStock !== null ? String(s.sinStock) : '—', tono, link: '/inventario/inventario-catalogo', cargando: s.cargando });
    }

    if (this.showCrm && this.crmTareas) {
      const c = this.crmTareas;
      const tono: Tono = (c.vencidas ?? 0) > 0 ? 'danger' : (c.paraHoy ?? 0) > 0 ? 'warning' : 'success';
      filas.push({
        clave: 'crm', zona: 'crm', icono: 'pi pi-comments',
        titulo: mis ? 'Mis tareas CRM vencidas' : 'Tareas CRM vencidas',
        valor: c.vencidas !== null ? String(c.vencidas) : '—',
        detalle: c.paraHoy ? `${c.paraHoy} para hoy` : 'Seguimiento comercial',
        tono, estado: tono === 'danger' ? 'Atrasadas' : tono === 'warning' ? 'Para hoy' : 'Al día',
        link: '/crm/list', cargando: c.cargando,
      });
      etiquetas.push({ zona: 'crm', icono: 'pi pi-comments', titulo: 'Tareas vencidas',
        valor: c.vencidas !== null ? String(c.vencidas) : '—', tono, link: '/crm/list', cargando: c.cargando });
    }

    if (this.showClientes && this.clientesResumen) {
      const k = this.clientesResumen;
      filas.push({
        clave: 'clientes-nuevos', zona: 'clientes', icono: 'pi pi-users', titulo: 'Primera compra reciente',
        valor: k.nuevosMes !== null ? String(k.nuevosMes) : '—', detalle: '30 días · historial de 12 meses',
        tono: 'success', estado: 'Nuevos', link: '/ventas/clienteslista', cargando: k.cargando,
        ayuda: 'Primera compra observada en los últimos 30 días dentro del historial de 12 meses. No representa altas de clientes.',
      });
      filas.push({
        clave: 'clientes-recompra', zona: 'clientes', icono: 'pi pi-replay', titulo: 'Recompra estimada',
        valor: k.enAlerta !== null ? String(k.enAlerta) : '—', detalle: 'según frecuencia histórica · no son tareas',
        tono: 'warning', estado: 'Por volver', link: '/ventas/clienteslista', cargando: k.cargando,
      });
      etiquetas.push({ zona: 'clientes', icono: 'pi pi-users', titulo: 'Primera compra',
        valor: k.nuevosMes !== null ? String(k.nuevosMes) : '—', tono: 'accent', link: '/ventas/clienteslista', cargando: k.cargando });
    }

    this.filas = filas;
    this.etiquetas = etiquetas;
    if (filas.some((f) => !f.cargando)) {
      this.hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(new Date());
    }
  }

  /** $1,2 M · $850 mil — para la etiqueta corta sobre la maqueta. */
  private compacto(v: number): string {
    const a = Math.abs(v);
    if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1).replace('.', ',').replace(',0', '')} M`;
    if (a >= 1_000) return `$${Math.round(v / 1_000)} mil`;
    return `$${this.moneda.format(v)}`;
  }
}
