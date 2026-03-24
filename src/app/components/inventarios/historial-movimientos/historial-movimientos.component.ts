import {
  Component,
  OnInit,
  ViewChild,
  OnDestroy,
  HostListener,
} from "@angular/core";
import { InventarioService } from "../../../shared/services/inventarios/inventario.service";
import { Table } from "primeng/table";
import { DatePipe } from "@angular/common";
import { FormBuilder, FormGroup } from "@angular/forms";
import { Router } from "@angular/router";
import { Producto } from "../../productos/model/producto.model";
import { MessageService } from "primeng/api";
import * as XLSX from "xlsx";
import { Bodega } from "../../../shared/models/inventarios/bodega.model";
import { MovimientosResponse, Movimiento } from "../model/movimientoinventario";
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";

@Component({
  selector: "app-historial-movimientos",
  templateUrl: "./historial-movimientos.component.html",
  styleUrls: ["./historial-movimientos.component.scss"],
  providers: [DatePipe, MessageService],
})
export class HistorialMovimientosComponent implements OnInit, OnDestroy {
  @ViewChild("dt") dt: Table;

  movimientos: Movimiento[] = [];
  productos: Producto[] = [];
  bodegas: Bodega[] = [];
  loading: boolean = false;
  formFiltros: FormGroup;
  totalRecords: number = 0;
  rows: number = 10;
  lastDoc: string = "";
  pageLastDocs: { [page: number]: string } = {}; // cursor por página para ir atrás
  currentPage: number = 0;
  mostrarFiltros: boolean = true;
  viewMode: "compact" | "detailed" = "compact"; // Modo de visualización
  selectedMovimiento: Movimiento | null = null; // Movimiento seleccionado

  // Propiedades para debounce en búsqueda global
  private searchSubject = new Subject<string>();
  globalFilterValue: string = "";

  // Propiedad para filtros rápidos por tipo
  selectedTipoFilter: "todos" | "ingreso" | "salida" = "todos";

  // Control de modales
  modalDetalleVisible: boolean = false;
  modalProductoVisible: boolean = false;
  modalBodegaVisible: boolean = false;
  modalOrdenVisible: boolean = false;
  movimientoParaModal: Movimiento | null = null;

  constructor(
    private inventarioService: InventarioService,
    private fb: FormBuilder,
    private datePipe: DatePipe,
    private messageService: MessageService,
    private router: Router,
  ) {
    // Intentar cargar filtros guardados
    const savedFilters = this.loadSavedFilters();

    if (savedFilters) {
      this.formFiltros = this.fb.group(savedFilters);
    } else {
      // Valores por defecto
      const hoy = new Date();
      const haceUnaSemana = new Date();
      haceUnaSemana.setDate(hoy.getDate() - 7);
      this.formFiltros = this.fb.group({
        fechaInicio: [haceUnaSemana],
        fechaFin: [hoy],
        producto: [null],
        bodega: [null],
        orderBy: ["fecha"],
        orderDirection: ["desc"],
      });
    }
  }

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarBodegas();
    // Cargar datos iniciales al entrar a la página
    this.buscarMovimientos();

    // Configurar debounce para búsqueda global
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((searchValue) => {
        this.globalFilterValue = searchValue;
        this.lastDoc = "";
        this.pageLastDocs = {};
        this.currentPage = 0;
        this.buscarMovimientos();
      });
  }

  // Método para cambiar el modo de visualización de la tabla
  setViewMode(mode: "compact" | "detailed"): void {
    this.viewMode = mode;
  }

  toggleFiltros(): void {
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  // Método para aplicar filtros rápidos por tipo de movimiento
  applyTipoFilter(tipo: "todos" | "ingreso" | "salida"): void {
    this.selectedTipoFilter = tipo;
    this.lastDoc = "";
    this.pageLastDocs = {};
    this.currentPage = 0;
    this.buscarMovimientos();
  }

  cargarProductos(): void {
    this.inventarioService.getProductos().subscribe({
      next: (response) => {
        this.productos = response.products;
      },
      error: (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error al cargar los productos",
        });
      },
    });
  }

  cargarBodegas(): void {
    this.inventarioService.getBodegas().subscribe({
      next: (response) => {
        this.bodegas = response;
      },
      error: (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error al cargar las bodegas",
        });
      },
    });
  }

  buscarMovimientos(event?: any): void {
    if (this.formFiltros.valid) {
      this.loading = true;

      // Si no viene de paginación, resetear cursores
      if (!event || !event.first) {
        this.lastDoc = "";
        this.pageLastDocs = {};
        this.currentPage = 0;
      }

      // Guardar filtros antes de buscar
      this.saveFilters();

      const filtros = { ...this.formFiltros.value };

      // Crear objeto limpio para el backend
      const filtrosParaBackend: any = {
        orderBy: filtros.orderBy?.value || filtros.orderBy || 'fecha',
        orderDirection: filtros.orderDirection?.value || filtros.orderDirection || 'desc'
      };

      // Formatear fechas
      if (filtros.fechaInicio) {
        filtrosParaBackend.fechaInicio = this.datePipe.transform(
          filtros.fechaInicio,
          "yyyy-MM-dd",
        );
      }
      if (filtros.fechaFin) {
        filtrosParaBackend.fechaFin = this.datePipe.transform(
          filtros.fechaFin,
          "yyyy-MM-dd",
        );
      }

      // Extraer IDs de los objetos seleccionados
      if (filtros.producto) {
        // cd es el Firestore doc ID (estándar Katuq)
        filtrosParaBackend.productoId = filtros.producto.cd || filtros.producto._id || filtros.producto.id;
      }

      if (filtros.bodega) {
        // idBodega es el business code (estándar Katuq)
        filtrosParaBackend.bodegaId = filtros.bodega.idBodega || filtros.bodega.id;
      }

      // Filtro por tipo (todos/ingreso/salida)
      if (this.selectedTipoFilter !== 'todos') {
        filtrosParaBackend.tipo = this.selectedTipoFilter === 'ingreso' ? 'INGRESO' : 'SALIDA';
      }

      // Búsqueda global
      if (this.globalFilterValue?.trim()) {
        filtrosParaBackend.search = this.globalFilterValue.trim();
      }

      // Agregar paginación
      if (event) {
        filtrosParaBackend.limit = event.rows;
        filtrosParaBackend.lastDoc = this.lastDoc;
      }

      this.inventarioService.getHistorialMovimientos(filtrosParaBackend).subscribe({
        next: (response: MovimientosResponse) => {
          this.movimientos = response.movimientos || [];
          this.totalRecords = response.pagination.total || 0;
          this.lastDoc = response.pagination.lastDoc || "";
          // Guardar cursor de esta página para poder navegar atrás
          if (this.lastDoc) {
            this.pageLastDocs[this.currentPage] = this.lastDoc;
          }
          this.loading = false;
        },
        error: (error) => {
          this.messageService.add({
            severity: "error",
            summary: "Error",
            detail: "Error al cargar el historial de movimientos",
          });
          this.loading = false;
        },
      });
    }
  }

  exportarExcel(): void {
    const filtros = { ...this.formFiltros.value };

    // Crear objeto limpio para el backend
    const filtrosParaBackend: any = {
      orderBy: filtros.orderBy,
      orderDirection: filtros.orderDirection
    };

    // Formatear fechas
    if (filtros.fechaInicio) {
      filtrosParaBackend.fechaInicio = this.datePipe.transform(
        filtros.fechaInicio,
        "yyyy-MM-dd",
      );
    }
    if (filtros.fechaFin) {
      filtrosParaBackend.fechaFin = this.datePipe.transform(
        filtros.fechaFin,
        "yyyy-MM-dd",
      );
    }

    // Extraer IDs de los objetos seleccionados
    if (filtros.producto) {
      // Intentar diferentes propiedades posibles
      filtrosParaBackend.productoId = filtros.producto._id
        || filtros.producto.id
        || filtros.producto.productId
        || filtros.producto.cd;
    }

    if (filtros.bodega) {
      // Intentar diferentes propiedades posibles
      filtrosParaBackend.bodegaId = filtros.bodega.idBodega
        || filtros.bodega.id
        || filtros.bodega._id;
    }

    // Mostrar mensaje de carga
    this.messageService.add({
      severity: "info",
      summary: "Procesando",
      detail: "Preparando exportación a Excel...",
      life: 3000,
    });

    this.inventarioService.getHistorialMovimientos(filtrosParaBackend).subscribe({
      next: (response: MovimientosResponse) => {
        const datosExcel = (response.movimientos || []).map((movimiento) => ({
          Fecha: this.datePipe.transform(
            movimiento.fecha._seconds * 1000,
            "dd/MM/yyyy HH:mm",
          ),
          Producto: movimiento.productDoc?.titulo || "N/A",
          Código: movimiento.producto?.identificacion?.referencia || "N/A",
          Bodega:
            movimiento.bodegaDoc?.nombre || movimiento.bodega?.nombre || "N/A",
          Tipo: movimiento.tipo,
          Cantidad: movimiento.cantidad,
          Observaciones: movimiento.observaciones || "N/A",
          "Orden Compra": movimiento.ordenCompraId || "N/A",
          Usuario: movimiento.usuario,
          Compañía: movimiento.company,
        }));

        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExcel);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial Movimientos");

        const fileName = `historial_movimientos_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, fileName);

        // Mostrar mensaje de éxito
        this.messageService.add({
          severity: "success",
          summary: "Éxito",
          detail: `Archivo ${fileName} exportado correctamente`,
          life: 5000,
        });
      },
      error: (error) => {
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Error al exportar el historial",
        });
      },
    });
  }

  verDocumento(movimiento: Movimiento): void {
    this.selectedMovimiento = null;
    this.movimientoParaModal = movimiento;
    this.modalDetalleVisible = true;
  }

  getTipoMovimientoClass(tipo: string): string {
    if (tipo.includes("INGRESO")) {
      return "badge-success";
    } else if (tipo.includes("SALIDA")) {
      return "badge-danger";
    } else {
      return "badge-secondary";
    }
  }

  clear(table: Table): void {
    table.clear();

    // Resetear formulario con valores predeterminados
    const hoy = new Date();
    const haceUnaSemana = new Date();
    haceUnaSemana.setDate(hoy.getDate() - 7);

    this.formFiltros.reset({
      fechaInicio: haceUnaSemana,
      fechaFin: hoy,
      producto: null,
      bodega: null,
      orderBy: "fecha",
      orderDirection: "desc",
    });

    this.lastDoc = "";
    this.pageLastDocs = {};
    this.currentPage = 0;
    this.selectedMovimiento = null;

    // Limpiar filtros guardados en localStorage
    localStorage.removeItem("historialMovimientos_filtros");

    this.buscarMovimientos();
  }

  onPageChange(event: any): void {
    this.rows = event.rows;
    const newPage = Math.floor((event.first || 0) / event.rows);

    // Si vamos a una página que ya visitamos, usar su cursor
    if (newPage > 0 && this.pageLastDocs[newPage - 1]) {
      this.lastDoc = this.pageLastDocs[newPage - 1];
    } else if (newPage === 0) {
      this.lastDoc = "";
    }

    this.currentPage = newPage;
    this.buscarMovimientos(event);
  }

  onGlobalFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.globalFilterValue = value;
    this.searchSubject.next(value);
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  // Control del menú de acciones
  toggleActionMenu(event: Event, movimiento: Movimiento): void {
    event.stopPropagation();

    if (this.selectedMovimiento?.id === movimiento.id) {
      this.selectedMovimiento = null;
    } else {
      this.selectedMovimiento = movimiento;

      // Posicionar el menú correctamente
      setTimeout(() => {
        const button = event.target as HTMLElement;
        const btnElement = button.closest(".btn-options") as HTMLElement;
        const menu = btnElement?.parentElement?.querySelector(
          ".list-actions",
        ) as HTMLElement;

        if (menu && btnElement) {
          const rect = btnElement.getBoundingClientRect();
          menu.style.top = `${rect.bottom + 5}px`;
          menu.style.left = `${rect.left - 170}px`; // Alinear a la derecha del botón
        }
      }, 0);
    }
  }

  verProducto(movimiento: Movimiento): void {
    this.selectedMovimiento = null;
    this.movimientoParaModal = movimiento;
    this.modalProductoVisible = true;
  }

  verBodega(movimiento: Movimiento): void {
    this.selectedMovimiento = null;
    this.movimientoParaModal = movimiento;
    this.modalBodegaVisible = true;
  }

  verOrdenCompra(movimiento: Movimiento): void {
    this.selectedMovimiento = null;

    if (movimiento.ordenCompraId) {
      this.movimientoParaModal = movimiento;
      this.modalOrdenVisible = true;
    } else {
      this.messageService.add({
        severity: "warn",
        summary: "Orden no disponible",
        detail: "No hay orden de compra asociada a este movimiento",
        life: 3000,
      });
    }
  }

  exportarMovimiento(movimiento: Movimiento): void {
    this.selectedMovimiento = null;

    const datosExcel = [
      {
        Fecha: this.datePipe.transform(
          movimiento.fecha._seconds * 1000,
          "dd/MM/yyyy HH:mm",
        ),
        Producto: movimiento.producto?.crearProducto?.titulo || "N/A",
        Código: movimiento.producto?.identificacion?.referencia || "N/A",
        Bodega:
          movimiento.bodegaDoc?.nombre || movimiento.bodega?.nombre || "N/A",
        Tipo: movimiento.tipo,
        Cantidad: movimiento.cantidad,
        Observaciones: movimiento.observaciones || "N/A",
        "Orden Compra": movimiento.ordenCompraId || "N/A",
        Usuario: movimiento.usuario,
      },
    ];

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExcel);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimiento");

    const fileName = `movimiento_${movimiento.id}_${new Date().getTime()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    this.messageService.add({
      severity: "success",
      summary: "Exportado",
      detail: `Movimiento exportado correctamente`,
      life: 3000,
    });
  }

  // Cerrar menú al hacer clic fuera
  @HostListener("document:click", ["$event"])
  clickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest(".hover-container")) {
      this.selectedMovimiento = null;
    }
  }

  // Ordenamiento personalizado
  customSort(event: any): void {
    event.data.sort((data1: any, data2: any) => {
      let value1 = data1[event.field];
      let value2 = data2[event.field];
      let result = null;

      // Manejar ordenamiento de fechas (objetos Firestore con _seconds)
      if (event.field === "fecha") {
        value1 = data1.fecha._seconds;
        value2 = data2.fecha._seconds;
      }
      // Manejar ordenamiento de productos
      else if (event.field === "producto") {
        value1 = data1.producto?.crearProducto?.titulo?.toLowerCase() || "";
        value2 = data2.producto?.crearProducto?.titulo?.toLowerCase() || "";
      }
      // Ordenamiento estándar para otros campos
      else {
        if (value1 == null && value2 != null) {
          result = -1;
        } else if (value1 != null && value2 == null) {
          result = 1;
        } else if (value1 == null && value2 == null) {
          result = 0;
        } else if (typeof value1 === "string" && typeof value2 === "string") {
          result = value1.localeCompare(value2);
        } else {
          result = value1 < value2 ? -1 : value1 > value2 ? 1 : 0;
        }

        return event.order * result;
      }

      // Para fechas y productos
      if (value1 == null && value2 != null) {
        result = -1;
      } else if (value1 != null && value2 == null) {
        result = 1;
      } else if (value1 == null && value2 == null) {
        result = 0;
      } else {
        result = value1 < value2 ? -1 : value1 > value2 ? 1 : 0;
      }

      return event.order * result;
    });
  }

  // Métodos para persistencia de filtros
  private loadSavedFilters(): any {
    try {
      const saved = localStorage.getItem("historialMovimientos_filtros");
      if (saved) {
        const filters = JSON.parse(saved);
        // Convertir strings de fecha a Date objects
        if (filters.fechaInicio) {
          filters.fechaInicio = new Date(filters.fechaInicio);
        }
        if (filters.fechaFin) {
          filters.fechaFin = new Date(filters.fechaFin);
        }
        return filters;
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
    return null;
  }

  private saveFilters(): void {
    try {
      const filtersToSave = {
        ...this.formFiltros.value,
        fechaInicio: this.formFiltros.value.fechaInicio?.toISOString(),
        fechaFin: this.formFiltros.value.fechaFin?.toISOString(),
      };
      localStorage.setItem(
        "historialMovimientos_filtros",
        JSON.stringify(filtersToSave),
      );
    } catch (error) {
      console.error("Error saving filters:", error);
    }
  }
}
