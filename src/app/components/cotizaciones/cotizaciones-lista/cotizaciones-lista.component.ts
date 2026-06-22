import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, Subscription } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { ToastrService } from "ngx-toastr";
import * as XLSX from "xlsx";
import { CotizacionesService } from "../cotizaciones.service";
import { CotizacionConvertService } from "../cotizacion-convert.service";
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

  // KPIs / métricas (globales por empresa, independientes del filtro)
  metrics: CotizacionMetrics | null = null;

  // Filtros
  chips: ChipEstado[] = [
    { value: "", label: "Todas" },
    ...ESTADOS_COTIZACION,
  ];
  filtroEstado: EstadoCotizacion | "" = "";
  q = "";

  // Paginación (server-side)
  page = 1;
  limit = 10;
  total = 0;
  totalPages = 1;

  // Orden (de la página cargada)
  sortKey = "fechaCreacion";
  sortDir: 1 | -1 = -1;

  private searchSubject = new Subject<string>();
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
    this.subs.push(
      this.searchSubject
        .pipe(debounceTime(350), distinctUntilChanged())
        .subscribe((value) => {
          this.q = value;
          this.page = 1;
          this.cargar();
        })
    );
    this.cargar();
    this.cargarMetrics();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  cargarMetrics(): void {
    const sub = this.service.metrics().subscribe({
      next: (res) => {
        this.metrics = (res && res.data) || null;
      },
      error: () => {
        this.metrics = null;
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
  setEstado(value: EstadoCotizacion | ""): void {
    this.filtroEstado = value;
    this.page = 1;
    this.cargar();
  }

  onSearch(value: string): void {
    this.searchSubject.next(value || "");
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
      } else if (key === "total") {
        x = a.total || 0;
        y = b.total || 0;
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

  /** Exporta TODAS las cotizaciones del filtro vigente a Excel (no solo la página). */
  exportar(): void {
    this.exporting = true;
    const sub = this.service
      .list({
        estado: this.filtroEstado || undefined,
        q: this.q || undefined,
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
            "Emisión": this.fecha(c.fechaCreacion),
            "Válida hasta": this.fecha(c.fechaVencimiento),
            "Total": c.total || 0,
            "Estado": this.estadoLabel(c.estadoCotizacion),
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
    const cli: any = c.cliente || {};
    return (
      cli.razonSocial ||
      cli.nombre ||
      [cli.nombres_completos, cli.apellidos_completos].filter(Boolean).join(" ") ||
      cli.nombreComercial ||
      cli.documento ||
      "—"
    );
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
