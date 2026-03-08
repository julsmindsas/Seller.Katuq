import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
  AfterViewInit,
  HostListener,
  OnDestroy,
  ChangeDetectorRef,
} from "@angular/core";
import {
  trigger,
  state,
  style,
  transition,
  animate,
} from "@angular/animations";
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import {
  Carrito,
  Cliente,
  EstadoPago,
  EstadoProceso,
  EstadoProcesoFiltros,
  Pedido,
} from "../modelo/pedido";
import { Table } from "primeng/table";
import { PaymentService } from "../../../shared/services/ventas/payment.service";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { jsPDF } from "jspdf";
import { ActivatedRoute } from "@angular/router";
// import * as jsPDF from 'jspdf';
import html2canvas from "html2canvas";
import { ClientesComponent } from "../clientes/clientes.component";
import Swal from "sweetalert2";
import { FormBuilder, Validators } from "@angular/forms";
import { PedidoEntregaComponent } from "../entrega/pedido-entrega.component";
import { PedidosUtilService } from "../service/pedidos.util.service";
import { UserLogged } from "../../../shared/models/User/UserLogged";
import { UserLite } from "../../../shared/models/User/UserLite";
import { FilterService, LazyLoadEvent, MenuItem } from "primeng/api";
import { FilterService as SharedFilterService } from "../../../shared/services/filters/filter.service";
import { ServiciosService } from "../../../shared/services/servicios.service";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";
import { ToastrService } from "ngx-toastr";
import { LoaderService } from "../../../shared/services/loader.service";

import { ColumnDefinition } from "../interfaces/column-definition.interface";
import * as XLSX from "xlsx";
import { EcomerceProductsComponent } from "../catalogo/ecomerce-products/ecomerce-products.component";
import { PedidoEntrega } from "../../despachos/interfaces/pedido-entrega.interface";
import { Subject, forkJoin, of } from "rxjs";
import { debounceTime, distinctUntilChanged, takeUntil } from "rxjs/operators";
import { OrdenVentaComponent } from "../orden-venta/orden-venta.component";
import { IntegrationsService } from "../../integrations/integrations.service";

@Component({
  selector: "app-list-orders",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
  animations: [
    trigger("slideInOut", [
      transition(":enter", [
        style({ transform: "translateY(-100%)", opacity: 0 }),
        animate(
          "200ms ease-in",
          style({ transform: "translateY(0)", opacity: 1 }),
        ),
      ]),
      transition(":leave", [
        animate(
          "200ms ease-out",
          style({ transform: "translateY(-100%)", opacity: 0 }),
        ),
      ]),
    ]),
  ],
})
export class ListOrdersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("clientes", { static: false }) clientes: ClientesComponent;
  @ViewChild("entrega", { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild("htmlPdf", { static: true }) htmlPdf: ElementRef;
  @ViewChild("sharedFilters", { static: false }) sharedFilters: any;
  @ViewChild("ordenVentaTemplate", { static: false }) ordenVentaTemplate: any;
  @ViewChild("ordenVentaContainer", { static: false }) ordenVentaContainer: ElementRef;

  // Referencias a modales para menú de opciones rápidas
  @ViewChild("modalContent", { static: false }) modalContentRef: any;
  @ViewChild("clientesModal", { static: false }) clientesModalRef: any;
  @ViewChild("notasModal", { static: false }) notasModalRef: any;

  @ViewChild("fechaInicialCtrl", { static: false })
  fechaInicialCtrl: ElementRef;
  @ViewChild("fechaFinalCtrl", { static: false }) fechaFinalCtrl: ElementRef;

  @Output() producirPedido = new EventEmitter<Pedido>();
  @ViewChild("dt1") table: Table;
  @Input() isFromProduction: boolean = false;
  orders: Pedido[] = [];
  loading: boolean = false; // ✅ CAMBIO: No mostrar loading inicialmente
  totalValorProductoBruto: number;
  totalDescuento: number;
  htmlModal: any;
  clienteSeleccionado: Cliente;
  formulario: any;
  pedidoSeleccionado: Pedido;
  pedidoParaOrdenVenta: Pedido | null = null; // Pedido para el componente de orden de venta

  // Menú de opciones dropdown (3 puntos)
  rowMenuItems: MenuItem[] = [];
  selectedMenuPedido: any;
  datosEntregaDelCliente: any[] = [];
  estadosPago = Object.values(EstadoPago);
  ciudadSeleccionada: any;

  // Integración de facturación electrónica
  hasInvoicingIntegration: boolean = false;

  // Variables temporales para el modal de cambio de estado
  tempEstadoPago: EstadoPago;
  tempEstadoProceso: EstadoProceso;
  originalEstadoPago: EstadoPago;
  originalEstadoProceso: EstadoProceso;

  // ------ NUEVAS PROPIEDADES PARA FILTRAR POR BODEGA Y CIUDAD EN RECOMPRA ------
  public bodegas: any[] = [];
  public selectedWarehouse: any = null; // objeto de bodega seleccionado
  @ViewChild("recompra", { static: false })
  recompraCmp: EcomerceProductsComponent;

  // --- Ciudades de entrega para el selector en el modal de recompra ---
  public ciudadesEntrega: any[] = [];

  // 1. Agregar propiedad para guardar el scroll
  private lastScrollTop = 0;
  // Reemplazar la propiedad de scroll simple por una pila
  private scrollStack: number[] = [];
  private tableScrollStack: number[] = [];

  productoSeleccionado: any;

  // Propiedades para búsqueda mejorada
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  isSearching: boolean = false;
  searchError: string | null = null;
  searchMinLength: number = 2;
  searchDebounceTime: number = 300;

  // Propiedades para búsqueda local adicional
  localSearchQuery: string = "";
  filteredOrders: Pedido[] = [];
  isLocalSearchActive: boolean = false;
  originalOrders: Pedido[] = [];
  hasLoadedOrdersOnce: boolean = false;

  // Propiedades para paginación del servidor
  usePagination: boolean = true;
  currentPage: number = 1;
  pageSize: number = 50;
  totalRecords: number = 0;
  first: number = 0;
  
  // Métricas del backend (calculadas sobre todos los pedidos, no solo los paginados)
  backendMetrics: any = null;

  // Skeleton loading - array para generar filas de placeholder
  skeletonRows = Array(10).fill(0);

  // Filtros de columna para server-side filtering
  private columnFilters: any = {};

  // Debouncing para filtros de columna (copiado de tabla-pedidos)
  private filterSubject = new Subject<{ value: string, filterCallback: Function }>();
  private filterSubscription: any;

  ngAfterViewInit() {
    // Con lazy loading, mostrar skeleton inmediatamente y forzar carga
    if (this.usePagination) {
      // Mostrar loading/skeleton inmediatamente
      this.loading = true;

      // Usar requestAnimationFrame en lugar de setTimeout para carga más rápida
      requestAnimationFrame(() => {
        if (this.orders.length === 0 && this.totalRecords === 0 && this.table) {
          console.log('🔄 Carga inicial inmediata');
          this.loadLazy({
            first: 0,
            rows: this.pageSize
          } as LazyLoadEvent);
        }
      });
    }
  }

  /**
   * Maneja el evento de carga diferida (Lazy Load) de la tabla PrimeNG para paginación del servidor
   */
  loadLazy(event: LazyLoadEvent) {
    if (!this.usePagination) {
      console.log('⏭️ loadLazy omitido - paginación deshabilitada');
      return;
    }

    // Si no hay evento, crear uno por defecto para la primera carga
    if (!event) {
      console.log('⚠️ loadLazy llamado sin evento, creando evento por defecto');
      event = {
        first: 0,
        rows: this.pageSize
      } as LazyLoadEvent;
    }

    const previousPage = this.currentPage;
    const previousFirst = this.first;

    console.log('🔄 loadLazy llamado:', {
      eventFirst: event.first,
      eventRows: event.rows,
      previousPage: previousPage,
      previousFirst: previousFirst,
      sortField: event.sortField,
      sortOrder: event.sortOrder
    });

    // Actualizar tamaño de página si cambió
    if (event.rows) {
      this.pageSize = event.rows;
    }
    
    // Calcular página actual basada en first y rows
    if (event.first !== undefined && event.rows && event.rows > 0) {
      this.currentPage = Math.floor(event.first / event.rows) + 1;
      this.first = event.first;
      // Asegurar que currentPage sea al menos 1
      if (this.currentPage < 1) {
        this.currentPage = 1;
        this.first = 0;
      }
    } else {
      // Valores por defecto si no están definidos
      this.currentPage = 1;
      this.first = 0;
      if (event.rows && event.rows > 0) {
        this.pageSize = event.rows;
      }
    }
    
    // Detectar si realmente cambió la página
    const pageChanged = previousPage !== this.currentPage || previousFirst !== this.first;
    
    console.log('📄 Parámetros de paginación calculados:', {
      previousPage: previousPage,
      newPage: this.currentPage,
      previousFirst: previousFirst,
      newFirst: this.first,
      pageSize: this.pageSize,
      pageChanged: pageChanged,
      refrescoEnProgreso: this.refrescoEnProgreso
    });

    // Capturar ordenamiento si existe
    if (event.sortField) {
      // El ordenamiento se puede manejar aquí si es necesario
      // Por ahora se maneja en el backend
    }

    // ==================== FASE 4: Captura de filtros de columna ====================
    // Capturar filtros de columna para las 4 columnas principales
    // Mapeo de campos del HTML a campos del backend:
    // - nroPedido → nroPedido
    // - cliente.nombres_completos → cliente
    // - envio.ciudad → ciudad
    // - transportador → transportador
    if (event.filters) {
      this.columnFilters = {};

      console.log('📋 Filtros recibidos del evento:', JSON.stringify(event.filters, null, 2));

      // Mapeo de campos HTML → campos backend
      const fieldMapping: { [key: string]: string } = {
        'nroPedido': 'nroPedido',
        'cliente.nombres_completos': 'cliente',
        'envio.ciudad': 'ciudad',
        'transportador': 'transportador',
        'asesorAsignado.name': 'vendedor',
        'estadoPago': 'estadoPago',
        'estadoProceso': 'estadoProceso',
        'horarioEntrega': 'horarioEntrega'
      };

      for (const [htmlField, backendField] of Object.entries(fieldMapping)) {
        const filterData = event.filters[htmlField];
        if (filterData) {
          // PrimeNG 14+ usa arrays de filtros: [{value: 'x', matchMode: 'contains'}]
          // También puede ser un objeto simple: {value: 'x', matchMode: 'contains'}
          let filterValue: any = null;

          if (Array.isArray(filterData)) {
            // Es un array de filtros - tomar el primer filtro con valor
            const activeFilter = filterData.find((f: any) => {
              if (f.value === null || f.value === undefined || f.value === '') return false;
              // Validar arrays vacíos (multiselect sin selección)
              if (Array.isArray(f.value) && f.value.length === 0) return false;
              return true;
            });
            if (activeFilter) {
              filterValue = activeFilter.value;
            }
          } else if (filterData.value !== null && filterData.value !== undefined && filterData.value !== '') {
            // Es un objeto simple - también validar arrays vacíos
            if (Array.isArray(filterData.value) && filterData.value.length === 0) {
              filterValue = null;
            } else {
              filterValue = filterData.value;
            }
          }

          // Solo agregar el filtro si tiene un valor válido (no null, no array vacío)
          if (filterValue && (!Array.isArray(filterValue) || filterValue.length > 0)) {
            this.columnFilters[backendField] = filterValue;
            console.log(`🔍 Filtro de columna capturado: ${htmlField} → ${backendField} = "${JSON.stringify(filterValue)}"`);
          }
        }
      }

      if (Object.keys(this.columnFilters).length > 0) {
        console.log('🎯 Filtros de columna activos para backend:', this.columnFilters);
      }
    }
    // ==============================================================================

    // Llamar a refrescar datos con la nueva página
    // Marcar como cambio de página para evitar bloqueos de protección
    console.log('🚀 Llamando a refrescarDatos con isPageChange=true');
    this.refrescarDatos(false, true);
  }

  /**
   * Handler para filtros de columna con debouncing (copiado de tabla-pedidos)
   * @param event - Input event del campo de filtro
   * @param filterCallback - Función callback de PrimeNG para aplicar el filtro
   */
  onColumnFilterInput(event: Event, filterCallback: Function): void {
    const value = (event.target as HTMLInputElement).value;
    this.filterSubject.next({ value, filterCallback });
  }

  /**
   * Handler para cuando PrimeNG aplica un filtro en la tabla
   * Fuerza recarga desde backend para obtener métricas actualizadas
   * @param event - Evento de filtro de PrimeNG
   */
  onTableFilter(event: any): void {
    console.log('🔍 onTableFilter disparado:', event.filters);

    // Capturar filtros del evento
    if (event.filters) {
      this.captureColumnFilters(event.filters);
    }

    // Si estamos en modo lazy y hay filtros activos, recargar datos del backend
    // para obtener métricas recalculadas sobre los datos filtrados
    if (this.usePagination) {
      const hasActiveFilters = Object.keys(this.columnFilters).length > 0;
      console.log('🎯 Filtros activos:', this.columnFilters, '- Recargando:', hasActiveFilters || Object.keys(event.filters || {}).length > 0);

      // Siempre recargar cuando hay cambio de filtros para actualizar métricas
      this.currentPage = 1; // Reset a primera página
      this.first = 0;
      this.refrescarDatos(false, true);
    }
  }

  /**
   * Extrae filtros del evento de PrimeNG y los mapea al formato del backend
   * @param filters - Objeto de filtros de PrimeNG
   */
  private captureColumnFilters(filters: any): void {
    this.columnFilters = {};

    // Mapeo de campos HTML a campos del backend
    const fieldMapping: { [key: string]: string } = {
      'nroPedido': 'nroPedido',
      'cliente.nombres_completos': 'cliente',
      'envio.ciudad': 'ciudad',
      'transportador': 'transportador',
      'asesorAsignado.name': 'vendedor',
      'estadoPago': 'estadoPagoFilter',
      'estadoProceso': 'estadoProcesoFilter',
      'horarioEntrega': 'horarioEntrega'
    };

    for (const [htmlField, backendField] of Object.entries(fieldMapping)) {
      const filterData = filters[htmlField];
      if (filterData) {
        let filterValue = null;

        // PrimeNG puede enviar filtros como array o como objeto único
        if (Array.isArray(filterData)) {
          const activeFilter = filterData.find((f: any) => f.value != null && f.value !== '');
          if (activeFilter) filterValue = activeFilter.value;
        } else if (filterData.value != null && filterData.value !== '') {
          filterValue = filterData.value;
        }

        if (filterValue) {
          this.columnFilters[backendField] = filterValue;
          console.log(`   📌 Filtro capturado: ${backendField} = "${filterValue}"`);
        }
      }
    }

    console.log('📊 columnFilters final:', this.columnFilters);
  }

  @HostListener("window:scroll", ["$event"])
  onWindowScroll() {
    // No action needed for modal-based options
  }

  @HostListener("window:resize", ["$event"])
  onWindowResize() {
    // No action needed for modal-based options
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: Event) {
    // Modal handles its own click-outside behavior
  }

  /**
   * Maneja el clic en el menú de 3 puntos para mostrar opciones del pedido
   */
  onRowMenuClick(event: Event, menu: any, pedido: any): void {
    this.selectedMenuPedido = pedido;

    // Construir menú dinámicamente según el pedido - Opciones más usadas
    const items: MenuItem[] = [
      {
        label: 'Imprimir PDF',
        icon: 'pi pi-file-pdf',
        command: () => this.pdfOrder(this.modalContentRef, this.selectedMenuPedido)
      },
      {
        label: 'Duplicar',
        icon: 'pi pi-copy',
        command: () => this.duplicarPedido(this.selectedMenuPedido)
      }
    ];

    // Agregar opciones de edición solo si no es desde producción
    if (!this.isFromProduction) {
      items.push(
        {
          label: 'Editar Cliente',
          icon: 'pi pi-user-edit',
          command: () => this.editDatosClientes(this.clientesModalRef, this.selectedMenuPedido)
        }
      );
      
      // Solo mostrar "Editar Notas" si NO es un pedido del POS
      if (!this.isPedidoPOS(this.selectedMenuPedido)) {
        items.push({
          label: 'Editar Notas',
          icon: 'pi pi-pencil',
          command: () => this.editNotas(this.notasModalRef, this.selectedMenuPedido)
        });
      }
    }

    // Agregar opción de producción si aplica
    if (this.isFromProduction) {
      items.push({
        label: 'Producción',
        icon: 'pi pi-sitemap',
        command: () => this.produceOrder(this.selectedMenuPedido)
      });
    }

    // Agregar opción de facturación electrónica si el pedido está pagado y no tiene factura
    if (!this.isFromProduction && this.puedeFacturarSiigo(pedido)) {
      items.push({
        label: 'Facturar',
        icon: 'pi pi-file-export',
        command: () => this.facturarPedidoSiigo(this.selectedMenuPedido)
      });
    }

    // Separador y más opciones al final
    items.push(
      { separator: true },
      {
        label: 'Más opciones...',
        icon: 'pi pi-cog',
        command: () => this.openOptionsModal(this.selectedMenuPedido)
      }
    );

    this.rowMenuItems = items;
    menu.toggle(event);
  }

  openOptionsModal(order: any, producto?: any) {
    this.scrollStack.push(window.scrollY);

    // Capturar scroll de la tabla si existe
    const tableElement = document.querySelector(".p-datatable-scrollable-body");
    if (tableElement) {
      this.tableScrollStack.push(tableElement.scrollTop);
    }

    this.selectedOrder = order;
    if (producto) {
      this.productoSeleccionado = producto;
    }
    this.modalVisible = true;
    document.body.classList.add("modal-open");
  }

  closeOptionsModal() {
    this.modalVisible = false;
    this.selectedOrder = null;
    // Remover la clase CSS para restaurar el scroll
    document.body.classList.remove("modal-open");
    const lastWindowScroll = this.scrollStack.pop();
    const lastTableScroll = this.tableScrollStack.pop();

    if (lastWindowScroll !== undefined) {
      setTimeout(() => {
        window.scrollTo({ top: lastWindowScroll });

        // Restaurar scroll de la tabla si existe
        if (lastTableScroll !== undefined) {
          const tableElement = document.querySelector(
            ".p-datatable-scrollable-body",
          );
          if (tableElement) {
            tableElement.scrollTop = lastTableScroll;
          }
        }
      }, 0);
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeOptionsModal();
    }
  }

  @HostListener("keydown", ["$event"])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && this.modalVisible) {
      this.closeOptionsModal();
    }
  }

  canDeleteOrder(): boolean {
    const authorizedEmails = [
      "jarango@almara.com",
      "danielmauriciogarcia@hotmail.com",
      "dgarciar@gmail.com",
      "gerencia@almara.com.co",
      "danielmauriciog2@hotmail.com",
    ];
    return !!(
      this.UserLogged?.email && authorizedEmails.includes(this.UserLogged.email)
    );
  }

  /**
   * Verifica si el pedido está congelado según los grupos de estados
   * GRUPO 1: EnProduccion, ProducidoParcialmente, ProducidoTotalmente, Empacado, Despachado
   * GRUPO 2: Entregado, Cerrado
   * @param order Pedido a verificar
   * @returns true si está congelado, false si permite modificaciones
   */
  isPedidoCongelado(order: Pedido): boolean {
    if (!order || !order.estadoProceso) {
      return false;
    }

    const estadosGrupo1 = [
      EstadoProcesoFiltros.EnProduccion,
      EstadoProcesoFiltros.ProducidoParcialmente,
      EstadoProcesoFiltros.ProducidoTotalmente,
      EstadoProcesoFiltros.Empacado,
      EstadoProcesoFiltros.Despachado,
    ];

    const estadosGrupo2 = [
      EstadoProcesoFiltros.Entregado,
      EstadoProcesoFiltros.Cerrado,
    ];

    return (
      estadosGrupo1.includes(
        order.estadoProceso as unknown as EstadoProcesoFiltros,
      ) ||
      estadosGrupo2.includes(
        order.estadoProceso as unknown as EstadoProcesoFiltros,
      )
    );
  }

  /**
   * Verifica si el pedido está en GRUPO 1 (congelamiento parcial)
   * Estados: EnProduccion, ProducidoParcialmente, ProducidoTotalmente, Empacado, Despachado
   * @param order Pedido a verificar
   * @returns true si está en grupo 1
   */
  isPedidoGrupo1(order: Pedido): boolean {
    if (!order || !order.estadoProceso) {
      return false;
    }

    const estadosGrupo1 = [
      EstadoProcesoFiltros.EnProduccion,
      EstadoProcesoFiltros.ProducidoParcialmente,
      EstadoProcesoFiltros.ProducidoTotalmente,
      EstadoProcesoFiltros.Empacado,
      EstadoProcesoFiltros.Despachado,
    ];

    return estadosGrupo1.includes(
      order.estadoProceso as unknown as EstadoProcesoFiltros,
    );
  }

  /**
   * Verifica si el pedido está en GRUPO 2 (congelamiento total)
   * Estados: Entregado, Cerrado
   * @param order Pedido a verificar
   * @returns true si está en grupo 2
   */
  isPedidoGrupo2(order: Pedido): boolean {
    if (!order || !order.estadoProceso) {
      return false;
    }

    const estadosGrupo2 = [
      EstadoProcesoFiltros.Entregado,
      EstadoProcesoFiltros.Cerrado,
    ];

    return estadosGrupo2.includes(
      order.estadoProceso as unknown as EstadoProcesoFiltros,
    );
  }

  /**
   * Verifica si se pueden modificar productos del pedido
   * Los productos se pueden modificar solo si NO está congelado
   * @param order Pedido a verificar
   * @returns true si se pueden modificar productos, false si no
   */
  canModifyProducts(order: Pedido): boolean {
    return !this.isPedidoCongelado(order);
  }

  /**
   * Verifica si se pueden ELIMINAR productos del pedido
   * SOLO se pueden eliminar productos si el pedido está en estado "Pendiente" o "SinProducir"
   * @param order Pedido a verificar
   * @returns true si se pueden eliminar productos, false si no
   */
  canDeleteProducts(order: Pedido): boolean {
    if (!order) {
      return false;
    }

    // Permitir eliminación si el pago está pendiente O si el proceso no ha iniciado
    const pagoPermitido = order.estadoPago === "Pendiente";
    const procesoPermitido = order.estadoProceso === "SinProducir";

    return pagoPermitido || procesoPermitido;
  }

  /**
   * Verifica si un producto es "fantasma" (tiene valores null que causan problemas)
   * @param item Producto del carrito a verificar
   * @returns true si el producto es fantasma y debe permitirse su eliminación
   */
  isGhostProduct(item: Carrito): boolean {
    if (!item || !item.producto) {
      return true;
    }

    // Verificar si el producto tiene propiedades críticas como null
    const producto = item.producto;

    // Si el título del producto es null, es un producto fantasma
    if (
      !producto.crearProducto?.titulo ||
      producto.crearProducto.titulo === "null"
    ) {
      return true;
    }

    // Si la referencia es null, es un producto fantasma
    if (
      !producto.identificacion?.referencia ||
      producto.identificacion.referencia === "null"
    ) {
      return true;
    }

    // Si el precio es null o 0, podría ser un producto fantasma
    if (
      !producto.precio?.precioUnitarioConIva ||
      producto.precio.precioUnitarioConIva === 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * Genera el título del tooltip para el botón de eliminación
   * @param item Producto del carrito
   * @param pedido Pedido al que pertenece
   * @returns Mensaje del tooltip
   */
  getDeleteButtonTitle(item: Carrito, pedido: Pedido): string {
    if (this.isGhostProduct(item)) {
      return "Eliminar producto fantasma (producto con datos corruptos)";
    }

    if (this.canDeleteProducts(pedido)) {
      return "Eliminar producto";
    }

    return `No se puede eliminar - Solo permitido en estados Pendiente o SinProducir. Estado actual: ${pedido.estadoProceso}`;
  }

  /**
   * Verifica si se pueden editar notas de producción
   * Solo se pueden editar si NO está en GRUPO 1
   * @param order Pedido a verificar
   * @returns true si se pueden editar notas de producción
   */
  canEditProductionNotes(order: Pedido): boolean {
    return !this.isPedidoGrupo1(order);
  }

  /**
   * Verifica si un pedido es del POS (Punto de Venta)
   * Los pedidos del POS tienen typeOrder = 'POS'
   * @param pedido Pedido a verificar
   * @returns true si el pedido es del POS
   */
  isPedidoPOS(pedido: Pedido): boolean {
    return pedido?.typeOrder === 'POS';
  }

  /**
   * Verifica si hay una integración de facturación electrónica configurada
   */
  private checkInvoicingIntegration(): void {
    console.log('🔄 [List] Verificando integración de facturación...');
    this.integrationsService.loadSiigoConfig().subscribe({
      next: (response) => {
        console.log('📦 [List] Respuesta de Siigo config:', response);

        // La respuesta del backend tiene estructura:
        // { success: true, config: { provider, config: { username, ... }, status } }
        // NOTA: accessKey no se envía al frontend por seguridad
        const siigoConfig = response?.config;
        const credentials = siigoConfig?.config;

        // Verificar si hay configuración válida:
        // - Debe existir la config
        // - Debe tener username (el accessKey está en el backend pero no se envía por seguridad)
        // - El status debe ser "active" o enabled debe ser true
        const isConfigured = siigoConfig &&
                            credentials?.username &&
                            (siigoConfig.status === 'active' || credentials.enabled === true);

        if (isConfigured) {
          this.hasInvoicingIntegration = true;
          console.log('✅ [List] Integración Siigo detectada - username:', credentials.username, '- status:', siigoConfig.status);
        } else {
          this.hasInvoicingIntegration = false;
          console.log('⚠️ [List] Siigo no está correctamente configurado');
        }
      },
      error: (err) => {
        // Si hay error (404 o cualquier otro), no hay integración configurada
        this.hasInvoicingIntegration = false;
        console.log('ℹ️ [List] No hay integración Siigo configurada:', err?.status || err?.message);
      }
    });
  }

  /**
   * Verifica si un pedido puede ser facturado electrónicamente
   * Condiciones:
   * - Debe haber una integración de facturación configurada
   * - El pago debe estar aprobado o pre-aprobado
   * - No debe tener ya una factura generada
   * @param pedido Pedido a verificar
   * @returns true si se puede facturar
   */
  puedeFacturarSiigo(pedido: Pedido): boolean {
    console.log('🔍 [puedeFacturarSiigo] Verificando pedido:', pedido?.nroPedido);
    console.log('   - hasInvoicingIntegration:', this.hasInvoicingIntegration);
    console.log('   - estadoPago:', pedido?.estadoPago);
    console.log('   - nroFactura:', pedido?.nroFactura);
    console.log('   - pdfUrlInvoice:', pedido?.pdfUrlInvoice);
    console.log('   - isFromProduction:', this.isFromProduction);

    // Verificar si hay integración de facturación configurada
    if (!this.hasInvoicingIntegration) {
      console.log('   ❌ No hay integración de facturación');
      return false;
    }
    // Solo pedidos con pago aprobado o pre-aprobado
    const estadosPermitidos = [EstadoPago.Aprobado, EstadoPago.PreAprobado];
    if (!estadosPermitidos.includes(pedido?.estadoPago as EstadoPago)) {
      console.log('   ❌ Estado de pago no permitido:', pedido?.estadoPago, 'Permitidos:', estadosPermitidos);
      return false;
    }
    // No mostrar si ya tiene factura (verificar por nroFactura o pdfUrlInvoice)
    if (pedido?.nroFactura || pedido?.pdfUrlInvoice) {
      console.log('   ❌ Ya tiene factura');
      return false;
    }
    console.log('   ✅ Puede facturar');
    return true;
  }

  /**
   * Genera una factura electrónica para un pedido
   * @param pedido Pedido a facturar
   */
  facturarPedidoSiigo(pedido: Pedido): void {
    // Cargar tipos de documento de Siigo primero
    Swal.fire({
      title: 'Cargando tipos de documento...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.integrationsService.getSiigoDocumentTypes().subscribe({
      next: (response) => {
        Swal.close();
        console.log('📄 [Siigo] Respuesta document-types:', response);

        // El backend devuelve { success, data: { documentTypes: [...] } }
        let documentTypes: any[] = [];
        if (Array.isArray(response?.data?.documentTypes)) {
          documentTypes = response.data.documentTypes;
        } else if (Array.isArray(response?.data?.data?.documentTypes)) {
          documentTypes = response.data.data.documentTypes;
        } else if (Array.isArray(response?.data)) {
          documentTypes = response.data;
        } else if (Array.isArray(response?.documentTypes)) {
          documentTypes = response.documentTypes;
        } else if (Array.isArray(response)) {
          documentTypes = response;
        }

        console.log('📄 [Siigo] Document types procesados:', documentTypes);

        if (!documentTypes || documentTypes.length === 0) {
          Swal.fire({
            title: 'Error',
            text: 'No se encontraron tipos de documento en Siigo. Verifique la configuración.',
            icon: 'error'
          });
          return;
        }

        // Construir opciones para el select
        const inputOptions: { [key: string]: string } = {};
        documentTypes.forEach((dt: any) => {
          // Siigo devuelve 'id' y 'name'
          const id = dt.id;
          const name = dt.name || `Documento ${id}`;
          if (id) {
            inputOptions[id] = `${name}`;
          }
        });

        // Mostrar modal con selector de tipo de documento
        Swal.fire({
          title: '¿Generar Factura Electrónica?',
          html: `
            <p>Se generará una factura electrónica para el pedido:</p>
            <p><strong>${pedido.nroPedido}</strong></p>
            <p class="text-muted">Cliente: ${pedido.cliente?.nombres_completos || 'N/A'}</p>
            <p class="text-muted">Total: $${(pedido.subtotal || 0).toLocaleString()}</p>
            <hr>
            <p><strong>Seleccione el tipo de documento:</strong></p>
          `,
          input: 'select',
          inputOptions: inputOptions,
          inputPlaceholder: 'Seleccione un tipo de documento',
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Generar factura',
          cancelButtonText: 'Cancelar',
          inputValidator: (value) => {
            if (!value) {
              return 'Debe seleccionar un tipo de documento';
            }
            return null;
          }
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            const selectedDocumentTypeId = parseInt(result.value, 10);
            this.ejecutarFacturacionSiigo(pedido, selectedDocumentTypeId);
          }
        });
      },
      error: (error) => {
        Swal.close();
        console.error('Error cargando tipos de documento:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los tipos de documento de Siigo',
          icon: 'error'
        });
      }
    });
  }

  /**
   * Ejecuta la facturación electrónica
   * Utiliza el nuevo endpoint que maneja automáticamente:
   * 1. Obtención del pedido completo
   * 2. Verificación/creación del cliente en Siigo
   * 3. Transformación del pedido a factura
   * 4. Actualización del pedido con datos de facturación
   *
   * @param pedido Pedido a facturar
   */
  private ejecutarFacturacionSiigo(pedido: Pedido, documentTypeId?: number): void {
    // Mostrar loader
    Swal.fire({
      title: 'Generando factura...',
      html: `
        <p>Por favor espere mientras se procesa la facturación electrónica.</p>
        <p class="text-muted small">Verificando cliente y creando factura en Siigo...</p>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Preparar opciones con el tipo de documento seleccionado
    const options = documentTypeId ? { documentTypeId } : undefined;

    // Usar el nuevo método que maneja todo el flujo automáticamente
    this.integrationsService.createSiigoInvoiceFromOrder(pedido._id, options).subscribe({
      next: (response: any) => {
        Swal.close();

        if (response.success) {
          // Actualizar el pedido en la lista con la información de la factura
          const invoiceData = response.data?.invoice || response.invoice;
          const customerData = response.data?.customer || response.customer;
          const productsData = response.data?.products || response.products;

          if (invoiceData) {
            pedido.nroFactura = invoiceData.number || invoiceData.id;
            pedido.pdfUrlInvoice = invoiceData.pdfUrl;
          }

          // Construir mensaje de éxito
          let successHtml = '<p>La factura electrónica se ha creado exitosamente.</p>';

          if (invoiceData?.number) {
            successHtml += `<p><strong>Número de factura:</strong> ${invoiceData.number}</p>`;
          }

          // Mostrar información de sincronización
          const syncItems: string[] = [];

          if (customerData?.created) {
            syncItems.push('<i class="fa fa-user-plus text-success"></i> Cliente creado');
          }

          if (productsData?.created > 0) {
            syncItems.push(`<i class="fa fa-cube text-success"></i> ${productsData.created} producto(s) creado(s)`);
          }

          if (syncItems.length > 0) {
            successHtml += `<div class="alert alert-info mt-2 p-2 small">
              <strong>Sincronizado con Siigo:</strong><br>
              ${syncItems.join('<br>')}
            </div>`;
          }

          if (invoiceData?.pdfUrl) {
            successHtml += `<p><a href="${invoiceData.pdfUrl}" target="_blank" class="btn btn-sm btn-primary mt-2"><i class="fa fa-file-pdf-o"></i> Ver PDF</a></p>`;
          }

          Swal.fire({
            title: '¡Factura Generada!',
            html: successHtml,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });

          // Refrescar la lista
          this.refrescar(this.table);
        } else {
          Swal.fire({
            title: 'Error',
            text: response.message || 'No se pudo generar la factura',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error) => {
        Swal.close();
        console.error('Error al facturar pedido:', error);

        // Extraer mensaje de error más específico
        const errorMessage = error.error?.message || error.message || 'Error desconocido';
        const errorDetails = error.error?.details;

        let errorHtml = `<p>No se pudo generar la factura electrónica.</p>`;
        errorHtml += `<p class="text-danger">${errorMessage}</p>`;

        // Mostrar sugerencias si el error es sobre configuración
        if (errorMessage.includes('documento') || errorMessage.includes('cliente')) {
          errorHtml += `<p class="text-muted small mt-2">
            <i class="fa fa-info-circle"></i> Verifique que el cliente tenga número de documento configurado en los datos de facturación.
          </p>`;
        } else if (errorMessage.includes('configuración') || errorMessage.includes('documentTypeId')) {
          errorHtml += `<p class="text-muted small mt-2">
            <i class="fa fa-info-circle"></i> Verifique la configuración de Siigo en Integraciones → Contabilidad.
          </p>`;
        }

        Swal.fire({
          title: 'Error de Facturación',
          html: errorHtml,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  /**
   * Verifica si se pueden agregar productos al pedido
   * Solo se pueden agregar si NO está congelado
   * @param order Pedido a verificar
   * @returns true si se pueden agregar productos
   */
  canAddProducts(order: Pedido): boolean {
    return !this.isPedidoCongelado(order);
  }

  /**
   * Verifica si se pueden editar observaciones de personalización
   * Solo se pueden editar si NO está en GRUPO 1
   * @param order Pedido a verificar
   * @returns true si se pueden editar observaciones
   */
  canEditCustomizationObservations(order: Pedido): boolean {
    return !this.isPedidoGrupo1(order);
  }

  /**
   * Verifica si se pueden editar preferencias de producto
   * Solo se pueden editar si NO está en GRUPO 1
   * @param order Pedido a verificar
   * @returns true si se pueden editar preferencias
   */
  canEditProductPreferences(order: Pedido): boolean {
    return !this.isPedidoGrupo1(order);
  }

  /**
   * Verifica si se pueden editar adiciones del producto
   * Solo se pueden editar si NO está en GRUPO 1
   * @param order Pedido a verificar
   * @returns true si se pueden editar adiciones
   */
  canEditProductAdditions(order: Pedido): boolean {
    return !this.isPedidoGrupo1(order);
  }

  /**
   * Verifica si se pueden editar cantidades del producto
   * Solo se pueden editar si NO está en GRUPO 1
   * @param order Pedido a verificar
   * @returns true si se pueden editar cantidades
   */
  canEditProductQuantities(order: Pedido): boolean {
    return !this.isPedidoGrupo1(order);
  }

  /**
   * Verifica si se puede editar la dirección de entrega
   * Solo se puede editar si NO está en GRUPO 2
   * @param order Pedido a verificar
   * @returns true si se puede editar dirección de entrega
   */
  canEditDeliveryAddress(order: Pedido): boolean {
    return !this.isPedidoGrupo2(order);
  }

  /**
   * Verifica si se puede editar la dirección de entrega basado en la forma de entrega
   * @param order Pedido a verificar
   * @returns true si se puede editar (solo si forma de entrega contiene "domicilio")
   */
  canEditDeliveryAddressByDeliveryType(order: Pedido): boolean {
    // Si no hay forma de entrega definida, permitir edición por defecto
    if (!order?.formaEntrega) return true;

    const formaEntregaLower = order.formaEntrega.toLowerCase();

    // Bloquear SOLO si contiene "recoge" (recoge en tienda no necesita dirección)
    if (formaEntregaLower.includes("recoge")) {
      return false;
    }

    // Permitir edición para domicilio y cualquier otra forma de entrega
    return true;
  }

  /**
   * Verifica si se pueden editar datos básicos del pedido (cliente, entrega, facturación)
   * Los datos básicos pueden modificarse incluso en pedidos congelados, excepto dirección en GRUPO 2
   * @param order Pedido a verificar
   * @returns true si se pueden modificar datos básicos
   */
  canModifyBasicData(order: Pedido): boolean {
    // Solo se prohíbe modificar datos básicos si el pedido está en GRUPO 2
    return !this.isPedidoGrupo2(order);
  }

  /**
   * Verifica si se puede editar la facturación
   * Siempre disponible, excepto cuando se haya generado la factura
   * @param order Pedido a verificar
   * @returns true si se puede editar facturación
   */
  canEditBilling(order: Pedido): boolean {
    // TODO: Implementar lógica cuando se tenga el módulo de facturación
    // Por ahora siempre permite editar
    return true;
  }

  /**
   * Verifica si se puede ver el historial de pagos
   * Siempre disponible para ver, pero no para editar cuando se administre desde tesorería
   * @param order Pedido a verificar
   * @returns true si se puede ver historial de pagos
   */
  canViewPaymentHistory(order: Pedido): boolean {
    // TODO: Implementar lógica cuando se tenga el módulo de tesorería
    // Por ahora siempre permite ver
    return true;
  }

  /**
   * Verifica si el usuario tiene rol de administrador
   */
  isAdminUser(): boolean {
    if (!this.UserLogged || !this.UserLogged.rol) {
      return false;
    }
    const rol = this.UserLogged.rol.toLowerCase();
    return rol.includes("admin") || rol.includes("administrador");
  }

  /**
   * Verifica si el usuario puede cambiar el estado del pedido
   * Permitido para: Super Admins (lista hardcodeada) O Administradores (rol)
   */
  canChangeStatus(): boolean {
    return this.canDeleteOrder() || this.isAdminUser();
  }

  /**
   * Verifica si se puede editar el estado de pago
   * Solo administradores pueden modificar estados de pago
   * @param order Pedido a verificar
   * @returns true si se puede editar estado de pago
   */
  canEditPaymentStatus(order: Pedido): boolean {
    return this.canChangeStatus();
  }

  /**
   * Verifica si se puede editar el estado de proceso
   * Solo administradores pueden modificar estados de proceso
   * @param order Pedido a verificar
   * @returns true si se puede editar estado de proceso
   */
  canEditProcessStatus(order: Pedido): boolean {
    if (this.isFromProduction) {
      return this.canProductionChangeProcess(order);
    }
    return this.canChangeStatus();
  }

  /** Permite cambio de proceso en módulo de producción entre 4 estados básicos si no está bloqueado */
  canProductionChangeProcess(order: Pedido): boolean {
    if (!order || !order.estadoProceso) return false;
    const bloqueados = [
      EstadoProcesoFiltros.Empacado,
      EstadoProcesoFiltros.Despachado,
      EstadoProcesoFiltros.Entregado,
      EstadoProcesoFiltros.Cerrado,
    ];
    return !bloqueados.includes(
      order.estadoProceso as unknown as EstadoProcesoFiltros,
    );
  }

  /**
   * Devuelve estados de pago disponibles según permisos
   * - Super Admin/Admin: TODOS los estados
   * - Vendedores: Pendiente, Pospendiente, PreAprobado, Aprobado
   */
  getAvailablePaymentStates(): EstadoPago[] {
    // Super admins y administradores ven todos los estados
    if (this.canDeleteOrder() || this.isAdminUser()) {
      return this.estadosPago as EstadoPago[];
    }
    // Vendedores ven estados básicos (sin Rechazado, Precancelado, Cancelado)
    return [
      EstadoPago.Pendiente,
      EstadoPago.Pospendiente,
      EstadoPago.PreAprobado,
      EstadoPago.Aprobado
    ];
  }

  /**
   * Verifica si se puede asignar un asesor diferente
   * Solo administradores pueden asignar asesores
   * @param order Pedido a verificar
   * @returns true si se puede asignar asesor
   */
  canAssignSeller(order: Pedido): boolean {
    // Solo administradores pueden asignar asesores
    // Usa includes() para soportar variantes como "ADMINISTRADOR FULL OH"
    if (!this.UserLogged?.rol) return false;
    const rol = this.UserLogged.rol.toLowerCase();
    return rol.includes("admin") || rol.includes("administrador");
  }

  /**
   * Obtiene el número de orden externa de WooCommerce o Shopify
   * @param pedido Pedido a verificar
   * @returns Número de orden con prefijo (ej: "WC-1001") o null
   */
  getExternalOrderNumber(pedido: Pedido): string | null {
    if (!pedido.integrations) {
      return null;
    }
    if (pedido.integrations.woocommerce?.orderNumber) {
      return `WC-${pedido.integrations.woocommerce.orderNumber}`;
    }
    if (pedido.integrations.shopify?.orderNumber) {
      return `SH-${pedido.integrations.shopify.orderNumber}`;
    }
    return null;
  }

  /**
   * Verifica si el pedido tiene integración externa
   * @param pedido Pedido a verificar
   * @returns true si tiene integración con WooCommerce o Shopify
   */
  hasExternalIntegration(pedido: Pedido): boolean {
    return this.getExternalOrderNumber(pedido) !== null;
  }

  /**
   * Obtiene el nombre de la plataforma de integración
   * @param pedido Pedido a verificar
   * @returns Nombre de la plataforma ("WooCommerce" o "Shopify") o null
   */
  getIntegrationPlatform(pedido: Pedido): string | null {
    if (!pedido.integrations) {
      return null;
    }
    if (pedido.integrations.woocommerce?.orderNumber) {
      return 'WooCommerce';
    }
    if (pedido.integrations.shopify?.orderNumber) {
      return 'Shopify';
    }
    return null;
  }

  confirmDeleteOrder(order: any) {
    if (confirm(`¿Está seguro de eliminar el pedido #${order.nroPedido}?`)) {
      this.deleteOrder(order);
    }
  }
  ESTADOPAGO: any[];
  cargando = true;

  ESTADOPEDIDO = [
    { id: 1, nombre: "Pendiente" },
    { id: 2, nombre: "Pagado" },
    { id: 3, nombre: "Anulado" },
    { id: 4, nombre: "Devuelto" },
  ];
  representatives: { name: string; image: string }[];
  configuracionCarritoSeleccionado: Carrito;
  indiceProductoSeleccionado: number;
  fechaInicial: string;
  fechaFinal: string;

  // Propiedades para el código de descuento
  codigoDescuentoIngresado: string = "";
  validandoDescuento: boolean = false;
  errorCodigoDescuento: string = "";
  descuentoAplicado: any = null;
  pedidoSeleccionadoDescuento: Pedido;

  // Propiedades para editar/eliminar descuento
  pedidoDescuentoEditando: Pedido | null = null;
  nuevoPorcentajeDescuento: number = 0;
  previewTotales: any = null;
  guardandoDescuento: boolean = false;
  // Date objects for p-calendar components
  fechaInicialDate: Date | null;
  fechaFinalDate: Date | null;
  estadosProcesos: EstadoProcesoFiltros[];
  validaciones: { value: boolean; nombre: string }[];
  numberProduct: string;
  filteredOrderNumbers: any;
  ordenes: any;
  ordersByName: any;
  searchQuery: string = "";
  showSuggestions: boolean = false;
  UserLogged: UserLogged;
  allBillingZone: any;
  selectedOrder: any;
  modalVisible = false;

  // Propiedades para modal de detalle entrega
  detalleEntregaVisible = false;
  pedidoEntregaData: PedidoEntrega | null = null;

  // Configuración de columnas - IMPORTANTE: 'detalles' debe estar siempre primero
  displayedColumns: ColumnDefinition[] = [
    { field: "detalles", header: "Detalles", visible: true, type: "actions" },
    {
      field: "nroPedido",
      header: "# Pedido",
      visible: true,
      type: "text",
      filterable: true,
    },
    // Columna para mostrar número de factura electrónica con enlace
    {
      field: "nroFactura",
      header: "Factura",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "fechaEntrega",
      header: "Fecha entrega",
      visible: true,
      type: "date",
      filterable: true,
    },
    { field: "opciones", header: "Opciones", visible: true, type: "actions" },
    {
      field: "estadoPago",
      header: "Estado de Pago",
      visible: true,
      type: "status",
      filterable: true,
    },
    {
      field: "estadoProceso",
      header: "Estado de Proceso",
      visible: true,
      type: "status",
      filterable: true,
    },
    {
      field: "validacion",
      header: "Validación",
      visible: true,
      type: "boolean",
      filterable: true,
    },
    {
      field: "cliente",
      header: "Cliente",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "valorBruto",
      header: "Valor Bruto",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "descuento",
      header: "Descuento",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "domicilio",
      header: "Domicilio",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "subtotal",
      header: "Subtotal",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "iva",
      header: "IVA",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "total",
      header: "Total",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "anticipo",
      header: "Anticipo",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "faltaPorPagar",
      header: "Falta por Pagar",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "fechaCreacion",
      header: "Fecha de compra",
      visible: true,
      type: "date",
      filterable: true,
    },
    {
      field: "ciudad",
      header: "Ciudad",
      visible: false,
      type: "text",
      filterable: true,
    },
    {
      field: "referencia",
      header: "Referencia",
      visible: false,
      type: "text",
      filterable: true,
    },
    {
      field: "zonaCobro",
      header: "Zona de Entrega",
      visible: false,
      type: "text",
      filterable: true,
    },
    {
      field: "formaEntrega",
      header: "Forma de Entrega",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "horarioEntrega",
      header: "Horario de Entrega",
      visible: true,
      type: "text",
      filterable: true,
    },
    // Nueva columna para mostrar el canal de procedencia del pedido
    {
      field: "channel",
      header: "Canal",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "vendedor",
      header: "Vendedor",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "ultimaImpresion",
      header: "Última impresión",
      visible: true,
      type: "date",
      filterable: false,
    },
    {
      field: "despachador",
      header: "Despachador",
      visible: false,
      type: "text",
      filterable: true,
    },
    {
      field: "transportador",
      header: "Transportador",
      visible: false,
      type: "text",
      filterable: true,
    },
    {
      field: "fechaYHorarioDespachado",
      header: "Fecha y Horario de Despachado",
      visible: false,
      type: "date",
      filterable: true,
    },
  ];

  selectedColumns: ColumnDefinition[] = [];

  // Configuración de columnas específica para producción
  displayedColumnsProduccion: ColumnDefinition[] = [
    {
      field: "producto",
      header: "Producto",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "referencia",
      header: "Referencia",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "ultimaImpresion",
      header: "Última impresión",
      visible: true,
      type: "date",
      filterable: false,
    },
    {
      field: "revisadoParaProduccion",
      header: "Revisado",
      visible: true,
      type: "date",
      filterable: true,
    },
    {
      field: "nroPedido",
      header: "# Pedido",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "cantidad",
      header: "Cantidad",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "cliente",
      header: "Cliente",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "estadoPago",
      header: "Estado de Pago",
      visible: true,
      type: "status",
      filterable: true,
    },
    {
      field: "estadoProceso",
      header: "Estado de Proceso",
      visible: true,
      type: "status",
      filterable: true,
    },
    {
      field: "validacion",
      header: "Validación",
      visible: true,
      type: "status",
      filterable: true,
    },
    {
      field: "totalPedidoSinDescuento",
      header: "Valor Bruto",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "totalDescuento",
      header: "Descuento",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "totalEnvio",
      header: "Domicilio",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "subtotal",
      header: "Subtotal",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "totalImpuesto",
      header: "IVA",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "totalPedididoConDescuento",
      header: "Total",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "anticipo",
      header: "Anticipo",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "faltaPorPagar",
      header: "Falta por Pagar",
      visible: true,
      type: "currency",
      filterable: true,
    },
    {
      field: "fechaEntrega",
      header: "Fecha Entrega",
      visible: true,
      type: "date",
      filterable: true,
    },
    {
      field: "fechaCreacion",
      header: "Fecha de compra",
      visible: true,
      type: "date",
      filterable: true,
    },
    {
      field: "ciudad",
      header: "Ciudad",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "zonaCobro",
      header: "Zona de Entrega",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "formaEntrega",
      header: "Forma de Entrega",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "horarioEntrega",
      header: "Horario de Entrega",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "channel",
      header: "Canal",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "vendedor",
      header: "Vendedor",
      visible: true,
      type: "text",
      filterable: true,
    },
    {
      field: "despachador",
      header: "Despachador",
      visible: false,
      type: "text",
      filterable: true,
    },
    {
      field: "transportador",
      header: "Transportador",
      visible: false,
      type: "text",
      filterable: true,
    },
    {
      field: "fechaYHorarioDespachado",
      header: "Fecha y Horario de Despachado",
      visible: false,
      type: "date",
      filterable: true,
    },
  ];
  selectedColumnsProduccion: ColumnDefinition[] = [];

  showColumnConfig: boolean = false;
  showFilters: boolean = false;
  showAdvancedFilters: boolean = false;
  nroPedido: any;

  // Filtros rápidos
  quickFilters = {
    estadoPago: "all",
    estadoProceso: "all",
  };

  // Nuevas propiedades para el diseño minimalista
  selectedDatePreset: string = "";
  datePresets = [
    { label: "Hoy", value: "today" },
    { label: "Esta semana", value: "week" },
    { label: "Este mes", value: "month" },
    { label: "Semana pasada", value: "lastWeek" },
    { label: "Mes pasado", value: "lastMonth" },
  ];

  // Spanish locale configuration for p-calendar
  es: any = {
    firstDayOfWeek: 1,
    dayNames: [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ],
    dayNamesShort: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    dayNamesMin: ["D", "L", "M", "X", "J", "V", "S"],
    monthNames: [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
    monthNamesShort: [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ],
    today: "Hoy",
    clear: "Limpiar",
    dateFormat: "dd/mm/yy",
    weekHeader: "Sm",
  };

  // Opciones para los dropdowns de estado
  estadosPagoOptions = [
    { label: "Todos", value: "all" },
    { label: "Aprobado", value: "Aprobado" },
    { label: "Pendiente", value: "Pendiente" },
    { label: "PreAprobado", value: "PreAprobado" },
    { label: "Pospendiente", value: "Pospendiente" },
    { label: "Rechazado", value: "Rechazado" },
    { label: "Precancelado", value: "Precancelado" },
    { label: "Cancelado", value: "Cancelado" },
  ];

  estadosProcesoOptions = [
    { label: "Todos", value: "all" },
    { label: "Sin Producir", value: "SinProducir" },
    { label: "En Producción", value: "EnProduccion" },
    { label: "Producido", value: "Producido" },
    { label: "Producido Parcialmente", value: "ProducidoParcialmente" },
    { label: "Producido Totalmente", value: "ProducidoTotalmente" },
    { label: "Empacado", value: "Empacado" },
    { label: "Para Despachar", value: "ParaDespachar" },
    { label: "Despachado", value: "Despachado" },
    { label: "Entregado", value: "Entregado" },
    { label: "Rechazado", value: "Rechazado" },
    { label: "Cerrado", value: "Cerrado" },
  ];

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private service: ServiciosService,
    private route: ActivatedRoute,
    private filterService: FilterService,
    private sharedFilterService: SharedFilterService,
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private maestroService: MaestroService,
    private bodegaService: BodegaService,
    private toastrService: ToastrService,
    private loaderService: LoaderService,
    private changeDetectorRef: ChangeDetectorRef,
    private integrationsService: IntegrationsService,
  ) {
    console.log("🔧 Constructor - Registrando filtros personalizados...");
    this.registerCustomFilters();
    console.log("✅ Constructor - Filtros personalizados registrados");
    this.setupSearchDebounce();

    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    this.numberProduct =
      this.route.snapshot.queryParamMap?.get("nroPedido") || "";

    if (this.numberProduct) {
      this.ventasService
        .getOrdersByNroPedido(this.numberProduct)
        .subscribe((x: any) => {
          this.orders = x;
          console.log(this.orders);
        });
    }

    this.UserLogged = JSON.parse(localStorage.getItem("user")!) as UserLogged;

    this.cargando = false;

    // Cargar listado de bodegas disponibles para el modal de recompra
    this.cargarBodegas();
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(this.searchDebounceTime),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe((query) => {
        console.log("Debounce ejecutado con query:", query);
        this.performSearch(query);
      });
  }

  /**
   * Valida el formato del número de pedido
   */
  private validateOrderNumber(query: string): boolean {
    if (!query || query.trim().length === 0) {
      return false;
    }

    // Validar longitud mínima de 3 caracteres
    if (query.trim().length < 3) {
      console.log("⚠️ Búsqueda requiere al menos 3 caracteres");
      return false;
    }

    // Permitir caracteres más flexibles (letras, números, guiones, espacios, puntos)
    const orderNumberPattern = /^[A-Za-z0-9\-_.\s]+$/;
    return orderNumberPattern.test(query.trim());
  }

  /**
   * Realiza la búsqueda con el servicio correcto
   */
  private performSearch(query: string): void {
    const trimmedQuery = query?.trim();

    if (!this.validateOrderNumber(trimmedQuery)) {
      this.filteredOrderNumbers = [];
      this.ordersByName = [];
      this.isSearching = false;
      this.searchError = null;
      return;
    }

    this.isSearching = true;
    this.searchError = null;

    // Usar el servicio principal para búsqueda
    this.ventasService.searchOrders(trimmedQuery).subscribe({
      next: (res: any) => {
        // Asegurar que la respuesta sea un array
        const results = Array.isArray(res) ? res : res ? [res] : [];
        this.filteredOrderNumbers = results;
        this.ordersByName = results;
        this.isSearching = false;
        this.searchError = null;

        // Si no hay resultados, mostrar array vacío (el template 'empty' se mostrará automáticamente)
        if (results.length === 0) {
          console.log("ℹ️ No se encontraron pedidos para:", trimmedQuery);
        }

        // Mostrar el panel del autocomplete después de cargar los datos
        if (this.sharedFilters && this.sharedFilters.showAutocompletePanel) {
          this.sharedFilters.showAutocompletePanel();
        }
      },
      error: (err) => {
        console.log("⚠️ Error en búsqueda principal:", err);

        // Verificar si el error es por "no encontrado"
        const isNotFoundError =
          err?.error?.message?.includes("No se encontraron pedidos") ||
          err?.status === 404;

        if (isNotFoundError) {
          // No es un error real, simplemente no hay resultados
          this.filteredOrderNumbers = [];
          this.ordersByName = [];
          this.isSearching = false;
          this.searchError = null;
          console.log("ℹ️ No se encontraron pedidos (404)");
        } else {
          // Fallback al servicio original si es un error real
          this.service
            .getOrderByName(trimmedQuery)
            .then((res: any) => {
              const results = Array.isArray(res) ? res : res ? [res] : [];
              this.filteredOrderNumbers = results;
              this.ordersByName = results;
              this.isSearching = false;
              this.searchError = null;

              // Mostrar el panel del autocomplete después de cargar los datos
              if (
                this.sharedFilters &&
                this.sharedFilters.showAutocompletePanel
              ) {
                this.sharedFilters.showAutocompletePanel();
              }
            })
            .catch((fallbackErr: any) => {
              this.searchError = "Error al buscar pedido. Intente nuevamente.";
              this.filteredOrderNumbers = [];
              this.ordersByName = [];
              this.isSearching = false;
              this.toastrService.error(this.searchError, "Error de Búsqueda");
            });
        }
      },
    });
  }

  /**
   * Maneja la entrada de texto en el campo de búsqueda
   */
  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchQuery = query;

    // Validar entrada
    if (!query || typeof query !== "string") {
      this.filteredOrderNumbers = [];
      this.showSuggestions = false;
      return;
    }

    this.showSuggestions = true;
    // Emitir al subject para aplicar debounce
    this.searchSubject.next(query);
  }

  /**
   * Maneja la pérdida de foco del input
   */
  onInputBlur(): void {
    // Usar setTimeout para permitir que el click en las sugerencias funcione
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }

  /**
   * Selecciona un pedido de las sugerencias
   */
  selectOrder(item: any): void {
    if (!item || !item.nroPedido) {
      this.toastrService.warning("Pedido inválido seleccionado", "Advertencia");
      return;
    }

    // Establecer el valor del campo de búsqueda
    this.searchQuery = item.nroPedido;
    this.nroPedido = item;

    // Ocultar sugerencias
    this.showSuggestions = false;
    this.filteredOrderNumbers = [];

    // Mostrar solo el pedido seleccionado
    this.orders = [item];

    // Mostrar notificación de éxito
    this.toastrService.success(
      `Pedido #${item.nroPedido} cargado correctamente`,
      "Pedido Encontrado",
    );

    // Limpiar errores de búsqueda
    this.searchError = null;
  }

  /**
   * Limpia el filtro de búsqueda
   */
  clearSearchFilter(): void {
    this.nroPedido = null;
    this.searchQuery = "";
    this.filteredOrderNumbers = [];
    this.ordersByName = [];
    this.searchError = null;
    this.isSearching = false;
    this.showSuggestions = false;
    this.refrescarDatos();
    this.saveFiltersState();

    // Mostrar notificación
    this.toastrService.info("Filtro de búsqueda limpiado", "Filtro Limpiado");
  }

  /**
   * Obtiene el estado de búsqueda para mostrar en la UI
   */
  getSearchStatus(): {
    isSearching: boolean;
    hasError: boolean;
    errorMessage: string | null;
  } {
    return {
      isSearching: this.isSearching,
      hasError: !!this.searchError,
      errorMessage: this.searchError,
    };
  }

  /**
   * Verifica si hay una búsqueda activa
   */
  hasActiveSearch(): boolean {
    return (
      this.isSearching ||
      !!this.searchError ||
      (this.filteredOrderNumbers && this.filteredOrderNumbers.length > 0)
    );
  }

  // ===== MÉTODOS PARA BÚSQUEDA LOCAL ADICIONAL =====

  /**
   * Inicializa la búsqueda local
   */
  initializeLocalSearch(): void {
    this.localSearchQuery = "";
    this.filteredOrders = [];
    this.isLocalSearchActive = false;
    this.originalOrders = [];
    // No resetear hasLoadedOrdersOnce aquí para mantener la barra visible
  }

  /**
   * Maneja el input de búsqueda local
   */
  onLocalSearchInput(event: any): void {
    const query = event.target.value;
    this.localSearchQuery = query;

    if (query.trim().length === 0) {
      this.clearLocalSearch();
    } else {
      this.performLocalSearch(query);
    }
  }

  /**
   * Realiza la búsqueda local en los pedidos filtrados por fecha
   */
  performLocalSearch(query: string): void {
    if (!this.orders || this.orders.length === 0) {
      this.filteredOrders = [];
      this.isLocalSearchActive = false;
      return;
    }

    const searchTerm = query.toLowerCase().trim();

    // Guardar los pedidos originales si es la primera búsqueda
    if (!this.isLocalSearchActive) {
      this.originalOrders = [...this.orders];
    }

    // Si no hay pedidos originales, no hay nada que buscar
    if (!this.originalOrders || this.originalOrders.length === 0) {
      this.filteredOrders = [];
      this.isLocalSearchActive = true;
      this.updateTableWithLocalResults();
      return;
    }

    this.filteredOrders = this.originalOrders.filter((order) => {
      // Buscar por número de pedido
      if (
        order.nroPedido &&
        order.nroPedido.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      // Buscar por nombre del cliente
      if (
        order.cliente?.nombres_completos &&
        order.cliente.nombres_completos.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      // Buscar por documento del cliente
      if (
        order.cliente?.documento &&
        order.cliente.documento.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      // Buscar por referencia
      if (
        order.referencia &&
        order.referencia.toLowerCase().includes(searchTerm)
      ) {
        return true;
      }

      return false;
    });

    this.isLocalSearchActive = true;
    this.updateTableWithLocalResults();
  }

  /**
   * Actualiza la tabla con los resultados de la búsqueda local
   */
  updateTableWithLocalResults(): void {
    // Si hay búsqueda local activa, usar los pedidos filtrados
    if (this.isLocalSearchActive && this.localSearchQuery.trim().length > 0) {
      this.orders = [...this.filteredOrders];
    } else {
      // Si no hay búsqueda local, restaurar los pedidos originales
      this.orders = [...this.originalOrders];
    }
  }

  /**
   * Limpia la búsqueda local
   */
  clearLocalSearch(): void {
    this.localSearchQuery = "";
    this.isLocalSearchActive = false;

    // Restaurar los pedidos originales
    if (this.originalOrders.length > 0) {
      this.orders = [...this.originalOrders];
    }

    this.filteredOrders = [];
    // No resetear hasLoadedOrdersOnce para mantener la barra visible
  }

  /**
   * Verifica si hay una búsqueda local activa
   */
  hasActiveLocalSearch(): boolean {
    return this.isLocalSearchActive && this.localSearchQuery.trim().length > 0;
  }

  /**
   * Obtiene el número de resultados de la búsqueda local
   */
  getLocalSearchResultsCount(): number {
    return this.filteredOrders.length;
  }

  /**
   * Determina si debe mostrar la barra de búsqueda local
   * La barra debe mostrarse si hay pedidos originales o si hay una búsqueda activa
   */
  shouldShowLocalSearch(): boolean {
    // Mostrar si hay pedidos originales (sin filtrar) o si hay una búsqueda activa
    // También mostrar si se ha cargado al menos una vez (para mantener la barra visible)
    return (
      this.originalOrders.length > 0 ||
      this.isLocalSearchActive ||
      this.localSearchQuery.trim().length > 0 ||
      this.hasLoadedOrdersOnce
    );
  }

  // ===== MÉTODOS PARA INTEGRACIÓN CON SHARED FILTERS =====

  /**
   * Maneja el cambio de búsqueda desde el componente compartido
   */
  onSharedSearchQueryChange(query: string): void {
    this.searchQuery = query;
    this.sharedFilterService.updateFilterState({ searchQuery: query });
    this.onSearchQueryChange(query);
  }

  /**
   * Maneja el evento completeMethod del autocompletado
   */
  onSearchComplete(event: any): void {
    const query = event.query || "";
    console.log("🔍 Búsqueda autocompletado (Enter presionado):", query);

    // Ejecutar búsqueda inmediatamente sin debounce cuando viene del Enter
    // Esto permite que el dropdown se muestre con los resultados
    if (query.trim().length >= 3) {
      this.performSearch(query);
    } else {
      this.filteredOrderNumbers = [];
      this.isSearching = false;
    }
  }

  /**
   * Maneja la selección de un pedido desde el autocompletado
   */
  onSearchSelect(event: any): void {
    console.log("✅ Pedido seleccionado desde autocompletado:", event);

    // Llamar al método existente de selección
    this.selectOrder(event);
  }

  /**
   * Maneja el cambio de fecha inicial desde el componente compartido
   */
  onSharedDateFromChange(date: Date | null): void {
    this.fechaInicialDate = date;
    this.fechaInicial = date ? date.toISOString().split("T")[0] : "";
    this.sharedFilterService.updateFilterState({ fechaInicial: date });
    this.onDateFromChange(date);
  }

  /**
   * Maneja el cambio de fecha final desde el componente compartido
   */
  onSharedDateToChange(date: Date | null): void {
    this.fechaFinalDate = date;
    this.fechaFinal = date ? date.toISOString().split("T")[0] : "";
    this.sharedFilterService.updateFilterState({ fechaFinal: date });
    this.onDateToChange(date);
  }

  /**
   * Maneja el cambio de estado de pago desde el componente compartido
   */
  onSharedEstadoPagoChange(estado: string): void {
    this.quickFilters.estadoPago = estado;
    this.sharedFilterService.updateFilterState({ estadoPago: estado });
    this.onEstadoPagoChange();
  }

  /**
   * Maneja el cambio de estado de proceso desde el componente compartido
   */
  onSharedEstadoProcesoChange(estado: string): void {
    this.quickFilters.estadoProceso = estado;
    this.sharedFilterService.updateFilterState({ estadoProceso: estado });
    this.onEstadoProcesoChange();
  }

  /**
   * Maneja el cambio de preset de fecha desde el componente compartido
   */
  onSharedDatePresetChange(preset: string): void {
    this.selectedDatePreset = preset;
    this.onDatePresetChange(preset);
  }

  /**
   * Maneja el cambio de selección de columnas desde el componente compartido
   */
  onSharedColumnSelectionChange(columns: any[]): void {
    this.selectedColumns = columns;
    this.onColumnSelectionChange();
  }

  /**
   * Maneja la limpieza de todos los filtros desde el componente compartido
   */
  onSharedClearAllFilters(): void {
    this.sharedFilterService.clearAllFilters();
    this.clearAllFilters();
  }

  /**
   * Maneja la limpieza de un filtro específico desde el componente compartido
   */
  onSharedClearSpecificFilter(event: { type: string; value?: string }): void {
    switch (event.type) {
      case "search":
        this.clearSearchFilter();
        break;
      case "date":
        this.clearDateFilter(event.value as "inicial" | "final");
        break;
      case "estadoPago":
        this.clearQuickFilter("estadoPago");
        break;
      case "estadoProceso":
        this.clearQuickFilter("estadoProceso");
        break;
    }
  }

  ngOnInit(): void {
    // Setup debouncing para filtros de columna (copiado de tabla-pedidos)
    this.filterSubscription = this.filterSubject.pipe(
      debounceTime(300), // Esperar 300ms después del último evento
      distinctUntilChanged((prev, curr) => prev.value === curr.value)
    ).subscribe(({ value, filterCallback }) => {
      filterCallback(value);
    });

    // Verificar si hay integración de facturación configurada
    this.checkInvoicingIntegration();

    // Initialize dates first before subscribing to service
    const today = new Date();
    this.fechaInicial = today.toISOString().split("T")[0];
    this.fechaFinal = today.toISOString().split("T")[0];
    this.fechaInicialDate = new Date(today);
    this.fechaFinalDate = new Date(today);

    // Update the shared filter service with initial dates
    this.sharedFilterService.updateFilterState({
      fechaInicial: this.fechaInicialDate,
      fechaFinal: this.fechaFinalDate,
    });

    // Suscribirse a los cambios del servicio de filtros compartido
    this.sharedFilterService.filterState$.subscribe((state) => {
      this.searchQuery = state.searchQuery;
      // Only update dates if they are provided by the service
      if (state.fechaInicial !== undefined && state.fechaInicial !== null) {
        this.fechaInicialDate = state.fechaInicial;
        this.fechaInicial = state.fechaInicial.toISOString().split("T")[0];
      }
      if (state.fechaFinal !== undefined && state.fechaFinal !== null) {
        this.fechaFinalDate = state.fechaFinal;
        this.fechaFinal = state.fechaFinal.toISOString().split("T")[0];
      }
      this.quickFilters.estadoPago = state.estadoPago;
      this.quickFilters.estadoProceso = state.estadoProceso;
      this.selectedDatePreset = state.selectedDatePreset || "";
    });

    // Sync Date objects with string dates (dates should already be initialized)
    // This ensures calendar components always have the correct Date objects
    if (this.fechaInicial && !this.fechaInicialDate) {
      this.fechaInicialDate = this.stringToDate(this.fechaInicial);
    }
    if (this.fechaFinal && !this.fechaFinalDate) {
      this.fechaFinalDate = this.stringToDate(this.fechaFinal);
    }

    this.estadosPago = Object.values(EstadoPago);
    // this.estadosProcesos = Object.values(EstadoProceso)
    this.estadosProcesos = Object.values(EstadoProcesoFiltros);
    if (this.isFromProduction) {
      this.estadosProcesos = this.estadosProcesos.filter(
        (estado) =>
          estado === EstadoProcesoFiltros.SinProducir ||
          estado === EstadoProcesoFiltros.EnProduccion ||
          estado === EstadoProcesoFiltros.ProducidoParcialmente ||
          estado === EstadoProcesoFiltros.ProducidoTotalmente,
      );
    }
    this.validaciones = [
      { value: false, nombre: "No" },
      { value: true, nombre: "Si" },
    ];

    // Cargar configuración de columnas guardada
    this.loadColumnConfiguration();
    // Cargar configuración de columnas de producción
    this.loadColumnConfigurationProduccion();

    // Asegurar que las columnas estén en el orden correcto
    this.initializeColumns();

    // Cargar estado de filtros guardado
    this.loadFiltersState();

    // Inicializar búsqueda local
    this.initializeLocalSearch();

    // Cargar datos iniciales si se usa paginación
    // Nota: Con lazy loading, PrimeNG disparará onLazyLoad automáticamente
    // pero necesitamos asegurar que los datos se carguen si no se dispara
    if (this.usePagination) {
      this.currentPage = 1;
      this.first = 0;
      this.pageSize = 50;
    }
    const context = this;
    this.maestroService.getBillingZone().subscribe({
      next(value: any) {
        context.allBillingZone = value;
        sessionStorage.setItem(
          "allBillingZone",
          JSON.stringify(context.allBillingZone),
        );
      },
      error(err) {
        console.log(err);
      },
    });

    this.cargando = false;
  }

  /**
   * Calcula el precio unitario sin IVA considerando escalas de volumen
   */
  private calcularPrecioUnitarioSinIVA(itemCarrito: any): number {
    const producto = itemCarrito.producto;
    const cantidad = itemCarrito.cantidad;

    if (!producto?.precio) {
      return 0;
    }

    const preciosVolumen = producto.precio.preciosVolumen || [];

    // Si no hay precios por volumen, usar precio base
    if (preciosVolumen.length === 0) {
      return Number(producto.precio.precioUnitarioSinIva) || 0;
    }

    // ✅ CORREGIDO: Filtrar solo rangos con límites válidos definidos
    const rangosValidos = preciosVolumen.filter((x: any) => {
      const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
      const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
      return tieneMinimo && tieneMaximo;
    });

    // Buscar el precio por volumen que aplique para esta cantidad
    const precioVolumen = rangosValidos.find((x: any) => {
      const min = Number(x.numeroUnidadesInicial) || 0;
      const max = Number(x.numeroUnidadesLimite) || Infinity;
      return cantidad >= min && cantidad <= max;
    });

    // Si se encuentra un precio por volumen, usarlo; sino usar precio base
    if (precioVolumen) {
      return Number(precioVolumen.valorUnitarioPorVolumenSinIVA) || 0;
    } else {
      return Number(producto.precio.precioUnitarioSinIva) || 0;
    }
  }

  /**
   * Calcula el subtotal de productos SIN IVA
   * Incluye: productos, adiciones y preferencias
   * Consistente con PaymentService
   */
  checkPriceScale(pedido) {
    let totalPrecioSinIVADef = 0;

    if (pedido && pedido.carrito) {
      pedido.carrito.forEach((itemCarrito) => {
        // Calcular precio base del producto con escalas de volumen
        const precioUnitarioSinIVA =
          this.calcularPrecioUnitarioSinIVA(itemCarrito);
        const cantidad = Number(itemCarrito.cantidad) || 0;
        let totalItemSinIVA = precioUnitarioSinIVA * cantidad;

        // Sumar precios de adiciones (usando valorUnitarioSinIva - CORRECTO)
        if (itemCarrito.configuracion?.adiciones) {
          itemCarrito.configuracion.adiciones.forEach((adicion) => {
            const valorAdicionSinIva = Number(adicion.valorUnitarioSinIva) || 0;
            totalItemSinIVA += valorAdicionSinIva * cantidad;
          });
        }

        // Sumar precios de preferencias
        if (itemCarrito.configuracion?.preferencias) {
          itemCarrito.configuracion.preferencias.forEach((preferencia) => {
            const valorPreferenciaSinIva = Number(preferencia.valorUnitarioSinIva) || 0;
            totalItemSinIVA += valorPreferenciaSinIva * cantidad;
          });
        }

        if (!isNaN(totalItemSinIVA)) {
          totalPrecioSinIVADef += totalItemSinIVA;
        }
      });
    }

    return isNaN(totalPrecioSinIVADef) ? 0 : totalPrecioSinIVADef;
  }

  /**
   * Calcula el IVA total extrayéndolo del precio CON IVA
   * Aplica el descuento antes de calcular el IVA
   * Fórmula: IVA = (valorConDescuento / (1 + %IVA)) * %IVA
   * Consistente con PaymentService - Incluye IVA del envío
   */
  checkIVAPrice(pedido): {
    totalPrecioIVADef: number;
    totalExcluidos: number;
    totalIva5: number;
    totalImpo: number;
    totalIva19: number;
  } {
    let totalPrecioIVADef = 0;
    let totalExcluidosDef = 0;
    let totalIva5Def = 0;
    let totalImpoDef = 0;
    let totalIva19Def = 0;

    if (!pedido?.carrito) {
      return {
        totalPrecioIVADef: 0,
        totalExcluidos: 0,
        totalIva5: 0,
        totalImpo: 0,
        totalIva19: 0,
      };
    }

    // Obtener porcentaje de descuento del pedido
    const porceDescuento = (Number(pedido.porceDescuento) || 0) / 100;

    // Obtener categoría del cliente para precios especiales
    const categoriaClienteId = pedido?.cliente?.categoria?.id;

    pedido.carrito.forEach((itemCarrito) => {
      const producto = itemCarrito?.producto;
      const cantidad = Number(itemCarrito?.cantidad) || 0;
      const preciosVolumen = producto?.precio?.preciosVolumen ?? [];

      // Obtener precio CON IVA y porcentaje de IVA
      let precioConIva = Number(producto?.precio?.precioUnitarioConIva) || 0;
      let porcentajeIvaStr = (producto?.precio?.precioUnitarioIva ?? "0").toString();

      // PRIORIDAD 1: Verificar si hay precio por categoría de cliente
      const preciosPorTipoCliente = producto?.preciosPorTipoCliente ?? [];
      const precioCategoria = categoriaClienteId
        ? preciosPorTipoCliente.find((p: any) =>
            p.tipoClienteId === categoriaClienteId && p.activo === true)
        : null;

      if (precioCategoria) {
        // Si hay precio por categoría, usarlo y su porcentaje de IVA
        precioConIva = Number(precioCategoria.precioConIva) || 0;
        porcentajeIvaStr = precioCategoria.porcentajeIva?.toString() ?? porcentajeIvaStr;
        // No aplicar precios por volumen cuando hay precio por categoría
      } else if (preciosVolumen.length > 0) {
        // PRIORIDAD 2: Buscar precio por volumen si aplica
        // ✅ CORREGIDO: Filtrar solo rangos con límites válidos definidos
        const rangosValidos = preciosVolumen.filter((x: any) => {
          const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
          const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
          return tieneMinimo && tieneMaximo;
        });

        for (const x of rangosValidos) {
          const unidadesInicial = Number(x.numeroUnidadesInicial) || 0;
          const unidadesLimite = Number(x.numeroUnidadesLimite) || Infinity;

          if (cantidad >= unidadesInicial && cantidad <= unidadesLimite) {
            precioConIva = Number(x.valorUnitarioPorVolumenIva) || 0;
            porcentajeIvaStr = (x.valorIVAPorVolumen ?? "0").toString();
            break;
          }
        }
      }

      // Calcular IVA del producto principal
      const valorConIva = precioConIva * cantidad;
      const valorConDescuento = valorConIva * (1 - porceDescuento);
      const porcentajeIva = (Number(porcentajeIvaStr) || 0) / 100;

      if (1 + porcentajeIva !== 0) {
        const ivaProducto = (valorConDescuento / (1 + porcentajeIva)) * porcentajeIva;
        if (!isNaN(ivaProducto)) {
          totalPrecioIVADef += ivaProducto;
          // Acumular por tipo de IVA
          switch (porcentajeIvaStr) {
            case "0":
              totalExcluidosDef += isNaN(valorConDescuento) ? 0 : valorConDescuento;
              break;
            case "5":
              totalIva5Def += ivaProducto;
              break;
            case "8":
              totalImpoDef += ivaProducto;
              break;
            case "19":
              totalIva19Def += ivaProducto;
              break;
          }
        }
      }

      // IVA de adiciones
      if (itemCarrito.configuracion?.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion) => {
          const valorAdicionConIva = (Number(adicion.precioTotalConIva) || 0) * cantidad;
          const valorAdicionConDesc = valorAdicionConIva * (1 - porceDescuento);
          const porcAdicionStr = (adicion.porcentajeIva ?? "0").toString();
          const porcAdicion = (Number(adicion.porcentajeIva) || 0) / 100;

          if (1 + porcAdicion !== 0) {
            const ivaAdicion = (valorAdicionConDesc / (1 + porcAdicion)) * porcAdicion;
            if (!isNaN(ivaAdicion)) {
              totalPrecioIVADef += ivaAdicion;
              switch (porcAdicionStr) {
                case "0":
                  totalExcluidosDef += isNaN(valorAdicionConDesc) ? 0 : valorAdicionConDesc;
                  break;
                case "5":
                  totalIva5Def += ivaAdicion;
                  break;
                case "8":
                  totalImpoDef += ivaAdicion;
                  break;
                case "19":
                  totalIva19Def += ivaAdicion;
                  break;
              }
            }
          }
        });
      }

      // IVA de preferencias
      if (itemCarrito.configuracion?.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia) => {
          const valorPrefConIva = (Number(preferencia.precioTotalConIva) || 0) * cantidad;
          const valorPrefConDesc = valorPrefConIva * (1 - porceDescuento);
          const porcPrefStr = (preferencia.porcentajeIva ?? "0").toString();
          const porcPref = (Number(preferencia.porcentajeIva) || 0) / 100;

          if (1 + porcPref !== 0) {
            const ivaPref = (valorPrefConDesc / (1 + porcPref)) * porcPref;
            if (!isNaN(ivaPref)) {
              totalPrecioIVADef += ivaPref;
              switch (porcPrefStr) {
                case "0":
                  totalExcluidosDef += isNaN(valorPrefConDesc) ? 0 : valorPrefConDesc;
                  break;
                case "5":
                  totalIva5Def += ivaPref;
                  break;
                case "8":
                  totalImpoDef += ivaPref;
                  break;
                case "19":
                  totalIva19Def += ivaPref;
                  break;
              }
            }
          }
        });
      }
    });

    // Calcular IVA del envío (domicilio) - Consistente con PaymentService
    const billingZones = this.allBillingZone ||
      JSON.parse(sessionStorage.getItem("allBillingZone") || "[]");

    if (billingZones && pedido) {
      this.pedidoUtilService.pedido = pedido;
      const costoEnvioConIva = Number(
        this.pedidoUtilService.getShippingTaxCostInvoice(billingZones, pedido)
      ) || 0;
      const porcentajeIvaEnvioStr =
        this.pedidoUtilService.getShippingTaxValueInvoice(billingZones, pedido) ?? "0";
      const porcentajeIvaEnvioNum = (Number(porcentajeIvaEnvioStr) || 0) / 100;

      if (1 + porcentajeIvaEnvioNum !== 0 && costoEnvioConIva > 0) {
        const ivaEnvio = (costoEnvioConIva / (1 + porcentajeIvaEnvioNum)) * porcentajeIvaEnvioNum;
        if (!isNaN(ivaEnvio)) {
          totalPrecioIVADef += ivaEnvio;
          switch (porcentajeIvaEnvioStr) {
            case "0":
              totalExcluidosDef += isNaN(costoEnvioConIva) ? 0 : costoEnvioConIva;
              break;
            case "5":
              totalIva5Def += ivaEnvio;
              break;
            case "8":
              totalImpoDef += ivaEnvio;
              break;
            case "19":
              totalIva19Def += ivaEnvio;
              break;
          }
        }
      }
    }

    return {
      totalPrecioIVADef: isNaN(totalPrecioIVADef) ? 0 : totalPrecioIVADef,
      totalExcluidos: isNaN(totalExcluidosDef) ? 0 : totalExcluidosDef,
      totalIva5: isNaN(totalIva5Def) ? 0 : totalIva5Def,
      totalImpo: isNaN(totalImpoDef) ? 0 : totalImpoDef,
      totalIva19: isNaN(totalIva19Def) ? 0 : totalIva19Def,
    };
  }

  private registerCustomFilters() {
    console.log("🔧 registerCustomFilters - Iniciando registro...");

    this.filterService.register(
      "horarioEntregaCustom",
      (value, filter): boolean => {
        if (!filter) {
          return true;
        }
        if (value === undefined || value === null) {
          return false;
        }

        const result = filter.some((item) => {
          const filterString =
            "Pedido: " + item.nroPedido + " - " + item.horarioEntrega;
          return value.includes(item.horarioEntrega.toString());
        });
        return result;
      },
    );
    console.log("✅ Filtro horarioEntregaCustom registrado");

    this.filterService.register("customDate", (value, filter): boolean => {
      console.log("🔍 FILTRO customDate - Valor:", value, "Filtro:", filter);

      if (filter === undefined || filter === null) {
        console.log("✅ Filtro vacío, retornando true");
        return true;
      }

      if (value === undefined || value === null) {
        console.log("❌ Valor vacío, retornando false");
        return false;
      }

      // Convertir el valor de la tabla (que puede ser string o Date) a Date
      let valueDate: Date;
      if (typeof value === "string") {
        // Si es string, convertir desde formato dd/MM/yyyy
        const parts = value.split("/");
        if (parts.length === 3) {
          valueDate = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0]),
          );
          console.log("📅 Valor string convertido:", value, "->", valueDate);
        } else {
          valueDate = new Date(value);
          console.log(
            "📅 Valor string genérico convertido:",
            value,
            "->",
            valueDate,
          );
        }
      } else {
        valueDate = new Date(value);
        console.log("📅 Valor Date convertido:", value, "->", valueDate);
      }

      // Convertir el filtro (que viene del calendario) a Date
      const filterDate = new Date(filter);
      console.log("📅 Filtro convertido:", filter, "->", filterDate);

      // Verificar si las fechas son válidas
      if (isNaN(valueDate.getTime()) || isNaN(filterDate.getTime())) {
        console.log(
          "❌ Fecha inválida detectada - Valor:",
          valueDate,
          "Filtro:",
          filterDate,
        );
        return false;
      }

      // Comparar solo la fecha (sin hora)
      const valueDateOnly = new Date(
        valueDate.getFullYear(),
        valueDate.getMonth(),
        valueDate.getDate(),
      );
      const filterDateOnly = new Date(
        filterDate.getFullYear(),
        filterDate.getMonth(),
        filterDate.getDate(),
      );

      console.log("📅 Comparando fechas:", valueDateOnly, "vs", filterDateOnly);

      const result = valueDateOnly.getTime() === filterDateOnly.getTime();
      console.log("✅ Resultado del filtro:", result);

      return result;
    });
    console.log("✅ Filtro customDate registrado");

    console.log(
      "🎯 registerCustomFilters - Todos los filtros registrados exitosamente",
    );
  }

  // ✅ NUEVO: Flag para controlar refrescos automáticos
  private ultimoRefresco = 0;
  private refrescoEnProgreso = false;

  // Método para debug del filtro de fecha
  onDateFilterSelect(event: any, filterCallback: Function) {
    console.log("🗓️ EVENTO onSelect del calendario:", event);
    console.log("🗓️ Tipo de evento:", typeof event);
    console.log("🗓️ Valor del evento:", event);
    console.log("🗓️ Filter callback:", filterCallback);
    console.log("🗓️ Filter callback tipo:", typeof filterCallback);

    try {
      // Llamar al callback original
      console.log("🗓️ Ejecutando filterCallback...");
      filterCallback(event);
      console.log("🗓️ filterCallback ejecutado exitosamente");
    } catch (error) {
      console.error("❌ Error al ejecutar filterCallback:", error);
    }
  }

  // Método alternativo para probar el filtro
  testDateFilter(event: any) {
    console.log("🧪 TEST - Evento del calendario:", event);
    console.log("🧪 TEST - Tipo de evento:", typeof event);

    if (event && event.target) {
      console.log("🧪 TEST - Valor del input:", event.target.value);
    }
  }

  // Método para probar el filtro manualmente
  testFilter(filterCallback: Function) {
    console.log("🧪 TEST FILTER - Iniciando prueba manual del filtro");
    console.log("🧪 TEST FILTER - Filter callback:", filterCallback);
    console.log("🧪 TEST FILTER - Tipo de callback:", typeof filterCallback);

    try {
      // Crear una fecha de prueba
      const testDate = new Date();
      console.log("🧪 TEST FILTER - Fecha de prueba:", testDate);

      // Ejecutar el filtro con la fecha de prueba
      filterCallback(testDate);
      console.log("🧪 TEST FILTER - Filtro ejecutado exitosamente");
    } catch (error) {
      console.error("❌ TEST FILTER - Error al ejecutar filtro:", error);
    }
  }

  refrescarDatos(forceRefresh: boolean = false, isPageChange: boolean = false) {
    // Log del stack trace para identificar de dónde viene la llamada
    const stackTrace = new Error().stack;
    const caller = stackTrace?.split('\n')[2]?.trim() || 'unknown';
    
    console.log('🔍 refrescarDatos llamado desde:', {
      caller: caller.substring(0, 100), // Limitar longitud del log
      forceRefresh,
      isPageChange,
      refrescoEnProgreso: this.refrescoEnProgreso
    });
    
    // ✅ PROTECCIÓN MEJORADA: Evitar refrescos automáticos muy frecuentes
    // PERO: Los cambios de página SIEMPRE deben procesarse inmediatamente
    const ahora = Date.now();
    const tiempoDesdeUltimoRefresco = ahora - this.ultimoRefresco;
    
    // Tiempo mínimo diferenciado:
    // - Cambios de página: 500ms (para evitar doble-click)
    // - Refrescos normales: 5 segundos (reducido de 30s para mejor UX)
    // - Refrescos forzados: sin límite
    const tiempoMinimoEntreRefrescos = isPageChange ? 500 : (forceRefresh ? 0 : 5000);

    // NO aplicar protección de tiempo si:
    // 1. Es un refresco forzado (filtros nuevos)
    // 2. Es un cambio de página legítimo con paginación habilitada
    const skipTimeProtection = forceRefresh || (this.usePagination && isPageChange);

    console.log('🔍 Verificando protección de refresco:', {
      forceRefresh,
      isPageChange,
      usePagination: this.usePagination,
      skipTimeProtection,
      tiempoDesdeUltimoRefresco: (tiempoDesdeUltimoRefresco / 1000).toFixed(1) + 's',
      tiempoMinimo: (tiempoMinimoEntreRefrescos / 1000).toFixed(1) + 's',
      refrescoEnProgreso: this.refrescoEnProgreso
    });

    if (
      !skipTimeProtection &&
      tiempoDesdeUltimoRefresco < tiempoMinimoEntreRefrescos
    ) {
      console.log(
        `⏰ REFRESCO OMITIDO - Último refresco hace ${(tiempoDesdeUltimoRefresco / 1000).toFixed(1)}s (mínimo ${tiempoMinimoEntreRefrescos / 1000}s)`,
      );
      return;
    }

    // PROTECCIÓN CONTRA LLAMADAS SIMULTÁNEAS
    // Para cambios de página: permitir si el anterior ya terminó o si pasaron más de 3s
    if (this.refrescoEnProgreso) {
      const tiempoMaximoEspera = 3000; // 3 segundos máximo de espera
      if (isPageChange && tiempoDesdeUltimoRefresco > tiempoMaximoEspera) {
        console.log(`⚠️ Forzando refresco - el anterior tardó más de ${tiempoMaximoEspera/1000}s`);
        // Resetear el flag para permitir el nuevo refresco
        this.refrescoEnProgreso = false;
      } else {
        console.log(`🔄 REFRESCO EN PROGRESO - Omitiendo solicitud duplicada`, {
          isPageChange,
          tiempoDesdeUltimoRefresco: (tiempoDesdeUltimoRefresco / 1000).toFixed(1) + 's',
          caller: caller.substring(0, 100)
        });
        return;
      }
    }

    this.refrescoEnProgreso = true;
    this.ultimoRefresco = ahora;

    // Si es un refresco forzado (filtros nuevos), resetear a página 1
    if (forceRefresh && this.usePagination) {
      this.currentPage = 1;
      this.first = 0;
    }

    console.log(
      `🔄 INICIANDO REFRESCO - Forzado: ${forceRefresh}, Tiempo desde último: ${(tiempoDesdeUltimoRefresco / 1000).toFixed(1)}s`,
    );

    // Ensure dates are set with fallback to today
    if (!this.fechaInicial || !this.fechaFinal) {
      const today = new Date().toISOString().split("T")[0];
      this.fechaInicial = this.fechaInicial || today;
      this.fechaFinal = this.fechaFinal || today;
    }

    // Create proper date range for filtering
    // Using local timezone to avoid issues with UTC conversion
    const startDate = new Date(this.fechaInicial + "T00:00:00");
    const endDate = new Date(this.fechaFinal + "T23:59:59.999");

    const filter: any = {
      fechaInicial: startDate.toISOString(),
      fechaFinal: endDate.toISOString(),
      company: JSON.parse(localStorage.getItem("currentCompany")!).nomComercial,
      tipoFecha: "fechaEntrega",
      estadoProceso: ["Todos"],
      //se comenta mientras salimos del dia de amor y amistad PARA ALMARA - 17/09/2025
      /*this.isFromProduction
        ? [EstadoProceso.SinProducir, EstadoProceso.EnProduccion, EstadoProceso.ProducidoParcialmente, EstadoProceso.ProducidoTotalmente, EstadoProceso.ParaDespachar]
        : ["Todos"],*/
    };

    // Agregar búsqueda global si existe y se usa paginación
    if (this.usePagination && this.searchQuery && this.searchQuery.trim() !== '') {
      filter.globalFilter = this.searchQuery.trim();
    }

    // ==================== FASE 5: Agregar filtros de columna al payload ====================
    // Mapear filtros de columna capturados en loadLazy al objeto filter
    // Solo para las 4 columnas principales: nroPedido, cliente, ciudad, transportador
    if (this.usePagination && Object.keys(this.columnFilters).length > 0) {
      filter.columnFilters = this.columnFilters;
      console.log('🎯 Filtros de columna agregados al payload:', filter.columnFilters);
    }
    // ======================================================================================

    // Apply quick filters for payment status
    if (this.quickFilters.estadoPago !== "all") {
      filter.estadosPago = [this.quickFilters.estadoPago];
    }

    // Apply quick filters for process status (fixed logic)
    if (this.quickFilters.estadoProceso !== "all") {
      if (this.isFromProduction) {
        // For production view, still allow process filtering but maintain production states
        const productionStates = [
          EstadoProceso.SinProducir,
          EstadoProceso.EnProduccion,
          EstadoProceso.ProducidoParcialmente,
          EstadoProceso.ParaDespachar,
        ];
        if (
          productionStates.includes(
            this.quickFilters.estadoProceso as EstadoProceso,
          )
        ) {
          filter.estadoProceso = [this.quickFilters.estadoProceso];
        }
      } else {
        filter.estadoProceso = [this.quickFilters.estadoProceso];
      }
    }

    // --- AJUSTE: Solo sobreescribir estadosPago por defecto si el filtro rápido está en 'all' ---
    if (this.quickFilters.estadoPago === "all") {
      if (this.isFromProduction) {
        filter["estadosPago"] = [
          "Pospendiente",
          "PreAprobado",
          "Aprobado",
          "Pendiente",
          "Pospendiente",
        ];
      } else {
        // Para modo no producción, incluir todos los estados de pago posibles
        filter["estadosPago"] = [
          "Pospendiente",
          "PreAprobado",
          "Aprobado",
          "Pendiente",
          "Pospendiente",
          "Rechazado",
          "Precancelado",
          "Cancelado",
        ];
      }
    }

    // Crear payload específico para POS (incluye filtros de columna)
    const posFilter: any = {
      fechaInicial: filter.fechaInicial,
      fechaFinal: filter.fechaFinal,
      company: filter.company,
    };

    // Agregar filtros de columna al payload POS si existen
    if (filter.columnFilters && Object.keys(filter.columnFilters).length > 0) {
      posFilter.columnFilters = filter.columnFilters;
    }

    // Agregar filtro global al payload POS si existe
    if (filter.globalFilter) {
      posFilter.globalFilter = filter.globalFilter;
    }

    console.log("Payload para pedidos normales:", filter);
    console.log("Payload para pedidos POS:", posFilter);

    // Usar paginación del servidor si está habilitada
    if (this.usePagination) {
      // Establecer loading antes de hacer la petición
      this.loading = true;
      
      console.log('🔄 refrescarDatos con paginación:', {
        currentPage: this.currentPage,
        pageSize: this.pageSize,
        first: this.first,
        filter: filter,
        refrescoEnProgreso: this.refrescoEnProgreso
      });

      // Obtener pedidos normales paginados y pedidos del POS en paralelo
      // Usar takeUntil para limpiar suscriptores cuando el componente se destruya
      // NOTA: Los pedidos POS solo se cargan en la primera página para no afectar la paginación
      const shouldLoadPOS = this.currentPage === 1;
      
      // Usar forkJoin con tipos explícitos para evitar errores de TypeScript
      const paginatedRequest = this.ventasService.getOrdersByFilterOptimized(filter, this.currentPage, this.pageSize);
      
      // Cargar pedidos paginados primero
      paginatedRequest.pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (paginatedResponse) => {
          // Si debemos cargar POS, hacerlo en paralelo
          if (shouldLoadPOS) {
            this.ventasService.getOrdersPOSByFilter(posFilter).pipe(
              takeUntil(this.destroy$)
            ).subscribe({
              next: (posOrdersResponse) => {
                this.procesarRespuestaPaginada(paginatedResponse, posOrdersResponse || [], shouldLoadPOS);
              },
              error: (error) => {
                console.error('Error cargando pedidos POS:', error);
                // Continuar sin pedidos POS
                this.procesarRespuestaPaginada(paginatedResponse, [], shouldLoadPOS);
              }
            });
          } else {
            this.procesarRespuestaPaginada(paginatedResponse, [], shouldLoadPOS);
          }
        },
        error: (error) => {
          console.error('Error cargando pedidos:', error);
          this.loading = false;
          this.refrescoEnProgreso = false;
        }
      });
    } else {
      // Usar método sin paginación
      this.refrescarDatosSinPaginacion();
    }
  }

  /**
   * Procesa la respuesta paginada y los pedidos POS
   */
  private procesarRespuestaPaginada(paginatedResponse: any, posOrders: any[], shouldLoadPOS: boolean): void {
    try {
      const posOrdersArray = Array.isArray(posOrders) ? posOrders : [];
      
      console.log("✅ Respuesta paginada recibida:", {
        orders: paginatedResponse?.orders?.length || 0,
        totalItems: paginatedResponse?.pagination?.totalItems || 0,
        currentPage: paginatedResponse?.pagination?.currentPage || 0,
        totalPages: paginatedResponse?.pagination?.totalPages || 0
      });
      
      if (shouldLoadPOS) {
        console.log("✅ Pedidos POS recibidos:", posOrdersArray?.length || 0);
      } else {
        console.log("⏭️ Pedidos POS omitidos (no es primera página)");
      }

      // Extraer pedidos de la respuesta paginada
      const normalOrders = paginatedResponse?.orders || [];
      
      // Actualizar información de paginación
      // IMPORTANTE: El totalRecords incluye SOLO los pedidos normales del backend
      // Los pedidos POS se suman al total solo si estamos en la primera página
      if (paginatedResponse?.pagination) {
        const totalNormales = paginatedResponse.pagination.totalItems;
        const totalPOS = posOrdersArray?.length || 0;
        
        // El total de registros es la suma de normales + POS
        this.totalRecords = totalNormales + totalPOS;
        
        console.log('📊 Total records actualizado:', {
          totalNormales: totalNormales,
          totalPOS: totalPOS,
          totalCombinado: this.totalRecords,
          currentPage: paginatedResponse.pagination.currentPage,
          totalPages: Math.ceil(this.totalRecords / this.pageSize),
          itemsPerPage: paginatedResponse.pagination.itemsPerPage
        });
      } else {
        // Si no hay paginación en la respuesta, usar el total de pedidos cargados como fallback
        this.totalRecords = normalOrders.length + (posOrdersArray?.length || 0);
        console.warn('⚠️ No se recibió información de paginación del backend, usando total de pedidos cargados como fallback:', this.totalRecords);
      }
      
      // Guardar métricas del backend (calculadas sobre todos los pedidos, no solo los paginados)
      if (paginatedResponse?.metrics) {
        this.backendMetrics = paginatedResponse.metrics;
        console.log('📊 Métricas recibidas del backend:', this.backendMetrics);
      } else {
        console.log('⚠️ No se recibieron métricas del backend');
      }

      // Combinar ambos tipos de pedidos
      // Los pedidos POS van al inicio para que aparezcan primero en la primera página
      const allOrders = [...posOrdersArray, ...(normalOrders || [])];
      console.log("Total de pedidos combinados:", allOrders.length);

      // Limpiar orders antes de asignar nuevos datos para forzar detección de cambios
      this.orders = [];
      this.changeDetectorRef.detectChanges();

        allOrders.forEach((order: any) => {
          // Verificar si el backend ya calculó los totales (optimización de rendimiento)
          if (!order._calculadoEnBackend) {
            // Recalcular montos base con consistencia (solo si backend no lo hizo)
            // Consistente con PaymentService
            const subtotalProductos = Number(this.checkPriceScale(order) || 0);
            const envio = Number(order.totalEnvio || 0);

            // 1. Valor Bruto (totalPedidoSinDescuento) = SOLO productos (sin envío)
            order.totalPedidoSinDescuento = subtotalProductos;

            // 2. Calcular descuento SOLO sobre productos (NO sobre envío)
            let descuento = 0;
            if (order.porceDescuento) {
              descuento = subtotalProductos * (Number(order.porceDescuento) / 100);
              order.totalDescuento = descuento;
            } else {
              descuento = Number(order.totalDescuento || 0);
            }

            // 3. Subtotal = valorBruto - descuento + envío (INCLUYE domicilio)
            order.subtotal = subtotalProductos - descuento + envio;

            // 4. Calcular IVA (incluye IVA de productos + envío, con descuento aplicado internamente)
            const ivaResult = this.checkIVAPrice(order);
            // Usar el IVA calculado, o preservar el existente del backend si no hay carrito
            order.totalImpuesto = Number(ivaResult.totalPrecioIVADef || order.totalImpuesto || 0);

            // 5. Total = subtotal + IVA (envío ya está incluido en subtotal)
            order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;
          }

          // Calcular anticipo basado en PagosAsentados si existen
          if (order.PagosAsentados && order.PagosAsentados.length > 0) {
            console.log(`🔍 PROCESANDO PAGOS - Pedido ${order.nroPedido}:`, {
              totalPagos: order.PagosAsentados.length,
              pagos: order.PagosAsentados.map((p) => ({
                formaPago: p.formaPago,
                estadoVerificacion: p.estadoVerificacion,
                valor: p.valor || p.valorRegistrado,
                numeroComprobante: p.numeroComprobante,
              })),
            });

            order.anticipo = order.PagosAsentados.reduce((acc, pago) => {
              // ✅ CORREGIDO: Incluir TODOS los pagos, incluso los pendientes
              // Los pagos pendientes también representan dinero que el cliente ya pagó
              // Solo excluir pagos rechazados o cancelados

              // Verificar si el pago está en un estado válido para sumar
              const estadoValido =
                pago.estadoVerificacion !== "Rechazado" &&
                pago.estadoVerificacion !== "Cancelado";

              if (estadoValido) {
                // Considerar tanto valor como valorRegistrado
                const valorPago = Number(
                  pago.valor || pago.valorRegistrado || 0,
                );
                console.log(`💰 PAGO INCLUIDO - Pedido ${order.nroPedido}:`, {
                  formaPago: pago.formaPago,
                  estadoVerificacion: pago.estadoVerificacion,
                  valor: valorPago,
                  numeroComprobante: pago.numeroComprobante,
                });
                return acc + valorPago;
              } else {
                console.log(`❌ PAGO EXCLUIDO - Pedido ${order.nroPedido}:`, {
                  formaPago: pago.formaPago,
                  estadoVerificacion: pago.estadoVerificacion,
                  valor: pago.valor || pago.valorRegistrado,
                  numeroComprobante: pago.numeroComprobante,
                  razon: "Estado inválido",
                });
                return acc;
              }
            }, 0);

            console.log(`📊 RESUMEN CÁLCULO - Pedido ${order.nroPedido}:`, {
              anticipoCalculado: order.anticipo,
              faltaPorPagar: order.faltaPorPagar,
              totalPedido: order.totalPedididoConDescuento,
            });
          } else if (order.anticipo == null || order.anticipo == undefined) {
            order.anticipo = 0;
          }

          // 🚚 RECALCULAR ENVÍO Y TOTALIZAR solo si el backend NO lo calculó
          // Si _calculadoEnBackend === true, confiamos en los valores del backend (fórmula correcta)
          if (!order._calculadoEnBackend) {
            this.recalcularEnvioYTotalizarPedido(order);
          }

          // Calcular falta por pagar basado en el total y anticipo real (ya recalculado)
          order.faltaPorPagar = Math.max(
            0,
            Number(order.totalPedididoConDescuento || 0) -
            Number(order.anticipo || 0),
          );

          // 🔍 DEBUG: Log del estado de pago antes de procesar
          console.log(`💰 ESTADO DE PAGO - Pedido ${order.nroPedido}:`, {
            estadoActual: order.estadoPago,
            _estadoCalculadoEnFrontend: order._estadoCalculadoEnFrontend,
            _timestamp: order._timestamp,
            anticipo: order.anticipo,
            faltaPorPagar: order.faltaPorPagar,
            totalPedido: order.totalPedididoConDescuento,
            pagosAsentados: order.PagosAsentados?.length || 0,
          });

          // 🔍 VERIFICACIÓN SIMPLIFICADA: Solo recalcular si NO fue calculado en frontend
          // ✅ CORREGIDO: Eliminar la lógica de expiración temporal para evitar recálculos automáticos
          // ✅ CORREGIDO: No recalcular estados finales (Aprobado, Rechazado, Cancelado, Precancelado)
          const estadosFinales = ["Aprobado", "Rechazado", "Cancelado", "Precancelado"];
          const esEstadoFinal = estadosFinales.includes(order.estadoPago);

          const debeRecalcular =
            !order._estadoCalculadoEnFrontend &&
            !esEstadoFinal;

          console.log(`🔍 VERIFICACIÓN ESTADO - Pedido ${order.nroPedido}:`, {
            _estadoCalculadoEnFrontend: order._estadoCalculadoEnFrontend,
            _timestamp: order._timestamp,
            debeRecalcular: debeRecalcular,
            esEstadoFinal: esEstadoFinal,
            estadoActual: order.estadoPago,
          });

          // Actualizar estado de pago basado en los cálculos reales
          // SOLO recalcular estado si no viene ya calculado del frontend
          // ✅ NUNCA recalcular estados finales (Rechazado, Cancelado, Precancelado)
          if (debeRecalcular && !esEstadoFinal) {
            // Regla: si la forma de entrega es "Recoge", el estado de pago debe ser siempre "Pendiente"
            const formaEntregaActual =
              (order.formaEntrega as string) ||
              (order?.carrito?.[0]?.configuracion?.datosEntrega
                ?.formaEntrega as string) ||
              "";
            const esRecoge =
              typeof formaEntregaActual === "string" &&
              formaEntregaActual.toLowerCase().includes("recoge");

            if (esRecoge) {
              order.estadoPago = "Pendiente";
            } else {
              // Evitar marcar como Aprobado pedidos con total 0
              const totalPedido = Number(order.totalPedididoConDescuento || 0);
              if (totalPedido <= 0) {
                order.estadoPago = "Pendiente";
              } else if (order.faltaPorPagar <= 0) {
                order.estadoPago = "Aprobado";
              } else if (
                order.faltaPorPagar > 0 &&
                order.faltaPorPagar < totalPedido
              ) {
                order.estadoPago = "PreAprobado";
              } else if (order.preAprobadoManual) {
                order.estadoPago = "PreAprobado";
              } else {
                order.estadoPago = "Pendiente";
              }

              console.log(
                `🔄 ESTADO RECALCULADO - Pedido ${order.nroPedido}:`,
                {
                  estadoAnterior: order.estadoPago,
                  estadoNuevo: order.estadoPago,
                  razon: "Recalculado en refrescarDatos",
                  anticipo: order.anticipo,
                  faltaPorPagar: order.faltaPorPagar,
                  totalPedido: order.totalPedididoConDescuento,
                },
              );
            }
          } else if (
            order._estadoCalculadoEnFrontend &&
            !esEstadoFinal
          ) {
            // 🔒 PROTECCIÓN MEJORADA: Si el estado ya fue calculado en el frontend,
            // verificar que sea consistente con los pagos actuales para evitar inconsistencias
            // ✅ NUNCA modificar estados finales (Rechazado, Cancelado, Precancelado)

            // Verificar si hay inconsistencias entre el estado y los pagos
            const totalPedido = Number(order.totalPedididoConDescuento || 0);
            const anticipoReal = Number(order.anticipo || 0);
            const faltaPorPagarReal = Math.max(0, totalPedido - anticipoReal);

            // ✅ CORREGIDO: Solo corregir inconsistencias CRÍTICAS y OBVIAS
            // Evitar cambios automáticos que puedan causar confusión
            // 🔒 PROTECCIÓN: NUNCA cambiar de "Aprobado" a otro estado automáticamente
            // Si el usuario o el sistema marcó un pedido como "Aprobado", esa decisión debe respetarse
            let estadoCorregido = false;

            // 🔒 ELIMINADO: Lógica que cambiaba de "Aprobado" a "Pendiente" o "PreAprobado"
            // Esta lógica causaba el problema reportado donde pedidos aprobados cambiaban automáticamente
            // a pendiente al refrescar la página, debido a discrepancias en el cálculo de faltaPorPagar
            // Si el estado es "Aprobado", SIEMPRE respetarlo (es un estado final establecido manualmente)
            if (order.estadoPago === "Aprobado" && faltaPorPagarReal <= 0) {
              console.log(`🔒 ESTADO APROBADO PROTEGIDO - Pedido ${order.nroPedido}:`, {
                estadoPreservado: order.estadoPago,
                razon: "Estado Aprobado es inmutable - No se recalcula automáticamente",
                anticipoReal: anticipoReal,
                faltaPorPagarReal: faltaPorPagarReal,
                totalPedido: totalPedido,
                tienePagosAsentados: (order.PagosAsentados?.length || 0) > 0
              });
              // NO HACER NADA - Preservar el estado "Aprobado"
            } else if (order.estadoPago === "Aprobado" && faltaPorPagarReal > 0) {
              // El pedido fue aprobado pero se añadieron productos y quedó saldo pendiente
              order.estadoPago = EstadoPago.PreAprobado;
              console.log(`🔄 APROBADO → PREAPROBADO - Pedido ${order.nroPedido}: se añadieron productos, faltaPorPagar=${faltaPorPagarReal}`);
            } else if (
              order.estadoPago === "PreAprobado" &&
              faltaPorPagarReal <= 0
            ) {
              // Solo corregir si realmente no falta nada por pagar
              if (faltaPorPagarReal <= 0) {
                order.estadoPago = "Aprobado";
                estadoCorregido = true;
                console.log(
                  `⚠️ CORRECCIÓN CRÍTICA - Pedido ${order.nroPedido}: Estado PreAprobado → Aprobado (pago completo)`,
                );
              }
            } else if (order.estadoPago === "Pendiente" && anticipoReal > 0) {
              // Solo corregir si hay pagos significativos (más del 50% del total)
              const porcentajePagado = (anticipoReal / totalPedido) * 100;
              if (porcentajePagado > 50) {
                if (faltaPorPagarReal <= 0) {
                  order.estadoPago = "Aprobado";
                } else if (faltaPorPagarReal < totalPedido) {
                  order.estadoPago = "PreAprobado";
                }
                estadoCorregido = true;
                console.log(
                  `⚠️ CORRECCIÓN CRÍTICA - Pedido ${order.nroPedido}: Estado Pendiente → ${order.estadoPago} (pagado ${porcentajePagado.toFixed(1)}%)`,
                );
              }
            }

            if (!estadoCorregido) {
              // ✅ NO SOBRESCRIBIR el estado si ya fue calculado en frontend y no hay inconsistencias críticas
              console.log(`🔒 ESTADO PRESERVADO - Pedido ${order.nroPedido}:`, {
                estadoPreservado: order.estadoPago,
                razon:
                  "Ya calculado en frontend - Sin inconsistencias críticas",
                _estadoCalculadoEnFrontend: order._estadoCalculadoEnFrontend,
                _timestamp: order._timestamp,
              });
            }
          }
          // if (order.estadoPago != 'Precancelado' && order.estadoPago != 'Cancelado') {
          //   if (order.faltaPorPagar <= 0) {
          //     order.estadoPago = EstadoPago.Aprobado
          //   } else if (order.faltaPorPagar > 0 && order.faltaPorPagar < order.totalPedididoConDescuento) {
          //     order.estadoPago = EstadoPago.PreAprobado
          //   } else if(order.preAprobadoManual){
          //     order.estadoPago = EstadoPago.PreAprobado
          //   }else{
          //     order.estadoPago = EstadoPago.Pendiente
          //   }
          // }

          if (
            !order.validacion ||
            order.validacion == null ||
            order.validacion == undefined
          ) {
            order.validacion = false;
          }
        });

        // Usar requestAnimationFrame para actualización más rápida (en lugar de setTimeout 100ms)
        requestAnimationFrame(() => {
          this.orders = [...allOrders];
          this.changeDetectorRef.detectChanges();
          this.changeDetectorRef.markForCheck();
          // ✅ FINALIZAR REFRESCO
          this.refrescoEnProgreso = false;
          this.loading = false;

          // Actualizar pedidos originales para búsqueda local
          this.originalOrders = [...this.orders];

          // Marcar que se han cargado pedidos al menos una vez
          if (this.orders.length > 0) {
            this.hasLoadedOrdersOnce = true;
          }

          // Si hay búsqueda local activa, aplicar el filtro nuevamente
          if (this.hasActiveLocalSearch()) {
            this.performLocalSearch(this.localSearchQuery);
          }

          console.log(
            `✅ REFRESCO COMPLETADO - ${this.orders.length} pedidos procesados, totalRecords: ${this.totalRecords}`,
          );
          // Si hay una referencia a la tabla, forzar su actualización
          if (this.table) {
            // Actualizar valores de la tabla
            this.table.value = this.orders;
            this.table.totalRecords = this.usePagination ? this.totalRecords : this.orders.length;
            this.table.first = this.first;
            this.table.loading = false;

            // Forzar detección de cambios en la tabla
            this.changeDetectorRef.detectChanges();

            console.log('📊 Tabla PrimeNG actualizada:', {
              totalRecords: this.table.totalRecords,
              first: this.table.first,
              rows: this.table.rows,
              ordersCount: this.orders.length,
              usePagination: this.usePagination
            });
          }
        });
    } catch (error) {
      console.error("❌ Error procesando respuesta paginada:", error);
      this.loading = false;
      this.refrescoEnProgreso = false;
      
      Swal.fire({
        icon: "error",
        title: "Error al procesar pedidos",
        text: "No se pudieron procesar los pedidos. Por favor, intente nuevamente.",
        confirmButtonText: "Reintentar",
      });
    }
  }

  /**
   * Método antiguo de refrescar datos (sin paginación del servidor)
   * @deprecated Usar refrescarDatos con usePagination = true
   */
  private refrescarDatosSinPaginacion(): void {
    // Ensure dates are set with fallback to today
    if (!this.fechaInicial || !this.fechaFinal) {
      const today = new Date().toISOString().split("T")[0];
      this.fechaInicial = this.fechaInicial || today;
      this.fechaFinal = this.fechaFinal || today;
    }

    const startDate = new Date(this.fechaInicial + "T00:00:00");
    const endDate = new Date(this.fechaFinal + "T23:59:59.999");

    const filter: any = {
      fechaInicial: startDate.toISOString(),
      fechaFinal: endDate.toISOString(),
      company: JSON.parse(localStorage.getItem("currentCompany")!).nomComercial,
      tipoFecha: "fechaEntrega",
      estadoProceso: ["Todos"],
    };

    const posFilter: any = {
      fechaInicial: filter.fechaInicial,
      fechaFinal: filter.fechaFinal,
      company: filter.company,
    };

    // Agregar filtros de columna al payload POS si existen (para método sin paginación)
    if (this.columnFilters && Object.keys(this.columnFilters).length > 0) {
      posFilter.columnFilters = this.columnFilters;
    }

    // Método antiguo (sin paginación del servidor)
    forkJoin([
        this.ventasService.getOrdersByFilter(filter),
        this.ventasService.getOrdersPOSByFilter(posFilter),
      ]).subscribe({
        next: ([normalOrders, posOrders]) => {
          console.log("Pedidos normales:", normalOrders);
          console.log("Pedidos POS:", posOrders);

          // Combinar ambos tipos de pedidos
          const allOrders = [...(normalOrders || []), ...(posOrders || [])];
          console.log("Total de pedidos combinados:", allOrders.length);

          // Limpiar orders antes de asignar nuevos datos para forzar detección de cambios
          this.orders = [];
          this.changeDetectorRef.detectChanges();

          allOrders.forEach((order: any) => {
            // Verificar si el backend ya calculó los totales (optimización de rendimiento)
            if (!order._calculadoEnBackend) {
              // Recalcular montos base con consistencia (solo si backend no lo hizo)
              // Consistente con PaymentService y recalcularEnvioYTotalizarPedido
              const subtotalProductos = Number(this.checkPriceScale(order) || 0);
              const envio = Number(order.totalEnvio || 0);

              // 1. Valor Bruto (totalPedidoSinDescuento) = SOLO productos (sin envío)
              order.totalPedidoSinDescuento = subtotalProductos;

              // 2. Calcular descuento SOLO sobre productos (NO sobre envío)
              let descuento = 0;
              if (order.porceDescuento) {
                descuento = subtotalProductos * (Number(order.porceDescuento) / 100);
                order.totalDescuento = descuento;
              } else {
                descuento = Number(order.totalDescuento || 0);
              }

              // 3. Subtotal = valorBruto - descuento + envío (INCLUYE domicilio)
              order.subtotal = subtotalProductos - descuento + envio;

              // 4. Calcular IVA (incluye IVA de productos + envío, con descuento aplicado internamente)
              const ivaResultSinPag = this.checkIVAPrice(order);
              // Usar el IVA calculado, o preservar el existente del backend si no hay carrito
              order.totalImpuesto = Number(ivaResultSinPag.totalPrecioIVADef || order.totalImpuesto || 0);

              // 5. Total = subtotal + IVA (envío ya está incluido en subtotal)
              order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;
            }

            // Calcular anticipo basado en PagosAsentados si existen
            if (order.PagosAsentados && order.PagosAsentados.length > 0) {
              order.anticipo = order.PagosAsentados.reduce((acc, pago) => {
                const estadoValido =
                  pago.estadoVerificacion !== "Rechazado" &&
                  pago.estadoVerificacion !== "Cancelado";
                if (estadoValido) {
                  const valorPago = Number(
                    pago.valor || pago.valorRegistrado || 0,
                  );
                  return acc + valorPago;
                }
                return acc;
              }, 0);
            } else if (order.anticipo == null || order.anticipo == undefined) {
              order.anticipo = 0;
            }

            // 🚚 RECALCULAR ENVÍO Y TOTALIZAR usando la misma lógica que el PDF
            // Esto asegura consistencia entre la tabla y el PDF
            this.recalcularEnvioYTotalizarPedido(order);

            // Calcular falta por pagar basado en el total y anticipo real (ya recalculado)
            order.faltaPorPagar = Math.max(
              0,
              Number(order.totalPedididoConDescuento || 0) -
              Number(order.anticipo || 0),
            );

            // Validación
            if (
              !order.validacion ||
              order.validacion == null ||
              order.validacion == undefined
            ) {
              order.validacion = false;
            }
          });

          // Forzar actualización de la tabla
          setTimeout(() => {
            this.orders = [...allOrders];
            this.changeDetectorRef.detectChanges();
            this.changeDetectorRef.markForCheck();
            this.refrescoEnProgreso = false;
            this.loading = false;

            // Actualizar pedidos originales para búsqueda local
            this.originalOrders = [...this.orders];

            // Marcar que se han cargado pedidos al menos una vez
            if (this.orders.length > 0) {
              this.hasLoadedOrdersOnce = true;
            }

            // Si hay búsqueda local activa, aplicar el filtro nuevamente
            if (this.hasActiveLocalSearch()) {
              this.performLocalSearch(this.localSearchQuery);
            }

            console.log(
              `✅ REFRESCO COMPLETADO - ${this.orders.length} pedidos procesados`,
            );
            // Si hay una referencia a la tabla, forzar su actualización
            if (this.table) {
              this.table.reset();
              this.table.value = this.orders;
              this.table.totalRecords = this.orders.length;
              this.table.loading = false;
            }
          }, 100);
        },
        error: (error) => {
          console.error("❌ ERROR EN REFRESCO:", error);
          this.refrescoEnProgreso = false;
          this.loading = false;

          Swal.fire({
            icon: "error",
            title: "Error al cargar pedidos",
            text: "No se pudieron cargar los pedidos. Por favor, intente nuevamente.",
            confirmButtonText: "Reintentar",
          });
        },
      });
  }

  clear(table: Table) {
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    // this.fechaInicial = new Date('01-' + (new Date().getMonth() + 1) + '-' + new Date().getFullYear());
    // this.fechaFinal = new Date(new Date().getTime() + unaSemana);
    // this.fechaFinal.setHours(23, 59, 59, 999);

    this.fechaInicial = new Date(
      "01-" + (new Date().getMonth() + 1) + "-" + new Date().getFullYear(),
    )
      .toISOString()
      .split("T")[0];
    this.fechaFinal = new Date().toISOString().split("T")[0];

    this.refrescar(table);
  }

  refrescar(table: Table) {
    this.refrescarDatos(true); // Forzar refresco
    // table.clear();
  }

  // ✅ NUEVO: Función para refrescar solo después de cambios importantes
  refrescarDespuesDeCambio() {
    console.log("🔄 REFRESCANDO DESPUÉS DE CAMBIO IMPORTANTE");
    this.refrescarDatos(true); // Forzar refresco
  }

  // ✅ NUEVO: Método público para cargar datos a demanda
  cargarDatos() {
    console.log("📊 CARGANDO DATOS A DEMANDA");
    this.loading = true;
    this.refrescarDatos(true);
  }

  initForms(cliente: Cliente) {
    this.formulario = this.formBuilder.group({
      // Datos del comprador
      nombres_completos: [cliente.nombres_completos || "", Validators.required],
      tipo_documento_comprador: [
        cliente.tipo_documento_comprador || "",
        Validators.required,
      ],
      documento: [cliente.documento || "", Validators.required],
      indicativo_celular_comprador: [
        cliente.indicativo_celular_comprador || "",
        Validators.required,
      ],
      numero_celular_comprador: [
        cliente.numero_celular_comprador || "",
        Validators.required,
      ],
      correo_electronico_comprador: [
        cliente.correo_electronico_comprador || "",
        [Validators.required, Validators.email],
      ],
      indicativo_celular_whatsapp: [
        cliente.indicativo_celular_whatsapp || "",
        Validators.required,
      ],
      numero_celular_whatsapp: [
        cliente.numero_celular_whatsapp || "",
        Validators.required,
      ],
      datosFacturacionElectronica: [
        cliente.datosFacturacionElectronica || [""],
      ],
      datosEntrega: [cliente.datosEntrega || [""]],
      notas: [cliente.notas || [""]],
      estado: [cliente.estado || "Activo"],
    });
  }

  calculateValorBruto() {
    return this.orders.reduce(
      (acc, pedido: any) => acc + pedido.totalPedidoSinDescuento,
      0,
    );
  }

  calculateDescuento() {
    return this.orders.reduce(
      (acc, pedido: any) => acc + pedido.totalDescuento,
      0,
    );
  }

  calculateEnvio() {
    return this.orders.reduce((acc, pedido: any) => acc + pedido.totalEnvio, 0);
  }

  calculateTotal() {
    return this.orders.reduce(
      (acc, pedido: any) => acc + pedido.totalPedididoConDescuento,
      0,
    );
  }

  calculateFaltaPorPagar() {
    return this.orders.reduce((acc, pedido: any) => {
      // Recalcular falta por pagar basado en pagos asentados
      const anticipoReal =
        pedido.PagosAsentados && pedido.PagosAsentados.length > 0
          ? pedido.PagosAsentados.reduce((sum, pago) => {
            // Para Wompi, verificar que no esté pendiente
            if (
              pago.formaPago?.toLowerCase().includes("wompi") &&
              pago.estadoVerificacion === "Pendiente"
            ) {
              return sum; // No sumar pagos de Wompi pendientes
            }
            // Considerar tanto valor como valorRegistrado
            const valorPago = pago.valor || pago.valorRegistrado || 0;
            return sum + valorPago;
          }, 0)
          : pedido.anticipo || 0;
      const faltaPorPagar =
        (pedido.totalPedididoConDescuento || 0) - anticipoReal;
      return acc + Math.max(0, faltaPorPagar); // Evitar valores negativos
    }, 0);
  }

  calculateTotalEnvio() {
    return this.orders.reduce((acc, pedido: any) => acc + pedido.totalEnvio, 0);
  }

  calculateAnticipo() {
    return this.orders.reduce((acc, pedido: any) => {
      // Calcular anticipo basado en PagosAsentados si existen
      const anticipoReal =
        pedido.PagosAsentados && pedido.PagosAsentados.length > 0
          ? pedido.PagosAsentados.reduce((sum, pago) => {
            // Para Wompi, verificar que no esté pendiente
            if (
              pago.formaPago?.toLowerCase().includes("wompi") &&
              pago.estadoVerificacion === "Pendiente"
            ) {
              return sum; // No sumar pagos de Wompi pendientes
            }
            // Considerar tanto valor como valorRegistrado
            const valorPago = pago.valor || pago.valorRegistrado || 0;
            return sum + valorPago;
          }, 0)
          : pedido.anticipo || 0;
      return acc + anticipoReal;
    }, 0);
  }

  calculateSubtotal() {
    return this.orders.reduce((acc, pedido: any) => acc + pedido.subtotal, 0);
  }

  calculateTotalImpuestos() {
    return this.orders.reduce(
      (acc, pedido: any) => acc + pedido.totalImpuesto,
      0,
    );
  }

  // MÉTODOS PARA LA FILA DE RESUMEN (DATOS FILTRADOS)
  /**
   * Obtiene los pedidos actualmente filtrados en la tabla
   */
  private getFilteredOrders(): any[] {
    if (this.table && this.table.filteredValue) {
      return this.table.filteredValue;
    }
    return this.orders || [];
  }

  /**
   * Conteo de pedidos por estado de pago
   */
  getEstadoCount(estado: string): number {
    return this.getFilteredOrders().filter(
      (pedido) => pedido.estadoPago === estado,
    ).length;
  }

  /**
   * Helper para mostrar estados de proceso abreviados con tooltips
   * Utilizado para optimizar el espacio visual en la tabla
   */
  getStatusDisplay(status: string): { short: string; full: string } {
    const statusMap: { [key: string]: { short: string; full: string } } = {
      ProducidoTotalmente: {
        short: "Prod. Total",
        full: "Producido Totalmente - Producción completada al 100%",
      },
      ProducidoParcialmente: {
        short: "Prod. Parcial",
        full: "Producido Parcialmente - Producción en progreso parcial",
      },
      SinProducir: {
        short: "Sin Producir",
        full: "Sin Producir - Pendiente de iniciar producción",
      },
      EnProduccion: {
        short: "En Prod.",
        full: "En Producción - Actualmente en fabricación",
      },
      ParaDespachar: {
        short: "P. Despachar",
        full: "Para Despachar - Listo para envío",
      },
      Despachado: {
        short: "Despachado",
        full: "Despachado - Enviado al cliente",
      },
      Entregado: {
        short: "Entregado",
        full: "Entregado - Entregado al cliente",
      },
      Empacado: {
        short: "Empacado",
        full: "Empacado - Empacado y listo",
      },
      Producido: {
        short: "Producido",
        full: "Producido - Producción finalizada",
      },
      Rechazado: {
        short: "Rechazado",
        full: "Rechazado - Proceso rechazado",
      },
      Cerrado: {
        short: "Cerrado",
        full: "Cerrado - Pedido finalizado",
      },
    };
    return statusMap[status] || { short: status, full: status };
  }

  /**
   * Helper para mostrar estados de pago abreviados con tooltips
   * Utilizado para optimizar el espacio visual en la tabla
   */
  getPaymentStatusDisplay(status: string): { short: string; full: string } {
    const statusMap: { [key: string]: { short: string; full: string } } = {
      Pospendiente: {
        short: "Pendiente",
        full: "Pospendiente - Pago en validación posterior",
      },
      Pendiente: {
        short: "Pendiente",
        full: "Pendiente - Pago pendiente de confirmación",
      },
      PreAprobado: {
        short: "Pre-Aprob.",
        full: "Pre-Aprobado - Pago pre-aprobado, verificando",
      },
      Aprobado: {
        short: "Aprobado",
        full: "Aprobado - Pago confirmado y exitoso",
      },
      Rechazado: {
        short: "Rechazado",
        full: "Rechazado - Pago rechazado por la entidad",
      },
      Cancelado: {
        short: "Cancelado",
        full: "Cancelado - Pedido cancelado manualmente",
      },
      Precancelado: {
        short: "Pre-Cancel",
        full: "Pre-Cancelado - En proceso de cancelación",
      },
    };
    return statusMap[status] || { short: status, full: status };
  }

  /**
   * Conteo de pedidos por estado de proceso
   * Usa métricas del backend si están disponibles (más preciso, incluye todos los pedidos)
   * Mejorado 2025.11.24 - Usa métricas individuales del backend
   */
  getProcesoCount(proceso: string): number {
    // Si hay métricas del backend, usarlas (más preciso)
    if (this.backendMetrics) {
      // Mapear estados de proceso a las métricas individuales del backend
      const metricMap: { [key: string]: string } = {
        'SinProducir': 'sinProducir',
        'EnProduccion': 'enProduccionIndividual',
        'ProducidoTotalmente': 'producidoTotalmente',
        'ProducidoParcialmente': 'producidoParcialmente',
        'Empacado': 'empacados',
        'Despachado': 'enRuta',
        'ParaDespachar': 'paraDespachar',
        'Entregado': 'entregados',
        'Cerrado': 'cerrados',
        // Estados de proceso faltantes
        'Rechazado': 'rechazadosProceso',
        'EnDespacho': 'enDespacho',
        'Producido': 'producido',
        // Estados de Dropshipping
        'SolicitadoProveedor': 'solicitadoProveedor',
        'AceptadoProveedor': 'aceptadoProveedor',
        'RechazadoProveedor': 'rechazadoProveedor',
        'DespachadoProveedor': 'despachadoProveedor',
        'EnTransitoProveedor': 'enTransitoProveedor'
      };
      
      const metricKey = metricMap[proceso];
      if (metricKey && this.backendMetrics[metricKey] !== undefined) {
        return this.backendMetrics[metricKey];
      }
      
      // Fallback a métricas agrupadas si no hay individuales
      const fallbackMap: { [key: string]: string } = {
        'SinProducir': 'enProduccion',
        'EnProduccion': 'enProduccion',
        'ProducidoTotalmente': 'enProduccion',
        'ProducidoParcialmente': 'enProduccion',
      };
      const fallbackKey = fallbackMap[proceso];
      if (fallbackKey && this.backendMetrics[fallbackKey] !== undefined) {
        return this.backendMetrics[fallbackKey];
      }
    }
    
    // Fallback: calcular localmente (solo sobre pedidos paginados)
    return this.getFilteredOrders().filter(
      (pedido) => pedido.estadoProceso === proceso,
    ).length;
  }

  /**
   * Obtener total de pedidos (usa métricas del backend si están disponibles)
   */
  getTotalPedidos(): number {
    // Si hay métricas del backend, usar el total (más preciso, incluye todos los pedidos)
    if (this.backendMetrics && this.backendMetrics.totalPedidos !== undefined) {
      return this.backendMetrics.totalPedidos;
    }
    // Fallback: usar el total de registros paginados o la longitud de orders
    return this.totalRecords || this.orders?.length || 0;
  }

  /**
   * Conteo de pedidos revisados para producción
   */
  getRevisadosCount(): number {
    return this.getFilteredOrders().filter(
      (pedido) =>
        pedido.revisadoParaProduccion && pedido.revisadoParaProduccion !== "",
    ).length;
  }

  /**
   * Conteo de pedidos no revisados para producción
   */
  getNoRevisadosCount(): number {
    return this.getFilteredOrders().filter(
      (pedido) =>
        !pedido.revisadoParaProduccion || pedido.revisadoParaProduccion === "",
    ).length;
  }

  /**
   * ===== MÉTRICAS COMERCIALES/FINANCIERAS =====
   */

  /**
   * Conteo de pedidos pendientes de pago
   * Incluye estados: Pendiente y Pospendiente
   * Usa métricas del backend si están disponibles
   * Mejorado 2025.11.24 - Usa métricas del backend
   */
  getPendientesPagoCount(): number {
    // Si hay métricas del backend, usarlas (más preciso)
    if (this.backendMetrics && this.backendMetrics.pendientesPago !== undefined) {
      return this.backendMetrics.pendientesPago;
    }
    
    // Fallback: Calcular localmente sobre pedidos paginados
    return this.getFilteredOrders().filter(
      (pedido) =>
        pedido.estadoPago === "Pendiente" ||
        pedido.estadoPago === "Pospendiente",
    ).length;
  }

  /**
   * Conteo de pedidos con pago aprobado creados hoy
   * KPI de conversión diaria
   * Usa métricas del backend si están disponibles
   */
  getPagosAprobadosHoyCount(): number {
    // Priorizar métricas del backend
    if (this.backendMetrics?.aprobadosHoy != null) {
      return this.backendMetrics.aprobadosHoy;
    }
    // Fallback: cálculo local (solo página actual)
    const hoyStr = new Date().toISOString().split('T')[0];

    return this.getFilteredOrders().filter((pedido) => {
      if (pedido.estadoPago !== "Aprobado") {
        return false;
      }

      if (!pedido.fechaCreacion) {
        return false;
      }

      let fechaPedidoStr: string;
      if (typeof pedido.fechaCreacion === 'string') {
        fechaPedidoStr = pedido.fechaCreacion.substring(0, 10);
      } else {
        fechaPedidoStr = new Date(pedido.fechaCreacion).toISOString().split('T')[0];
      }
      return fechaPedidoStr === hoyStr;
    }).length;
  }

  /**
   * Suma del valor total de pedidos creados hoy
   * Métrica financiera diaria
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getVentasDelDia(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.ventasDelDia != null) {
      return this.backendMetrics.ventasDelDia;
    }
    // Fallback: cálculo local (solo página actual)
    const hoyStr = new Date().toISOString().split('T')[0]; // "2025-12-02"

    return this.getFilteredOrders()
      .filter((pedido) => {
        if (!pedido.fechaCreacion) {
          return false;
        }
        // Normalizar fecha del pedido a YYYY-MM-DD
        let fechaPedidoStr: string;
        if (typeof pedido.fechaCreacion === 'string') {
          fechaPedidoStr = pedido.fechaCreacion.substring(0, 10);
        } else {
          fechaPedidoStr = new Date(pedido.fechaCreacion).toISOString().split('T')[0];
        }
        return fechaPedidoStr === hoyStr;
      })
      .reduce((acc, pedido) => acc + (pedido.totalPedidoSinDescuento || 0), 0);
  }

  /**
   * Valor promedio por pedido (Ticket Promedio)
   * Indicador de valor por transacción
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getTicketPromedio(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalBruto != null && this.backendMetrics?.totalPedidos > 0) {
      return this.backendMetrics.totalBruto / this.backendMetrics.totalPedidos;
    }
    // Fallback: cálculo local (solo página actual)
    const pedidos = this.getFilteredOrders();

    if (pedidos.length === 0) {
      return 0;
    }

    const total = pedidos.reduce(
      (acc, pedido) => acc + (pedido.totalPedidoSinDescuento || 0),
      0,
    );

    return total / pedidos.length;
  }

  /**
   * Conteo de pedidos urgentes
   * Pedidos con fecha de entrega hoy o mañana que no están completados
   * Usa métricas del backend si están disponibles
   */
  getPedidosUrgentesCount(): number {
    // Priorizar métricas del backend
    if (this.backendMetrics?.pedidosUrgentes != null) {
      return this.backendMetrics.pedidosUrgentes;
    }
    // Fallback: cálculo local (solo página actual)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    return this.getFilteredOrders().filter((pedido) => {
      const estadosNoCompletados = [
        "SinProducir",
        "EnProduccion",
        "ProducidoParcialmente",
        "ProducidoTotalmente",
        "Empacado",
        "ParaDespachar",
        "Despachado",
      ];

      if (!estadosNoCompletados.includes(pedido.estadoProceso)) {
        return false;
      }

      if (!pedido.fechaEntrega) {
        return false;
      }

      const fechaEntrega = new Date(pedido.fechaEntrega);
      fechaEntrega.setHours(0, 0, 0, 0);

      return fechaEntrega.getTime() <= manana.getTime();
    }).length;
  }

  /**
   * Conteo de pedidos con anticipo pendiente
   * Pedidos con saldo por pagar después de anticipo
   * Usa métricas del backend si están disponibles
   */
  getAnticiposPendientesCount(): number {
    // Priorizar métricas del backend
    if (this.backendMetrics?.anticiposPendientes != null) {
      return this.backendMetrics.anticiposPendientes;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().filter((pedido) => {
      const tieneAnticipo = pedido.anticipo && pedido.anticipo > 0;
      const tieneSaldoPendiente =
        pedido.faltaPorPagar && pedido.faltaPorPagar > 0;
      return tieneAnticipo && tieneSaldoPendiente;
    }).length;
  }

  /**
   * Conteo de pedidos con descuento aplicado
   * Monitoreo de estrategia promocional
   * Usa métricas del backend si están disponibles
   */
  getPedidosConDescuentoCount(): number {
    // Priorizar métricas del backend
    if (this.backendMetrics?.pedidosConDescuento != null) {
      return this.backendMetrics.pedidosConDescuento;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().filter(
      (pedido) => pedido.totalDescuento && pedido.totalDescuento > 0,
    ).length;
  }

  /**
   * Maneja el click en las métricas breadcrumb para aplicar filtros
   */
  onMetricClick(estado: string): void {
    // Limpiar filtros previos en la tabla si existe
    if (this.table) {
      this.table.clear();
    }

    if (estado === "all") {
      // Limpiar todos los filtros de estado
      this.quickFilters.estadoProceso = "all";
    } else if (estado === "revisados") {
      // Filtro de revisados
      this.toastrService.info(
        "Filtro de revisados - Próximamente",
        "Información",
      );
      return;
    } else if (estado === "noRevisados") {
      // Filtro de no revisados
      this.toastrService.info(
        "Filtro de no revisados - Próximamente",
        "Información",
      );
      return;
    } else if (estado === "pendientesPago") {
      // Filtrar pedidos pendientes de pago
      if (this.table) {
        this.table.filter(["Pendiente", "Pospendiente"], "estadoPago", "in");
      }
      this.toastrService.info(
        `Filtrando ${this.getPendientesPagoCount()} pedidos pendientes de pago`,
        "Filtro Aplicado",
      );
      return;
    } else if (estado === "aprobadosHoy") {
      // Filtrar pedidos aprobados hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const pedidosAprobadosHoy = this.orders.filter((pedido) => {
        if (pedido.estadoPago !== "Aprobado") return false;
        if (!pedido.fechaCreacion) return false;

        const fechaPedido = new Date(pedido.fechaCreacion);
        fechaPedido.setHours(0, 0, 0, 0);

        return fechaPedido.getTime() === hoy.getTime();
      });

      // Aplicar filtro combinado: estado de pago y fecha
      if (this.table) {
        this.table.filter("Aprobado", "estadoPago", "equals");
      }

      this.toastrService.success(
        `Mostrando ${pedidosAprobadosHoy.length} pedidos aprobados hoy`,
        "Filtro Aplicado",
      );
      return;
    } else if (estado === "urgentes") {
      // Filtrar pedidos urgentes (entrega hoy o mañana, no completados)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);

      // Definir estados no completados fuera del filter para reutilizar
      const estadosNoCompletados = [
        "SinProducir",
        "EnProduccion",
        "ProducidoParcialmente",
        "ProducidoTotalmente",
        "Empacado",
        "ParaDespachar",
        "Despachado",
      ];

      const pedidosUrgentes = this.orders.filter((pedido) => {
        if (!estadosNoCompletados.includes(pedido.estadoProceso)) return false;
        if (!pedido.fechaEntrega) return false;

        const fechaEntrega = new Date(pedido.fechaEntrega);
        fechaEntrega.setHours(0, 0, 0, 0);

        return fechaEntrega.getTime() <= manana.getTime();
      });

      if (this.table) {
        this.table.filter(estadosNoCompletados, "estadoProceso", "in");
      }

      this.toastrService.warning(
        `${pedidosUrgentes.length} pedidos urgentes requieren atención inmediata`,
        "Pedidos Urgentes",
        { timeOut: 5000 },
      );
      return;
    } else if (estado === "anticipoPendiente") {
      // Filtrar pedidos con anticipo pendiente
      const pedidosConAnticipo = this.orders.filter((pedido) => {
        return (
          pedido.anticipo &&
          pedido.anticipo > 0 &&
          pedido.faltaPorPagar &&
          pedido.faltaPorPagar > 0
        );
      });

      // Mostrar solo estos pedidos usando un filtro custom
      this.toastrService.info(
        `Mostrando ${pedidosConAnticipo.length} pedidos con saldo pendiente`,
        "Filtro Aplicado",
      );

      // No hay un campo directo para filtrar, se debe implementar lógica personalizada
      // Por ahora solo notificar
      return;
    } else if (estado === "conDescuento") {
      // Filtrar pedidos con descuento
      const pedidosConDescuento = this.orders.filter(
        (pedido) => pedido.totalDescuento && pedido.totalDescuento > 0,
      );

      this.toastrService.info(
        `Mostrando ${pedidosConDescuento.length} pedidos con descuento aplicado`,
        "Filtro Aplicado",
      );
      return;
    } else {
      // Aplicar filtro por estado de proceso (estados estándar)
      this.quickFilters.estadoProceso = estado;
      // Actualizar el servicio compartido de filtros
      this.sharedFilterService.updateFilterState({ estadoProceso: estado });
    }

    // Refrescar los datos con el nuevo filtro
    this.refrescarDatos();
  }

  /**
   * Conteo de pedidos validados
   */
  getValidacionCount(): number {
    return this.getFilteredOrders().filter(
      (pedido) => pedido.validacion === true,
    ).length;
  }

  /**
   * Conteo de clientes únicos en los pedidos filtrados
   */
  getClientesUnicos(): number {
    const clientesUnicos = new Set();
    this.getFilteredOrders().forEach((pedido) => {
      if (pedido.cliente && pedido.cliente.documento) {
        clientesUnicos.add(pedido.cliente.documento);
      }
    });
    return clientesUnicos.size;
  }

  /**
   * Conteo de ciudades únicas en los pedidos filtrados
   */
  getCiudadesUnicas(): number {
    const ciudadesUnicas = new Set();
    this.getFilteredOrders().forEach((pedido) => {
      if (pedido.envio && pedido.envio.ciudad) {
        ciudadesUnicas.add(pedido.envio.ciudad);
      }
    });
    return ciudadesUnicas.size;
  }

  /**
   * Conteo de vendedores únicos en los pedidos filtrados
   */
  getVendedoresUnicos(): number {
    const vendedoresUnicos = new Set();
    this.getFilteredOrders().forEach((pedido) => {
      if (pedido.asesorAsignado && pedido.asesorAsignado.name) {
        vendedoresUnicos.add(pedido.asesorAsignado.name);
      }
    });
    return vendedoresUnicos.size;
  }

  /**
   * Total valor bruto de pedidos filtrados
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateValorBruto(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalBruto != null) {
      return this.backendMetrics.totalBruto;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalPedidoSinDescuento || 0),
      0,
    );
  }

  /**
   * Total descuento de pedidos filtrados
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateDescuento(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalDescuentos != null) {
      return this.backendMetrics.totalDescuentos;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalDescuento || 0),
      0,
    );
  }

  /**
   * Total envío de pedidos filtrados
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateEnvio(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalEnvio != null) {
      return this.backendMetrics.totalEnvio;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalEnvio || 0),
      0,
    );
  }

  /**
   * Total subtotal de pedidos filtrados (solo productos, sin envío)
   * Consistente con getSubtotalConDomicilio y el PDF
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateSubtotal(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalSubtotal != null) {
      return this.backendMetrics.totalSubtotal;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce((acc, pedido: any) => {
      // Subtotal = solo productos (sin envío, sin descuento)
      const subtotalProductos = this.getSubtotalConDomicilio(pedido);
      return acc + subtotalProductos;
    }, 0);
  }

  /**
   * Retorna el subtotal del pedido (valorBruto - descuento + envío)
   * @note subtotal ahora incluye el domicilio según la fórmula correcta
   */
  getSubtotalConDomicilio(pedido: any): number {
    // subtotal ya incluye: valorBruto - descuento + envío
    return Number(pedido.subtotal || 0);
  }

  /**
   * Total impuestos (IVA) de pedidos filtrados
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateTotalImpuestos(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalImpuestos != null) {
      return this.backendMetrics.totalImpuestos;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalImpuesto || 0),
      0,
    );
  }

  /**
   * Total general de pedidos filtrados
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateTotal(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalVentas != null) {
      return this.backendMetrics.totalVentas;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalPedididoConDescuento || 0),
      0,
    );
  }

  /**
   * Total anticipo de pedidos filtrados
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateAnticipo(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.totalAnticipo != null) {
      return this.backendMetrics.totalAnticipo;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce((acc, pedido: any) => {
      // Calcular anticipo basado en PagosAsentados si existen
      const anticipoReal =
        pedido.PagosAsentados && pedido.PagosAsentados.length > 0
          ? pedido.PagosAsentados.reduce((sum, pago) => {
            // Para Wompi, verificar que no esté pendiente
            if (
              pago.formaPago?.toLowerCase().includes("wompi") &&
              pago.estadoVerificacion === "Pendiente"
            ) {
              return sum; // No sumar pagos de Wompi pendientes
            }
            // Considerar tanto valor como valorRegistrado
            const valorPago = pago.valor || pago.valorRegistrado || 0;
            return sum + valorPago;
          }, 0)
          : pedido.anticipo || 0;
      return acc + anticipoReal;
    }, 0);
  }

  /**
   * Total falta por pagar de pedidos filtrados
   * Usa métricas del backend si están disponibles (cubre todos los pedidos)
   */
  getFilteredCalculateFaltaPorPagar(): number {
    // Priorizar métricas del backend (más precisas, cubren todos los pedidos filtrados)
    if (this.backendMetrics?.porCobrar != null) {
      return this.backendMetrics.porCobrar;
    }
    // Fallback: cálculo local (solo página actual)
    return this.getFilteredOrders().reduce((acc, pedido: any) => {
      // Recalcular falta por pagar basado en pagos asentados
      const anticipoReal =
        pedido.PagosAsentados && pedido.PagosAsentados.length > 0
          ? pedido.PagosAsentados.reduce((sum, pago) => {
            // Para Wompi, verificar que no esté pendiente
            if (
              pago.formaPago?.toLowerCase().includes("wompi") &&
              pago.estadoVerificacion === "Pendiente"
            ) {
              return sum; // No sumar pagos de Wompi pendientes
            }
            // Considerar tanto valor como valorRegistrado
            const valorPago = pago.valor || pago.valorRegistrado || 0;
            return sum + valorPago;
          }, 0)
          : pedido.anticipo || 0;
      const faltaPorPagar =
        (pedido.totalPedididoConDescuento || 0) - anticipoReal;
      return acc + Math.max(0, faltaPorPagar); // Evitar valores negativos
    }, 0);
  }

  pdfOrder(content, order: Pedido) {
    // ✅ FIX: Capturar scroll y aplicar posición fija con offset para prevenir salto visual
    const scrollY = window.scrollY;
    this.scrollStack.push(scrollY);
    document.body.style.top = `-${scrollY}px`;

    // 🔄 CRÍTICO: Actualizar valores del pedido ANTES de generar PDF
    // Esto asegura que el PDF muestre los valores más recientes
    const pedidoActualizado = this.actualizarPedidoParaPDF(order);
    this.pedidoSeleccionado = pedidoActualizado;

    // ✅ Ahora generar PDF con pedido ACTUALIZADO
    this.htmlModal = this.paymentService.getHtmlContent(
      pedidoActualizado, // ← Pedido con valores actualizados
      this.isFromProduction,
    );

    // Registrar la fecha/hora de impresión solo cuando se usa desde producción
    if (this.isFromProduction) {
      const now = new Date().toISOString();
      order.ultimaImpresion = now;
      this.ventasService.editOrder(order).subscribe({
        next: () => {
          // Opcional: mostrar notificación de éxito
          this.toastrService.success(
            "Fecha de impresión registrada",
            "Pedido actualizado",
          );
        },
        error: () => {
          this.toastrService.error(
            "No se pudo actualizar la fecha de impresión",
            "Error",
          );
        },
      });
    }
    this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          // ✅ FIX: Restaurar posición del body antes de hacer scroll
          document.body.style.top = "";
          this.htmlModal = null;
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          // ✅ FIX: Restaurar posición del body antes de hacer scroll
          document.body.style.top = "";
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
      );
  }

  produceOrder(order: Pedido) {
    this.producirPedido.emit(order);

    // No refrescar aquí con timeout arbitrario
    // El componente padre debe llamar a refrescarDatos() cuando termine
  }

  /**
   * Genera una Orden de Venta profesional para el pedido seleccionado
   * MODIFICADO: Ahora genera el PDF directamente del DOM (igual que despachos)
   * @param order - El pedido para el cual generar la orden de venta
   */
  async generarOrdenVenta(order: Pedido): Promise<void> {
    if (!order) {
      this.toastrService.error('No se ha seleccionado un pedido', 'Error');
      return;
    }

    if (!this.ordenVentaContainer) {
      this.toastrService.error('El contenedor de orden de venta no está disponible', 'Error');
      console.error('❌ ordenVentaContainer ViewChild no está disponible');
      return;
    }

    // Actualizar el pedido antes de generar la orden
    const pedidoActualizado = this.actualizarPedidoParaPDF(order);

    // Actualizar la propiedad que alimenta el componente renderizado
    this.pedidoParaOrdenVenta = pedidoActualizado;

    // Esperar un ciclo de Angular para que se actualice el componente
    setTimeout(async () => {
      try {
        console.log('📄 Generando PDF de orden de venta...');

        // Importar html2pdf dinámicamente
        const html2pdf = (await import("html2pdf.js")).default;

        // Obtener el elemento del DOM
        const element = this.ordenVentaContainer.nativeElement;

        // Hacer el elemento visible temporalmente para la captura (como despachos)
        const originalVisibility = element.style.visibility;
        const originalPosition = element.style.position;
        element.style.visibility = 'visible';
        element.style.position = 'static';

        console.log('📸 Elemento visible para captura');

        // Configuración del PDF optimizada para portrait
        const options = {
          margin: [10, 10, 10, 10], // Márgenes apropiados para vertical
          filename: `orden-venta-${pedidoActualizado.nroPedido || 'sin-numero'}.pdf`,
          image: {
            type: "jpeg",
            quality: 0.95
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            logging: false,
            letterRendering: true,
            windowWidth: document.body.clientWidth, // Usar ancho del documento
            windowHeight: document.body.clientHeight // Usar alto del documento
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
            compress: true
          },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break-before',
            after: '.page-break-after',
            avoid: ['tr', 'img']
          }
        };

        // Generar PDF
        await html2pdf()
          .from(element)
          .set(options)
          .toPdf()
          .get("pdf")
          .then((pdf: any) => {
            // Restaurar visibilidad original
            element.style.visibility = originalVisibility;
            element.style.position = originalPosition;
            console.log('🔄 Visibilidad restaurada');

            // Abrir PDF en nueva ventana
            const blob = pdf.output("blob");
            const blobUrl = URL.createObjectURL(blob);

            setTimeout(() => {
              URL.revokeObjectURL(blobUrl);
            }, 30000);

            window.open(blobUrl, "_blank");

            console.log('✅ PDF de orden de venta generado exitosamente');
            this.toastrService.success('PDF generado exitosamente', 'Éxito');
          })
          .catch((err: any) => {
            // Restaurar visibilidad en caso de error
            element.style.visibility = originalVisibility;
            element.style.position = originalPosition;
            throw err;
          });

      } catch (error) {
        console.error('❌ Error al generar PDF de orden de venta:', error);
        this.toastrService.error('Error al generar el PDF', 'Error');
      }
    }, 200); // Dar tiempo para que Angular actualice el template
  }

  /**
   * Obtiene el nombre de la empresa actual
   */
  getNombreEmpresa(): string {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return userInfo?.companyInformation?.companyName || 'KATUQ';
  }

  /**
   * 🔄 MÉTODO AUXILIAR: Actualizar pedido antes de generar PDF
   * Asegura que todos los valores estén sincronizados
   */
  private actualizarPedidoParaPDF(order: Pedido): Pedido {
    // Clonar el pedido para no modificar el original
    const pedidoActualizado = { ...order };

    // Sincronizar forma de entrega entre pedido y carrito
    this.sincronizarFormaEntrega(pedidoActualizado);

    // Actualizar valores usando el servicio
    this.actualizarValoresPedido(pedidoActualizado);

    console.log("📊 PDF - Pedido actualizado antes de generar:", {
      nroPedido: pedidoActualizado.nroPedido,
      formaEntrega: pedidoActualizado.formaEntrega,
      totalPedidoSinDescuento: pedidoActualizado.totalPedidoSinDescuento,
      totalEnvio: pedidoActualizado.totalEnvio,
      totalDescuento: pedidoActualizado.totalDescuento,
      totalPedididoConDescuento: pedidoActualizado.totalPedididoConDescuento,
    });

    return pedidoActualizado;
  }

  /**
   * 🔄 SINCRONIZA la forma de entrega entre el pedido y el carrito
   * Asegura que ambos tengan la misma información para el PDF
   * También maneja el costo de envío según la forma de entrega
   */
  private sincronizarFormaEntrega(pedido: Pedido): void {
    if (!pedido.carrito || pedido.carrito.length === 0) {
      return;
    }

    console.log("🔄 SINCRONIZACIÓN - Estado inicial:", {
      nroPedido: pedido.nroPedido,
      formaEntregaPedido: pedido.formaEntrega,
      formaEntregaCarrito:
        pedido.carrito[0]?.configuracion?.datosEntrega?.formaEntrega,
      totalEnvio: pedido.totalEnvio,
    });

    // Obtener la forma de entrega más reciente del carrito
    const formasEntregaCarrito = pedido.carrito
      .map((item) => item.configuracion?.datosEntrega?.formaEntrega)
      .filter((forma) => forma && forma.trim() !== "");

    let formaEntregaFinal = "";

    // Si hay formas de entrega en el carrito, usar la primera no vacía
    if (formasEntregaCarrito.length > 0) {
      formaEntregaFinal = formasEntregaCarrito[0];

      // Actualizar el pedido con la forma de entrega del carrito
      pedido.formaEntrega = formaEntregaFinal;

      // Asegurar que todos los items del carrito tengan la misma forma de entrega
      pedido.carrito.forEach((item) => {
        if (item.configuracion?.datosEntrega) {
          item.configuracion.datosEntrega.formaEntrega = formaEntregaFinal;
        }
      });

      console.log(
        "🔄 SINCRONIZACIÓN - Forma de entrega sincronizada desde carrito:",
        {
          nroPedido: pedido.nroPedido,
          formaEntrega: formaEntregaFinal,
          itemsActualizados: pedido.carrito.length,
        },
      );
    }
    // Si el pedido tiene forma de entrega pero el carrito no, sincronizar hacia el carrito
    else if (pedido.formaEntrega) {
      formaEntregaFinal = pedido.formaEntrega;

      pedido.carrito.forEach((item) => {
        if (item.configuracion?.datosEntrega) {
          item.configuracion.datosEntrega.formaEntrega = pedido.formaEntrega;
        }
      });

      console.log(
        "🔄 SINCRONIZACIÓN - Forma de entrega sincronizada desde pedido:",
        {
          nroPedido: pedido.nroPedido,
          formaEntrega: pedido.formaEntrega,
          itemsActualizados: pedido.carrito.length,
        },
      );
    }

    // 🚚 MANEJO DEL COSTO DE ENVÍO Y DATOS DE ENVÍO según la forma de entrega
    if (
      formaEntregaFinal &&
      formaEntregaFinal.toLowerCase().includes("recoge")
    ) {
      // Si es "recoge en tienda", el costo de envío debe ser 0
      if (pedido.totalEnvio && pedido.totalEnvio > 0) {
        console.log(
          "🚚 SINCRONIZACIÓN - Cambiando costo de envío a 0 para recoge en tienda:",
          {
            nroPedido: pedido.nroPedido,
            formaEntrega: formaEntregaFinal,
            totalEnvioAnterior: pedido.totalEnvio,
            totalEnvioNuevo: 0,
          },
        );

        pedido.totalEnvio = 0;

        // Recalcular totales del pedido
        this.recalcularTotalesPedido(pedido);
      }

      // 📦 ACTUALIZAR DATOS DE ENVÍO para "recoge en tienda"
      // Establecer todos los campos como N/A excepto alias y ciudad
      if (!pedido.envio) {
        pedido.envio = {} as any;
      }

      // Preservar la ciudad actual si existe, de lo contrario usar N/A
      const ciudadActual = pedido.envio.ciudad || "N/A";

      // Establecer datos de envío según el formato requerido para recoge en tienda
      pedido.envio = {
        ...pedido.envio,
        nombres: "N/A",
        apellidos: "N/A",
        alias: "Recoge",
        direccionEntrega: "N/A",
        nombreUnidad: "N/A",
        especificacionesInternas: "N/A",
        departamento: "N/A",
        ciudad: ciudadActual, // Mantener la ciudad actual
        barrio: "N/A",
        codigoPV: "N/A",
        indicativoCel: "N/A",
        celular: "N/A",
        indicativoOtroNumero: "N/A",
        otroNumero: "N/A",
        zonaCobro: "N/A",
        observaciones: "N/A",
        pais: pedido.envio.pais || "N/A",
        valorZonaCobro: 0,
      };

      console.log(
        "📦 SINCRONIZACIÓN - Datos de envío actualizados para recoge en tienda:",
        {
          nroPedido: pedido.nroPedido,
          formaEntrega: formaEntregaFinal,
          datosEnvio: pedido.envio,
        },
      );
    }

    console.log("🔄 SINCRONIZACIÓN - Estado final:", {
      nroPedido: pedido.nroPedido,
      formaEntregaPedido: pedido.formaEntrega,
      formaEntregaCarrito:
        pedido.carrito[0]?.configuracion?.datosEntrega?.formaEntrega,
      totalEnvio: pedido.totalEnvio,
    });
  }

  /**
   * 🧮 RECALCULA los totales del pedido después de cambiar el costo de envío
   * Fórmula consistente con PaymentService y orderCalculationService
   */
  private recalcularTotalesPedido(pedido: Pedido): void {
    if (!pedido) return;

    // Recalcular totales usando el servicio de utilidades
    this.pedidoUtilService.pedido = pedido;

    // 1. Obtener subtotal SOLO de productos (sin IVA, sin envío)
    const subtotalProductos = this.pedidoUtilService.getSubtotalSinEnvio();
    const totalEnvio = Number(pedido.totalEnvio) || 0;

    // 2. Valor Bruto (totalPedidoSinDescuento) = SOLO productos (sin envío)
    pedido.totalPedidoSinDescuento = subtotalProductos;

    // 3. Calcular descuento SOLO sobre productos (NO sobre envío)
    let descuento = 0;
    if (pedido.porceDescuento) {
      descuento = subtotalProductos * (Number(pedido.porceDescuento) / 100);
      pedido.totalDescuento = descuento;
    } else {
      descuento = Number(pedido.totalDescuento) || 0;
    }

    // 4. Subtotal = valorBruto - descuento + envío (INCLUYE domicilio)
    pedido.subtotal = subtotalProductos - descuento + totalEnvio;

    // 5. Recalcular IVA (incluye IVA del envío, con descuento aplicado internamente)
    const ivaResultTotales = this.checkIVAPrice(pedido);
    // Usar el IVA calculado, o preservar el existente del backend si no hay carrito
    const totalImpuesto = Number(ivaResultTotales.totalPrecioIVADef || pedido.totalImpuesto || 0);
    pedido.totalImpuesto = totalImpuesto;

    // 6. Total = subtotal + IVA (envío ya está incluido en subtotal)
    pedido.totalPedididoConDescuento = pedido.subtotal + totalImpuesto;

    // 7. Calcular falta por pagar
    pedido.faltaPorPagar = Math.max(0, pedido.totalPedididoConDescuento - (Number(pedido.anticipo) || 0));

    console.log("🧮 RECÁLCULO - Totales actualizados:", {
      nroPedido: pedido.nroPedido,
      subtotalProductos,
      totalEnvio,
      descuento,
      subtotal: pedido.subtotal,
      totalImpuesto,
      totalFinal: pedido.totalPedididoConDescuento,
      faltaPorPagar: pedido.faltaPorPagar,
    });
  }

  /**
   * 🚚 RECALCULA el envío y totaliza el pedido usando la misma lógica que el PDF
   * Asegura consistencia entre la tabla y el PDF
   *
   * NOTA: Si el backend ya calculó los totales (_calculadoEnBackend = true),
   * NO se debe llamar este método para evitar sobrescribir la fórmula correcta.
   */
  private recalcularEnvioYTotalizarPedido(order: Pedido): void {
    if (!order) return;

    // Guard: Si el backend ya calculó los totales, no recalcular
    // El backend usa calculateOrderTotals() que tiene la fórmula correcta:
    // subtotal = productos - descuento + envío
    // total = subtotal + IVA
    if (order._calculadoEnBackend) {
      console.log(`⚠️ RECÁLCULO OMITIDO - Backend ya calculó totales para pedido: ${order.nroPedido}`);
      return;
    }

    // Asignar pedido al servicio de utilidades
    this.pedidoUtilService.pedido = order;

    // Sincronizar forma de entrega antes de recalcular envío
    this.sincronizarFormaEntrega(order);

    // 🔍 DETECTAR CAMBIOS EN FORMA DE ENTREGA
    const tieneDomicilio = (order.carrito ?? []).some((car) => {
      const forma = car?.configuracion?.datosEntrega?.formaEntrega || "";
      return forma.toLowerCase().includes("domicilio");
    });

    // 🔄 SINCRONIZAR ENVÍO CON FORMA DE ENTREGA ACTUAL
    let costoEnvioAnterior = order.totalEnvio || 0;
    let costoEnvioNuevo = 0;

    // Asegurar que allBillingZone esté disponible
    const billingZones = this.allBillingZone ||
      JSON.parse(sessionStorage.getItem("allBillingZone") || "[]");

    if (tieneDomicilio && order.envio?.zonaCobro) {
      try {
        costoEnvioNuevo = Number(
          this.pedidoUtilService.getShippingCost(billingZones),
        );
        order.totalEnvio = costoEnvioNuevo;

        console.log("🚚 RECÁLCULO ENVÍO - Envío domicilio detectado:", {
          nroPedido: order.nroPedido,
          costoAnterior: costoEnvioAnterior,
          costoNuevo: costoEnvioNuevo,
          formaEntrega: "Domicilio",
          zonaCobro: order.envio.zonaCobro,
        });
      } catch (e) {
        console.warn("No se pudo calcular el costo de envío:", e);
        order.totalEnvio = 0;
        costoEnvioNuevo = 0;
      }
    } else {
      // Recoge en tienda o sin zona de cobro
      if (order.totalEnvio !== 0) {
        console.log(
          "🚚 RECÁLCULO ENVÍO - Envío removido (recoge en tienda o sin zona):",
          {
            nroPedido: order.nroPedido,
            costoAnterior: costoEnvioAnterior,
            formaEntrega: order.formaEntrega,
          },
        );
      }
      order.totalEnvio = 0;
      costoEnvioNuevo = 0;
    }

    // 🔄 RECALCULAR TOTALES DEPENDIENTES - Fórmula consistente con PaymentService
    // 1. Obtener subtotal SOLO de productos (sin IVA, sin envío)
    const subtotalProductos = this.pedidoUtilService.getSubtotal();

    // 2. Valor Bruto (totalPedidoSinDescuento) = SOLO productos (sin envío)
    order.totalPedidoSinDescuento = subtotalProductos;

    // 3. Calcular descuento SOLO sobre productos (NO sobre envío)
    let descuento = 0;
    if (order.porceDescuento) {
      descuento = subtotalProductos * (Number(order.porceDescuento) / 100);
      order.totalDescuento = descuento;
    } else {
      descuento = Number(order.totalDescuento || 0);
    }

    // 4. Subtotal = valorBruto - descuento + envío (INCLUYE domicilio)
    const envio = Number(order.totalEnvio || 0);
    order.subtotal = subtotalProductos - descuento + envio;

    // 5. Recalcular IVA (incluye IVA del envío, con descuento aplicado internamente)
    const ivaResultRecalc = this.checkIVAPrice(order);
    // Usar el IVA calculado, o preservar el existente del backend si no hay carrito
    order.totalImpuesto = Number(ivaResultRecalc.totalPrecioIVADef || order.totalImpuesto || 0);

    // 6. Total = subtotal + IVA (envío ya está incluido en subtotal)
    order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;

    // 7. Recalcular falta por pagar si hay anticipo
    const anticipo = Number(order.anticipo || 0);
    order.faltaPorPagar = Math.max(
      0,
      order.totalPedididoConDescuento - anticipo,
    );

    console.log("💰 RECÁLCULO ENVÍO - Totales actualizados:", {
      nroPedido: order.nroPedido,
      subtotalProductos,
      totalEnvio: order.totalEnvio,
      totalDescuento: descuento,
      totalImpuesto: order.totalImpuesto,
      subtotalFinal: order.subtotal,
      totalFinal: order.totalPedididoConDescuento,
      cambioEnvio: costoEnvioAnterior !== costoEnvioNuevo,
      formaEntrega: order.carrito?.map(
        (c) => c.configuracion?.datosEntrega?.formaEntrega,
      ),
    });
  }

  async convertirImagenesAbase64YGenerarPDF(DATA: HTMLElement) {
    const imagenes = DATA.querySelectorAll("img");
    const promesasDeConversion = Array.from(imagenes).map(async (img) => {
      const url = img.src;
      const base64 = await this.obtenerBase64DeImagen(url);
      img.src = base64;
    });

    await Promise.all(promesasDeConversion);

    // Ahora que todas las imágenes están convertidas y reemplazadas en DATA,
    // puedes proceder con html2canvas y jsPDF como antes.
    html2canvas(DATA, { useCORS: true, allowTaint: false, logging: true })
      .then((canvas) => {
        // El resto del código para generar el PDF sigue igual...
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const imgWidth = 210; // Ancho de un A4 en mm
        const pageHeight = 295; // Altura de un A4 en mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;

        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(this.pedidoSeleccionado.nroPedido + ".pdf");
      })
      .catch((error) => {
        console.error("Error al generar PDF", error);
      });
  }

  async obtenerBase64DeImagen(url: string): Promise<string> {
    return fetch(url)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          }),
      );
  }

  imprimirToPdf() {
    const htmlPdfEl = document.getElementById("htmlPdf");
    if (!htmlPdfEl) {
      this.toastrService.error("No hay contenido para imprimir", "Error");
      return;
    }
    let printContents = htmlPdfEl.innerHTML;
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = printContents;

    const h2Elements = tempDiv.querySelectorAll("h2");
    h2Elements.forEach((h2) => {
      const h3 = document.createElement("h3");
      h3.innerHTML = h2.innerHTML;
      Array.from(h2.attributes).forEach((attr) => {
        h3.setAttribute(attr.name, attr.value);
      });
      if (h2.parentNode) {
        h2.parentNode.replaceChild(h3, h2);
      }
    });

    const idsToRemove = ["Encabezado", "piepagina", "publicidad"];
    idsToRemove.forEach((id) => {
      const element: any = tempDiv.querySelector(`#${id}`);
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });

    tempDiv.classList.add("texto-pequeno");
    printContents = tempDiv.innerHTML;

    this.closeOptionsModal();
    this.modalService.dismissAll();
    document.body.classList.remove("modal-open");
    this.loaderService.hide();

    const newWindow = window.open(
      "",
      "_blank",
      "width=800,height=600,scrollbars=yes,resizable=yes",
    );
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pedido ${this.pedidoSeleccionado?.nroPedido || "PDF"}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.2;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .texto-pequeno {
              font-size: 10px;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
            }
          </style>
          <script>
            window.onload = function() {
              // Auto-print después de cargar, pero sin bloquear la ventana padre
              setTimeout(function() {
                window.print();
              }, 100);
            };
          </script>
        </head>
        <body>
          ${printContents}
        </body>
        </html>
      `);
      newWindow.document.close();
      // Liberar la referencia inmediatamente para evitar bloqueos
      newWindow.focus();
    }
  }

  editDatosClientes(content, order: Pedido) {
    // Prevenir ejecución cuando está en modo producción
    if (this.isFromProduction) {
      return;
    }

    if (!this.canModifyBasicData(order)) {
      this.toastrService.warning(
        "No se pueden modificar los datos del cliente en pedidos entregados",
        "Pedido No Modificable",
      );
      return;
    }

    // Cerrar el modal de opciones primero
    this.closeOptionsModal();

    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? ({} as Cliente);
    this.pedidoSeleccionado = order;
    this.initForms(this.clienteSeleccionado);
    setTimeout(() => {
      const modalRef = this.modalService.open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
        backdrop: "static", // 🔒 NUEVO: Prevenir cierre al hacer clic fuera del modal
        keyboard: false, // 🔒 NUEVO: Prevenir cierre con tecla ESC
      });
      setTimeout(() => {
        this.inicializarComponenteClientes();
      }, 500);
      modalRef.result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          if (reason == "Cross click") {
            return;
          }
          this.clienteSeleccionado = null as any;
          order.cliente = reason ?? order.cliente;
          this.editOrder(order);
        },
      );
    }, 100);
  }

  private inicializarComponenteClientes(): void {
    // Intentar inicializar el componente clientes con reintentos
    let intentos = 0;
    const maxIntentos = 10;

    const inicializar = () => {
      intentos++;

      // Verificar si el componente clientes existe
      if (this.clientes && this.clienteSeleccionado?.documento) {
        console.log(
          "🎯 Inicializando componente clientes con documento:",
          this.clienteSeleccionado.documento,
        );

        // Intentar establecer el documento en el campo de búsqueda si existe
        if (
          this.clientes.documentoBusqueda &&
          this.clientes.documentoBusqueda.nativeElement
        ) {
          this.clientes.documentoBusqueda.nativeElement.value =
            this.clienteSeleccionado.documento;

          // Establecer el tipo de búsqueda
          this.clientes.tipoBusqueda = "CC-NIT";

          // Llamar al método buscar
          this.clientes.buscar();
          console.log("✅ Componente clientes inicializado con búsqueda");
        } else {
          // Si los elementos de búsqueda no están disponibles,
          // usar el método alternativo cargarDatosCliente
          console.log(
            "⚠️ Elementos de búsqueda no disponibles, usando carga directa",
          );

          // Asignar el cliente directamente al componente
          this.clientes.clienteEdit = this.clienteSeleccionado;
          this.clientes.isEdit = true;

          // Llamar al método de carga directa si existe
          if (typeof this.clientes.cargarDatosCliente === "function") {
            this.clientes.cargarDatosCliente();
            console.log("✅ Cliente cargado directamente");
          } else {
            // Si el método no existe aún, intentar buscar
            this.clientes.buscar();
          }
        }
      } else if (intentos < maxIntentos) {
        console.log(
          `⏳ Intento ${intentos}/${maxIntentos} - Esperando inicialización del componente clientes...`,
        );
        setTimeout(inicializar, 200);
      } else {
        console.error(
          "❌ No se pudo inicializar el componente clientes después de",
          maxIntentos,
          "intentos",
        );
        console.log("Estado del componente:", {
          clientes: !!this.clientes,
          documentoBusqueda: !!this.clientes?.documentoBusqueda,
          nativeElement: !!this.clientes?.documentoBusqueda?.nativeElement,
          clienteSeleccionado: !!this.clienteSeleccionado,
          documento: this.clienteSeleccionado?.documento,
        });

        // Como último recurso, intentar asignar los datos directamente
        if (this.clientes && this.clienteSeleccionado) {
          this.clientes.clienteEdit = this.clienteSeleccionado;
          this.clientes.isEdit = true;
          console.log(
            "⚠️ Datos del cliente asignados directamente como último recurso",
          );
        }
      }
    };

    inicializar();
  }

  private editOrder(order: Pedido) {
    if (order.carrito && order.carrito.length > 0) {
      const fechaEntrega =
        order.carrito?.[0]?.configuracion?.datosEntrega?.fechaEntrega;
      const horarioEntrega =
        order.carrito?.[0]?.configuracion?.datosEntrega?.horarioEntrega;
      const formaEntrega =
        order.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega;

      if (
        fechaEntrega &&
        (fechaEntrega as any).year &&
        (fechaEntrega as any).month &&
        (fechaEntrega as any).day
      ) {
        order.fechaEntrega = new Date(
          (fechaEntrega as any).year,
          (fechaEntrega as any).month - 1,
          (fechaEntrega as any).day,
        ).toISOString();
      }

      if (horarioEntrega) {
        order.horarioEntrega = horarioEntrega as any;
      }

      // Sincronizar forma de entrega entre pedido y carrito
      if (formaEntrega) {
        order.formaEntrega = formaEntrega;
      } else if (order.formaEntrega) {
        // Si el pedido tiene forma de entrega pero el carrito no, sincronizar hacia el carrito
        order.carrito.forEach((item) => {
          if (item.configuracion?.datosEntrega && order.formaEntrega) {
            item.configuracion.datosEntrega.formaEntrega = order.formaEntrega;
          }
        });
      }
    }

    // 🔄 Sincronizar forma de entrega y actualizar datos de envío si es necesario
    this.sincronizarFormaEntrega(order);

    // Log del payload que se envía al servicio
    console.log("📤 PAYLOAD EDIT ORDER:", {
      nroPedido: order.nroPedido,
      formaEntrega: order.formaEntrega,
      carritoFormaEntrega: order.carrito?.map((item) => ({
        referencia: item.producto?.identificacion?.referencia,
        formaEntrega: item.configuracion?.datosEntrega?.formaEntrega,
      })),
      payloadCompleto: order,
    });

    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos();
      Swal.fire({
        icon: "success",
        title: "Pedido actualizado correctamente",
        showConfirmButton: false,
        timer: 1500,
      });
    });
  }

  // NUEVO MÉTODO SEGURO: Solo actualizar notas sin tocar carrito
  private updateNotasOnly(order: Pedido) {
    // VERIFICACIÓN DE INTEGRIDAD ANTES DE ENVIAR
    if (!order.carrito || order.carrito.length === 0) {
      console.error("🚨 ABORT: Carrito vacío, no se actualizará nada");
      Swal.fire({
        icon: "error",
        title: "Error Crítico",
        text: "El pedido no tiene productos. No se puede actualizar.",
        confirmButtonText: "Recargar",
        preConfirm: () => window.location.reload(),
      });
      return;
    }

    console.log(
      "🛡️ VERIFICACIÓN OK: Carrito tiene",
      order.carrito.length,
      "productos",
    );

    // Crear objeto minimalista solo con notas para actualizar
    const notasUpdate = {
      _id: order._id,
      nroPedido: order.nroPedido,
      notasPedido: order.notasPedido,
      // INCLUIR CARRITO COMPLETO PARA ASEGURAR QUE NO SE PIERDA
      carrito: order.carrito,
    };

    this.ventasService.editOrder(notasUpdate as any).subscribe((data) => {
      this.refrescarDatos();
      Swal.fire({
        icon: "success",
        title: "Notas actualizadas correctamente",
        showConfirmButton: false,
        timer: 1500,
      });
    });
  }

  // NUEVO MÉTODO ESPECÍFICO PARA PAGOS: Actualizar solo información de pagos
  private updatePagosOnly(order: Pedido) {
    console.log("💰 ACTUALIZANDO PAGOS EN BACKEND");
    console.log("Pagos a enviar:", order.PagosAsentados?.length || 0);
    console.log("Anticipo calculado:", order.anticipo);
    console.log("Falta por pagar:", order.faltaPorPagar);
    console.log("Estado de pago:", order.estadoPago);

    // Crear objeto con solo los campos relacionados a pagos
    const pagosUpdate = {
      _id: order._id,
      nroPedido: order.nroPedido,
      PagosAsentados: order.PagosAsentados || [],
      anticipo: order.anticipo,
      faltaPorPagar: order.faltaPorPagar,
      estadoPago: order.estadoPago,
      // Incluir campos mínimos para identificación
      totalPedididoConDescuento: order.totalPedididoConDescuento,
    };

    this.ventasService.editOrder(pagosUpdate as any).subscribe({
      next: (data) => {
        console.log("✅ Pagos actualizados en backend exitosamente");

        // Actualizar el pedido en la lista SIN recargar todo
        const index = this.orders.findIndex(
          (p) => p.nroPedido === order.nroPedido,
        );
        if (index !== -1) {
          this.orders[index] = { ...this.orders[index], ...pagosUpdate };
        }

        Swal.fire({
          icon: "success",
          title: "Pagos actualizados correctamente",
          showConfirmButton: false,
          timer: 1500,
        });

        // ✅ NUEVO: Refrescar solo después de cambios importantes
        setTimeout(() => {
          this.refrescarDespuesDeCambio();
        }, 1000);
      },
      error: (error) => {
        console.error("❌ Error actualizando pagos:", error);
        Swal.fire({
          icon: "error",
          title: "Error al actualizar pagos",
          text: "No se pudieron guardar los cambios en el servidor",
          confirmButtonText: "Reintentar",
        });
      },
    });
  }

  private convertirDatosEntregaAArray(datosEntrega: any): any[] {
    if (!datosEntrega) return [];
    if (Array.isArray(datosEntrega)) return datosEntrega;
    // Si es un objeto único, convertirlo a array
    return [datosEntrega];
  }

  private openEntregaModal(content: any, order: Pedido) {
    return this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          if (reason == "Cross click") {
            return;
          }
          this.pedidoUtilService.pedido = order;
          order.totalEnvio = Number(
            this.pedidoUtilService.getShippingCost(this.allBillingZone),
          );
          this.editOrder(order);
        },
      );
  }

  editDatosEntrega(content, order: Pedido) {
    // Prevenir ejecución cuando está en modo producción
    if (this.isFromProduction) {
      return;
    }

    // Cerrar el modal de opciones primero
    this.closeOptionsModal();

    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? ({} as Cliente);
    this.pedidoSeleccionado = order;

    // Buscar datos actualizados del cliente usando búsqueda activa
    if (order.cliente?.documento) {
      const data = { documento: order.cliente.documento };
      this.maestroService.getClientByDocument(data).subscribe({
        next: (res: any) => {
          // Usar datos actualizados de la base de datos
          this.datosEntregaDelCliente = this.convertirDatosEntregaAArray(
            res.datosEntrega,
          );
          this.initForms(this.clienteSeleccionado);
          this.openEntregaModal(content, order);
        },
        error: (error) => {
          console.warn(
            "Error al buscar cliente, usando datos del pedido:",
            error,
          );
          // Fallback: usar datos del pedido si hay error en la búsqueda
          this.datosEntregaDelCliente = this.convertirDatosEntregaAArray(
            order.cliente?.datosEntrega,
          );
          this.initForms(this.clienteSeleccionado);
          this.openEntregaModal(content, order);
        },
      });
    } else {
      // Fallback: usar datos del pedido si no hay documento
      this.datosEntregaDelCliente = this.convertirDatosEntregaAArray(
        order.cliente?.datosEntrega,
      );
      this.initForms(this.clienteSeleccionado);
      this.openEntregaModal(content, order);
    }
  }

  /**
   * Muestra el modal con detalles de entrega para pedidos entregados
   * @param order Pedido entregado del cual mostrar los detalles
   */
  mostrarDetalleEntrega(order: Pedido) {
    // Verificar que el pedido esté en estado "Entregado"
    if (order.estadoProceso !== "Entregado") {
      this.toastrService.warning(
        "Esta opción solo está disponible para pedidos entregados",
        "Estado inválido",
      );
      return;
    }

    // Convertir Pedido a PedidoEntrega con datos adicionales
    this.pedidoEntregaData = {
      ...order,
      // Datos adicionales que podrían venir del backend
      quienRecibio: order.quienRecibio || "No especificado",
      parentesco: order.parentesco || "No especificado",
      telefono: order.envio?.celular || order.cliente?.numero_celular_comprador,
      fechaRecepcion: order.fechaEntrega || new Date().toISOString(),
      observacionesEntrega:
        order.notasPedido?.notasEntregas?.[0]?.descripcion || "",
      // Acceso a datos reales de evidencia de entrega
      fotosEvidencia: order.fotosEvidencia || [], // Array de fotos de evidencia
      fotoEvidencia: order.fotoEvidencia || "", // Foto individual de evidencia
      signatureImage: order.signatureImage || "", // Firma digital
      calificacion: 0,
    };

    // Debug: Verificar datos y fotos de evidencia
    console.log("📸 Debug fotos evidencia - Original order:", {
      fotosEvidencia: order.fotosEvidencia,
      fotoEvidencia: order.fotoEvidencia,
      signatureImage: order.signatureImage,
    });
    console.log("📸 Debug fotos evidencia - Processed data:", {
      fotosEvidencia: this.pedidoEntregaData?.fotosEvidencia,
      fotoEvidencia: this.pedidoEntregaData?.fotoEvidencia,
      signatureImage: this.pedidoEntregaData?.signatureImage,
      hayFotos:
        (this.pedidoEntregaData?.fotosEvidencia?.length || 0) > 0 ||
        !!this.pedidoEntregaData?.fotoEvidencia,
    });
    console.log("Datos del pedido de entrega:", this.pedidoEntregaData);
    console.log("Mostrando modal con detalleEntregaVisible:", true);

    // Mostrar el modal
    this.detalleEntregaVisible = true;

    // Debug adicional después de 100ms para verificar que el cambio se propague
    setTimeout(() => {
      console.log(
        "Estado después de 100ms - detalleEntregaVisible:",
        this.detalleEntregaVisible,
      );
      console.log(
        "Estado después de 100ms - pedidoEntregaData:",
        this.pedidoEntregaData,
      );
    }, 100);
  }

  /**
   * Cierra el modal de detalle de entrega
   */
  cerrarDetalleEntrega() {
    this.detalleEntregaVisible = false;
    this.pedidoEntregaData = null;
  }

  /**
   * Maneja el click en una imagen del modal de detalle entrega
   * @param imageUrl URL de la imagen a mostrar en tamaño completo
   */
  onImageClick(imageUrl: string) {
    // TODO: Implementar modal de imagen en tamaño completo si es necesario
    console.log("Imagen clickeada:", imageUrl);
  }

  editDatosFacturacion(content, order: Pedido) {
    // Prevenir ejecución cuando está en modo producción
    if (this.isFromProduction) {
      return;
    }

    // Cerrar el modal de opciones primero
    this.closeOptionsModal();

    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? ({} as Cliente);
    this.pedidoSeleccionado = order;
    this.initForms(this.clienteSeleccionado);
    this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          if (reason == "Cross click") {
            return;
          }
          this.editOrder(order);
        },
      );
  }

  // edutar Notas
  editNotas(content, order: Pedido) {
    // Prevenir ejecución cuando está en modo producción
    if (this.isFromProduction) {
      return;
    }

    // Cerrar el modal de opciones primero
    this.closeOptionsModal();

    if (!order.carrito || order.carrito.length === 0) {
      Swal.fire({
        icon: "error",
        title: "No se puede editar",
        text: "Este pedido no tiene productos en el carrito.",
        confirmButtonText: "Entendido",
      });
      return;
    }
    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? ({} as Cliente);
    this.pedidoSeleccionado = order;
    this.initForms(this.clienteSeleccionado);
    this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          if (reason == "Cross click") {
            return;
          }
          this.updateNotasOnly(order);
        },
      );
  }

  // Nuevo método para manejar actualizaciones de notas desde el componente
  onNotasActualizadas(event: any) {
    if (event.pedidoCompleto && event.notasPedido) {
      // CRÍTICO: PRESERVAR completamente el carrito original
      const carritoOriginalCompleto = this.pedidoSeleccionado.carrito;
      const productosAntes = carritoOriginalCompleto?.length || 0;

      // VERIFICACIÓN DE INTEGRIDAD ANTES DE ACTUALIZAR
      if (!carritoOriginalCompleto || productosAntes === 0) {
        console.error(
          "🚨 ALERTA CRÍTICA: El carrito original está vacío o corrupto",
        );
        Swal.fire({
          icon: "error",
          title: "Error Crítico",
          text: "Se detectó un problema con los productos del pedido. No se actualizarán las notas por seguridad.",
          confirmButtonText: "Entendido",
        });
        return;
      }

      // Solo actualizar las notas manteniendo TODO lo demás intacto
      this.pedidoSeleccionado = {
        ...this.pedidoSeleccionado,
        notasPedido: event.notasPedido,
        // FORZAR que el carrito se mantenga exactamente igual
        carrito: carritoOriginalCompleto,
      };

      // VERIFICACIÓN POST-ACTUALIZACIÓN
      const productosDespues = this.pedidoSeleccionado.carrito?.length || 0;

      if (productosDespues !== productosAntes) {
        console.error("🚨 PÉRDIDA DE PRODUCTOS DETECTADA");
        Swal.fire({
          icon: "error",
          title: "¡PRODUCTOS PERDIDOS!",
          text: `Se perdieron productos: Antes ${productosAntes}, Después ${productosDespues}`,
          confirmButtonText: "Recargar página",
          preConfirm: () => {
            window.location.reload();
          },
        });
        return;
      }

      console.log("✅ CARRITO PRESERVADO - Productos:", productosAntes);
      console.log("✅ NOTAS ACTUALIZADAS SEGURAMENTE");
    }
  }

  convertFechaEntregaString(fechaEntrega: {
    day: number;
    month: number;
    year: number;
  }) {
    if (!fechaEntrega) {
      return "";
    }
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }

  // edutar Notas
  editarEstadoPago(content, order: Pedido) {
    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? ({} as Cliente);
    this.pedidoSeleccionado = order;

    // Guardar valores originales antes de abrir el modal
    this.originalEstadoPago = order.estadoPago;
    this.originalEstadoProceso = order.estadoProceso;
    this.tempEstadoPago = order.estadoPago;
    this.tempEstadoProceso = order.estadoProceso;

    this.initForms(this.clienteSeleccionado);
    this.modalService
      .open(content, {
        size: "lg",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          // Modal confirmado - no hacer nada aquí, cambiarEstadoPago() ya maneja la actualización
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          // Modal cancelado - restaurar valores originales
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          // Restaurar valores originales
          order.estadoPago = this.originalEstadoPago;
          order.estadoProceso = this.originalEstadoProceso;
          this.clienteSeleccionado = {} as Cliente;
          // NO llamar a editOrder aquí - el modal fue cancelado
        },
      );
  }

  cambiarEstadoPago(order: Pedido) {
    // Aplicar los valores temporales al pedido
    order.estadoPago = this.tempEstadoPago;
    order.estadoProceso = this.tempEstadoProceso;

    // Marcar como calculado en frontend para evitar recálculo automático
    (order as any)._estadoCalculadoEnFrontend = true;

    // Si se marca como PreAprobado manualmente, establecer la bandera
    if (order.estadoPago === "PreAprobado") {
      (order as any).preAprobadoManual = true;
    }

    // Actualizar el pedido
    this.editOrder(order);

    // Cerrar el modal
    this.modalService.dismissAll();

    // Mostrar mensaje de confirmación
    Swal.fire({
      icon: "success",
      title: "Estado de pago actualizado",
      text: `El estado se cambió a: ${order.estadoPago}`,
      showConfirmButton: false,
      timer: 1500,
    });
  }

  /**
   * Elimina una imagen de una preferencia específica en el detalle del pedido
   * @param pedido - El pedido que contiene la preferencia
   * @param item - El item del carrito que contiene la configuración
   * @param preferencia - La preferencia específica a eliminar
   */
  deleteImageFromOrderPreference(
    pedido: Pedido,
    item: any,
    preferencia: any,
  ): void {
    // Confirmar eliminación
    Swal.fire({
      title: "¿Eliminar imagen?",
      text: `¿Estás seguro de que quieres eliminar la imagen de "${preferencia.titulo}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Buscar la preferencia en la configuración del item
        const preferencias = item.configuracion?.preferencias || [];
        const index = preferencias.findIndex(
          (p: any) =>
            p.titulo === preferencia.titulo &&
            p.subtitulo === preferencia.subtitulo,
        );

        if (index !== -1) {
          // Eliminar la imagen de la preferencia
          preferencias[index] = {
            ...preferencias[index],
            imagen: "assets/images/other-images/sinimagen.webp",
            subtitulo: "",
            titulo: preferencias[index].titulo, // Mantener el título original
          };

          // Actualizar el pedido
          this.updateOrderConfiguration(pedido, item);

          // Mostrar confirmación
          Swal.fire({
            title: "Imagen eliminada",
            text: "La imagen ha sido eliminada correctamente.",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
          });

          console.log(
            `🗑️ Imagen eliminada de la preferencia: ${preferencia.titulo}`,
          );
        }
      }
    });
  }

  /**
   * Actualiza la configuración del pedido después de eliminar una imagen
   * @param pedido - El pedido a actualizar
   * @param item - El item del carrito modificado
   */
  private updateOrderConfiguration(pedido: Pedido, item: any): void {
    // Aquí puedes implementar la lógica para actualizar el pedido
    // Por ejemplo, llamar al servicio de ventas para actualizar el pedido
    console.log("🔄 Actualizando configuración del pedido:", {
      pedidoId: pedido._id,
      itemConfiguracion: item.configuracion,
    });

    // Opcional: Actualizar el pedido en el servidor
    // this.ventasService.updateOrder(pedido).subscribe(...)
  }

  confProductToCart(
    content,
    carritoConfiguracion: Carrito,
    order: Pedido,
    indiceProducto?: number,
  ) {
    // Evitar warning de aria-hidden con foco persistente en botones bajo app-root
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === "function") {
        active.blur();
      }
    } catch { }
    if (!this.canModifyProducts(order)) {
      this.toastrService.warning(
        `No se pueden modificar productos. El pedido está en estado: ${order.estadoProceso}`,
        "Pedido Congelado",
      );
      return;
    }
    this.scrollStack.push(window.scrollY);

    // Verificar preferencias antes de establecer la configuración
    this.verifyCartPreferences(carritoConfiguracion);

    this.configuracionCarritoSeleccionado = carritoConfiguracion;
    this.indiceProductoSeleccionado = indiceProducto ?? -1;

    // Establecer el producto seleccionado desde la configuración del carrito
    this.productoSeleccionado = carritoConfiguracion?.producto;

    console.log("🔄 Abriendo modal de configuración:", {
      configuracion: carritoConfiguracion,
      producto: this.productoSeleccionado,
      indiceProducto: this.indiceProductoSeleccionado,
      preferencias:
        carritoConfiguracion?.configuracion?.preferencias?.length || 0,
    });
    this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: true,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (configuracionResult) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          if (configuracionResult == "Cross click") {
            return;
          }
          // Solo actualizar el carrito si se configuró correctamente el producto
          if (
            order.carrito &&
            configuracionResult?.producto &&
            configuracionResult?.configuracion // Verificar que tiene configuración válida
          ) {
            // Usar el índice específico del producto que se está editando
            if (
              this.indiceProductoSeleccionado >= 0 &&
              this.indiceProductoSeleccionado < order.carrito.length
            ) {
              console.log(
                "✅ Actualizando producto en índice:",
                this.indiceProductoSeleccionado,
              );
              order.carrito[this.indiceProductoSeleccionado] =
                configuracionResult;
            } else {
              console.error(
                "❌ Índice de producto inválido:",
                this.indiceProductoSeleccionado,
              );
            }
          }
          const tieneDomicilio = (order.carrito ?? []).some((car) => {
            const forma = car?.configuracion?.datosEntrega?.formaEntrega || "";
            return forma.toLowerCase().includes("domicilio");
          });
          // ===== NUEVO: Recalcular valor de envío (domicilio) =====
          // Si alguna línea del carrito tiene una forma de entrega que incluya la palabra "domicilio",
          // se calcula el envío con base en la zona de cobro; de lo contrario se pone en 0 (recoge en tienda).
          if (tieneDomicilio) {
            // Utilizar el servicio utilitario para obtener el costo de envío según la zona
            this.pedidoUtilService.pedido = order;
            try {
              order.totalEnvio = Number(
                this.pedidoUtilService.getShippingCost(this.allBillingZone),
              );
            } catch (e) {
              // Fallback si las zonas no están aún en memoria
              const zonas =
                this.allBillingZone ||
                JSON.parse(sessionStorage.getItem("allBillingZone") || "[]");
              order.totalEnvio = Number(
                this.pedidoUtilService.getShippingCost(zonas),
              );
            }
          } else {
            // Forma de entrega tipo "recoge"  →  sin costos de domicilio
            order.totalEnvio = 0;
          }

          // Sincronizar forma de entrega antes de actualizar valores
          console.log("🔄 CONFIGURACIÓN - Antes de sincronizar:", {
            nroPedido: order.nroPedido,
            formaEntregaPedido: order.formaEntrega,
            formaEntregaCarrito:
              order.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega,
          });

          this.sincronizarFormaEntrega(order);

          console.log("🔄 CONFIGURACIÓN - Después de sincronizar:", {
            nroPedido: order.nroPedido,
            formaEntregaPedido: order.formaEntrega,
            formaEntregaCarrito:
              order.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega,
          });

          // Recalcular totales dependientes del valor de envío, descuentos, etc.
          order = this.actualizarValoresPedido(order);

          this.editOrder(order);
        },
      );
  }

  addProductToCart(content: any, order: Pedido) {
    if (!this.canModifyProducts(order)) {
      this.toastrService.warning(
        `No se pueden agregar productos. El pedido está en estado: ${order.estadoProceso}`,
        "Pedido Congelado",
      );
      return;
    }
    this.scrollStack.push(window.scrollY);
    this.pedidoUtilService.pedido = order;
    this.ciudadSeleccionada = order.envio?.ciudad;

    // Pre-seleccionar la primera bodega disponible para que los productos se muestren inmediatamente
    if (this.bodegas && this.bodegas.length > 0 && !this.selectedWarehouse) {
      this.selectedWarehouse = this.bodegas[0];
    }

    this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: true,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (configuracionResult) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          if (configuracionResult == "Cross click") {
            return;
          }
          // Solo agregar al carrito si se configuró correctamente el producto
          if (order.carrito && configuracionResult?.producto) {
            // Verificar que al menos tenga producto válido
            if (
              configuracionResult.producto.identificacion?.referencia ||
              configuracionResult.producto.crearProducto?.cd
            ) {
              order.carrito.push(configuracionResult);
              console.log(
                "✅ Producto agregado a recompra:",
                configuracionResult,
              );
            } else {
              console.error(
                "❌ Producto sin referencia válida:",
                configuracionResult,
              );
            }
          }

          // Sincronizar forma de entrega antes de actualizar valores
          this.sincronizarFormaEntrega(order);

          order = this.actualizarValoresPedido(order);
          this.editOrder(order);
        },
      );
  }

  /**
   * Abre el modal para aplicar código de descuento
   * @param content Referencia del modal
   * @param pedido Pedido al que se aplicará el descuento
   */
  aplicarCodigoDescuento(content: any, pedido: Pedido) {
    // Permitir a administradores aplicar descuentos incluso en pedidos congelados
    if (!this.canModifyProducts(pedido) && !this.isAdminUser()) {
      this.toastrService.warning(
        `No se pueden aplicar descuentos. El pedido está en estado: ${pedido.estadoProceso}`,
        "Pedido Congelado",
      );
      return;
    }

    // Limpiar datos anteriores
    this.codigoDescuentoIngresado = "";
    this.errorCodigoDescuento = "";
    this.descuentoAplicado = null;
    this.pedidoSeleccionadoDescuento = pedido;

    this.scrollStack.push(window.scrollY);
    this.modalService
      .open(content, {
        size: "md",
        scrollable: true,
        centered: true,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
      );
  }

  /**
   * Valida y aplica el código de descuento al pedido
   * @param pedido Pedido al que se aplicará el descuento
   */
  validarYAplicarDescuento(pedido: Pedido) {
    if (!this.codigoDescuentoIngresado) {
      this.errorCodigoDescuento = "Por favor ingrese un código de cupón";
      return;
    }

    this.validandoDescuento = true;
    this.errorCodigoDescuento = "";

    // Usar el mismo servicio que usa el carrito de venta asistida
    this.ventasService
      .validateCupon({ code: this.codigoDescuentoIngresado })
      .subscribe({
        next: (value) => {
          this.validandoDescuento = false;

          if (!value || value.length === 0) {
            this.errorCodigoDescuento = "Cupón no válido";
            return;
          }

          // Aplicar el descuento al pedido
          const porcentajeDescuento = parseFloat(value[0]?.valor) || 0;
          const totalSinDescuento = this.getTotalProductPriceInCart(pedido);
          const valorDescuento =
            (totalSinDescuento * porcentajeDescuento) / 100;

          // Actualizar el pedido
          pedido.cuponAplicado = this.codigoDescuentoIngresado;
          pedido.porceDescuento = porcentajeDescuento;
          pedido.totalDescuento = valorDescuento;
          pedido.totalPedididoConDescuento = totalSinDescuento - valorDescuento;

          // Mostrar información del descuento aplicado
          this.descuentoAplicado = {
            codigo: this.codigoDescuentoIngresado,
            porcentaje: porcentajeDescuento,
            valor: valorDescuento,
          };

          // Actualizar el pedido en la base de datos
          this.editOrder(pedido);

          this.toastrService.success(
            `Cupón "${this.codigoDescuentoIngresado}" aplicado exitosamente. Descuento: $${valorDescuento.toLocaleString()}`,
            "Descuento Aplicado",
            {
              timeOut: 5000,
              progressBar: true,
              positionClass: "toast-bottom-right",
            },
          );
        },
        error: (err) => {
          this.validandoDescuento = false;
          this.errorCodigoDescuento = "Ocurrió un error al validar el cupón";
          this.toastrService.error("Error al validar el cupón", "Error", {
            timeOut: 4000,
            progressBar: true,
            positionClass: "toast-bottom-right",
          });
        },
      });
  }

  /**
   * Calcula el total de productos en el carrito del pedido
   * @param pedido Pedido del cual calcular el total
   * @returns Total del carrito
   */
  private getTotalProductPriceInCart(pedido: Pedido): number {
    if (!pedido.carrito || pedido.carrito.length === 0) {
      return 0;
    }

    return pedido.carrito.reduce((total, item) => {
      const precioUnitario = item.producto?.precio?.precioUnitarioConIva || 0;
      const cantidad = item.cantidad || 0;
      return total + precioUnitario * cantidad;
    }, 0);
  }

  /**
   * Abre el modal para editar/eliminar descuento
   * @param content Template del modal
   * @param pedido Pedido al que se le editará el descuento
   */
  editarDescuentoPedido(content: any, pedido: Pedido) {
    // Permitir a administradores editar descuentos incluso en pedidos congelados
    if (!this.canModifyProducts(pedido) && !this.isAdminUser()) {
      this.toastrService.warning(
        `No se pueden editar descuentos. El pedido está en estado: ${pedido.estadoProceso}`,
        "Pedido Congelado",
      );
      return;
    }

    if (!pedido.porceDescuento || pedido.porceDescuento <= 0) {
      this.toastrService.warning(
        "Este pedido no tiene descuento aplicado",
        "Sin Descuento",
      );
      return;
    }

    // Crear una copia del pedido para editar sin afectar el original
    this.pedidoDescuentoEditando = JSON.parse(JSON.stringify(pedido));
    this.nuevoPorcentajeDescuento = pedido.porceDescuento || 0;
    this.previewTotales = null;
    this.guardandoDescuento = false;

    // Calcular preview inicial
    if (this.pedidoDescuentoEditando) {
      this.calcularPreviewTotales(this.pedidoDescuentoEditando, this.nuevoPorcentajeDescuento);
    }

    this.scrollStack.push(window.scrollY);
    this.modalService
      .open(content, {
        size: "lg",
        scrollable: true,
        centered: true,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          // Limpiar datos al cerrar
          this.pedidoDescuentoEditando = null;
          this.nuevoPorcentajeDescuento = 0;
          this.previewTotales = null;
        },
        (reason) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          // Limpiar datos al cerrar
          this.pedidoDescuentoEditando = null;
          this.nuevoPorcentajeDescuento = 0;
          this.previewTotales = null;
        },
      );
  }

  /**
   * Calcula el preview de los totales con el nuevo porcentaje de descuento
   * @param pedido Pedido base
   * @param nuevoPorcentaje Nuevo porcentaje de descuento
   */
  calcularPreviewTotales(pedido: Pedido, nuevoPorcentaje: number): void {
    if (!pedido || nuevoPorcentaje < 0 || nuevoPorcentaje > 100) {
      this.previewTotales = null;
      return;
    }

    // Crear una copia del pedido para calcular sin afectar el original
    const pedidoCopia: Pedido = JSON.parse(JSON.stringify(pedido));
    pedidoCopia.porceDescuento = nuevoPorcentaje;

    // Asignar el pedido al servicio de utilidades para calcular
    this.pedidoUtilService.pedido = pedidoCopia;
    this.sincronizarFormaEntrega(pedidoCopia);

    // Recalcular envío y totales usando el mismo método que se usa en la tabla
    this.recalcularEnvioYTotalizarPedido(pedidoCopia);

    // Preparar el preview
    this.previewTotales = {
      totalPedidoSinDescuento: pedidoCopia.totalPedidoSinDescuento || 0,
      totalDescuento: pedidoCopia.totalDescuento || 0,
      totalEnvio: pedidoCopia.totalEnvio || 0,
      subtotal: pedidoCopia.subtotal || 0,
      totalImpuesto: pedidoCopia.totalImpuesto || 0,
      totalPedididoConDescuento: pedidoCopia.totalPedididoConDescuento || 0,
    };
  }

  /**
   * Guarda los cambios del descuento editado
   */
  guardarCambiosDescuento(): void {
    if (!this.pedidoDescuentoEditando) {
      return;
    }

    if (this.nuevoPorcentajeDescuento < 0 || this.nuevoPorcentajeDescuento > 100) {
      this.toastrService.error(
        "El porcentaje de descuento debe estar entre 0 y 100",
        "Error de Validación",
      );
      return;
    }

    this.guardandoDescuento = true;

    // Buscar el pedido original en la lista
    const pedidoOriginal = this.orders.find(
      (p) => p._id === this.pedidoDescuentoEditando?._id || p.nroPedido === this.pedidoDescuentoEditando?.nroPedido,
    );

    if (!pedidoOriginal) {
      this.toastrService.error("No se encontró el pedido en la lista", "Error");
      this.guardandoDescuento = false;
      return;
    }

    // Actualizar el porcentaje de descuento
    pedidoOriginal.porceDescuento = this.nuevoPorcentajeDescuento;

    // Si el descuento es 0, limpiar el cupón aplicado
    if (this.nuevoPorcentajeDescuento === 0) {
      pedidoOriginal.cuponAplicado = undefined;
    }

    // Recalcular todos los totales usando el mismo método que se usa en la tabla
    this.recalcularEnvioYTotalizarPedido(pedidoOriginal);

    // Actualizar el pedido en el backend
    this.ventasService.editOrder(pedidoOriginal).subscribe({
      next: (response) => {
        this.guardandoDescuento = false;
        this.toastrService.success(
          `Descuento ${this.nuevoPorcentajeDescuento === 0 ? 'eliminado' : 'actualizado'} exitosamente`,
          "Descuento Actualizado",
          {
            timeOut: 3000,
            progressBar: true,
            positionClass: "toast-bottom-right",
          },
        );

        // Cerrar el modal
        this.modalService.dismissAll();

        // Refrescar los datos de la tabla
        this.refrescarDatos();
      },
      error: (err) => {
        this.guardandoDescuento = false;
        console.error("Error al actualizar el descuento:", err);
        this.toastrService.error(
          "Error al actualizar el descuento. Por favor, intente nuevamente.",
          "Error",
          {
            timeOut: 4000,
            progressBar: true,
            positionClass: "toast-bottom-right",
          },
        );
      },
    });
  }

  /**
   * Elimina el descuento del pedido
   */
  eliminarDescuentoPedido(): void {
    if (!this.pedidoDescuentoEditando) {
      return;
    }

    Swal.fire({
      title: "¿Eliminar descuento?",
      text: "Esta acción eliminará el descuento aplicado al pedido. ¿Desea continuar?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        // Establecer el porcentaje en 0
        this.nuevoPorcentajeDescuento = 0;
        // Guardar los cambios (que ahora eliminará el descuento)
        this.guardarCambiosDescuento();
      }
    });
  }

  /**
   * Elimina directamente un pedido sin mostrar alert (usado cuando ya se confirmó)
   * @param pedido Pedido a eliminar
   */
  private eliminarPedidoCompleto(pedido: Pedido) {
    try {
      console.log(`🗑️ Eliminando pedido completo: ${pedido.nroPedido}`);

      // Eliminar el pedido del backend
      this.ventasService.deleteOrder(pedido).subscribe({
        next: (response) => {
          console.log("✅ Pedido eliminado exitosamente:", response);

          // Mostrar mensaje de éxito
          this.toastrService.success(
            `Pedido ${pedido.nroPedido} eliminado exitosamente`,
            "Pedido Eliminado",
          );

          // Remover el pedido de la lista local
          const index = this.orders.findIndex(
            (order) => order._id === pedido._id,
          );
          if (index !== -1) {
            this.orders.splice(index, 1);
          }

          // Refrescar los datos para actualizar la UI
          this.refrescarDatos();
        },
        error: (error) => {
          console.error("❌ Error al eliminar pedido:", error);
          this.toastrService.error(
            `Error al eliminar el pedido ${pedido.nroPedido}. Inténtalo nuevamente.`,
            "Error al Eliminar",
          );
        },
      });
    } catch (error) {
      console.error("❌ Error inesperado al eliminar pedido:", error);
      this.toastrService.error(
        "Ocurrió un error inesperado al eliminar el pedido",
        "Error",
      );
    }
  }

  /**
   * Elimina automáticamente un pedido que se quedó sin productos
   * @param pedido Pedido sin productos a eliminar
   */
  private eliminarPedidoSinProductos(pedido: Pedido) {
    Swal.fire({
      title: "⚠️ Pedido Sin Productos",
      text: `El pedido ${pedido.nroPedido} se quedó sin productos. Los pedidos sin productos no están permitidos en el sistema. ¿Deseas eliminar automáticamente este pedido?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar pedido",
      cancelButtonText: "Cancelar",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          console.log(
            `🗑️ Eliminando pedido sin productos: ${pedido.nroPedido}`,
          );

          // Eliminar el pedido del backend
          this.ventasService.deleteOrder(pedido).subscribe({
            next: (response) => {
              console.log(
                "✅ Pedido sin productos eliminado exitosamente:",
                response,
              );

              // Mostrar mensaje de éxito
              this.toastrService.success(
                `Pedido ${pedido.nroPedido} eliminado automáticamente por no tener productos`,
                "Pedido Eliminado",
              );

              // Remover el pedido de la lista local
              const index = this.orders.findIndex(
                (order) => order._id === pedido._id,
              );
              if (index !== -1) {
                this.orders.splice(index, 1);
              }

              // Refrescar los datos para actualizar la UI
              this.refrescarDatos();
            },
            error: (error) => {
              console.error(
                "❌ Error al eliminar pedido sin productos:",
                error,
              );
              this.toastrService.error(
                `Error al eliminar el pedido ${pedido.nroPedido}. Inténtalo nuevamente.`,
                "Error al Eliminar",
              );
            },
          });
        } catch (error) {
          console.error(
            "❌ Error inesperado al eliminar pedido sin productos:",
            error,
          );
          this.toastrService.error(
            "Ocurrió un error inesperado al eliminar el pedido",
            "Error",
          );
        }
      } else {
        // Si el usuario cancela, mostrar mensaje informativo
        this.toastrService.info(
          `El pedido ${pedido.nroPedido} se mantendrá en el sistema pero no tendrá productos. Considera agregar productos o eliminarlo manualmente.`,
          "Pedido Mantenido",
        );
      }
    });
  }

  /**
   * Elimina un producto específico del pedido
   * @param item Producto del carrito a eliminar
   * @param pedido Pedido al que pertenece el producto
   */
  eliminarProductoDelPedido(item: Carrito, pedido: Pedido) {
    // Verificar si se pueden ELIMINAR productos (más restrictivo que modificar)
    // EXCEPTO para productos fantasma que siempre se pueden eliminar
    if (!this.canDeleteProducts(pedido) && !this.isGhostProduct(item)) {
      this.toastrService.warning(
        `No se pueden eliminar productos. Solo se permiten eliminaciones cuando el estado de pago es "Pendiente" o el estado de proceso es "SinProducir". Estado actual - Pago: ${pedido.estadoPago}, Proceso: ${pedido.estadoProceso}`,
        "Eliminación No Permitida",
      );
      return;
    }

    // Mostrar mensaje especial si se está eliminando un producto fantasma
    if (this.isGhostProduct(item)) {
      this.toastrService.info(
        "Eliminando producto fantasma (producto con datos corruptos). Se está saltando la restricción de estado para limpiar el pedido.",
        "Eliminación Especial",
        { timeOut: 5000 },
      );
    }

    // Verificar si será el último producto del pedido
    const seraUltimoProducto = (pedido.carrito?.length || 0) === 1;

    // Si será el último producto, mostrar alert especial primero
    if (seraUltimoProducto) {
      this.confirmarEliminacionUltimoProducto(item, pedido);
      return;
    }

    // Si no será el último producto, proceder con eliminación normal
    this.confirmarEliminacionProducto(item, pedido);
  }

  /**
   * Confirma la eliminación del último producto (que dejará el pedido vacío)
   * @param item Producto a eliminar
   * @param pedido Pedido al que pertenece
   */
  private confirmarEliminacionUltimoProducto(item: Carrito, pedido: Pedido) {
    Swal.fire({
      title: "⚠️ Último Producto del Pedido",
      text: `Al eliminar "${item.producto?.crearProducto?.titulo || "este producto"}" el pedido ${pedido.nroPedido} se quedará sin productos. Los pedidos sin productos no están permitidos en el sistema. ¿Deseas eliminar el producto y el pedido completo?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar producto y pedido",
      cancelButtonText: "Cancelar",
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // Eliminar el producto del carrito
          const index = pedido.carrito?.findIndex(
            (carritoItem) =>
              carritoItem.producto?.identificacion?.referencia ===
              item.producto?.identificacion?.referencia,
          );

          if (index !== -1 && index !== undefined) {
            // Eliminar el producto del carrito
            pedido.carrito?.splice(index, 1);

            console.log(
              `🗑️ Último producto eliminado del pedido ${pedido.nroPedido}:`,
              {
                producto: item.producto?.crearProducto?.titulo,
                referencia: item.producto?.identificacion?.referencia,
                cantidad: item.cantidad,
              },
            );

            // Recalcular todos los valores del pedido
            pedido = this.actualizarValoresPedido(pedido);

            // Actualizar el pedido en el backend
            this.editOrder(pedido);

            // Mostrar mensaje de éxito
            this.toastrService.success(
              `Producto "${item.producto?.crearProducto?.titulo || "eliminado"}" removido del pedido exitosamente`,
              "Producto Eliminado",
            );

            // Ahora eliminar el pedido completo directamente ya que está vacío
            this.eliminarPedidoCompleto(pedido);
          } else {
            this.toastrService.error(
              "No se pudo encontrar el producto en el pedido",
              "Error al Eliminar",
            );
          }
        } catch (error) {
          console.error("Error al eliminar último producto del pedido:", error);
          this.toastrService.error(
            "Ocurrió un error al eliminar el producto",
            "Error",
          );
        }
      }
    });
  }

  /**
   * Confirma la eliminación de un producto (cuando no es el último)
   * @param item Producto a eliminar
   * @param pedido Pedido al que pertenece
   */
  private confirmarEliminacionProducto(item: Carrito, pedido: Pedido) {
    Swal.fire({
      title: "¿Eliminar producto?",
      text: `¿Estás seguro de que quieres eliminar "${item.producto?.crearProducto?.titulo || "este producto"}" del pedido?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // Buscar el índice del producto en el carrito
          const index = pedido.carrito?.findIndex(
            (carritoItem) =>
              carritoItem.producto?.identificacion?.referencia ===
              item.producto?.identificacion?.referencia,
          );

          if (index !== -1 && index !== undefined) {
            // Eliminar el producto del carrito
            pedido.carrito?.splice(index, 1);

            console.log(
              `🗑️ Producto eliminado del pedido ${pedido.nroPedido}:`,
              {
                producto: item.producto?.crearProducto?.titulo,
                referencia: item.producto?.identificacion?.referencia,
                cantidad: item.cantidad,
              },
            );

            // Recalcular todos los valores del pedido
            pedido = this.actualizarValoresPedido(pedido);

            // Actualizar el pedido en el backend
            this.editOrder(pedido);

            // Mostrar mensaje de éxito
            this.toastrService.success(
              `Producto "${item.producto?.crearProducto?.titulo || "eliminado"}" removido del pedido exitosamente`,
              "Producto Eliminado",
            );
          } else {
            this.toastrService.error(
              "No se pudo encontrar el producto en el pedido",
              "Error al Eliminar",
            );
          }
        } catch (error) {
          console.error("Error al eliminar producto del pedido:", error);
          this.toastrService.error(
            "Ocurrió un error al eliminar el producto",
            "Error",
          );
        }
      }
    });
  }
  actualizarValoresPedido(order: Pedido) {
    this.pedidoUtilService.pedido = order;

    // Sincronizar forma de entrega antes de actualizar valores
    this.sincronizarFormaEntrega(order);

    // Recalcular descuentos
    order.totalDescuento = this.pedidoUtilService.getDiscount();

    // 🔍 DETECTAR CAMBIOS EN FORMA DE ENTREGA
    const tieneDomicilio = (order.carrito ?? []).some((car) => {
      const forma = car?.configuracion?.datosEntrega?.formaEntrega || "";
      return forma.toLowerCase().includes("domicilio");
    });

    // 🔄 SINCRONIZAR ENVÍO CON FORMA DE ENTREGA ACTUAL
    let costoEnvioAnterior = order.totalEnvio || 0;
    let costoEnvioNuevo = 0;

    if (tieneDomicilio && order.envio?.zonaCobro) {
      try {
        costoEnvioNuevo = Number(
          this.pedidoUtilService.getShippingCost(this.allBillingZone),
        );
        order.totalEnvio = costoEnvioNuevo;

        console.log("🚚 ACTUALIZAR VALORES - Envío domicilio detectado:", {
          costoAnterior: costoEnvioAnterior,
          costoNuevo: costoEnvioNuevo,
          formaEntrega: "Domicilio",
          zonaCobro: order.envio.zonaCobro,
        });
      } catch (e) {
        console.warn("No se pudo calcular el costo de envío:", e);
        order.totalEnvio = 0;
        costoEnvioNuevo = 0;
      }
    } else {
      // Recoge en tienda o sin zona de cobro
      if (order.totalEnvio !== 0) {
        console.log(
          "🚚 ACTUALIZAR VALORES - Envío removido (recoge en tienda)",
        );
      }
      order.totalEnvio = 0;
      costoEnvioNuevo = 0;
    }

    // 🔄 CALCULAR SUBTOTAL CORRECTAMENTE - Fórmula consistente con backend
    // 1. Obtener subtotal SOLO de productos (sin envío)
    const subtotalProductos = this.pedidoUtilService.getSubtotal();

    // 2. Valor Bruto (totalPedidoSinDescuento) = SOLO productos (sin envío)
    // CORREGIDO: Antes sumaba envío aquí, lo cual era incorrecto
    order.totalPedidoSinDescuento = subtotalProductos;

    // 3. Calcular descuento SOLO sobre productos (NO sobre envío)
    let descuento = 0;
    if (order.porceDescuento) {
      descuento = subtotalProductos * (Number(order.porceDescuento) / 100);
      order.totalDescuento = descuento;
    } else {
      descuento = Number(order.totalDescuento || 0);
    }

    // 4. Subtotal = valorBruto - descuento + envío (INCLUYE domicilio)
    const envio = Number(order.totalEnvio || 0);
    order.subtotal = subtotalProductos - descuento + envio;

    // 5. Calcular IVA (incluye IVA de productos + envío, con descuento aplicado)
    const ivaResult = this.checkIVAPrice(order);
    // Usar el IVA calculado, o preservar el existente del backend si no hay carrito
    order.totalImpuesto = Number(ivaResult.totalPrecioIVADef || order.totalImpuesto || 0);

    // 6. Total = subtotal + IVA (envío ya está incluido en subtotal)
    order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;

    console.log("💰 ACTUALIZAR VALORES - Cálculo corregido:", {
      subtotalProductos,
      descuento,
      totalEnvio: order.totalEnvio,
      subtotal: order.subtotal,
      totalImpuesto: order.totalImpuesto,
      totalFinal: order.totalPedididoConDescuento,
      cambioEnvio: costoEnvioAnterior !== costoEnvioNuevo,
      formaEntrega: order.carrito?.map(
        (c) => c.configuracion?.datosEntrega?.formaEntrega,
      ),
    });

    // Recalcular falta por pagar si hay anticipos
    if (order.PagosAsentados && order.PagosAsentados.length > 0) {
      const anticipoReal = order.PagosAsentados.reduce((sum, pago) => {
        if (
          pago.formaPago?.toLowerCase().includes("wompi") &&
          pago.estadoVerificacion === "Pendiente"
        ) {
          return sum; // No sumar pagos de Wompi pendientes
        }
        const valorPago = pago.valor || pago.valorRegistrado || 0;
        return sum + valorPago;
      }, 0);

      order.anticipo = anticipoReal;
      order.faltaPorPagar = Math.max(
        0,
        order.totalPedididoConDescuento - anticipoReal,
      );

      // Si el orden estaba Aprobado pero ahora queda saldo pendiente (se añadieron productos),
      // debe volver a PreAprobado
      if (order.faltaPorPagar > 0 && order.estadoPago === EstadoPago.Aprobado) {
        order.estadoPago = EstadoPago.PreAprobado;
      }
    }

    return order;
  }

  deleteProductToCart(order: Pedido, carrito: Carrito) {
    // Usar una comparación correcta contra el ítem provisto
    const index: number = (order.carrito ?? []).findIndex(
      (c: any) =>
        c?.producto?.identificacion?.referencia ===
        carrito?.producto?.identificacion?.referencia,
    );
    if (index !== -1) {
      order.carrito?.splice(index, 1);
    }
    this.editOrder(order);
  }

  deleteOrder(order: Pedido) {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Si, eliminarlo",
    }).then((result) => {
      if (result.isConfirmed) {
        this.ventasService.deleteOrder(order).subscribe((data) => {
          console.log(data);
          this.refrescarDatos();
          Swal.fire("Eliminado", "El pedido ha sido eliminado.", "success");
        });
      }
    });
  }

  editSeller(order: Pedido) {
    // Obtener la empresa del pedido para filtrar usuarios
    const empresaPedido = order.company;

    if (!empresaPedido) {
      Swal.fire({
        title: "Error",
        text: "No se puede determinar la empresa del pedido.",
        icon: "error",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Aceptar",
      });
      return;
    }

    // Cargar la lista de usuarios para mostrar como opciones de asesores
    this.maestroService.consultarUsuarios().subscribe(
      (usuarios: any) => {
        console.log(`🔍 DEBUG ASIGNACIÓN ASESOR - Empresa: ${empresaPedido}`);
        console.log(`📊 Total usuarios obtenidos: ${usuarios.length}`);

        // ✅ CORREGIDO: Filtrar usuarios activos de la empresa específica
        // Incluir TODOS los usuarios activos de la empresa, no solo roles específicos
        const usuariosEmpresa = usuarios.filter((usuario: any) => {
          const esActivo = usuario.activo;
          const esDeEmpresa =
            usuario.empresa === empresaPedido ||
            usuario.company === empresaPedido;

          console.log(`👤 Usuario: ${usuario.nombre} ${usuario.apellido}`, {
            activo: esActivo,
            empresa: usuario.empresa,
            company: usuario.company,
            roles: usuario.roles,
            esDeEmpresa: esDeEmpresa,
          });

          return esActivo && esDeEmpresa;
        });

        console.log(
          `✅ Usuarios filtrados por empresa: ${usuariosEmpresa.length}`,
        );

        if (usuariosEmpresa.length === 0) {
          Swal.fire({
            title: "Error",
            text: `No hay usuarios disponibles en la empresa ${empresaPedido}.`,
            icon: "error",
            confirmButtonColor: "#3085d6",
            confirmButtonText: "Aceptar",
          });
          return;
        }

        // ✅ CORREGIDO: Usar todos los usuarios de la empresa como asesores disponibles
        const asesoresDisponibles = usuariosEmpresa;

        // Crear opciones para el select
        const options = asesoresDisponibles.map((asesor: any) => ({
          value: asesor.cd,
          label: `${asesor.nombre} ${asesor.apellido} (${asesor.email})`,
        }));

        // Agregar opción para el asesor actual si existe
        if (order.asesorAsignado && order.asesorAsignado.nit !== "9999") {
          const asesorActual = asesoresDisponibles.find(
            (a: any) => a.nit === order.asesorAsignado?.nit,
          );
          if (asesorActual) {
            options.unshift({
              value: asesorActual.cd,
              label: `${asesorActual.nombre} ${asesorActual.apellido} (${asesorActual.email}) - ACTUAL`,
            });
          }
        }

        Swal.fire({
          title: "Asignar Asesor",
          text: `Selecciona el asesor que deseas asignar a este pedido de ${empresaPedido}:`,
          input: "select",
          inputOptions: options.reduce((acc, option) => {
            acc[option.value] = option.label;
            return acc;
          }, {} as any),
          inputValue:
            order.asesorAsignado?.nit !== "9999"
              ? asesoresDisponibles.find(
                (a: any) => a.nit === order.asesorAsignado?.nit,
              )?.cd
              : "",
          showCancelButton: true,
          confirmButtonColor: "#3085d6",
          cancelButtonColor: "#d33",
          confirmButtonText: "Asignar Asesor",
          cancelButtonText: "Cancelar",
          inputValidator: (value) => {
            if (!value) {
              return "Debes seleccionar un asesor";
            }
            return null;
          },
        }).then((result) => {
          if (result.isConfirmed && result.value) {
            const asesorSeleccionado = asesoresDisponibles.find(
              (a: any) => a.cd === result.value,
            );

            if (asesorSeleccionado) {
              const userLite: UserLite = {
                name: `${asesorSeleccionado.nombre} ${asesorSeleccionado.apellido}`,
                email: asesorSeleccionado.email,
                nit: asesorSeleccionado.nit,
              };

              order.asesorAsignado = userLite;
              this.editOrder(order);

              Swal.fire({
                title: "Asesor Asignado",
                text: `El asesor ${userLite.name} ha sido asignado exitosamente al pedido.`,
                icon: "success",
                confirmButtonColor: "#3085d6",
                confirmButtonText: "Aceptar",
              });
            }
          }
        });
      },
      (error) => {
        console.error("Error al cargar usuarios:", error);
        Swal.fire({
          title: "Error",
          text: "No se pudo cargar la lista de asesores. Intenta nuevamente.",
          icon: "error",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "Aceptar",
        });
      },
    );
  }

  buscarPorFechas(table?: Table): void {
    // Implementar lógica para filtrar los pedidos entre fechaInicial y fechaFinal
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      tipoFecha: "fechaCreacion",
      company: JSON.parse(localStorage.getItem("currentCompany")!).nomComercial,
      estadoProceso: this.isFromProduction
        ? [
          EstadoProceso.SinProducir,
          EstadoProceso.EnProduccion,
          EstadoProceso.ProducidoParcialmente,
        ]
        : ["Todos"],
    };
    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      console.log(data);
      this.orders = data;
      this.loading = false;
    });

    if (table) {
      table.clear();
    }
  }

  filtrarParaHoy(): void {
    // Ajustar fechaInicial y fechaFinal al día actual
    const fechaActual = new Date();
    this.fechaInicial = fechaActual.toISOString().split("T")[0];
    this.fechaFinal = fechaActual.toISOString().split("T")[0];
    // Update Date objects for calendar components
    this.fechaInicialDate = new Date(fechaActual);
    this.fechaFinalDate = new Date(fechaActual);
    this.refrescarDatos();
  }
  filter(event) {
    console.log(event);
  }

  filtrarParaManana(): void {
    // Ajustar las fechas para mañana
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = fechaManana.toISOString().split("T")[0];
    this.fechaFinal = fechaManana.toISOString().split("T")[0];
    // Update Date objects for calendar components
    this.fechaInicialDate = new Date(fechaManana);
    this.fechaFinalDate = new Date(fechaManana);
    this.refrescarDatos();
  }

  filtrarParaPasadoManana(): void {
    // Ajustar las fechas para pasado mañana
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = fechaPasadoManana.toISOString().split("T")[0];
    this.fechaFinal = fechaPasadoManana.toISOString().split("T")[0];
    // Update Date objects for calendar components
    this.fechaInicialDate = new Date(fechaPasadoManana);
    this.fechaFinalDate = new Date(fechaPasadoManana);
    this.refrescarDatos();
  }

  AsentarPago(content, order: Pedido) {
    this.scrollStack.push(window.scrollY);
    this.pedidoSeleccionado = order;
    this.modalService
      .open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
        },
        (reason) => {
          const last = this.scrollStack.pop();
          if (last !== undefined) {
            setTimeout(() => {
              window.scrollTo({ top: last });
            }, 0);
          }
          if (reason == "Cross click") {
            return;
          }
          if (reason && reason.nroPedido) {
            const index = this.orders.findIndex(
              (p) => p.nroPedido === reason.nroPedido,
            );
            if (index !== -1) {
              this.orders[index] = { ...reason };
            }
            this.updatePagosOnly(reason);
          }
        },
      );
  }

  overridePedidoByEntrega(event: Pedido) {
    this.pedidoSeleccionado = event;
  }

  /**
   * Actualiza el pedido con los datos de facturación seleccionados y lo guarda
   * @param event Pedido actualizado con datos de facturación
   */
  overridePedidoByFacturacion(event: Pedido) {
    this.pedidoSeleccionado = event;
    // Guardar el pedido con los nuevos datos de facturación
    this.editOrder(this.pedidoSeleccionado);
    console.log('📧 Datos de facturación actualizados y guardados:', this.pedidoSeleccionado.facturacion);
  }

  /**
   * Exporta pedidos a Excel usando endpoint dedicado SIN LÍMITE de paginación
   * Obtiene TODOS los pedidos que coincidan con el filtro de fechas
   * @since 2025.11.24 - Nuevo endpoint dedicado para exportación sin límites
   */
  async exportarExcel(): Promise<void> {
    // Mostrar loading
    this.loading = true;
    const toastRef = this.toastrService.info(
      'Preparando exportación... Esto puede tomar un momento.',
      'Exportando',
      { disableTimeOut: true, tapToDismiss: false }
    );

    try {
      // Obtener datos de la empresa actual
      const currentCompany = JSON.parse(localStorage.getItem("currentCompany") || '{}');
      const company = currentCompany.nomComercial;

      if (!company) {
        throw new Error('No se encontró la empresa actual');
      }

      // Ensure dates are set with fallback to today
      const fechaInicial = this.fechaInicial || new Date().toISOString().split("T")[0];
      const fechaFinal = this.fechaFinal || new Date().toISOString().split("T")[0];

      // Formatear fechas para el backend
      const startDate = new Date(fechaInicial + "T00:00:00");
      const endDate = new Date(fechaFinal + "T23:59:59.999");

      console.log(`📤 Exportando pedidos: ${startDate.toISOString()} a ${endDate.toISOString()}`);

      // Usar el nuevo endpoint dedicado para exportación SIN LÍMITES
      const response = await this.ventasService.getAllOrdersForExportDirect(
        company,
        startDate.toISOString(),
        endDate.toISOString(),
        'fechaCreacion'
      ).toPromise();

      if (response && response.success && response.orders && response.orders.length > 0) {
        console.log(`✅ Obtenidos ${response.orders.length} pedidos para exportar (totalItems: ${response.totalItems})`);

        // Procesar los pedidos igual que en refrescarDatos
        // Consistente con PaymentService y recalcularEnvioYTotalizarPedido
        const pedidosProcesados = response.orders.map((order: any) => {
          const subtotalProductos = Number(this.checkPriceScale(order) || 0);
          const envio = Number(order.totalEnvio || 0);

          // 1. Valor Bruto (totalPedidoSinDescuento) = SOLO productos (sin envío)
          order.totalPedidoSinDescuento = subtotalProductos;

          // 2. Calcular descuento SOLO sobre productos (NO sobre envío)
          let descuento = 0;
          if (order.porceDescuento) {
            descuento = subtotalProductos * (Number(order.porceDescuento) / 100);
            order.totalDescuento = descuento;
          } else {
            descuento = Number(order.totalDescuento || 0);
          }

          // 3. Subtotal = valorBruto - descuento + envío (INCLUYE domicilio)
          order.subtotal = subtotalProductos - descuento + envio;

          // 4. Calcular IVA (incluye IVA de productos + envío, con descuento aplicado internamente)
          const ivaResultExport = this.checkIVAPrice(order);
          // Usar el IVA calculado, o preservar el existente del backend si no hay carrito
          order.totalImpuesto = Number(ivaResultExport.totalPrecioIVADef || order.totalImpuesto || 0);

          // 5. Total = subtotal + IVA (envío ya está incluido en subtotal)
          order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;

          if (order.PagosAsentados && order.PagosAsentados.length > 0) {
            order.anticipo = order.PagosAsentados.reduce((acc, pago) => {
              const estadoValido = pago.estadoVerificacion !== "Rechazado" && pago.estadoVerificacion !== "Cancelado";
              if (estadoValido) {
                return acc + Number(pago.valor || pago.valorRegistrado || 0);
              }
              return acc;
            }, 0);
          }

          order.faltaPorPagar = Math.max(0, Number(order.totalPedididoConDescuento || 0) - Number(order.anticipo || 0));
          return order;
        });

        // Cerrar toast de progreso
        this.toastrService.clear(toastRef.toastId);

        // Exportar a Excel
        this.exportarExcelConDatos(pedidosProcesados);
        this.toastrService.success(
          `Exportados ${pedidosProcesados.length} pedidos exitosamente`,
          'Exportación completada'
        );
      } else if (response && response.orders && response.orders.length === 0) {
        this.toastrService.clear(toastRef.toastId);
        this.toastrService.warning(
          'No se encontraron pedidos en el rango de fechas seleccionado',
          'Sin datos'
        );
      } else {
        throw new Error(response?.error || 'No se recibieron datos del servidor');
      }
    } catch (error: any) {
      console.error('❌ Error al obtener pedidos para exportar:', error);
      this.toastrService.clear();
      this.toastrService.error(
        error.message || 'Error al obtener los pedidos para exportar. Intente nuevamente.',
        'Error de exportación'
      );
    } finally {
      this.loading = false;
    }
  }

  /**
   * Realiza la exportación a Excel con los datos proporcionados
   * @param pedidos Array de pedidos a exportar
   */
  private exportarExcelConDatos(pedidos: Pedido[]): void {
    // Transformar los datos para la exportación con columnas legibles
    const datosExportar = pedidos.map((pedido) => ({
      'Nro Pedido': pedido.nroPedido || '',
      'Fecha Creación': pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleDateString('es-CO') : '',
      'Fecha Entrega': pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString('es-CO') : '',
      'Cliente': pedido.cliente?.nombres_completos || '',
      'Documento': pedido.cliente?.documento || '',
      'Teléfono': pedido.cliente?.numero_celular_comprador || '',
      'Email': pedido.cliente?.correo_electronico_comprador || '',
      'Ciudad': pedido.envio?.ciudad || '',
      'Dirección': pedido.envio?.direccionEntrega || '',
      'Zona': pedido.envio?.zonaCobro || '',
      'Forma Entrega': pedido.formaEntrega || '',
      'Horario Entrega': pedido.horarioEntrega || '',
      'Estado Pago': pedido.estadoPago || '',
      'Estado Proceso': pedido.estadoProceso || '',
      'Validación': pedido.validacion ? 'Sí' : 'No',
      'Valor Bruto': pedido.totalPedidoSinDescuento || 0,
      'Descuento': pedido.totalDescuento || 0,
      'Envío': pedido.totalEnvio || 0,
      'IVA': pedido.totalImpuesto || 0,
      'Subtotal': pedido.subtotal || 0,
      'Total': pedido.totalPedididoConDescuento || 0,
      'Anticipo': pedido.anticipo || 0,
      'Falta por Pagar': pedido.faltaPorPagar || 0,
      'Forma de Pago': pedido.formaDePago || '',
      'Asesor': pedido.asesorAsignado?.name || '',
      'Empacador': pedido.empacador || '',
      'Despachador': pedido.despachador?.name || '',
      'Transportador': typeof pedido.transportador === 'string' ? pedido.transportador : pedido.transportador?.nombre || '',
      'Nro Factura': pedido.nroFactura || '',
      'Nro Guía': pedido.nroShippingOrder || '',
      'Canal': pedido.channel?.name || 'Regular',
      'Notas': pedido.notasPedido?.notasCliente?.[0]?.nota || '',
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
    
    // Ajustar anchos de columna
    const columnWidths = [
      { wch: 12 }, // Nro Pedido
      { wch: 12 }, // Fecha Creación
      { wch: 12 }, // Fecha Entrega
      { wch: 25 }, // Cliente
      { wch: 15 }, // Documento
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 15 }, // Ciudad
      { wch: 40 }, // Dirección
      { wch: 15 }, // Zona
      { wch: 15 }, // Forma Entrega
      { wch: 15 }, // Horario Entrega
      { wch: 12 }, // Estado Pago
      { wch: 15 }, // Estado Proceso
      { wch: 10 }, // Validación
      { wch: 12 }, // Valor Bruto
      { wch: 12 }, // Descuento
      { wch: 10 }, // Envío
      { wch: 10 }, // IVA
      { wch: 12 }, // Subtotal
      { wch: 12 }, // Total
      { wch: 12 }, // Anticipo
      { wch: 12 }, // Falta por Pagar
      { wch: 15 }, // Forma de Pago
      { wch: 20 }, // Asesor
      { wch: 15 }, // Empacador
      { wch: 15 }, // Despachador
      { wch: 15 }, // Transportador
      { wch: 12 }, // Nro Factura
      { wch: 15 }, // Nro Guía
      { wch: 12 }, // Canal
      { wch: 40 }, // Notas
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook: XLSX.WorkBook = {
      Sheets: { Pedidos: worksheet },
      SheetNames: ["Pedidos"],
    };
    
    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Pedidos_${fecha}.xlsx`);
  }

  /**
   * Construye el objeto de filtro actual basado en el estado del componente
   * Usado para exportación y otras operaciones que necesitan el filtro completo
   */
  private buildCurrentFilter(): any {
    // Ensure dates are set with fallback to today
    const fechaInicial = this.fechaInicial || new Date().toISOString().split("T")[0];
    const fechaFinal = this.fechaFinal || new Date().toISOString().split("T")[0];

    const startDate = new Date(fechaInicial + "T00:00:00");
    const endDate = new Date(fechaFinal + "T23:59:59.999");

    const filter: any = {
      fechaInicial: startDate.toISOString(),
      fechaFinal: endDate.toISOString(),
      company: JSON.parse(localStorage.getItem("currentCompany")!).nomComercial,
      tipoFecha: "fechaCreacion", // Cambiado de fechaEntrega a fechaCreacion para incluir TODOS los pedidos
      estadoProceso: ["Todos"],
    };

    // Agregar búsqueda global si existe
    if (this.searchQuery && this.searchQuery.trim() !== '') {
      filter.globalFilter = this.searchQuery.trim();
    }

    // Apply quick filters for payment status
    if (this.quickFilters.estadoPago !== "all") {
      filter.estadosPago = [this.quickFilters.estadoPago];
    } else {
      if (this.isFromProduction) {
        filter.estadosPago = ["Pospendiente", "PreAprobado", "Aprobado", "Pendiente"];
      } else {
        filter.estadosPago = ["Pospendiente", "PreAprobado", "Aprobado", "Pendiente", "Rechazado", "Precancelado", "Cancelado"];
      }
    }

    // Apply quick filters for process status
    if (this.quickFilters.estadoProceso !== "all") {
      filter.estadoProceso = [this.quickFilters.estadoProceso];
    }

    return filter;
  }

  firstEvent(ev: string): void {
    if (new Date(ev) > new Date(this.fechaFinal)) {
      this.fechaFinal = ev;
      this.clearFilter();
      this.refrescarDatos();
    }
    this.saveFiltersState();
  }

  secondEvent(ev): void {
    if (ev < this.fechaInicial) {
      this.fechaInicial = ev;
      this.clearFilter();
    }
    this.saveFiltersState();
  }

  clearFilter(): void {
    this.orders = [];
  }

  // Métodos para manejo de columnas
  loadColumnConfiguration(): void {
    const savedColumns = localStorage.getItem("ventasListColumns");
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        // Validar que las columnas guardadas coincidan con las actuales
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Fusionar columnas guardadas con columnas por defecto (para agregar nuevas columnas)
          const defaultColumns = [...this.displayedColumns];
          const savedFields = parsed.map((col: any) => col.field);

          // Agregar columnas nuevas que no existen en las guardadas
          const newColumns = defaultColumns.filter(col => !savedFields.includes(col.field));
          if (newColumns.length > 0) {
            console.log('📋 Nuevas columnas detectadas:', newColumns.map(c => c.field).join(', '));
            // Insertar nuevas columnas antes de la última columna (generalmente 'opciones')
            this.displayedColumns = [...parsed, ...newColumns];
          } else {
            this.displayedColumns = parsed;
          }
        }
      } catch (e) {
        console.error("Error parsing saved columns configuration", e);
      }
    }

    // Asegurar que la columna 'detalles' esté siempre primera y visible
    const detallesIndex = this.displayedColumns.findIndex(
      (col) => col.field === "detalles",
    );
    if (detallesIndex > 0) {
      const detallesColumn = this.displayedColumns.splice(detallesIndex, 1)[0];
      this.displayedColumns.unshift(detallesColumn);
    }
    if (detallesIndex >= 0) {
      this.displayedColumns[0].visible = true;
    }

    // Inicializar columnas seleccionadas manteniendo el orden
    // La columna 'detalles' debe estar siempre incluida y primera
    this.selectedColumns = this.displayedColumns.filter((col) => col.visible);

    // Verificar que 'detalles' esté en selectedColumns y sea la primera
    const detallesInSelected = this.selectedColumns.findIndex(
      (col) => col.field === "detalles",
    );
    if (detallesInSelected === -1) {
      // Si no está, agregarla al inicio
      const detallesColumn = this.displayedColumns.find(
        (col) => col.field === "detalles",
      );
      if (detallesColumn) {
        this.selectedColumns.unshift(detallesColumn);
      }
    } else if (detallesInSelected > 0) {
      // Si está pero no es la primera, moverla al inicio
      const detallesColumn = this.selectedColumns.splice(
        detallesInSelected,
        1,
      )[0];
      this.selectedColumns.unshift(detallesColumn);
    }
  }

  saveColumnConfiguration(): void {
    localStorage.setItem(
      "ventasListColumns",
      JSON.stringify(this.displayedColumns),
    );
  }

  isColumnVisible(field: string): boolean {
    // La columna 'detalles' siempre debe ser visible
    if (field === "detalles") {
      return true;
    }
    return this.selectedColumns.some((col) => col.field === field);
  }

  onColumnSelectionChange(): void {
    // Actualizar la propiedad visible en displayedColumns basado en selectedColumns
    this.displayedColumns.forEach((col) => {
      col.visible = this.selectedColumns.some(
        (selected) => selected.field === col.field,
      );
    });

    // Asegurar que la columna 'detalles' esté siempre visible
    const detallesColumn = this.displayedColumns.find(
      (col) => col.field === "detalles",
    );
    if (detallesColumn) {
      detallesColumn.visible = true;
      if (!this.selectedColumns.some((col) => col.field === "detalles")) {
        this.selectedColumns.unshift(detallesColumn);
      }
    }

    // Guardar la configuración en localStorage
    this.saveColumnConfiguration();
  }

  resetColumnConfig(): void {
    this.displayedColumns = [
      { field: "detalles", header: "Detalles", visible: true, type: "actions" },
      {
        field: "nroPedido",
        header: "# Pedido",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "fechaEntrega",
        header: "Fecha entrega",
        visible: true,
        type: "date",
        filterable: true,
      },
      { field: "opciones", header: "Opciones", visible: true, type: "actions" },
      {
        field: "estadoPago",
        header: "Estado de Pago",
        visible: true,
        type: "status",
        filterable: true,
      },
      {
        field: "estadoProceso",
        header: "Estado de Proceso",
        visible: true,
        type: "status",
        filterable: true,
      },
      {
        field: "validacion",
        header: "Validación",
        visible: true,
        type: "boolean",
        filterable: true,
      },
      {
        field: "cliente",
        header: "Cliente",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "valorBruto",
        header: "Valor Bruto",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "descuento",
        header: "Descuento",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "domicilio",
        header: "Domicilio",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "subtotal",
        header: "Subtotal",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "iva",
        header: "IVA",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "total",
        header: "Total",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "anticipo",
        header: "Anticipo",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "faltaPorPagar",
        header: "Falta por Pagar",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "fechaCreacion",
        header: "Fecha de compra",
        visible: true,
        type: "date",
        filterable: true,
      },
      {
        field: "ciudad",
        header: "Ciudad",
        visible: false,
        type: "text",
        filterable: true,
      },
      {
        field: "referencia",
        header: "Referencia",
        visible: false,
        type: "text",
        filterable: true,
      },
      {
        field: "zonaCobro",
        header: "Zona de Entrega",
        visible: false,
        type: "text",
        filterable: true,
      },
      {
        field: "formaEntrega",
        header: "Forma de Entrega",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "horarioEntrega",
        header: "Horario de Entrega",
        visible: true,
        type: "text",
        filterable: true,
      },
      // Nueva columna para mostrar el canal de procedencia del pedido
      {
        field: "channel",
        header: "Canal",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "vendedor",
        header: "Vendedor",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "ultimaImpresion",
        header: "Última impresión",
        visible: true,
        type: "date",
        filterable: false,
      },
    ];

    // Re-inicializar para asegurar orden correcto
    this.initializeColumns();

    // Asegurar que selectedColumns mantenga el orden correcto con 'detalles' primero
    this.selectedColumns = this.displayedColumns.filter((col) => col.visible);
    this.saveColumnConfiguration();
  }

  // Métodos específicos para manejo de columnas de producción
  loadColumnConfigurationProduccion(): void {
    const savedColumns = localStorage.getItem("ventasListProduccionColumns");
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        // Validar que las columnas guardadas coincidan con las actuales
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.displayedColumnsProduccion = parsed;
        }
      } catch (e) {
        console.error(
          "Error parsing saved production columns configuration",
          e,
        );
      }
    }
    // Inicializar columnas seleccionadas de producción
    this.selectedColumnsProduccion = this.displayedColumnsProduccion.filter(
      (col) => col.visible,
    );
  }

  saveColumnConfigurationProduccion(): void {
    localStorage.setItem(
      "ventasListProduccionColumns",
      JSON.stringify(this.displayedColumnsProduccion),
    );
  }

  onColumnSelectionChangeProduccion(newSelected: ColumnDefinition[]): void {
    this.selectedColumnsProduccion = newSelected;
    // Actualizar la propiedad visible en displayedColumnsProduccion basado en selectedColumnsProduccion
    this.displayedColumnsProduccion.forEach((col) => {
      col.visible = this.selectedColumnsProduccion.some(
        (selected) => selected.field === col.field,
      );
    });
    // Guardar la configuración en localStorage
    this.saveColumnConfigurationProduccion();
  }

  resetColumnConfigProduccion(): void {
    this.displayedColumnsProduccion = [
      {
        field: "producto",
        header: "Producto",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "referencia",
        header: "Referencia",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "ultimaImpresion",
        header: "Última impresión",
        visible: true,
        type: "date",
        filterable: false,
      },
      {
        field: "revisadoParaProduccion",
        header: "Revisado",
        visible: true,
        type: "date",
        filterable: true,
      },
      {
        field: "nroPedido",
        header: "# Pedido",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "cantidad",
        header: "Cantidad",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "cliente",
        header: "Cliente",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "estadoPago",
        header: "Estado de Pago",
        visible: true,
        type: "status",
        filterable: true,
      },
      {
        field: "estadoProceso",
        header: "Estado de Proceso",
        visible: true,
        type: "status",
        filterable: true,
      },
      {
        field: "validacion",
        header: "Validación",
        visible: true,
        type: "status",
        filterable: true,
      },
      {
        field: "totalPedidoSinDescuento",
        header: "Valor Bruto",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "totalDescuento",
        header: "Descuento",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "totalEnvio",
        header: "Domicilio",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "subtotal",
        header: "Subtotal",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "totalImpuesto",
        header: "IVA",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "totalPedididoConDescuento",
        header: "Total",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "anticipo",
        header: "Anticipo",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "faltaPorPagar",
        header: "Falta por Pagar",
        visible: true,
        type: "currency",
        filterable: true,
      },
      {
        field: "fechaEntrega",
        header: "Fecha Entrega",
        visible: true,
        type: "date",
        filterable: true,
      },
      {
        field: "fechaCreacion",
        header: "Fecha de compra",
        visible: true,
        type: "date",
        filterable: true,
      },
      {
        field: "ciudad",
        header: "Ciudad",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "zonaCobro",
        header: "Zona de Entrega",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "formaEntrega",
        header: "Forma de Entrega",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "horarioEntrega",
        header: "Horario de Entrega",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "channel",
        header: "Canal",
        visible: true,
        type: "text",
        filterable: true,
      },
      {
        field: "vendedor",
        header: "Vendedor",
        visible: true,
        type: "text",
        filterable: true,
      },
    ];
    // Asegurar que selectedColumnsProduccion mantenga la nueva configuración
    this.selectedColumnsProduccion = this.displayedColumnsProduccion.filter(
      (col) => col.visible,
    );
    this.saveColumnConfigurationProduccion();
  }

  private initializeColumns(): void {
    // Asegurar que la columna 'detalles' esté siempre primera
    const detallesIndex = this.displayedColumns.findIndex(
      (col) => col.field === "detalles",
    );
    if (detallesIndex > 0) {
      const detallesColumn = this.displayedColumns.splice(detallesIndex, 1)[0];
      this.displayedColumns.unshift(detallesColumn);
    }

    // Asegurar que la columna 'detalles' esté visible
    const detallesColumn = this.displayedColumns.find(
      (col) => col.field === "detalles",
    );
    if (detallesColumn) {
      detallesColumn.visible = true;
    }
  }

  getVisibleColumnsCount(): number {
    // Siempre incluir la columna 'detalles' en el conteo
    const visibleCount = this.selectedColumns.length;
    const hasDetalles = this.selectedColumns.some(
      (col) => col.field === "detalles",
    );
    return hasDetalles ? visibleCount : visibleCount + 1;
  }

  getVisibleColumnFields(): string[] {
    return this.selectedColumns.map((col) => col.field);
  }

  // Nuevos métodos para filtros modernos
  toggleColumnConfig(): void {
    this.showColumnConfig = !this.showColumnConfig;
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.saveFiltersState();
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.fechaInicial) count++;
    if (this.fechaFinal) count++;
    if (this.nroPedido) count++;
    if (this.quickFilters.estadoPago !== "all") count++;
    if (this.quickFilters.estadoProceso !== "all") count++;
    return count;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.fechaInicial ||
      this.fechaFinal ||
      this.nroPedido ||
      this.quickFilters.estadoPago !== "all" ||
      this.quickFilters.estadoProceso !== "all"
    );
  }

  clearDateFilter(type: "inicial" | "final"): void {
    if (type === "inicial") {
      this.fechaInicial = "";
      this.fechaInicialDate = null;
    } else {
      this.fechaFinal = "";
      this.fechaFinalDate = null;
    }
    this.refrescarDatos();
    this.saveFiltersState();
  }

  // Métodos para rangos de fecha predefinidos
  setDateRange(range: string): void {
    const today = new Date();
    const startOfWeek = new Date(
      today.setDate(today.getDate() - today.getDay()),
    );
    const endOfWeek = new Date(
      today.setDate(today.getDate() - today.getDay() + 6),
    );

    switch (range) {
      case "today":
        const todayDate = new Date();
        this.fechaInicial = todayDate.toISOString().split("T")[0];
        this.fechaFinal = todayDate.toISOString().split("T")[0];
        this.fechaInicialDate = new Date(todayDate);
        this.fechaFinalDate = new Date(todayDate);
        break;
      case "week":
        this.fechaInicial = startOfWeek.toISOString().split("T")[0];
        this.fechaFinal = endOfWeek.toISOString().split("T")[0];
        this.fechaInicialDate = new Date(startOfWeek);
        this.fechaFinalDate = new Date(endOfWeek);
        break;
      case "month":
        const startOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
        );
        const endOfMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        );
        this.fechaInicial = startOfMonth.toISOString().split("T")[0];
        this.fechaFinal = endOfMonth.toISOString().split("T")[0];
        this.fechaInicialDate = new Date(startOfMonth);
        this.fechaFinalDate = new Date(endOfMonth);
        break;
      case "lastWeek":
        const lastWeekStart = new Date(
          today.setDate(today.getDate() - today.getDay() - 7),
        );
        const lastWeekEnd = new Date(
          today.setDate(today.getDate() - today.getDay() - 1),
        );
        this.fechaInicial = lastWeekStart.toISOString().split("T")[0];
        this.fechaFinal = lastWeekEnd.toISOString().split("T")[0];
        this.fechaInicialDate = new Date(lastWeekStart);
        this.fechaFinalDate = new Date(lastWeekEnd);
        break;
      case "lastMonth":
        const lastMonthStart = new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 1,
          1,
        );
        const lastMonthEnd = new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          0,
        );
        this.fechaInicial = lastMonthStart.toISOString().split("T")[0];
        this.fechaFinal = lastMonthEnd.toISOString().split("T")[0];
        this.fechaInicialDate = new Date(lastMonthStart);
        this.fechaFinalDate = new Date(lastMonthEnd);
        break;
    }
    this.refrescarDatos();
    this.saveFiltersState();
  }

  // Métodos para filtros rápidos (movido abajo para evitar duplicación)

  clearQuickFilter(type: "estadoPago" | "estadoProceso"): void {
    this.quickFilters[type] = "all";
    this.refrescarDatos();
    this.saveFiltersState();
  }

  clearAllFilters(): void {
    this.fechaInicial = "";
    this.fechaFinal = "";
    this.fechaInicialDate = null;
    this.fechaFinalDate = null;
    this.nroPedido = null;
    this.quickFilters = {
      estadoPago: "all",
      estadoProceso: "all",
    };
    // Cerrar filtros si no hay filtros activos
    if (!this.hasActiveFilters()) {
      this.showFilters = false;
    }
    this.refrescarDatos();
    this.saveFiltersState();
  }

  // Métodos para persistir estado de filtros
  private loadFiltersState(): void {
    const savedState = localStorage.getItem("ventasFiltersState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);

        // Restore UI state (existing logic)
        this.showFilters = state.showFilters || false;

        // Restore filter values (NEW)
        if (state.fechaInicial) {
          this.fechaInicial = state.fechaInicial;
          this.fechaInicialDate = this.stringToDate(state.fechaInicial);
        }
        if (state.fechaFinal) {
          this.fechaFinal = state.fechaFinal;
          this.fechaFinalDate = this.stringToDate(state.fechaFinal);
        }
        if (state.nroPedido) this.nroPedido = state.nroPedido;
        if (state.quickFilters) {
          this.quickFilters = { ...this.quickFilters, ...state.quickFilters };
        }

        // Auto-open filters if there are active filters
        if (this.hasActiveFilters()) {
          this.showFilters = true;
        }
      } catch (e) {
        console.error("Error loading filters state", e);
        this.showFilters = false;
      }
    }

    // Ensure Date objects are always initialized even if no saved state
    // or if saved state doesn't have dates
    if (!this.fechaInicialDate && this.fechaInicial) {
      this.fechaInicialDate = this.stringToDate(this.fechaInicial);
    }
    if (!this.fechaFinalDate && this.fechaFinal) {
      this.fechaFinalDate = this.stringToDate(this.fechaFinal);
    }
  }

  private saveFiltersState(): void {
    const state = {
      showFilters: this.showFilters,
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      nroPedido: this.nroPedido,
      quickFilters: { ...this.quickFilters },
      timestamp: new Date().getTime(),
    };
    localStorage.setItem("ventasFiltersState", JSON.stringify(state));
  }

  // Auto-abrir filtros cuando se aplicen filtros rápidos
  setQuickFilter(type: "estadoPago" | "estadoProceso", value: string): void {
    this.quickFilters[type] = value;
    // Abrir filtros si se aplica un filtro
    if (value !== "all" && !this.showFilters) {
      this.showFilters = true;
    }
    this.refrescarDatos();
    this.saveFiltersState();
  }

  // ==================== BODEGAS ====================
  private cargarBodegas(): void {
    this.bodegaService.getBodegasByChannelName("Venta Asistida").subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
      },
      error: () => {
        console.error("Error cargando bodegas");
      },
    });
  }

  onWarehouseChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
    const selected = this.bodegas.find((b) => b.idBodega === selectedId);

    if (selected) {
      this.selectedWarehouse = selected;

      if (this.recompraCmp) {
        // Pasar objeto completo de bodega para mantener formato de filtro en e-commerce (igual que Crear-Ventas)
        this.recompraCmp.bodega = selected;
        if (typeof this.recompraCmp.filtrarProductos === "function") {
          this.recompraCmp.filtrarProductos();
        }
      }
    } else {
      this.selectedWarehouse = null;
    }
  }

  // === Maneja el evento citySelected proveniente de app-ecomerce-products ===
  onCitySelect(ciudad: any): void {
    if (ciudad && ciudad !== "seleccione") {
      this.ciudadSeleccionada = ciudad;
    } else {
      this.ciudadSeleccionada = "";
    }
  }

  onPrintProduct(event: { pedido: any; producto: any }) {
    console.log(
      "Imprimir producto:",
      event.producto,
      "del pedido:",
      event.pedido,
    );
    // Aquí puedes llamar a la lógica de impresión específica por producto
  }

  // ==================== NUEVOS MÉTODOS PARA DISEÑO MINIMALISTA ====================

  /**
   * Alterna la visibilidad del panel de filtros avanzados
   */
  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  /**
   * Maneja el cambio en el preset de fecha seleccionado
   */
  onDatePresetChange(value: string): void {
    if (value) {
      this.setDateRange(value);
      this.selectedDatePreset = "";
    }
  }

  /**
   * Maneja el cambio en el estado de pago seleccionado
   */
  onEstadoPagoChange(): void {
    this.refrescarDatos();
    this.saveFiltersState();
  }

  /**
   * Maneja el cambio en el estado de proceso seleccionado
   */
  onEstadoProcesoChange(): void {
    this.refrescarDatos();
    this.saveFiltersState();
  }

  /**
   * Maneja el cambio en el campo de búsqueda con debounce
   */
  onSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.searchSubject.next(value);
  }

  /**
   * Formatea una fecha para mostrar en los tags de filtros
   */
  formatDateForDisplay(dateString: string | Date): string {
    if (!dateString) return "";
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  /**
   * Obtiene la clase CSS para un estado específico
   */
  getStatusClass(status: string, type: "pago" | "proceso"): string {
    if (type === "pago") {
      switch (status) {
        case "Aprobado":
          return "status-success";
        case "Pendiente":
        case "Pospendiente":
          return "status-warning";
        case "PreAprobado":
          return "status-info";
        case "Rechazado":
        case "Precancelado":
        case "Cancelado":
          return "status-danger";
        default:
          return "status-secondary";
      }
    } else {
      switch (status) {
        case "Entregado":
          return "status-success";
        case "Despachado":
        case "ParaDespachar":
          return "status-warning";
        case "EnProduccion":
        case "ProducidoParcialmente":
        case "ProducidoTotalmente":
          return "status-info";
        case "Empacado":
          return "status-primary";
        case "Rechazado":
          return "status-danger";
        case "Cerrado":
          return "status-dark";
        default:
          return "status-secondary";
      }
    }
  }

  /**
   * Convert string date (YYYY-MM-DD) to Date object
   */
  private stringToDate(dateString: string): Date {
    if (!dateString) return null;
    const parts = dateString.split("-");
    if (parts.length === 3) {
      // Create date at noon to avoid timezone issues
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        12,
        0,
        0,
      );
    }
    return null;
  }

  /**
   * Convert Date object to string (YYYY-MM-DD)
   */
  private dateToString(date: Date): string {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  /**
   * Sync Date objects with string values
   */
  private syncDatesToStrings(): void {
    this.fechaInicial = this.dateToString(this.fechaInicialDate);
    this.fechaFinal = this.dateToString(this.fechaFinalDate);
  }

  /**
   * Maneja el evento de cambio de fecha inicial
   */
  onDateFromChange(date: Date | null): void {
    // Handle clear event
    if (!date) {
      this.fechaInicialDate = null;
      this.fechaInicial = "";
      this.selectedDatePreset = "";
      this.saveFiltersState();
      return;
    }

    // Set the date for the calendar component
    this.fechaInicialDate = date;

    // Create a new date at start of day for the filter
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    this.fechaInicial = this.dateToString(startDate);

    // Ensure end date is not before start date
    if (this.fechaFinalDate && this.fechaFinalDate < date) {
      this.fechaFinalDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      this.fechaFinal = this.dateToString(endDate);
    }

    // Clear date preset when manually selecting dates
    this.selectedDatePreset = "";

    this.saveFiltersState();
  }

  /**
   * Maneja el evento de cambio de fecha final
   */
  onDateToChange(date: Date | null): void {
    // Handle clear event
    if (!date) {
      this.fechaFinalDate = null;
      this.fechaFinal = "";
      this.selectedDatePreset = "";
      this.saveFiltersState();
      return;
    }

    // Set the date for the calendar component
    this.fechaFinalDate = date;

    // Create a new date at end of day for the filter
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    this.fechaFinal = this.dateToString(endDate);

    // Ensure start date is not after end date
    if (this.fechaInicialDate && this.fechaInicialDate > date) {
      this.fechaInicialDate = new Date(date);
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      this.fechaInicial = this.dateToString(startDate);
    }

    // Clear date preset when manually selecting dates
    this.selectedDatePreset = "";

    this.saveFiltersState();
  }

  onOptionsProduccion(event: { pedido: any; producto: any }) {
    this.selectedOrder = event.pedido;
    this.productoSeleccionado = event.producto;
    this.openOptionsModal(event.pedido, event.producto);
  }

  checkIfUserIsBrenda(): boolean {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    const allowedEmails = [
      "brendazora@almara.com.co",
      "gerencia@almara.com.co",
    ];
    return allowedEmails.includes(userData.email);
  }

  marcarComoRevisado(order: Pedido): void {
    if (!order) return;

    // Lógica condicional para el cambio de estado
    if (order.estadoProceso === EstadoProceso.SinProducir) {
      // Solo cambiar a EnProduccion si está sin producir
      order.estadoProceso = EstadoProceso.EnProduccion;
    }
    // Si está en EnProduccion, ProducidoParcialmente o ProducidoTotalmente, mantener el estado actual

    // Agregar texto "Revisado" en lugar de fecha
    order.revisadoParaProduccion = "Revisado";

    // Guardar cambios
    this.ventasService.editOrder(order).subscribe({
      next: () => {
        const mensaje =
          order.estadoProceso === EstadoProceso.EnProduccion
            ? "Pedido marcado como revisado y enviado a producción"
            : "Pedido marcado como revisado";
        this.toastrService.success(mensaje, "Éxito");
        this.refrescarDatos();
      },
      error: (error) => {
        console.error("Error al marcar como revisado:", error);
        this.toastrService.error("Error al marcar como revisado", "Error");
      },
    });
  }

  quitarRevision(order: Pedido): void {
    if (!order || !order.revisadoParaProduccion) return;

    // Confirmar acción
    if (confirm("¿Está seguro de quitar la revisión de este pedido?")) {
      // Quitar revisión - dejar en blanco
      order.revisadoParaProduccion = "";

      // Mantener el estado de proceso actual - NO modificar estadoProceso

      // Guardar cambios
      this.ventasService.editOrder(order).subscribe({
        next: () => {
          this.toastrService.success(
            "Revisión removida correctamente",
            "Éxito",
          );
          this.refrescarDatos();
        },
        error: (error) => {
          console.error("Error al quitar revisión:", error);
          this.toastrService.error("Error al quitar revisión", "Error");
        },
      });
    }
  }

  isOrderRevisado(order: Pedido): boolean {
    return order?.revisadoParaProduccion && order.revisadoParaProduccion !== ""
      ? true
      : false;
  }

  /**
   * Duplica un pedido: clona los datos relevantes, reinicia estados e identificadores
   * y lo guarda como un nuevo pedido en la base de datos.
   */
  duplicarPedido(order: Pedido): void {
    if (!order) {
      this.toastrService.error("Pedido inválido", "Error");
      return;
    }

    // Mostrar confirmación antes de duplicar
    Swal.fire({
      title: "¿Duplicar pedido?",
      text: `¿Está seguro de que desea duplicar el pedido ${order.nroPedido}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, duplicar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarDuplicacion(order);
      }
    });
  }

  /**
   * Procesa la duplicación del pedido después de la confirmación
   */
  private procesarDuplicacion(order: Pedido): void {
    try {
      const empresaActual = JSON.parse(
        localStorage.getItem("currentCompany") || "{}",
      );
      const companyNom: string =
        empresaActual?.nomComercial ||
        (order.company as unknown as string) ||
        "";

      // Clonar profundamente el pedido seleccionado
      const cloned: Pedido = JSON.parse(JSON.stringify(order));

      // Limpiar identificadores y campos que no deben heredarse
      delete (cloned as any)._id;
      delete (cloned as any).transaccionId;
      delete (cloned as any).shippingOrder;
      (cloned as any).nroShippingOrder = "";
      cloned.referencia = "";
      cloned.nroFactura = "";
      cloned.fechaFactura = "";
      cloned.fechaCreacion = new Date().toISOString();
      cloned.company = companyNom as any;

      // Limpiar campos de facturación electrónica
      (cloned as any).pdfUrlInvoice = "";
      (cloned as any).generarFacturaElectronica = undefined;

      // Reiniciar estados y datos de seguimiento/logística
      cloned.estadoPago = EstadoPago.Pendiente;
      cloned.estadoProceso = EstadoProceso.SinProducir;
      cloned.PagosAsentados = [];
      cloned.anticipo = 0;
      cloned.faltaPorPagar = undefined as any;

      // Limpiar campos adicionales de pagos
      (cloned as any).pagoRecibido = undefined;
      (cloned as any).cambioEntregado = undefined;
      (cloned as any).pagoInformation = undefined;

      (cloned as any).empacador = "";
      (cloned as any).despachador = undefined;
      (cloned as any).entregado = undefined;
      (cloned as any).transportador = undefined;
      (cloned as any).fechaYHorarioDespachado = "";
      (cloned as any).fechaHoraEmpacado = "";
      cloned.validacion = false;

      // Limpiar campos de producción
      (cloned as any).revisadoParaProduccion = undefined;
      (cloned as any).ultimaImpresion = undefined;
      (cloned as any).historialEstadoProceso = [];
      (cloned as any).preAprobadoManual = undefined;

      // Limpiar campos de entrega y evidencias
      (cloned as any).fotosEvidencia = [];
      (cloned as any).fotoEvidencia = "";
      (cloned as any).fotoEvidenciaEmpacado = [];
      (cloned as any).signatureImage = "";
      (cloned as any).quienRecibio = "";
      (cloned as any).parentesco = "";
      (cloned as any).providerShipment = "";
      (cloned as any).notasEntregaMensajero = "";

      // Limpiar campos de tracking y shipping
      (cloned as any).shippment = undefined;
      (cloned as any)._estadoCalculadoEnFrontend = undefined;

      // Limpiar integraciones externas (WooCommerce, Shopify)
      (cloned as any).integrations = undefined;

      // Mantener las notas del pedido original (ya no se limpian)

      // Mantener las notas de producción de productos individuales en el carrito

      // Resetear estados de proceso por producto en el carrito
      if (cloned.carrito && Array.isArray(cloned.carrito)) {
        cloned.carrito.forEach((item: any) => {
          if (item.estadoProcesoProducto) {
            item.estadoProcesoProducto = EstadoProceso.SinProducir;
          }
        });
      }

      // Recalcular totales
      this.pedidoUtilService.pedido = cloned as any;
      cloned.subtotal = this.pedidoUtilService.getSubtotal();
      cloned.totalImpuesto = this.pedidoUtilService.checkIVAPrice();
      cloned.totalEnvio = cloned.totalEnvio || 0;
      cloned.totalDescuento = cloned.totalDescuento || 0;
      cloned.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(
        Number(cloned.totalEnvio || 0),
      );

      // Obtener el siguiente consecutivo y crear el pedido duplicado
      this.ventasService.getNextRef(companyNom).subscribe({
        next: (res: any) => {
          const texto = companyNom?.toString?.() || "";
          const ultimasLetras = texto.substring(Math.max(0, texto.length - 3));
          const nextConsecutive = (res?.nextConsecutive ?? res ?? 0)
            .toString()
            .padStart(6, "0");
          cloned.nroPedido = `${ultimasLetras}-${nextConsecutive}`;

          const html = this.paymentService.getHtmlContent(
            cloned,
            this.isFromProduction,
          );
          this.ventasService
            .createOrder({ order: cloned, emailHtml: html })
            .subscribe({
              next: () => {
                this.toastrService.success(
                  "Pedido duplicado correctamente",
                  "Éxito",
                );
                this.refrescarDatos(true); // Forzar refresco después de duplicar
              },
              error: () => {
                this.toastrService.error(
                  "No se pudo duplicar el pedido",
                  "Error",
                );
              },
            });
        },
        error: () => {
          this.toastrService.error(
            "No se pudo obtener el consecutivo para el nuevo pedido",
            "Error",
          );
        },
      });
    } catch (e) {
      this.toastrService.error(
        "Ocurrió un error al duplicar el pedido",
        "Error",
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Verifica las preferencias del carrito antes de abrir el modal
   */
  private verifyCartPreferences(carritoConfiguracion: Carrito): void {
    console.log("🔍 Verificando preferencias del carrito:", {
      carrito: carritoConfiguracion,
      configuracion: carritoConfiguracion?.configuracion,
      preferencias: carritoConfiguracion?.configuracion?.preferencias,
      cantidadPreferencias:
        carritoConfiguracion?.configuracion?.preferencias?.length || 0,
    });

    if (carritoConfiguracion?.configuracion?.preferencias) {
      carritoConfiguracion.configuracion.preferencias.forEach(
        (pref: any, index: number) => {
          console.log(`📋 Preferencia ${index + 1} del carrito:`, {
            titulo: pref.titulo,
            tipo: pref.tipo,
            subtitulo: pref.subtitulo,
            valorUnitarioSinIva: pref.valorUnitarioSinIva,
          });
        },
      );
    } else {
      console.warn("⚠️ No hay preferencias en la configuración del carrito");
    }
  }

  // ========================================================================
  // NUEVO: Sistema de Historial de Estados
  // ========================================================================
  // Creado: 2025-10-21
  // NO MODIFICA ninguna funcionalidad existente - Solo agrega nueva

  // Propiedades para el modal de historial
  showHistoryModal: boolean = false;
  currentOrderHistory: any[] = [];
  loadingHistory: boolean = false;
  currentOrderForHistory: Pedido | null = null;
  historyError: string | null = null;

  /**
   * Abre el modal de historial de una orden
   * @param pedido - Pedido del cual ver el historial
   */
  verHistorialPedido(pedido: Pedido): void {
    if (!pedido || !pedido._id) {
      this.toastrService.error(
        "No se puede ver el historial de este pedido",
        "Error",
      );
      return;
    }

    console.log("📜 Abriendo historial para pedido:", pedido.nroPedido);

    this.currentOrderForHistory = pedido;
    this.currentOrderHistory = [];
    this.historyError = null;
    this.showHistoryModal = true;
    this.loadingHistory = true;

    // Consultar historial
    this.ventasService.getOrderHistory(pedido._id).subscribe({
      next: (response) => {
        this.loadingHistory = false;

        if (response.success) {
          this.currentOrderHistory = response.history || [];
          console.log(
            `✅ Historial cargado: ${this.currentOrderHistory.length} registros`,
          );

          if (this.currentOrderHistory.length === 0) {
            this.toastrService.info(
              "No hay cambios de estado registrados para este pedido",
              "Sin historial",
            );
          }
        } else {
          this.historyError =
            response.error || "No se pudo cargar el historial";
          this.toastrService.error(this.historyError, "Error");
        }
      },
      error: (error) => {
        this.loadingHistory = false;
        console.error("❌ Error cargando historial:", error);
        this.historyError =
          error.error?.error || error.message || "Error desconocido";
        this.toastrService.error(
          "No se pudo cargar el historial del pedido",
          "Error",
        );
      },
    });
  }

  /**
   * Cierra el modal de historial
   */
  cerrarHistorialModal(): void {
    this.showHistoryModal = false;
    this.currentOrderForHistory = null;
    this.currentOrderHistory = [];
    this.historyError = null;
  }

  /**
   * Limpia notas de producción huérfanas de un pedido.
   * Las notas huérfanas son aquellas que referencian productos que ya no existen en el carrito.
   * @param pedido Pedido a limpiar
   */
  limpiarNotasHuerfanasPedido(pedido: Pedido) {
    if (!pedido) {
      this.toastrService.warning('No se seleccionó un pedido', 'Aviso');
      return;
    }

    const notasProduccion = pedido.notasPedido?.notasProduccion;
    if (!notasProduccion || notasProduccion.length === 0) {
      this.toastrService.info(
        'Este pedido no tiene notas de producción.',
        'Sin notas'
      );
      return;
    }

    const productosCarrito = pedido.carrito || [];

    // Recolectar todos los identificadores de los productos actuales del carrito
    const identificadoresCarrito = new Set<string>();
    const titulosCarrito = new Set<string>();
    const cdsCarrito = new Set<string>();
    const bodegaIdsCarrito = new Set<string>();

    productosCarrito.forEach((item) => {
      const ref = item.producto?.identificacion?.referencia;
      const titulo = item.producto?.crearProducto?.titulo;
      const cd = item.producto?.cd || (item.producto?.crearProducto as any)?.cd;
      const bodegaId = item.producto?.bodegaId;

      if (ref) identificadoresCarrito.add(ref);
      if (titulo) titulosCarrito.add(titulo);
      if (cd) cdsCarrito.add(cd);
      if (bodegaId) bodegaIdsCarrito.add(bodegaId);
    });

    // Identificar notas huérfanas usando la misma estrategia jerárquica que notas.component
    const notasHuerfanas: any[] = [];
    const notasValidas: any[] = [];

    notasProduccion.forEach((nota: any) => {
      let perteneceAProductoExistente = false;

      // 1. Si la nota tiene productoId, verificar si existe en el carrito
      if (nota.productoId) {
        perteneceAProductoExistente = identificadoresCarrito.has(nota.productoId);
      }
      // 2. Si tiene productoCD, verificar
      else if (nota.productoCD) {
        perteneceAProductoExistente = cdsCarrito.has(nota.productoCD);
      }
      // 3. Si tiene productoBodegaId + producto (título), verificar ambos
      else if (nota.productoBodegaId && nota.producto) {
        perteneceAProductoExistente =
          bodegaIdsCarrito.has(nota.productoBodegaId) &&
          titulosCarrito.has(nota.producto);
      }
      // 4. Si solo tiene título (producto), verificar
      else if (nota.producto) {
        perteneceAProductoExistente = titulosCarrito.has(nota.producto);
      }
      // 5. Notas sin ningún identificador de producto se consideran huérfanas
      //    solo si el carrito tiene productos (para no borrar notas genéricas en pedidos vacíos)
      else if (productosCarrito.length > 0) {
        // Nota sin ningún identificador - no se puede vincular, se marca como huérfana
        perteneceAProductoExistente = false;
      } else {
        // Pedido sin productos, conservar la nota
        perteneceAProductoExistente = true;
      }

      if (perteneceAProductoExistente) {
        notasValidas.push(nota);
      } else {
        notasHuerfanas.push(nota);
      }
    });

    if (notasHuerfanas.length === 0) {
      this.toastrService.info(
        'No se encontraron notas huérfanas en este pedido. Todas las notas corresponden a productos existentes.',
        'Sin notas huérfanas'
      );
      return;
    }

    // Mostrar detalle de las notas huérfanas encontradas
    const detalleNotas = notasHuerfanas
      .map((n: any) => `- "${n.descripcion || n.nota || 'Sin texto'}" (Producto: ${n.producto || n.productoId || 'Desconocido'})`)
      .join('\n');

    Swal.fire({
      title: `Se encontraron ${notasHuerfanas.length} nota(s) huérfana(s)`,
      html: `<p>Las siguientes notas de producción no están vinculadas a ningún producto actual del pedido <b>${pedido.nroPedido || ''}</b>:</p>
             <div style="text-align:left; max-height:200px; overflow-y:auto; font-size:0.85em; background:#f8f9fa; padding:10px; border-radius:5px;">
               ${notasHuerfanas.map((n: any) =>
                 `<div style="margin-bottom:6px; padding:4px; border-bottom:1px solid #dee2e6;">
                    <b>${n.producto || n.productoId || 'Producto desconocido'}</b><br>
                    <span>${n.descripcion || n.nota || 'Sin texto'}</span>
                    ${n.archivos?.length ? '<br><small>(' + n.archivos.length + ' archivo(s) adjunto(s))</small>' : ''}
                  </div>`
               ).join('')}
             </div>
             <p class="mt-2">Notas válidas que se conservarán: <b>${notasValidas.length}</b></p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: `Sí, eliminar ${notasHuerfanas.length} nota(s)`,
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        // Reemplazar con solo las notas válidas
        pedido.notasPedido!.notasProduccion = notasValidas;

        // Guardar el pedido
        this.editOrder(pedido);

        this.toastrService.success(
          `Se eliminaron ${notasHuerfanas.length} nota(s) huérfana(s) del pedido ${pedido.nroPedido || ''}.`,
          'Notas limpiadas'
        );

        console.log(`🧹 Notas huérfanas eliminadas del pedido ${pedido.nroPedido}:`, {
          eliminadas: notasHuerfanas.length,
          conservadas: notasValidas.length,
          detalle: notasHuerfanas,
        });
      }
    });
  }
}
