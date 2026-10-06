import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone,
  OnDestroy, QueryList, ViewChild, ViewChildren,
} from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import type { AnclaZona } from '../../shared/escena-3d/escena-base';
import { LogisticaServiceV2 } from '../../shared/services/despachos/logistica.service.v2';
import type { CentroOperacionesEscena, NivelCentro, ResultadoEscena } from './centro-operaciones.scene';
import {
  CentroOperacionesService, ETAPAS_COLA, EtapaCola, FotoOperacion, NOMBRE_ETAPA, PedidoCola, ProductoCola,
} from './centro-operaciones.service';

type Tono = 'accent' | 'warning' | 'danger' | 'muted';

interface Etiqueta {
  id: string;
  titulo: string;
  valor: string;
  tono: Tono;
  icono: string;
  /** Al tocarla se elige esto en la escena. */
  elige: string | null;
}

const REFRESCO_MS = 60_000;

/**
 * Centro de operaciones 3D (D-354): bodega y muelles en una sola pantalla, con los
 * pedidos frenados por falta de unidades a la vista. Lee la foto del backend
 * (solo lectura); generar la guía y abrir el detalle se hacen desde aquí, y
 * despachar se entrega a Despachos con los pedidos ya elegidos.
 */
@Component({
  selector: 'app-centro-operaciones',
  templateUrl: './centro-operaciones.component.html',
  styleUrls: ['./centro-operaciones.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CentroOperacionesComponent implements AfterViewInit, OnDestroy {
  @ViewChild('stage', { static: true }) private stageRef!: ElementRef<HTMLElement>;
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChildren('etiqueta') private etiquetasRef!: QueryList<ElementRef<HTMLElement>>;

  readonly etapas = ETAPAS_COLA;
  readonly nombreEtapa = NOMBRE_ETAPA;

  /** null = cargando; false = sin WebGL (queda solo el panel). */
  webglOk: boolean | null = null;
  cargando = true;
  error = false;
  noDisponible = false;
  foto: FotoOperacion | null = null;
  bodega: string | null = null;
  nivel: NivelCentro = 'todo';
  sel: string | null = null;
  hoverId: string | null = null;
  resultado: ResultadoEscena | null = null;
  etiquetas: Etiqueta[] = [];
  generandoGuia: string | null = null;

  private escena: CentroOperacionesEscena | null = null;
  private resizeObs: ResizeObserver | null = null;
  private interObs: IntersectionObserver | null = null;
  private visible = true;
  private destruido = false;
  private reloj: ReturnType<typeof setInterval> | null = null;
  private ultimaCarga = 0;
  private pidiendo = false;
  private productosPorId = new Map<string, ProductoCola>();
  private pedidosPorId = new Map<string, PedidoCola>();
  private readonly hora = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });
  private readonly fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
  private readonly numero = new Intl.NumberFormat('es-CO');

  constructor(
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly servicio: CentroOperacionesService,
    private readonly logistica: LogisticaServiceV2,
  ) {}

  // ---------------------------------------------------------------- datos

  // Listas de la foto, armadas una vez por carga (no en cada ciclo de la vista).
  vivos: PedidoCola[] = [];
  rezagados: PedidoCola[] = [];
  rezagadosVisibles: PedidoCola[] = [];
  frenados: PedidoCola[] = [];
  porEtapa = {} as Record<EtapaCola, PedidoCola[]>;

  get resumen() { return this.foto?.resumen; }
  get actualizado(): string { return this.foto?.calculadoEn ? this.hora.format(new Date(this.foto.calculadoEn)) : ''; }

  /** Si la línea del pedido tiene su lugar en la bodega (estantería o mesa de producción). */
  tieneEstante(productoId: string): boolean {
    return this.productosPorId.has(productoId);
  }

  get pedidoSel(): PedidoCola | null {
    return this.sel?.startsWith('p:') ? this.pedidosPorId.get(this.sel.slice(2)) || null : null;
  }
  get productoSel(): ProductoCola | null {
    return this.sel?.startsWith('s:') ? this.productosPorId.get(this.sel.slice(2)) || null : null;
  }
  get etapaSel(): EtapaCola | null {
    return this.sel?.startsWith('m:') ? (this.sel.slice(2) as EtapaCola) : null;
  }
  get transportadorSel(): string | null {
    return this.sel?.startsWith('t:') ? this.sel.slice(2) : null;
  }
  get pedidosDelProducto(): PedidoCola[] {
    const pr = this.productoSel;
    return pr ? this.ordenar(this.vivos.filter((p) => p.lineas.some((l) => l.productoId === pr.id))) : [];
  }
  get pedidosDelTransportador(): PedidoCola[] {
    const t = this.transportadorSel;
    return t ? this.ordenar(this.vivos.filter((p) => p.transportador === t)) : [];
  }
  get bodegaNombre(): string {
    return this.foto?.bodegas?.find((b) => b.id === this.bodega)?.nombre || 'Sin bodega';
  }
  get hoverTexto(): string {
    return this.hoverId && this.hoverId !== this.sel ? this.textoDe(this.hoverId) : '';
  }

  get selTexto(): string {
    return this.sel ? this.textoDe(this.sel) : '';
  }

  /** Nombre corto de lo que hay en la escena con ese id (pedido, producto, muelle…). */
  private textoDe(id: string): string {
    if (id.startsWith('p:')) {
      const p = this.pedidosPorId.get(id.slice(2));
      return p ? `${p.nroPedido} · ${p.cliente || p.ciudad || 'Pedido'}` : '';
    }
    if (id.startsWith('s:')) {
      const pr = this.productosPorId.get(id.slice(2));
      if (!pr) return '';
      return `${pr.nombre} · ${pr.inventariable ? this.saldoTexto(this.saldoEn(pr, this.bodega)) : 'se hace por pedido'}`;
    }
    if (id.startsWith('m:')) return NOMBRE_ETAPA[id.slice(2) as EtapaCola] || '';
    if (id.startsWith('t:')) return id.slice(2);
    return id === 'rez' ? 'Pedidos rezagados' : '';
  }

  saldoEn(pr: ProductoCola, bodega: string | null): number {
    return bodega ? (pr.stockPorBodega?.[bodega] ?? 0) : (pr.stockTotal ?? 0);
  }

  saldoTexto(n: number): string {
    return n < 0 ? `faltan ${this.numero.format(-n)}` : `${this.numero.format(n)} disponibles`;
  }

  bodegasDelProducto(pr: ProductoCola): Array<{ nombre: string; saldo: number }> {
    const nombres = new Map((this.foto?.bodegas || []).map((b) => [b.id, b.nombre]));
    return Object.entries(pr.stockPorBodega || {})
      .map(([id, saldo]) => ({ nombre: nombres.get(id) || id, saldo }))
      .sort((a, b) => a.saldo - b.saldo);
  }

  entregaTexto(p: PedidoCola): string {
    if (p.urgencia === 'sin_fecha') return 'Sin fecha de entrega';
    if (p.urgencia === 'hoy') return 'Entrega hoy';
    const f = p.entrega ? this.fecha.format(new Date(p.entrega)) : '';
    if (p.urgencia === 'vencido') return `Vencido hace ${p.diasVencido} ${p.diasVencido === 1 ? 'día' : 'días'}${f ? ` · ${f}` : ''}`;
    return f ? `Entrega ${f}` : 'Próxima entrega';
  }

  fmt(n: number | null | undefined): string { return this.numero.format(n || 0); }

  trackId = (_: number, x: { id: string }) => x.id;

  // ------------------------------------------------------------ ciclo vida

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => { void this.montar(); });
    this.cargar();
    this.zone.runOutsideAngular(() => {
      this.reloj = setInterval(() => {
        if (this.visible && document.visibilityState === 'visible') this.zone.run(() => this.cargar());
      }, REFRESCO_MS);
    });
    document.addEventListener('visibilitychange', this.onVisibilidad);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    if (this.reloj) clearInterval(this.reloj);
    this.resizeObs?.disconnect();
    this.interObs?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilidad);
    this.escena?.destruir();
    this.escena = null;
  }

  cargar(): void {
    if (this.pidiendo) return;
    this.pidiendo = true;
    this.servicio.getFoto().subscribe({
      next: (foto) => {
        this.pidiendo = false;
        this.ultimaCarga = Date.now();
        this.cargando = false;
        this.error = false;
        this.noDisponible = !foto?.disponible;
        this.foto = foto?.disponible ? foto : null;
        this.indexar();
        this.pintar();
        this.cdr.markForCheck();
      },
      error: () => {
        this.pidiendo = false;
        this.cargando = false;
        this.error = !this.foto; // con una foto previa se sigue mostrando; el próximo refresco reintenta
        this.cdr.markForCheck();
      },
    });
  }

  // -------------------------------------------------------------- acciones

  elegirBodega(id: string | null): void {
    if (this.bodega === id) return;
    this.bodega = id;
    if (this.sel?.startsWith('s:')) this.seleccionar(null);
    this.pintar();
  }

  enfocar(nivel: NivelCentro): void {
    this.nivel = nivel;
    this.escena?.enfocar(nivel);
  }

  seleccionar(id: string | null): void {
    this.sel = id && id === this.sel ? null : id;
    this.escena?.resaltar(this.sel);
    this.cdr.markForCheck();
  }

  verDetalle(p: PedidoCola): void {
    void this.router.navigate(['/ventas/pedidos'], { queryParams: { buscar: p.nroPedido } });
  }

  /** La misma guía que genera Despachos para el pedido (proveedor según el transportador). */
  generarGuia(p: PedidoCola): void {
    if (this.generandoGuia) return;
    this.generandoGuia = p.id;
    this.toastr.info('Generando guía…', 'Guía de envío');
    this.logistica.generarGuia(p.id).subscribe({
      next: (resp: any) => {
        this.generandoGuia = null;
        this.cdr.markForCheck();
        const raw = resp?.labelPdf || resp?.labelUrl;
        if (resp?.success && raw) {
          const url = /^https?:\/\//i.test(raw) || raw.startsWith('data:') ? raw : `data:application/pdf;base64,${raw}`;
          if (!window.open(url, '_blank')) {
            this.toastr.error('No se pudo abrir la guía. Revisa que las ventanas emergentes no estén bloqueadas.', 'Ventana bloqueada');
          }
        } else {
          this.toastr.warning(resp?.error || 'No se pudo generar la guía.', 'Guía no disponible');
        }
      },
      error: (err) => {
        this.generandoGuia = null;
        this.cdr.markForCheck();
        this.toastr.error(err?.error?.error || 'No se pudo generar la guía. Intenta nuevamente.', 'Guía de envío');
      },
    });
  }

  /**
   * Lleva a Despachos, donde se arma y confirma el despacho con el flujo de siempre.
   * Si alguno de los pedidos no tiene unidades, avisa primero qué falta, sin
   * bloquear la decisión. Los pedidos y el transportador viajan en la dirección
   * para que Despachos los deje elegidos (esa parte llega en su propio cambio).
   */
  async despachar(pedidos: PedidoCola[], transportador?: string | null): Promise<void> {
    if (!pedidos.length) return;
    const frenados = pedidos.filter((p) => p.frenado);
    if (frenados.length) {
      const items = frenados.slice(0, 6).map((p) => `<li><b>${this.esc(p.nroPedido)}</b>: ${p.faltantes
        .map((f) => `faltan ${this.fmt(f.faltan)} de ${this.esc(f.nombre)}`).join(', ')}</li>`).join('');
      const mas = frenados.length > 6 ? `<p>Y ${frenados.length - 6} pedidos más.</p>` : '';
      const r = await Swal.fire({
        icon: 'warning',
        title: frenados.length === 1 ? 'Un pedido no tiene unidades' : `${frenados.length} pedidos no tienen unidades`,
        html: `<ul style="text-align:left;margin:0;padding-left:18px">${items}</ul>${mas}`
          + '<p style="margin-top:10px">Se vendieron sin existencias en la bodega. Revisa que estén completos antes de que salgan.</p>',
        showCancelButton: true,
        confirmButtonText: 'Abrir Despachos igual',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#5F3FE0',
      });
      if (!r.isConfirmed) return;
    }
    const queryParams: Record<string, string> = { pedidos: pedidos.map((p) => p.id).join(',') };
    if (transportador) queryParams['transportador'] = transportador;
    void this.router.navigate(['/despachos'], { queryParams });
  }

  acercar(): void { this.escena?.acercar(1.25); }
  alejar(): void { this.escena?.acercar(0.8); }
  girar(g: number): void { this.escena?.girar(g); }
  centrar(): void { this.nivel = 'todo'; this.escena?.centrar(); this.escena?.enfocar('todo'); }

  // ---------------------------------------------------------------- escena

  private async montar(): Promise<void> {
    if (!this.soportaWebgl()) { this.sinWebgl(); return; }
    try {
      const [T, rb, mod] = await Promise.all([
        import('three'),
        import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        import('./centro-operaciones.scene'),
      ]);
      if (this.destruido) return;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const escena = new mod.CentroOperacionesEscena(T, rb.RoundedBoxGeometry, {
        canvas: this.canvasRef.nativeElement,
        reducirMovimiento: !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        calidadBaja: !!window.matchMedia?.('(pointer: coarse)').matches
          || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4,
        onHover: (id) => this.zone.run(() => { this.hoverId = id; this.cdr.markForCheck(); }),
        onClick: (id) => this.zone.run(() => this.seleccionar(id)),
        onFrame: (a) => this.posicionar(a),
      });
      escena.iniciar();
      this.escena = escena;
      const stage = this.stageRef.nativeElement;
      this.resizeObs = new ResizeObserver(() => escena.redimensionar(stage.clientWidth, stage.clientHeight));
      this.resizeObs.observe(stage);
      escena.redimensionar(stage.clientWidth, stage.clientHeight);
      this.interObs = new IntersectionObserver((e) => { this.visible = e.some((x) => x.isIntersecting); this.pausa(); });
      this.interObs.observe(stage);
      this.zone.run(() => {
        this.webglOk = true;
        this.pintar();
        this.cdr.markForCheck();
      });
    } catch {
      this.escena?.destruir();
      this.escena = null;
      this.sinWebgl();
    }
  }

  private readonly onVisibilidad = (): void => {
    this.pausa();
    // Al volver (por ejemplo, de Despachos en otra pestaña) se trae la foto al día.
    if (document.visibilityState === 'visible' && Date.now() - this.ultimaCarga > 30_000) {
      this.zone.run(() => this.cargar());
    }
  };

  private pausa(): void {
    this.escena?.pausar(!this.visible || document.visibilityState === 'hidden');
  }

  private indexar(): void {
    const pedidos = this.foto?.pedidos || [];
    this.vivos = this.ordenar(pedidos.filter((p) => !p.rezagado));
    this.rezagados = pedidos.filter((p) => p.rezagado).sort((a, b) => b.diasVencido - a.diasVencido);
    this.rezagadosVisibles = this.rezagados.slice(0, 50);
    this.frenados = this.vivos.filter((p) => p.frenado);
    this.porEtapa = {} as Record<EtapaCola, PedidoCola[]>;
    for (const etapa of ETAPAS_COLA) this.porEtapa[etapa] = this.vivos.filter((p) => p.etapa === etapa);
    this.productosPorId = new Map((this.foto?.productos || []).map((p) => [p.id, p]));
    this.pedidosPorId = new Map((this.foto?.pedidos || []).map((p) => [p.id, p]));
    const bodegas = this.foto?.bodegas || [];
    if (!bodegas.some((b) => b.id === this.bodega)) this.bodega = bodegas[0]?.id ?? null;
    if (this.sel && !this.existe(this.sel)) this.sel = null;
  }

  private existe(id: string): boolean {
    if (id.startsWith('p:')) return this.pedidosPorId.has(id.slice(2));
    if (id.startsWith('s:')) return this.productosPorId.has(id.slice(2));
    if (id.startsWith('t:')) return this.vivos.some((p) => p.transportador === id.slice(2));
    if (id === 'rez') return (this.resumen?.rezagados || 0) > 0;
    return id.startsWith('m:');
  }

  private pintar(): void {
    if (!this.foto) { this.etiquetas = []; return; }
    if (this.escena) {
      this.resultado = this.escena.ponerFoto(this.foto, this.bodega);
      this.escena.resaltar(this.sel);
    }
    this.etiquetas = this.armarEtiquetas();
  }

  private armarEtiquetas(): Etiqueta[] {
    const f = this.foto!;
    const r = this.resultado;
    const out: Etiqueta[] = [];
    const ocultos = r?.estantesOcultos ? ` · +${r.estantesOcultos}` : '';
    out.push({ id: 'z:bodega', titulo: 'Bodega', valor: `${this.bodegaNombre}${ocultos}`, tono: 'accent', icono: 'pi pi-box', elige: null });
    for (const etapa of ETAPAS_COLA) {
      const lista = this.vivos.filter((p) => p.etapa === etapa);
      const frenados = lista.filter((p) => p.frenado).length;
      const urgentes = lista.filter((p) => p.urgencia === 'hoy' || p.urgencia === 'vencido').length;
      const extra = r?.ocultosPorMuelle[etapa] ? ` · +${r.ocultosPorMuelle[etapa]}` : '';
      out.push({
        id: `z:${etapa}`, titulo: NOMBRE_ETAPA[etapa], valor: `${this.fmt(lista.length)}${extra}`,
        tono: frenados ? 'danger' : urgentes ? 'warning' : 'accent', icono: 'pi pi-inbox', elige: `m:${etapa}`,
      });
    }
    for (const t of r?.camiones || []) {
      const n = this.vivos.filter((p) => p.transportador === t).length;
      out.push({ id: `t:${t}`, titulo: t, valor: `${n} ${n === 1 ? 'pedido' : 'pedidos'}`, tono: 'accent', icono: 'pi pi-truck', elige: `t:${t}` });
    }
    if (r && !r.camiones.length) out.push({ id: 'z:salida', titulo: 'Salida', valor: 'Sin transportador asignado', tono: 'muted', icono: 'pi pi-truck', elige: null });
    if (f.resumen?.rezagados) {
      out.push({ id: 'z:rez', titulo: 'Rezagados', valor: this.fmt(f.resumen.rezagados), tono: 'muted', icono: 'pi pi-history', elige: 'rez' });
    }
    for (const p of this.frenados) {
      const x = p.faltantes[0];
      out.push({ id: `f:${p.id}`, titulo: p.nroPedido, valor: `Faltan ${this.fmt(x.faltan)} · ${x.nombre}`, tono: 'danger', icono: 'pi pi-exclamation-triangle', elige: `p:${p.id}` });
    }
    for (const pr of f.productos || []) {
      const s = this.saldoEn(pr, this.bodega);
      if (pr.inventariable && s < 0) out.push({ id: `n:${pr.id}`, titulo: pr.nombre, valor: `Faltan ${this.fmt(-s)}`, tono: 'danger', icono: 'pi pi-minus-circle', elige: `s:${pr.id}` });
    }
    out.push({ id: 'h', titulo: '', valor: '', tono: 'accent', icono: '', elige: null });
    out.push({ id: 'sel', titulo: '', valor: '', tono: 'accent', icono: '', elige: null });
    return out;
  }

  /** Mueve cada etiqueta a su ancla; si dos chocan, gana la de mayor rango. */
  private posicionar(anclas: Partial<Record<string, AnclaZona>>): void {
    const stage = this.stageRef.nativeElement;
    const ancho = stage.clientWidth;
    const alto = stage.clientHeight;
    const els = this.etiquetasRef?.map((x) => x.nativeElement) ?? [];
    const rango = (id: string) => (id === 'sel' ? 4 : id === 'h' ? 3 : id.startsWith('f:') ? 2 : id.startsWith('n:') ? 1.5 : 1);
    els.sort((a, b) => rango(b.dataset['id'] || '') - rango(a.dataset['id'] || ''));
    const medidas = els.map((el) => [el.offsetWidth, el.offsetHeight + 8] as const);
    const ocupadas: Array<[number, number, number, number]> = [];
    els.forEach((el, i) => {
      const id = el.dataset['id'] || '';
      const p = anclas[id];
      const [w, h] = medidas[i];
      const flotante = id === 'h' || id === 'sel';
      let ok = !!p && (id !== 'h' || !!this.hoverTexto) && (id !== 'sel' || !!this.selTexto) && p.x > 8 && p.x < ancho - 8 && p.y > 40 && p.y < alto + 8;
      let x = 0, y = 0;
      if (p && ok) {
        x = Math.min(ancho - w / 2 - 6, Math.max(w / 2 + 6, p.x));
        y = Math.max(h + 6, p.y);
        const r: [number, number, number, number] = [x - w / 2, y - h, x + w / 2, y];
        ok = !ocupadas.some((o) => r[0] < o[2] && r[2] > o[0] && r[1] < o[3] && r[3] > o[1]);
        if (ok) ocupadas.push(r);
      }
      if (!ok) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; return; }
      el.style.opacity = '1';
      el.style.pointerEvents = flotante ? 'none' : 'auto';
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -100%)`;
    });
  }

  private ordenar(lista: PedidoCola[]): PedidoCola[] {
    const peso = (p: PedidoCola) => (p.frenado ? 10 : 0) + (p.urgencia === 'vencido' ? 3 : p.urgencia === 'hoy' ? 2 : p.urgencia === 'proximo' ? 1 : 0);
    return [...lista].sort((a, b) => peso(b) - peso(a) || (a.entrega || '9').localeCompare(b.entrega || '9'));
  }

  private esc(s: string): string {
    return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
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
