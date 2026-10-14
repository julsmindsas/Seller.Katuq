import { Component, HostListener, OnInit, OnDestroy } from "@angular/core";
import Swal from "sweetalert2";
import { Router } from "@angular/router";
import { Subject, Subscription } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { ToastrService } from "ngx-toastr";
import * as XLSX from "xlsx";
import { CotizacionesService } from "../cotizaciones.service";
import { CotizacionConvertService } from "../cotizacion-convert.service";
import { nombreClienteCotizacion } from "../modelo/nombre-cliente";
import {
  Cotizacion,
  CotizacionMetrics,
  EstadoCotizacion,
  ESTADOS_COTIZACION,
} from "../modelo/cotizacion";

interface ChipEstado {
  value: EstadoCotizacion | "";
  label: string;
}

/**
 * Listado de cotizaciones (T-14): tabla server-side con paginación, filtro por
 * estado, buscador (server-side por número/cliente) y orden de la página actual.
 */
@Component({
  selector: "app-cotizaciones-lista",
  templateUrl: "./cotizaciones-lista.component.html",
  styleUrls: ["./cotizaciones-lista.component.scss"],
})
export class CotizacionesListaComponent implements OnInit, OnDestroy {
  cotizaciones: Cotizacion[] = [];
  loading = false;
  exporting = false;
  error = "";

  // KPIs / métricas: respetan búsqueda, pedido y comercial (tickets 1200/1211/1212).
  // El estado no las filtra: los chips cuentan cada estado con los demás filtros.
  metrics: CotizacionMetrics | null = null;

  // Filtros
  chips: ChipEstado[] = [
    { value: "", label: "Todas" },
    ...ESTADOS_COTIZACION,
  ];
  filtroEstado: EstadoCotizacion | "" = "";
  q = "";
  filtroPedido = "";
  /** Tickets 1104/1204: comerciales elegidos (vacío = todos). */
  vendedoresSel: string[] = [];
  /** Ticket 1204: menú de comerciales abierto. */
  menuComerciales = false;
  /** Ticket 1204: con "Todos" también se puede pedir la comparativa del equipo. */
  compararTodos = false;
  /** Ticket 1205: período ("" = todo, mes, mesAnterior, trimestre, personalizado). */
  periodo: "" | "mes" | "mesAnterior" | "trimestre" | "personalizado" = "";
  fechaDesde = "";
  fechaHasta = "";
  /** Ticket 1206: alerta "Requieren atención" aplicada a la tabla. */
  filtroAtencion = "";
  /** Ticket 1204: orden de la tabla comparativa. */
  ordenComparativa: { campo: string; dir: 1 | -1 } = { campo: "cotizadoValor", dir: -1 };
  /** Tickets 1204/1205: metas mensuales por comercial (configuración de la empresa). */
  metas: { [email: string]: number } = {};

  /** Ticket 1204: correos separados por coma, como los espera el servidor. */
  get filtroVendedor(): string {
    return this.vendedoresSel.join(",");
  }
  /** Ticket 1211: la tabla muestra solo las aceptadas sin pedido (clic en la tarjeta). */
  filtroSinConvertir = false;
  /** Ticket 1207: rechazadas por este motivo. */
  filtroMotivo = "";
  /** Ticket 1201: métricas y filtros contraídos (preferencia guardada en el navegador). */
  panelContraido = false;
  /** Comerciales de toda la empresa: el filtro no se encoge al usarlo. */
  vendedores: { email: string; nombre: string; total: number }[] = [];

  // Paginación (server-side)
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;

  // Orden (de la página cargada)
  sortKey = "fechaCreacion";
  sortDir: 1 | -1 = -1;

  private metricsSeq = 0;
  private searchSubject = new Subject<string>();
  private pedidoSubject = new Subject<string>();
  private subs: Subscription[] = [];

  private readonly COP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  constructor(
    private service: CotizacionesService,
    private router: Router,
    private toastr: ToastrService,
    private convertService: CotizacionConvertService
  ) {}

  ngOnInit(): void {
    this.panelContraido = this.leerPreferenciaPanel();
    this.cargarMetas();
    this.subs.push(
      this.searchSubject
        .pipe(debounceTime(350), distinctUntilChanged())
        .subscribe((value) => {
          this.q = value;
          this.page = 1;
          this.cargar();
          this.cargarMetrics();
        })
    );
    this.subs.push(
      this.pedidoSubject
        .pipe(debounceTime(350), distinctUntilChanged())
        .subscribe((value) => {
          this.filtroPedido = value;
          this.page = 1;
          this.cargar();
          this.cargarMetrics();
        })
    );
    this.cargar();
    this.cargarMetrics();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  cargarMetrics(): void {
    const seq = ++this.metricsSeq;
    const sub = this.service
      .metrics({
        q: this.q || undefined,
        pedido: this.filtroPedido || undefined,
        vendedor: this.filtroVendedor || undefined,
        desde: this.fechaDesde || undefined,
        hasta: this.fechaHasta || undefined,
        comparativa: this.mostrarComparativa,
      })
      .subscribe({
        next: (res) => {
          if (seq !== this.metricsSeq) return; // llegó tarde: ya hay un filtro más nuevo
          this.metrics = (res && res.data) || null;
          if (this.metrics && this.metrics.vendedores) this.vendedores = this.metrics.vendedores;
        },
        error: () => {
          if (seq === this.metricsSeq) this.metrics = null;
        },
      });
    this.subs.push(sub);
  }

  /** Conteo para los chips: 'Todas' = total; por estado = porEstado[estado]. */
  chipCount(value: EstadoCotizacion | ""): number | null {
    if (!this.metrics) return null;
    if (value === "") return this.metrics.total ?? null;
    return (this.metrics.porEstado && this.metrics.porEstado[value]) || 0;
  }

  cargar(): void {
    this.loading = true;
    this.error = "";
    const sub = this.service
      .list({
        estado: this.filtroEstado || undefined,
        q: this.q || undefined,
        pedido: this.filtroPedido || undefined,
        vendedor: this.filtroVendedor || undefined,
        sinConvertir: this.filtroSinConvertir || undefined,
        motivo: this.filtroMotivo || undefined,
        desde: this.fechaDesde || undefined,
        hasta: this.fechaHasta || undefined,
        atencion: this.filtroAtencion || undefined,
        page: this.page,
        limit: this.limit,
      })
      .subscribe({
        next: (res) => {
          this.cotizaciones = (res && res.data) || [];
          if (res && res.pagination) {
            this.total = res.pagination.total;
            this.totalPages = res.pagination.totalPages || 1;
          } else {
            this.total = this.cotizaciones.length;
            this.totalPages = 1;
          }
          this.ordenarLocal();
          this.loading = false;
        },
        error: () => {
          this.error = "No se pudieron cargar las cotizaciones.";
          this.cotizaciones = [];
          this.loading = false;
        },
      });
    this.subs.push(sub);
  }

  // ---- Filtros ----
  /** Ticket 1204: uno solo (desde la comparativa o al quitar el chip) o "" = todos. */
  setVendedor(value: string): void {
    this.vendedoresSel = value ? [value] : [];
    this.compararTodos = false;
    this.aplicarFiltrosComerciales();
  }

  alternarVendedor(email: string): void {
    this.vendedoresSel = this.vendedoresSel.includes(email)
      ? this.vendedoresSel.filter((e) => e !== email)
      : [...this.vendedoresSel, email];
    this.aplicarFiltrosComerciales();
  }

  elegirTodos(): void {
    this.vendedoresSel = [];
    this.aplicarFiltrosComerciales();
  }

  get textoComerciales(): string {
    if (!this.vendedoresSel.length) return "Todos";
    if (this.vendedoresSel.length === 1) {
      const v = this.vendedores.find((x) => x.email === this.vendedoresSel[0]);
      return (v && v.nombre) || this.vendedoresSel[0];
    }
    return `${this.vendedoresSel.length} comerciales`;
  }

  /** Ticket 1204: la comparativa sale con 2 o más comerciales, o con "Comparar todos". */
  get mostrarComparativa(): boolean {
    return this.vendedoresSel.length >= 2 || (this.compararTodos && this.vendedores.length > 1);
  }

  alternarComparativa(): void {
    this.compararTodos = !this.compararTodos;
    this.cargarMetrics();
  }

  private aplicarFiltrosComerciales(): void {
    this.page = 1;
    this.cargar();
    this.cargarMetrics();
  }

  @HostListener("document:click", ["$event"])
  cerrarMenuComerciales(ev: Event): void {
    if (!this.menuComerciales) return;
    const t = ev.target as HTMLElement;
    if (t && t.closest && t.closest(".comerciales-menu")) return;
    this.menuComerciales = false;
  }

  // ---- Ticket 1205: período ----

  setPeriodo(valor: string): void {
    this.periodo = valor as any;
    const hoy = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (valor === "mes") {
      this.fechaDesde = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
      this.fechaHasta = iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));
    } else if (valor === "mesAnterior") {
      this.fechaDesde = iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1));
      this.fechaHasta = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0));
    } else if (valor === "trimestre") {
      const ini = Math.floor(hoy.getMonth() / 3) * 3;
      this.fechaDesde = iso(new Date(hoy.getFullYear(), ini, 1));
      this.fechaHasta = iso(new Date(hoy.getFullYear(), ini + 3, 0));
    } else if (valor === "") {
      this.fechaDesde = "";
      this.fechaHasta = "";
    }
    if (valor !== "personalizado" || (this.fechaDesde && this.fechaHasta)) this.aplicarFiltrosComerciales();
  }

  setFecha(campo: "fechaDesde" | "fechaHasta", valor: string): void {
    this[campo] = valor || "";
    this.periodo = "personalizado";
    this.aplicarFiltrosComerciales();
  }

  // ---- Ticket 1206: requieren atención ----

  readonly ALERTAS: { clave: string; texto: string; ayuda: string }[] = [
    { clave: "sinConvertir", texto: "Aceptadas sin convertir", ayuda: "Negocio ganado que todavía no es pedido." },
    { clave: "porVencer", texto: "Por vencer", ayuda: "Enviadas que vencen en los próximos 3 días." },
    { clave: "sinSeguimiento", texto: "Sin seguimiento", ayuda: "Enviadas hace más de 5 días sin cambios." },
    { clave: "borradoresViejos", texto: "Borradores viejos", ayuda: "Borradores de hace más de 2 días sin enviar." },
  ];

  conteoAlerta(clave: string): number {
    const a: any = this.metrics && this.metrics.atencion;
    return (a && a[clave]) || 0;
  }

  alertaActiva(clave: string): boolean {
    return clave === "sinConvertir" ? this.filtroSinConvertir : this.filtroAtencion === clave;
  }

  aplicarAlerta(clave: string): void {
    const activa = this.alertaActiva(clave);
    this.filtroAtencion = "";
    this.filtroSinConvertir = false;
    this.filtroEstado = "";
    this.filtroMotivo = "";
    if (!activa) {
      if (clave === "sinConvertir") { this.filtroSinConvertir = true; this.filtroEstado = "aceptada"; }
      else this.filtroAtencion = clave;
    }
    this.page = 1;
    this.cargar();
  }

  // ---- Ticket 1205: indicadores comerciales ----

  variacion(campo: string): number | null {
    const v = this.metrics && this.metrics.variacion;
    return v && v[campo] !== undefined ? v[campo] : null;
  }

  /** "+12,5 %" / "−3 %". En ciclo y respuesta, bajar es bueno. */
  textoVariacion(campo: string): string {
    const v = this.variacion(campo);
    if (v === null) return "";
    return (v > 0 ? "▲ " : v < 0 ? "▼ " : "") + Math.abs(v).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + "%";
  }

  claseVariacion(campo: string): string {
    const v = this.variacion(campo);
    if (v === null || v === 0) return "";
    const bajarEsBueno = campo === "cicloCierreDias" || campo === "primeraRespuestaHoras" || campo === "descuentoPromedio";
    return (v > 0) !== bajarEsBueno ? "var-buena" : "var-mala";
  }

  numero(n: number | null | undefined, sufijo = ""): string {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString("es-CO", { maximumFractionDigits: 1 }) + sufijo;
  }

  get esAdmin(): boolean {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return /admin/i.test(String(u.rol || ""));
    } catch {
      return false;
    }
  }

  /** Tickets 1204/1205: el administrador fija la meta mensual de cada comercial. */
  async editarMetas(): Promise<void> {
    const esc = (v: string) => String(v || "").replace(/[&<>"']/g, (ch) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as any)[ch]));
    const filas = this.vendedores
      .map((v, i) => `<label style="display:flex;align-items:center;gap:10px;margin:0 0 8px;text-align:left"><span style="flex:1;font-size:13px">${esc(v.nombre)}</span><input id="meta-${i}" type="number" min="0" step="100000" value="${this.metas[v.email] || ""}" placeholder="Sin meta" style="width:150px;padding:8px 10px;border:1px solid #dedbea;border-radius:11px"></label>`)
      .join("");
    const r = await Swal.fire({
      title: "Meta mensual por comercial",
      html: `<p style="font-size:13px;color:#6b6880;margin:0 0 12px">Pesos convertidos a pedido en el mes. Vacío = sin meta.</p>${filas}`,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#5F3FE0",
      preConfirm: () => {
        const metas: { [email: string]: number } = {};
        this.vendedores.forEach((v, i) => {
          const n = Math.round(Number((document.getElementById("meta-" + i) as HTMLInputElement | null)?.value || 0));
          if (n > 0) metas[v.email] = n;
        });
        return metas;
      },
    });
    if (!r.isConfirmed) return;
    const metas = r.value as { [email: string]: number };
    this.subs.push(this.service.updateConfig({ metas }).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.metas = metas;
          this.toastr.success("Metas guardadas.");
          this.cargarMetrics();
        } else {
          this.toastr.error((res && res.message) || "No se pudieron guardar las metas.");
        }
      },
      error: (e) => this.toastr.error(e?.error?.message || "No se pudieron guardar las metas."),
    }));
  }

  private cargarMetas(): void {
    this.subs.push(this.service.getConfig().subscribe({
      next: (res) => { this.metas = (res && res.data && (res.data as any).metas) || {}; },
      error: () => { this.metas = {}; },
    }));
  }

  // ---- Ticket 1204: tabla comparativa ----

  get filasComparativa(): any[] {
    const filas = [...((this.metrics && this.metrics.porVendedor) || [])];
    const { campo, dir } = this.ordenComparativa;
    return filas.sort((a, b) => {
      const x = a[campo] ?? -Infinity;
      const y = b[campo] ?? -Infinity;
      return (typeof x === "string" ? x.localeCompare(y, "es") : x - y) * dir;
    });
  }

  ordenarComparativa(campo: string): void {
    this.ordenComparativa = this.ordenComparativa.campo === campo
      ? { campo, dir: this.ordenComparativa.dir === 1 ? -1 : 1 }
      : { campo, dir: campo === "nombre" ? 1 : -1 };
  }

  exportarComparativa(): void {
    const ind: any = (this.metrics && this.metrics.indicadores) || {};
    const fila = (f: any) => ({
      "Asesor": f.nombre,
      "Cotizaciones": f.cotizaciones,
      "$ cotizado": Math.round(f.cotizadoValor),
      "Win rate (cantidad) %": f.winRate,
      "Win rate (valor) %": f.winRateValor,
      "Ticket promedio": f.ticketPromedio,
      "Ciclo de cierre (días)": f.cicloCierreDias ?? "",
      "Descuento promedio %": f.descuentoPromedio,
      "Pipeline abierto": Math.round(f.pipelineAbierto),
      "$ convertido": Math.round(f.convertidoValor),
      "Avance vs. meta %": f.avanceMeta ?? "",
      "Participación %": f.participacion ?? 100,
    });
    const ws = XLSX.utils.json_to_sheet([...this.filasComparativa.map(fila), fila({ ...ind, nombre: "Equipo", participacion: 100 })]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comparativa");
    XLSX.writeFile(wb, `comparativa-asesores-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  setEstado(value: EstadoCotizacion | ""): void {
    this.filtroEstado = value;
    this.filtroSinConvertir = false;
    this.filtroAtencion = "";
    if (value !== "rechazada") this.filtroMotivo = "";
    this.page = 1;
    this.cargar();
  }

  /** Ticket 1211: clic en "Aceptadas sin convertir" filtra la tabla con esas cotizaciones. */
  verAceptadasSinConvertir(): void {
    const activo = this.filtroSinConvertir;
    this.filtroEstado = activo ? "" : "aceptada";
    this.filtroSinConvertir = !activo;
    this.page = 1;
    this.cargar();
  }

  /** Ticket 1207: filtrar las rechazadas por motivo. */
  setMotivo(value: string): void {
    this.filtroMotivo = value || "";
    this.page = 1;
    this.cargar();
  }

  /** Motivos que aparecen en las rechazadas (con los filtros actuales), de más a menos. */
  get motivosDisponibles(): { motivo: string; total: number }[] {
    const m = (this.metrics && this.metrics.motivosRechazo) || {};
    return Object.keys(m).map((motivo) => ({ motivo, total: m[motivo] })).sort((a, b) => b.total - a.total);
  }

  motivoRechazo(c: Cotizacion): string {
    if (c.estadoCotizacion !== "rechazada") return "";
    return (c.rechazo && c.rechazo.motivo) || ((c as any).motivoRechazo ? "Rechazada por el cliente desde el enlace" : "");
  }

  // ---- Ticket 1201: panel contraíble ----

  private get clavePreferencia(): string {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return "cotizaciones.panelContraido." + (u.email || "anon");
    } catch {
      return "cotizaciones.panelContraido.anon";
    }
  }

  private leerPreferenciaPanel(): boolean {
    try {
      return localStorage.getItem(this.clavePreferencia) === "1";
    } catch {
      return false;
    }
  }

  alternarPanel(): void {
    this.panelContraido = !this.panelContraido;
    try {
      localStorage.setItem(this.clavePreferencia, this.panelContraido ? "1" : "0");
    } catch {
      /* sin almacenamiento, la preferencia dura hasta recargar */
    }
  }

  /** Filtros puestos, como chips que se pueden quitar desde la barra compacta. */
  get filtrosActivos(): { clave: string; texto: string }[] {
    const lista: { clave: string; texto: string }[] = [];
    if (this.vendedoresSel.length) {
      lista.push({ clave: "vendedor", texto: "Comercial: " + this.textoComerciales });
    }
    if (this.fechaDesde || this.fechaHasta) lista.push({ clave: "periodo", texto: `Período: ${this.fechaDesde || "…"} a ${this.fechaHasta || "…"}` });
    const alerta = this.ALERTAS.find((a) => a.clave === this.filtroAtencion);
    if (alerta) lista.push({ clave: "atencion", texto: alerta.texto });
    if (this.filtroSinConvertir) lista.push({ clave: "sinConvertir", texto: "Aceptadas sin convertir" });
    else if (this.filtroEstado) lista.push({ clave: "estado", texto: "Estado: " + this.estadoLabel(this.filtroEstado) });
    if (this.filtroMotivo) lista.push({ clave: "motivo", texto: "Motivo: " + this.filtroMotivo });
    if (this.filtroPedido) lista.push({ clave: "pedido", texto: "Pedido: " + this.filtroPedido });
    return lista;
  }

  quitarFiltro(clave: string): void {
    if (clave === "vendedor") { this.setVendedor(""); return; }
    if (clave === "sinConvertir" || clave === "estado") { this.setEstado(""); return; }
    if (clave === "motivo") { this.setMotivo(""); return; }
    if (clave === "pedido") { this.filtroPedido = ""; this.page = 1; this.cargar(); this.cargarMetrics(); }
    if (clave === "periodo") { this.setPeriodo(""); }
    if (clave === "atencion") { this.filtroAtencion = ""; this.page = 1; this.cargar(); }
  }

  /** Porcentaje con coma decimal (34,07 %). */
  pct(n: number | undefined | null): string {
    if (n === undefined || n === null) return "—";
    return n.toLocaleString("es-CO", { maximumFractionDigits: 2 }) + "%";
  }

  onSearch(value: string): void {
    this.searchSubject.next(value || "");
  }

  onPedidoSearch(value: string): void {
    this.pedidoSubject.next(value || "");
  }

  // ---- Orden (página actual) ----
  sortBy(key: string): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 1 ? -1 : 1;
    } else {
      this.sortKey = key;
      this.sortDir = 1;
    }
    this.ordenarLocal();
  }

  private ordenarLocal(): void {
    const key = this.sortKey;
    const dir = this.sortDir;
    this.cotizaciones = [...this.cotizaciones].sort((a, b) => {
      let x: any;
      let y: any;
      if (key === "cliente") {
        x = this.clienteNombre(a).toLowerCase();
        y = this.clienteNombre(b).toLowerCase();
      } else if (key === "vendedor") {
        x = this.vendedorNombre(a).toLowerCase();
        y = this.vendedorNombre(b).toLowerCase();
      } else if (key === "total") {
        x = a.total || 0;
        y = b.total || 0;
      } else if (key === "fechaEmision") {
        // Fallback a fechaCreacion para cotizaciones antiguas sin fechaEmision.
        x = (a as any).fechaEmision || (a as any).fechaCreacion || "";
        y = (b as any).fechaEmision || (b as any).fechaCreacion || "";
      } else {
        x = (a as any)[key];
        y = (b as any)[key];
      }
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
  }

  // ---- Paginación ----
  irPagina(p: number): void {
    if (p < 1 || p > this.totalPages || p === this.page) return;
    this.page = p;
    this.cargar();
  }

  // ---- Navegación ----
  nuevaCotizacion(): void {
    this.router.navigate(["/cotizaciones/editor"]);
  }

  abrir(c: Cotizacion): void {
    if (c.id) this.router.navigate(["/cotizaciones/editor", c.id]);
  }

  /**
   * Abre la cotización directamente en su vista previa (el documento que ve el
   * cliente, idéntico al PDF).
   *
   * Va al editor con `?preview=1` en vez de dibujar el documento acá: el
   * documento es un solo marcado en el editor, compartido por la vista previa y
   * el PDF. Una segunda copia en el listado se desincronizaría al primer cambio
   * — y ya pasó con los banners y con la tabla de columnas.
   */
  vistaPrevia(c: Cotizacion, ev: Event): void {
    ev.stopPropagation();
    if (!c.id) return;
    this.router.navigate(["/cotizaciones/editor", c.id], {
      queryParams: { preview: 1 },
    });
  }

  /** Navega al pedido generado a partir de la cotización (deep-link a la lista de pedidos). */
  verPedido(c: Cotizacion, ev: Event): void {
    ev.stopPropagation();
    if (!c.pedidoGenerado) return;
    this.router.navigate(["/ventas/pedidos"], { queryParams: { nroPedido: c.pedidoGenerado } });
  }

  /** Exporta TODAS las cotizaciones del filtro vigente a Excel (no solo la página). */
  exportar(): void {
    this.exporting = true;
    const sub = this.service
      .list({
        estado: this.filtroEstado || undefined,
        q: this.q || undefined,
        pedido: this.filtroPedido || undefined,
        vendedor: this.filtroVendedor || undefined,
        sinConvertir: this.filtroSinConvertir || undefined,
        motivo: this.filtroMotivo || undefined,
        desde: this.fechaDesde || undefined,
        hasta: this.fechaHasta || undefined,
        atencion: this.filtroAtencion || undefined,
        page: 1,
        limit: 5000,
      })
      .subscribe({
        next: (res) => {
          const rows = ((res && res.data) || []).map((c) => ({
            "Número": c.nroCotizacion || "",
            "Cliente": this.clienteNombre(c),
            "Documento": (c.cliente as any)?.documento || "",
            "Vendedor": (c.vendedor && (c.vendedor.nombre || c.vendedor.email)) || "",
            "Emisión": this.fecha(c.fechaEmision || c.fechaCreacion),
            "Válida hasta": this.fecha(c.fechaVencimiento),
            "Total": c.total || 0,
            "Estado": this.estadoLabel(c.estadoCotizacion),
            // Ticket 1207: el motivo del rechazo también sale en el Excel.
            "Motivo de rechazo": this.motivoRechazo(c),
            "Pedido": c.pedidoGenerado || "",
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones");
          const ts = new Date().toISOString().slice(0, 10);
          XLSX.writeFile(wb, `cotizaciones-${ts}.xlsx`);
          this.exporting = false;
        },
        error: () => {
          this.exporting = false;
          this.toastr.error("No se pudo exportar el listado.");
        },
      });
    this.subs.push(sub);
  }

  /** Duplica una cotización como nuevo borrador (consecutivo nuevo en el backend). */
  duplicar(c: Cotizacion, ev: Event): void {
    ev.stopPropagation();
    const copia: Cotizacion = {
      ...c,
      estadoCotizacion: "borrador",
      items: c.items || [],
    };
    delete copia.id;
    delete copia.nroCotizacion;
    delete copia.fechaCreacion;
    delete copia.convertidaAPedido;
    delete copia.pedidoGenerado;
    // Revisión 1081: la copia es una cotización nueva. Sin estos campos, el servidor le pone
    // el anexo vigente de la empresa y no le hereda el enlace público de la original.
    delete copia.anexoCondiciones;
    delete (copia as any).publicToken;
    delete (copia as any).publicTokenCreatedAt;
    delete copia.vistaCliente;
    delete copia.fechaPrimeraVista;
    const sub = this.service.create(copia).subscribe({
      next: (res) => {
        const num = res && res.data ? res.data.nroCotizacion : "";
        this.toastr.success("Copia creada: " + (num || ""));
        this.page = 1;
        this.cargar();
        this.cargarMetrics();
      },
      error: () => this.toastr.error("No se pudo duplicar la cotización."),
    });
    this.subs.push(sub);
  }

  /** True si la cotización puede convertirse a pedido (aceptada, no convertida). */
  puedeConvertir(c: Cotizacion): boolean {
    return this.convertService.puedeConvertir(c);
  }

  /** Convierte la cotización a pedido (hidrata la venta asistida — spec 008.2). */
  convertir(c: Cotizacion, ev: Event): void {
    ev.stopPropagation();
    this.convertService.iniciar(c);
  }

  // ---- Helpers de presentación ----
  clienteNombre(c: Cotizacion): string {
    return nombreClienteCotizacion(c.cliente) || "—";
  }

  /** Ticket 1176: nombre del comercial (o su correo si no tiene nombre). */
  vendedorNombre(c: Cotizacion): string {
    const v = c.vendedor;
    if (!v) return "—";
    return v.nombre || v.email || "—";
  }

  clienteSub(c: Cotizacion): string {
    const cli: any = c.cliente || {};
    const doc = cli.documento || "";
    const ciudad = cli.ciudad || cli.municipio || "";
    return [doc, ciudad].filter(Boolean).join(" · ");
  }

  money(n: number | undefined): string {
    return this.COP.format(Math.round(n || 0));
  }

  fecha(iso: string | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }

  estadoLabel(e: string | undefined): string {
    const found = ESTADOS_COTIZACION.find((x) => x.value === e);
    return found ? found.label : (e || "—");
  }

  /** Clase de badge Bootstrap por estado canónico (tolerante a legacy). */
  getEstadoClass(e: string | undefined): string {
    switch (e) {
      case "aceptada":
        return "bg-success";
      case "enviada":
        return "bg-info text-dark";
      case "rechazada":
        return "bg-danger";
      case "vencida":
        return "bg-warning text-dark";
      case "convertida":
        return "bg-primary";
      case "borrador":
      default:
        return "bg-secondary";
    }
  }

  /** Días hasta la validez; negativo = vencida. */
  diasValidez(c: Cotizacion): number | null {
    if (!c.fechaVencimiento) return null;
    const d = new Date(c.fechaVencimiento).getTime();
    if (isNaN(d)) return null;
    return Math.ceil((d - Date.now()) / 86400000);
  }

  validezClase(c: Cotizacion): string {
    if (c.estadoCotizacion === "convertida" || c.estadoCotizacion === "rechazada") return "";
    const dias = this.diasValidez(c);
    if (dias === null) return "";
    if (dias < 0) return "vence-old";
    if (dias <= 3) return "vence-soon";
    return "";
  }

  trackById(_i: number, c: Cotizacion): string {
    return c.id || c.nroCotizacion || String(_i);
  }
}
