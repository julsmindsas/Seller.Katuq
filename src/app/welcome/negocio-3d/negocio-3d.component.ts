import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input,
  NgZone, OnChanges, OnDestroy, OnInit, QueryList, ViewChild, ViewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { CotizacionesService } from '../../components/cotizaciones/cotizaciones.service';
import { CiudadMapa, MapaPedidosResponse, MapaPedidosService } from '../../shared/services/dashboard/mapa-pedidos.service';
import type { AnclaZona } from '../escena-3d/escena-base';
import type { EstadoEscena, FuenteLogo, LogoId, NegocioEscena, Tono, ZonaId } from './negocio-3d.scene';
import type { GeoColombia, MapaColombiaEscena } from './mapa-colombia.scene';
import { RAMPA_MAPA } from './mapa-rampa';

const LOGO_KATUQ = 'assets/images/logo/Katuq/katuq-logo-solo.png';
const GEO_COLOMBIA = 'assets/geo/colombia.json';
const DIAS_MAPA = 90;
const CLAVE_VISTA = 'kq3d.vista';

export type Vista = 'negocio' | 'mapa';

// El contorno del país es estático: se baja una vez por sesión de la página.
let geoColombia: Promise<GeoColombia> | null = null;
function cargarGeoColombia(): Promise<GeoColombia> {
  if (!geoColombia) {
    geoColombia = fetch(GEO_COLOMBIA).then((r) => {
      if (!r.ok) throw new Error('mapa');
      return r.json() as Promise<GeoColombia>;
    }).catch((e) => { geoColombia = null; throw e; });
  }
  return geoColombia;
}

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
  /** zona de la maqueta, o `c:<DANE>` / `d:<ISO>` en el mapa */
  id: string;
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
export class Negocio3dComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
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
  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('panel', { static: true }) private panelRef!: ElementRef<HTMLElement>;
  @ViewChildren('etiqueta') private etiquetasRef!: QueryList<ElementRef<HTMLElement>>;

  filas: FilaNegocio[] = [];
  etiquetas: EtiquetaZona[] = [];
  zonaActiva: ZonaId | null = null;

  /** Vista del bloque: la maqueta del negocio o el mapa del país. */
  vista: Vista = 'negocio';
  /** El canvas se rehace al cambiar de vista (un contexto WebGL liberado no se reusa). */
  vistasCanvas: Vista[] = ['negocio'];
  readonly rampa = RAMPA_MAPA;
  readonly diasMapa = DIAS_MAPA;
  mapa: { cargando: boolean; error: boolean; datos: MapaPedidosResponse | null } = { cargando: false, error: false, datos: null };
  ciudadesTop: Array<CiudadMapa & { parte: number }> = [];
  etiquetasMapa: EtiquetaZona[] = [];
  mapaActivo: string | null = null;
  private geo: GeoColombia | null = null;
  /** Ubicación del navegador para el "estás aquí". Solo en memoria: no se envía ni se guarda. */
  ubicacion: { estado: 'nada' | 'buscando' | 'lista' | 'fuera' | 'error'; depto?: string } = { estado: 'nada' };
  private coordenadas: { lon: number; lat: number } | null = null;
  /** null = todavía cargando la librería; false = sin WebGL (queda solo el panel). */
  webglOk: boolean | null = null;
  readonly fecha = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date());
  hora = '';

  private escena: NegocioEscena | MapaColombiaEscena | null = null;
  private libs: {
    T: typeof import('three');
    rb: typeof import('three/examples/jsm/geometries/RoundedBoxGeometry.js');
  } | null = null;
  private observando = false;
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
    private readonly mapaPedidosService: MapaPedidosService,
  ) {}

  /** El mapa muestra cifras de ventas de la empresa: mismo permiso que "Ventas de hoy". */
  get puedeVerMapa(): boolean {
    return this.showVentas;
  }

  get etiquetasVista(): EtiquetaZona[] {
    return this.vista === 'mapa' ? this.etiquetasMapa : this.etiquetas;
  }

  get porcentajeUbicado(): number {
    const d = this.mapa.datos;
    return d && d.totalPedidos ? Math.round((d.conCiudad / d.totalPedidos) * 100) : 0;
  }

  get iniciales(): string {
    return (this.empresa || 'K').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase();
  }

  ngOnChanges(): void {
    this.construirFilas();
    this.negocio()?.actualizar(this.estadoEscena());
    if (this.logoComercio !== this.logoPedido) {
      this.logoPedido = this.logoComercio;
      this.logoRoto = false;
      this.cargarLogoComercio(this.logoComercio);
    }
  }

  ngOnInit(): void {
    // Cada quien vuelve a la vista que dejó (preferencia del navegador, no del comercio).
    let guardada: string | null = null;
    try { guardada = localStorage.getItem(CLAVE_VISTA); } catch { /* sin almacenamiento */ }
    if (guardada === 'mapa' && this.puedeVerMapa) {
      this.vista = 'mapa';
      this.vistasCanvas = ['mapa'];
      this.cargarDatosMapa();
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
    this.negocio()?.resaltar(zona);
  }

  resaltarMapa(id: string | null): void {
    this.mapaActivo = id;
    this.mapaEscena()?.resaltar(id);
    this.actualizarTooltipMapa(id);
  }

  cambiarVista(vista: Vista): void {
    if (vista === this.vista || (vista === 'mapa' && !this.puedeVerMapa)) return;
    try { localStorage.setItem(CLAVE_VISTA, vista); } catch { /* sin almacenamiento */ }
    this.escena?.destruir();
    this.escena = null;
    this.vista = vista;
    this.vistasCanvas = [vista];
    this.zonaActiva = null;
    this.mapaActivo = null;
    this.etiquetasMapa = this.etiquetasMapa.filter((e) => !e.id.startsWith('d:'));
    this.cdr.detectChanges(); // canvas nuevo en el DOM antes de montar
    if (vista === 'mapa' && !this.mapa.datos && !this.mapa.cargando) this.cargarDatosMapa();
    if (this.webglOk !== false) this.zone.runOutsideAngular(() => { void this.montarEscena(); });
  }

  hoverEtiqueta(id: string | null): void {
    if (this.vista === 'negocio') this.resaltar(id as ZonaId | null);
    else this.resaltarMapa(id);
  }

  /** 12.345 (separador de miles colombiano). */
  fmt(n: number | null | undefined): string {
    return this.moneda.format(n ?? 0);
  }

  reintentarMapa(): void {
    this.cargarDatosMapa();
  }

  trackFila = (_: number, f: FilaNegocio) => f.clave;
  trackEtiqueta = (_: number, e: EtiquetaZona) => e.id;
  trackCiudad = (_: number, c: CiudadMapa) => c.dane;

  // ---------------------------------------------------------------- escena

  private negocio(): NegocioEscena | null {
    return this.vista === 'negocio' ? this.escena as NegocioEscena | null : null;
  }

  private mapaEscena(): MapaColombiaEscena | null {
    return this.vista === 'mapa' ? this.escena as MapaColombiaEscena | null : null;
  }

  private async montarEscena(): Promise<void> {
    if (!this.soportaWebgl()) { this.marcarSinWebgl(); return; }
    const vista = this.vista;
    try {
      // Carga diferida: three y cada escena solo bajan cuando se ven.
      if (!this.libs) {
        const [T, rb] = await Promise.all([
          import('three'),
          import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        ]);
        this.libs = { T, rb };
      }
      const { T, rb } = this.libs;
      const canvas = this.canvasRef?.nativeElement;
      if (this.destruido || vista !== this.vista || !canvas) return;

      const reducir = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const calidadBaja = !!window.matchMedia?.('(pointer: coarse)').matches
        || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;
      const base = { canvas, reducirMovimiento: reducir, calidadBaja, onFrame: (a: Partial<Record<string, AnclaZona>>) => this.posicionarEtiquetas(a) };

      if (vista === 'negocio') {
        const mod = await import('./negocio-3d.scene');
        if (this.destruido || vista !== this.vista) return;
        const escena = new mod.NegocioEscena(T, rb.RoundedBoxGeometry, {
          ...base,
          onHover: (z) => this.zone.run(() => { this.zonaActiva = z; this.cdr.markForCheck(); }),
          onClick: (z) => this.zone.run(() => this.abrir(z)),
        });
        escena.iniciar();
        this.escena = escena;
        escena.actualizar(this.estadoEscena());
        this.fuentesLogo.forEach((f, id) => escena.ponerLogo(id, f));
        if (!this.fuentesLogo.has('katuq')) {
          this.cargarImagen(LOGO_KATUQ, (img) => this.aplicarLogo('katuq', { imagen: img, texto: 'Katuq' }));
        }
      } else {
        const [mod, geo] = await Promise.all([import('./mapa-colombia.scene'), cargarGeoColombia()]);
        if (this.destruido || vista !== this.vista) return;
        this.geo = geo;
        const escena = new mod.MapaColombiaEscena(T, rb.RoundedBoxGeometry, {
          ...base,
          onHover: (id) => this.zone.run(() => { this.mapaActivo = id; this.actualizarTooltipMapa(id); this.cdr.markForCheck(); }),
          onClick: (id) => this.zone.run(() => this.resaltarMapa(this.mapaActivo === id ? null : id)),
        }, geo);
        escena.iniciar();
        this.escena = escena;
        if (this.mapa.datos) {
          escena.ponerDatos(this.mapa.datos);
          this.zone.run(() => { this.construirMapa(); this.cdr.markForCheck(); });
        }
        if (this.coordenadas) this.zone.run(() => this.aplicarUbicacion());
        else void this.ubicarSiHayPermiso();
      }

      this.observar();
      this.ajustarTamano();
      this.actualizarPausa();
      this.zone.run(() => { this.webglOk = true; this.cdr.markForCheck(); });
    } catch {
      this.escena?.destruir();
      this.escena = null;
      if (vista === 'mapa' && this.webglOk) {
        // WebGL sí funciona: falló el contorno del mapa. Queda el listado de ciudades.
        this.zone.run(() => { this.mapa = { ...this.mapa, error: !this.mapa.datos }; this.cdr.markForCheck(); });
        return;
      }
      this.marcarSinWebgl();
    }
  }

  private observar(): void {
    if (this.observando) return;
    this.observando = true;
    this.resizeObs = new ResizeObserver(() => this.ajustarTamano());
    this.resizeObs.observe(this.stageRef.nativeElement);
    this.interObs = new IntersectionObserver((entries) => {
      this.visibleEnPantalla = entries.some((e) => e.isIntersecting);
      this.actualizarPausa();
    });
    this.interObs.observe(this.stageRef.nativeElement);
    document.addEventListener('visibilitychange', this.onVisibilidad);
  }

  // ------------------------------------------------------------------ mapa

  /** Botón "Mi ubicación": aquí sí se pide el permiso del navegador. */
  pedirUbicacion(): void {
    if (!('geolocation' in navigator)) { this.ubicacion = { estado: 'error' }; return; }
    this.ubicacion = { estado: 'buscando' };
    navigator.geolocation.getCurrentPosition(
      (pos) => this.zone.run(() => {
        this.coordenadas = { lon: pos.coords.longitude, lat: pos.coords.latitude };
        this.aplicarUbicacion();
        this.cdr.markForCheck();
      }),
      () => this.zone.run(() => { this.ubicacion = { estado: 'error' }; this.cdr.markForCheck(); }),
      // Precisión baja basta a escala de país y gasta menos batería.
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  /** Si el permiso ya estaba dado, el punto aparece solo; si no, no se pregunta al abrir. */
  private async ubicarSiHayPermiso(): Promise<void> {
    try {
      const estado = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
      if (estado?.state === 'granted') this.zone.run(() => this.pedirUbicacion());
    } catch { /* navegador sin Permissions API: queda el botón */ }
  }

  private aplicarUbicacion(): void {
    const escena = this.mapaEscena();
    if (!escena || !this.coordenadas) return;
    const depto = escena.ponerUbicacion(this.coordenadas.lon, this.coordenadas.lat);
    this.ubicacion = depto ? { estado: 'lista', depto: depto.nombre } : { estado: 'fuera' };
    this.etiquetasMapa = [
      ...this.etiquetasMapa.filter((e) => e.id !== 'yo'),
      ...(depto ? [{ id: 'yo', icono: 'pi pi-user', titulo: 'Estás aquí', valor: depto.nombre, tono: 'accent' as Tono, link: null, cargando: false }] : []),
    ];
  }

  private cargarDatosMapa(): void {
    this.mapa = { cargando: true, error: false, datos: this.mapa.datos };
    this.cdr.markForCheck();
    this.mapaPedidosService.getMapaPedidos(DIAS_MAPA).subscribe({
      next: (datos) => {
        this.mapa = { cargando: false, error: false, datos };
        this.mapaEscena()?.ponerDatos(datos);
        this.construirMapa();
        this.cdr.markForCheck();
      },
      error: () => {
        this.mapa = { cargando: false, error: true, datos: null };
        this.cdr.markForCheck();
      },
    });
  }

  /** Lista del panel y etiquetas de las ciudades con más pedidos. */
  private construirMapa(): void {
    const d = this.mapa.datos;
    if (!d) { this.ciudadesTop = []; this.etiquetasMapa = []; return; }
    const total = Math.max(1, d.conCiudad);
    this.ciudadesTop = d.ciudades.slice(0, 8).map((c) => ({ ...c, parte: Math.round((c.pedidos / total) * 1000) / 10 }));
    const conCoord = this.geo ? d.ciudades.filter((c) => this.geo!.ciudades[c.dane]) : [];
    const yo = this.etiquetasMapa.filter((e) => e.id === 'yo');
    this.etiquetasMapa = [...yo, ...conCoord.slice(0, 5).map((c) => ({
      id: `c:${c.dane}`, icono: 'pi pi-map-marker', titulo: c.nombre,
      valor: `${this.moneda.format(c.pedidos)} ${c.pedidos === 1 ? 'pedido' : 'pedidos'}`,
      tono: 'accent' as Tono, link: null, cargando: false,
    }))];
    this.actualizarTooltipMapa(this.mapaActivo);
  }

  /** Al pasar por un departamento aparece su etiqueta con los pedidos. */
  private actualizarTooltipMapa(id: string | null): void {
    const fijas = this.etiquetasMapa.filter((e) => !e.id.startsWith('d:'));
    if (!id || !id.startsWith('d:') || !this.geo) { this.etiquetasMapa = fijas; return; }
    const iso = id.slice(2);
    const depto = this.geo.departamentos.find((x) => x.iso === iso);
    const dato = this.mapa.datos?.departamentos.find((x) => x.iso === iso);
    const n = dato?.pedidos ?? 0;
    this.etiquetasMapa = [...fijas, {
      id, icono: 'pi pi-map', titulo: depto?.nombre || iso,
      valor: n ? `${this.moneda.format(n)} ${n === 1 ? 'pedido' : 'pedidos'}` : 'Sin pedidos',
      tono: n ? 'accent' : 'success', link: null, cargando: false,
    }];
  }

  // ------------------------------------------------------------------ logos

  private aplicarLogo(id: LogoId, fuente: FuenteLogo): void {
    this.fuentesLogo.set(id, fuente);
    this.negocio()?.ponerLogo(id, fuente);
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

  private posicionarEtiquetas(anclas: Partial<Record<string, AnclaZona>>): void {
    const alto = this.stageRef.nativeElement.clientHeight;
    const limiteX = this.limiteX;
    const ocupadas: Array<[number, number, number, number]> = [];
    const els = this.etiquetasRef?.map((r) => r.nativeElement) ?? [];
    // La etiqueta del puntero (departamento) va primero: nunca la tapa otra.
    const prioridad = (el: HTMLElement) => {
      const id = el.dataset['id'] || '';
      return id.startsWith('d:') ? 2 : id === 'yo' ? 1 : 0;
    };
    els.sort((a, b) => prioridad(b) - prioridad(a));
    // Primero se mide todo y después se mueve (leer y escribir intercalado fuerza recálculos).
    const medidas = els.map((el) => [el.offsetWidth, el.offsetHeight + 10] as const);
    els.forEach((el, i) => {
      const p = anclas[el.dataset['id'] || ''];
      let visible = !!p && p.x > 12 && p.x < limiteX - 12 && p.y > 44 && p.y < alto + 8;
      // "Estás aquí" cuelga debajo de su punto; las demás van encima de su ancla.
      const abajo = el.dataset['id'] === 'yo';
      if (p && visible) {
        // Si se monta con una de mayor rango (las primeras de la lista), se esconde.
        const [w, h] = medidas[i];
        const r: [number, number, number, number] = abajo
          ? [p.x - w / 2, p.y + 4, p.x + w / 2, p.y + h + 4]
          : [p.x - w / 2, p.y - h, p.x + w / 2, p.y];
        visible = !ocupadas.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]);
        if (visible) ocupadas.push(r);
      }
      if (!p || !visible) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; }
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
      el.style.transform = abajo
        ? `translate3d(${Math.round(p.x)}px, ${Math.round(p.y) + 22}px, 0) translate(-50%, 0)`
        : `translate3d(${Math.round(p.x)}px, ${Math.round(p.y)}px, 0) translate(-50%, -100%)`;
    });
  }

  abrir(zona: ZonaId): void {
    const link = this.etiquetas.find((e) => e.id === zona)?.link;
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
      etiquetas.push({ id: 'ventas', icono: 'pi pi-shopping-bag', titulo: 'Ventas hoy',
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
      etiquetas.push({ id: 'despachos', icono: 'pi pi-truck', titulo: 'Por despachar',
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
      etiquetas.push({ id: 'inventario', icono: 'pi pi-box', titulo: 'Sin stock',
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
      etiquetas.push({ id: 'crm', icono: 'pi pi-comments', titulo: 'Tareas vencidas',
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
      etiquetas.push({ id: 'clientes', icono: 'pi pi-users', titulo: 'Primera compra',
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
