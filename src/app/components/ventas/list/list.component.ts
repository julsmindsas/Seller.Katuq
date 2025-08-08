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
} from "@angular/core";
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
import { FilterService } from "primeng/api";
import { ServiciosService } from "../../../shared/services/servicios.service";
import { MaestroService } from "../../../shared/services/maestros/maestro.service";
import { BodegaService } from "../../../shared/services/bodegas/bodega.service";
import { ToastrService } from "ngx-toastr";
import { LoaderService } from "../../../shared/services/loader.service";

import { ColumnDefinition } from "../interfaces/column-definition.interface";
import * as XLSX from "xlsx";
import { EcomerceProductsComponent } from "../catalogo/ecomerce-products/ecomerce-products.component";
import { PedidoEntrega } from "../../despachos/interfaces/pedido-entrega.interface";
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: "app-list-orders",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
})
export class ListOrdersComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("clientes", { static: false }) clientes: ClientesComponent;
  @ViewChild("entrega", { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild("htmlPdf", { static: true }) htmlPdf: ElementRef;

  @ViewChild("fechaInicialCtrl", { static: false })
  fechaInicialCtrl: ElementRef;
  @ViewChild("fechaFinalCtrl", { static: false }) fechaFinalCtrl: ElementRef;

  @Output() producirPedido = new EventEmitter<Pedido>();
  @ViewChild("dt1") table: Table;
  @Input() isFromProduction: boolean = false;
  orders: Pedido[] = [];
  loading: boolean = true;
  totalValorProductoBruto: number;
  totalDescuento: number;
  htmlModal: any;
  clienteSeleccionado: Cliente;
  formulario: any;
  pedidoSeleccionado: Pedido;
  estadosPago = Object.values(EstadoPago);
  ciudadSeleccionada: any;

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

  ngAfterViewInit() {
    // Limpiar funciones del menú anterior
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

  openOptionsModal(order: any, producto?: any) {
    this.scrollStack.push(window.scrollY);

    // Capturar scroll de la tabla si existe
    const tableElement = document.querySelector('.p-datatable-scrollable-body');
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
          const tableElement = document.querySelector('.p-datatable-scrollable-body');
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
      EstadoProcesoFiltros.Despachado
    ];

    const estadosGrupo2 = [
      EstadoProcesoFiltros.Entregado,
      EstadoProcesoFiltros.Cerrado
    ];

    return estadosGrupo1.includes(order.estadoProceso as unknown as EstadoProcesoFiltros) ||
           estadosGrupo2.includes(order.estadoProceso as unknown as EstadoProcesoFiltros);
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
      EstadoProcesoFiltros.Despachado
    ];

    return estadosGrupo1.includes(order.estadoProceso as unknown as EstadoProcesoFiltros);
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
      EstadoProcesoFiltros.Cerrado
    ];

    return estadosGrupo2.includes(order.estadoProceso as unknown as EstadoProcesoFiltros);
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
   * Verifica si se pueden editar notas de producción
   * Solo se pueden editar si NO está en GRUPO 1
   * @param order Pedido a verificar
   * @returns true si se pueden editar notas de producción
   */
  canEditProductionNotes(order: Pedido): boolean {
    return !this.isPedidoGrupo1(order);
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
   * Verifica si se puede editar el estado de pago
   * Solo administradores pueden modificar estados de pago
   * @param order Pedido a verificar
   * @returns true si se puede editar estado de pago
   */
  canEditPaymentStatus(order: Pedido): boolean {
    return this.canDeleteOrder(); // Solo administradores
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
    return this.canDeleteOrder();
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
    return !bloqueados.includes(order.estadoProceso as unknown as EstadoProcesoFiltros);
  }

  /** Devuelve estados de pago disponibles según permisos (usuarios normales: Pendiente, PreAprobado) */
  getAvailablePaymentStates(): EstadoPago[] {
    if (this.canDeleteOrder()) {
      return this.estadosPago as EstadoPago[];
    }
    return [EstadoPago.Pendiente, EstadoPago.PreAprobado];
  }

  /**
   * Verifica si se puede asignar un asesor diferente
   * Solo administradores pueden asignar asesores
   * @param order Pedido a verificar
   * @returns true si se puede asignar asesor
   */
  canAssignSeller(order: Pedido): boolean {
    return this.canDeleteOrder(); // Solo administradores
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
  fechaInicial: string;
  fechaFinal: string;
  estadosProcesos: EstadoProcesoFiltros[];
  validaciones: { value: boolean; nombre: string }[];
  numberProduct: string;
  filteredOrderNumbers: any;
  ordenes: any;
  ordersByName: any;
  searchQuery: string = '';
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

  selectedColumns: ColumnDefinition[] = [];

  // Configuración de columnas específica para producción
  displayedColumnsProduccion: ColumnDefinition[] = [
    { field: "producto", header: "Producto", visible: true, type: "text", filterable: true },
    { field: "referencia", header: "Referencia", visible: true, type: "text", filterable: true },
    { field: "ultimaImpresion", header: "Última impresión", visible: true, type: "date", filterable: false },
    { field: "nroPedido", header: "# Pedido", visible: true, type: "text", filterable: true },
    { field: "cantidad", header: "Cantidad", visible: true, type: "text", filterable: true },
    { field: "cliente", header: "Cliente", visible: true, type: "text", filterable: true },
    { field: "estadoPago", header: "Estado de Pago", visible: true, type: "status", filterable: true },
    { field: "estadoProceso", header: "Estado de Proceso", visible: true, type: "status", filterable: true },
    { field: "validacion", header: "Validación", visible: false, type: "status", filterable: true },
    { field: "totalPedidoSinDescuento", header: "Valor Bruto", visible: false, type: "currency", filterable: true },
    { field: "totalDescuento", header: "Descuento", visible: false, type: "currency", filterable: true },
    { field: "totalEnvio", header: "Domicilio", visible: false, type: "currency", filterable: true },
    { field: "subtotal", header: "Subtotal", visible: false, type: "currency", filterable: true },
    { field: "totalImpuesto", header: "IVA", visible: false, type: "currency", filterable: true },
    { field: "totalPedididoConDescuento", header: "Total", visible: false, type: "currency", filterable: true },
    { field: "anticipo", header: "Anticipo", visible: false, type: "currency", filterable: true },
    { field: "faltaPorPagar", header: "Falta por Pagar", visible: false, type: "currency", filterable: true },
    { field: "fechaEntrega", header: "Fecha Entrega", visible: false, type: "date", filterable: true },
    { field: "fechaCreacion", header: "Fecha de compra", visible: false, type: "date", filterable: true },
    { field: "ciudad", header: "Ciudad", visible: false, type: "text", filterable: true },
    { field: "zonaCobro", header: "Zona de Entrega", visible: false, type: "text", filterable: true },
    { field: "formaEntrega", header: "Forma de Entrega", visible: false, type: "text", filterable: true },
    { field: "horarioEntrega", header: "Horario de Entrega", visible: false, type: "text", filterable: true },
    { field: "channel", header: "Canal", visible: false, type: "text", filterable: true },
    { field: "vendedor", header: "Vendedor", visible: false, type: "text", filterable: true }
  ];
  selectedColumnsProduccion: ColumnDefinition[] = [];

  showColumnConfig: boolean = false;
  showFilters: boolean = false;
  nroPedido: any;

  // Filtros rápidos
  quickFilters = {
    estadoPago: "all",
    estadoProceso: "all",
  };

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private service: ServiciosService,
    private route: ActivatedRoute,
    private filterService: FilterService,
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private maestroService: MaestroService,
    private bodegaService: BodegaService,
    private toastrService: ToastrService,
    private loaderService: LoaderService,
  ) {
    this.registerCustomFilters();
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

    this.fechaInicial = new Date().toISOString().split("T")[0];
    this.fechaFinal = new Date().toISOString().split("T")[0];

    this.UserLogged = JSON.parse(localStorage.getItem("user")!) as UserLogged;

    this.cargando = false;

    // Cargar listado de bodegas disponibles para el modal de recompra
    this.cargarBodegas();
  }

  /**
   * Configura el debounce para la búsqueda
   */
  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(this.searchDebounceTime),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      console.log('Debounce ejecutado con query:', query);
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

    // Validar longitud mínima (reducir a 1 para ser más flexible)
    if (query.trim().length < 1) {
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
    this.ventasService.getOrdersByNroPedido(trimmedQuery).subscribe({
      next: (res: any) => {
        // Asegurar que la respuesta sea un array
        const results = Array.isArray(res) ? res : (res ? [res] : []);
        this.filteredOrderNumbers = results;
        this.ordersByName = results;
        this.isSearching = false;
        this.searchError = null;
      },
      error: (err) => {
        // Fallback al servicio original si el nuevo falla
        this.service.getOrderByName(trimmedQuery).then((res: any) => {
          const results = Array.isArray(res) ? res : (res ? [res] : []);
          this.filteredOrderNumbers = results;
          this.ordersByName = results;
          this.isSearching = false;
          this.searchError = null;
        }).catch((fallbackErr: any) => {
          this.searchError = 'Error al buscar pedido. Intente nuevamente.';
          this.filteredOrderNumbers = [];
          this.ordersByName = [];
          this.isSearching = false;
          this.toastrService.error(this.searchError, 'Error de Búsqueda');
        });
      }
    });
  }

  /**
   * Maneja la entrada de texto en el campo de búsqueda
   */
  onSearchInput(event: any): void {
    const query = event.target.value;
    this.searchQuery = query;

    // Validar entrada
    if (!query || typeof query !== 'string') {
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
      this.toastrService.warning('Pedido inválido seleccionado', 'Advertencia');
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
      'Pedido Encontrado'
    );

    // Limpiar errores de búsqueda
    this.searchError = null;
  }

  /**
   * Limpia el filtro de búsqueda
   */
  clearSearchFilter(): void {
    this.nroPedido = null;
    this.searchQuery = '';
    this.filteredOrderNumbers = [];
    this.ordersByName = [];
    this.searchError = null;
    this.isSearching = false;
    this.showSuggestions = false;
    this.refrescarDatos();
    this.saveFiltersState();

    // Mostrar notificación
    this.toastrService.info('Filtro de búsqueda limpiado', 'Filtro Limpiado');
  }

  /**
   * Obtiene el estado de búsqueda para mostrar en la UI
   */
  getSearchStatus(): { isSearching: boolean; hasError: boolean; errorMessage: string | null } {
    return {
      isSearching: this.isSearching,
      hasError: !!this.searchError,
      errorMessage: this.searchError
    };
  }

  /**
   * Verifica si hay una búsqueda activa
   */
  hasActiveSearch(): boolean {
    return this.isSearching || !!this.searchError || (this.filteredOrderNumbers && this.filteredOrderNumbers.length > 0);
  }

  ngOnInit(): void {
    // Initialize default date range if not set
    if (!this.fechaInicial || !this.fechaFinal) {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      this.fechaInicial = this.fechaInicial || thirtyDaysAgo.toISOString().split('T')[0];
      this.fechaFinal = this.fechaFinal || today.toISOString().split('T')[0];
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
          estado === EstadoProcesoFiltros.ProducidoTotalmente
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

    if (!this.numberProduct) {
      this.refrescarDatos();
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

  checkPriceScale(pedido) {
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0;
    pedido.carrito.map((itemCarrito) => {
      if (itemCarrito?.producto?.precio?.preciosVolumen?.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.map((x) => {
          if (
            itemCarrito.cantidad >= x.numeroUnidadesInicial &&
            itemCarrito.cantidad <= x.numeroUnidadesLimite
          ) {
            totalPrecioSinIVA =
              x.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
          } else {
            totalPrecioSinIVA =
              itemCarrito.producto?.precio?.precioUnitarioSinIva *
              itemCarrito.cantidad;
          }
        });
      } else {
        totalPrecioSinIVA =
          itemCarrito.producto?.precio?.precioUnitarioSinIva *
          itemCarrito.cantidad;
      }

      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion) => {
          try {
            if (adicion["referencia"]["precioUnitario"]) {
              totalPrecioSinIVA +=
                adicion["cantidad"] *
                (adicion["referencia"]["precioUnitario"] ?? 1) *
                itemCarrito.cantidad;
            }
          } catch (error) {
            console.log("Pedido: ", adicion);
          }
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia) => {
          totalPrecioSinIVA +=
            preferencia["valorUnitarioSinIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioSinIVADef += totalPrecioSinIVA;
    });

    return totalPrecioSinIVADef;
  }

  checkIVAPrice(pedido) {
    let totalPrecioIVA = 0;
    let totalPrecioIVADef = 0;
    pedido.carrito.forEach((itemCarrito) => {
      if (itemCarrito?.producto?.precio?.preciosVolumen?.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.forEach((x) => {
          if (
            itemCarrito.cantidad >= x.numeroUnidadesInicial &&
            itemCarrito.cantidad <= x.numeroUnidadesLimite
          ) {
            totalPrecioIVA =
              x.valorUnitarioPorVolumenIva * itemCarrito.cantidad;
          } else {
            totalPrecioIVA =
              itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
          }
        });
      } else {
        totalPrecioIVA =
          itemCarrito.producto?.precio?.valorIva * itemCarrito.cantidad;
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach((adicion) => {
          try {
            if (adicion["referencia"]["precioIva"])
              totalPrecioIVA +=
                adicion["cantidad"] *
                adicion["referencia"]["precioIva"] *
                itemCarrito.cantidad;
          } catch (error) { }
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach((preferencia) => {
          totalPrecioIVA += preferencia["valorIva"] * itemCarrito.cantidad;
        });
      }
      totalPrecioIVADef += totalPrecioIVA;
    });

    return totalPrecioIVADef;
  }

  private registerCustomFilters() {
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

    this.filterService.register("customDate", (value, filter): boolean => {
      if (filter === undefined || filter === null) {
        return true;
      }

      if (value === undefined || value === null) {
        return false;
      }

      // const valueTransformed = value.toString().split(' - ')

      // const result = valueTransformed.some((element) => {
      //   if (!/(\d{2})\/(\d{2})\/(\d{4})/.test(element)) {
      //     return false;
      //   }

      //   // Convertir valores a Date para comparación
      //   // const filterDate = new Date(filter.split('/').reverse().join('-'));
      //   const valueDate = new Date(element.split('/').reverse().join('-') + 'T00:00:00');
      //   return valueDate.getTime() === filter.getTime();

      // });
      return new Date(value).getTime() === filter.getTime();
    });
  }

  refrescarDatos() {
    // Ensure dates are set with fallback to today
    if (!this.fechaInicial || !this.fechaFinal) {
      const today = new Date().toISOString().split('T')[0];
      this.fechaInicial = this.fechaInicial || today;
      this.fechaFinal = this.fechaFinal || today;
    }

    const filter: any = {
      fechaInicial: this.fechaInicial + "T00:00:00.0000Z",
      fechaFinal: this.fechaFinal + "T23:59:59.9999Z",
      company: JSON.parse(localStorage.getItem("currentCompany")!)
        .nomComercial,
      tipoFecha: "fechaEntrega",
      estadoProceso: this.isFromProduction
        ? [EstadoProceso.SinProducir, EstadoProceso.EnProduccion, EstadoProceso.ProducidoParcialmente, EstadoProceso.ParaDespachar]
        : ["Todos"],
    };

    // Apply quick filters for payment status
    if (this.quickFilters.estadoPago !== "all") {
      filter.estadosPago = [this.quickFilters.estadoPago];
    }

    // Apply quick filters for process status (fixed logic)
    if (this.quickFilters.estadoProceso !== "all") {
      if (this.isFromProduction) {
        // For production view, still allow process filtering but maintain production states
        const productionStates = [EstadoProceso.SinProducir, EstadoProceso.EnProduccion, EstadoProceso.ProducidoParcialmente, EstadoProceso.ParaDespachar];
        if (productionStates.includes(this.quickFilters.estadoProceso as EstadoProceso)) {
          filter.estadoProceso = [this.quickFilters.estadoProceso];
        }
      } else {
        filter.estadoProceso = [this.quickFilters.estadoProceso];
      }
    }

    // --- AJUSTE: Solo sobreescribir estadosPago por defecto si el filtro rápido está en 'all' ---
    if (this.quickFilters.estadoPago === "all") {
      if (this.isFromProduction) {
        filter['estadosPago'] = ['Pospendiente', 'PreAprobado', 'Aprobado', 'Pendiente', 'Pospendiente'];
      } else {
        // Para modo no producción, incluir todos los estados de pago posibles
        filter['estadosPago'] = ['Pospendiente', 'PreAprobado', 'Aprobado', 'Pendiente', 'Pospendiente', 'Rechazado', 'Precancelado', 'Cancelado'];
      }
    }

    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      console.log(data);
      this.orders = data;

      this.orders.forEach((order: any) => {
        order.totalPedidoSinDescuento = this.checkPriceScale(order);
        order.totalImpuesto = this.checkIVAPrice(order);
        order.subtotal =
          order.totalPedidoSinDescuento +
          order.totalEnvio -
          order.totalDescuento;
        order.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(
          Number(order.totalEnvio || 0),
        );

        // Calcular anticipo basado en PagosAsentados si existen
        if (order.PagosAsentados && order.PagosAsentados.length > 0) {
          order.anticipo = order.PagosAsentados.reduce((acc, pago) => {
            // Para Wompi, verificar que no esté pendiente
            if (
              pago.formaPago?.toLowerCase().includes("wompi") &&
              pago.estadoVerificacion === "Pendiente"
            ) {
              return acc; // No sumar pagos de Wompi pendientes
            }
            // Considerar tanto valor como valorRegistrado
            const valorPago = pago.valor || pago.valorRegistrado || 0;
            return acc + valorPago;
          }, 0);
        } else if (order.anticipo == null || order.anticipo == undefined) {
          order.anticipo = 0;
        }

        // Calcular falta por pagar basado en el total y anticipo real
        order.faltaPorPagar = Math.max(
          0,
          order.totalPedididoConDescuento - order.anticipo,
        );

        // Actualizar estado de pago basado en los cálculos reales
        // SOLO recalcular estado si no viene ya calculado del frontend
        if (
          !order._estadoCalculadoEnFrontend &&
          order.estadoPago !== "Precancelado" &&
          order.estadoPago !== "Cancelado"
        ) {
          if (order.faltaPorPagar <= 0) {
            order.estadoPago = "Aprobado";
          } else if (
            order.faltaPorPagar > 0 &&
            order.faltaPorPagar < order.totalPedididoConDescuento
          ) {
            order.estadoPago = "PreAprobado";
          } else if (order.preAprobadoManual) {
            order.estadoPago = "PreAprobado";
          } else {
            order.estadoPago = "Pendiente";
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
      //   let precioTotalProductosSinIva=0
      //   let precioTotalIVA=0
      //   let precioTotalProductosConIva=0
      //   order.carrito.forEach(producto=>
      //     {
      //       let precioAdicionesSinIva=0
      //       let precioAdicionesConIva=0
      //       let precioIvaAdiciones=0
      //       let precioPreferenciaSinIva=0
      //       let precioPreferenciaConIva=0
      //       let precioIvaPreferencia=0
      //       let precioTotalProductoSinIva=0
      //       let precioIvaProducto=0
      //       let precioTotalProductoConIva=0
      //       if (producto.producto.precio.preciosVolumen.length > 0) {
      //         producto.producto.precio.preciosVolumen.map(x => {
      //           if (producto.cantidad >= x.numeroUnidadesInicial && producto.cantidad <= x.numeroUnidadesLimite) {
      //             precioTotalProductoConIva= x.valorUnitarioPorVolumenConIVA*producto.cantidad
      //             precioTotalProductoSinIva=x.valorUnitarioPorVolumenSinIVA*producto.cantidad
      //             precioIvaProducto=x.valorUnitarioPorVolumenIva*producto.cantidad

      //           }
      //         })
      //       } else {
      //         precioTotalProductoConIva = producto.producto?.precio?.precioUnitarioConIva*producto.cantidad
      //         precioTotalProductoSinIva = producto.producto?.precio?.precioUnitarioSinIva*producto.cantidad
      //         precioIvaProducto=producto.producto?.precio?.valorIva*producto.cantidad
      //       }
      //       producto.configuracion.adiciones.forEach(adicion=>{
      //         precioAdicionesSinIva+=adicion["referencia"].precioUnitario*adicion["cantidad"]*producto.cantidad
      //         precioIvaAdiciones+=adicion["referencia"].precioIva*adicion["cantidad"]*producto.cantidad
      //         precioAdicionesConIva+=adicion["referencia"].precioTotal*adicion["cantidad"]*producto.cantidad
      //       })
      //       producto.configuracion.preferencias.forEach(preferencia=>{
      //         precioPreferenciaSinIva+=preferencia.valorUnitarioSinIva * producto.cantidad
      //         precioIvaPreferencia+=preferencia.valorIva* producto.cantidad
      //         precioPreferenciaConIva+=preferencia.precioTotalConIva * producto.cantidad
      //       })
      //       precioTotalProductosSinIva+=precioTotalProductoSinIva+precioAdicionesSinIva+precioPreferenciaSinIva
      //       precioTotalIVA+=precioIvaProducto+precioIvaAdiciones+precioIvaPreferencia
      //       precioTotalProductosConIva+=precioTotalProductoConIva+precioAdicionesConIva+precioPreferenciaConIva
      //     })
      //     order.totalImpuesto=precioTotalIVA
      //     order.totalPedidoSinDescuento=precioTotalProductosSinIva
      //     order.totalPedididoConDescuento=precioTotalProductosSinIva+order.totalEnvio-order.totalDescuento

      // })
      this.loading = false;
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
    this.refrescarDatos();
    // table.clear();
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
   * Total de pedidos mostrados en la tabla filtrada
   */
  getTotalPedidos(): number {
    return this.getFilteredOrders().length;
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
   * Conteo de pedidos por estado de proceso
   */
  getProcesoCount(proceso: string): number {
    return this.getFilteredOrders().filter(
      (pedido) => pedido.estadoProceso === proceso,
    ).length;
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
   */
  getFilteredCalculateValorBruto(): number {
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalPedidoSinDescuento || 0),
      0,
    );
  }

  /**
   * Total descuento de pedidos filtrados
   */
  getFilteredCalculateDescuento(): number {
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalDescuento || 0),
      0,
    );
  }

  /**
   * Total envío de pedidos filtrados
   */
  getFilteredCalculateEnvio(): number {
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalEnvio || 0),
      0,
    );
  }

  /**
   * Total subtotal de pedidos filtrados
   */
  getFilteredCalculateSubtotal(): number {
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.subtotal || 0),
      0,
    );
  }

  /**
   * Total impuestos (IVA) de pedidos filtrados
   */
  getFilteredCalculateTotalImpuestos(): number {
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalImpuesto || 0),
      0,
    );
  }

  /**
   * Total general de pedidos filtrados
   */
  getFilteredCalculateTotal(): number {
    return this.getFilteredOrders().reduce(
      (acc, pedido: any) => acc + (pedido.totalPedididoConDescuento || 0),
      0,
    );
  }

  /**
   * Total anticipo de pedidos filtrados
   */
  getFilteredCalculateAnticipo(): number {
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
   */
  getFilteredCalculateFaltaPorPagar(): number {
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
    this.scrollStack.push(window.scrollY);
    this.pedidoSeleccionado = order;
    this.htmlModal = this.paymentService.getHtmlContent(
      order,
      this.isFromProduction,
    );

    // Registrar la fecha/hora de impresión solo cuando se usa desde producción
    if (this.isFromProduction) {
      const now = new Date().toISOString();
      order.ultimaImpresion = now;
      this.ventasService.editOrder(order).subscribe({
        next: () => {
          // Opcional: mostrar notificación de éxito
          this.toastrService.success('Fecha de impresión registrada', 'Pedido actualizado');
        },
        error: () => {
          this.toastrService.error('No se pudo actualizar la fecha de impresión', 'Error');
        }
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
          this.htmlModal = null;
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

  produceOrder(order: Pedido) {
    this.producirPedido.emit(order);

    setTimeout(() => {
      this.refrescarDatos();
    }, 1000);
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
      this.toastrService.error('No hay contenido para imprimir', 'Error');
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

    const newWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pedido ${this.pedidoSeleccionado?.nroPedido || 'PDF'}</title>
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
    if (!this.canModifyBasicData(order)) {
      this.toastrService.warning(
        "No se pueden modificar los datos del cliente en pedidos entregados",
        "Pedido No Modificable",
      );
      return;
    }
    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? {} as Cliente;
    this.pedidoSeleccionado = order;
    this.initForms(this.clienteSeleccionado);
    setTimeout(() => {
      const modalRef = this.modalService.open(content, {
        size: "xl",
        scrollable: true,
        centered: true,
        fullscreen: false,
        ariaLabelledBy: "modal-basic-title",
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

      if (
        this.clientes &&
        this.clientes.documentoBusqueda &&
        this.clientes.documentoBusqueda.nativeElement &&
        this.clienteSeleccionado?.documento
      ) {
        console.log(
          "🎯 Inicializando componente clientes con documento:",
          this.clienteSeleccionado.documento,
        );

        // Setear el documento en el campo de búsqueda
        this.clientes.documentoBusqueda.nativeElement.value =
          this.clienteSeleccionado.documento;

        // Llamar directamente al método buscar del componente
        this.clientes.buscar();

        console.log("✅ Componente clientes inicializado correctamente");
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
      }
    };

    inicializar();
  }

  private editOrder(order: Pedido) {
    if (order.carrito && order.carrito.length > 0) {
      const fechaEntrega = order.carrito?.[0]?.configuracion?.datosEntrega?.fechaEntrega;
      const horarioEntrega = order.carrito?.[0]?.configuracion?.datosEntrega?.horarioEntrega;

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
    }

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

  editDatosEntrega(content, order: Pedido) {
    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? {} as Cliente;
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
          this.pedidoUtilService.pedido = order;
          order.totalEnvio = Number(
            this.pedidoUtilService.getShippingCost(this.allBillingZone),
          );
          this.editOrder(order);
        },
      );
  }

  /**
   * Muestra el modal con detalles de entrega para pedidos entregados
   * @param order Pedido entregado del cual mostrar los detalles
   */
  mostrarDetalleEntrega(order: Pedido) {
    // Verificar que el pedido esté en estado "Entregado"
    if (order.estadoProceso !== 'Entregado') {
      this.toastrService.warning(
        'Esta opción solo está disponible para pedidos entregados',
        'Estado inválido'
      );
      return;
    }

    // Convertir Pedido a PedidoEntrega con datos adicionales
    this.pedidoEntregaData = {
      ...order,
      // Datos adicionales que podrían venir del backend
      quienRecibio: order.envio?.nombres || 'No especificado',
      telefono: order.envio?.celular || order.cliente?.numero_celular_comprador,
      fechaRecepcion: order.fechaEntrega || new Date().toISOString(),
      observacionesEntrega: order.notasPedido?.notasEntregas?.[0]?.descripcion || '',
      // Acceso a datos reales de evidencia de entrega
      fotosEvidencia: order.fotosEvidencia || [], // Array de fotos de evidencia
      fotoEvidencia: order.fotoEvidencia || '', // Foto individual de evidencia  
      signatureImage: order.signatureImage || '', // Firma digital
      calificacion: 0
    };

    // Debug: Verificar datos y fotos de evidencia
    console.log('📸 Debug fotos evidencia - Original order:', {
      fotosEvidencia: order.fotosEvidencia,
      fotoEvidencia: order.fotoEvidencia,
      signatureImage: order.signatureImage
    });
    console.log('📸 Debug fotos evidencia - Processed data:', {
      fotosEvidencia: this.pedidoEntregaData?.fotosEvidencia,
      fotoEvidencia: this.pedidoEntregaData?.fotoEvidencia,
      signatureImage: this.pedidoEntregaData?.signatureImage,
      hayFotos: (this.pedidoEntregaData?.fotosEvidencia?.length || 0) > 0 || !!this.pedidoEntregaData?.fotoEvidencia
    });
    console.log('Datos del pedido de entrega:', this.pedidoEntregaData);
    console.log('Mostrando modal con detalleEntregaVisible:', true);

    // Mostrar el modal
    this.detalleEntregaVisible = true;

    // Debug adicional después de 100ms para verificar que el cambio se propague
    setTimeout(() => {
      console.log('Estado después de 100ms - detalleEntregaVisible:', this.detalleEntregaVisible);
      console.log('Estado después de 100ms - pedidoEntregaData:', this.pedidoEntregaData);
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
    console.log('Imagen clickeada:', imageUrl);
  }

  editDatosFacturacion(content, order: Pedido) {
    this.scrollStack.push(window.scrollY);
    this.clienteSeleccionado = order.cliente ?? {} as Cliente;
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
    this.clienteSeleccionado = order.cliente ?? {} as Cliente;
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
    this.clienteSeleccionado = order.cliente ?? {} as Cliente;
    this.pedidoSeleccionado = order;
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

  cambiarEstadoPago(order: Pedido) {
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

  confProductToCart(content, carritoConfiguracion: Carrito, order: Pedido) {
    // Evitar warning de aria-hidden con foco persistente en botones bajo app-root
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === 'function') {
        active.blur();
      }
    } catch {}
    if (!this.canModifyProducts(order)) {
      this.toastrService.warning(
        `No se pueden modificar productos. El pedido está en estado: ${order.estadoProceso}`,
        "Pedido Congelado",
      );
      return;
    }
    this.scrollStack.push(window.scrollY);
    this.configuracionCarritoSeleccionado = carritoConfiguracion;
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
          if (
            configuracionResult == "Cross click"
          ) {
            return;
          }
          if (
            order.carrito &&
            configuracionResult?.producto?.identificacion?.referencia
          ) {
            const index = order.carrito.findIndex(
              (carrito) =>
                carrito.producto &&
                carrito.producto.identificacion &&
                carrito.producto.identificacion.referencia ===
                configuracionResult?.producto?.identificacion?.referencia,
            );
            if (index !== -1) {
              order.carrito[index] = configuracionResult;
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
          if (order.carrito) {
            order.carrito.push(configuracionResult);
          }
          order = this.actualizarValoresPedido(order);
          this.editOrder(order);
        },
      );
  }
  actualizarValoresPedido(order: Pedido) {
    this.pedidoUtilService.pedido = order;
    order.totalDescuento = this.pedidoUtilService.getDiscount();
    order.totalPedidoSinDescuento = this.pedidoUtilService.getSubtotal();
    order.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(
      Number(order.totalEnvio || 0),
    );
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
    if (order?.asesorAsignado?.nit === "9999") {
      Swal.fire({
        title: "¿Estás seguro?",
        text: "Estás a punto de cambiar el asesor asignado a este pedido.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, cambiar asesor",
        cancelButtonText: "No, cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          const userString = localStorage.getItem("user") || "{}";
          const user = JSON.parse(userString) as UserLogged;
          const userLite: UserLite = {
            name: user?.name || '',
            email: user?.email || '',
            nit: user?.nit || '',
          };
          order.asesorAsignado = userLite;
          this.editOrder(order);
          Swal.fire("Cambiado", "El asesor ha sido cambiado.", "success");
        }
      });
    } else {
      Swal.fire({
        title: "¡Alerta!",
        text: "Este pedido ya tiene un asesor asignado.",
        icon: "warning",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Aceptar",
      });
    }
  }

  buscarPorFechas(table?: Table): void {
    // Implementar lógica para filtrar los pedidos entre fechaInicial y fechaFinal
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      tipoFecha: "fechaCreacion",
      company: JSON.parse(localStorage.getItem("currentCompany")!)
        .nomComercial,
      estadoProceso: this.isFromProduction
        ? [EstadoProceso.SinProducir, EstadoProceso.EnProduccion, EstadoProceso.ProducidoParcialmente]
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
    // Implementar lógica para ajustar fechaInicial y fechaFinal al día actual y luego filtrar
    const fechaActual = new Date();
    this.fechaInicial = fechaActual.toISOString().split("T")[0];
    this.fechaFinal = fechaActual.toISOString().split("T")[0];
    this.refrescarDatos();
  }
  filter(event) {
    console.log(event);
  }

  filtrarParaManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para mañana
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = fechaManana.toISOString().split("T")[0];
    this.fechaFinal = fechaManana.toISOString().split("T")[0];
    this.refrescarDatos();
  }

  filtrarParaPasadoManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para pasado mañana
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = fechaPasadoManana.toISOString().split("T")[0];
    this.fechaFinal = fechaPasadoManana.toISOString().split("T")[0];
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

  exportarExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.orders);
    const workbook: XLSX.WorkBook = {
      Sheets: { Pedidos: worksheet },
      SheetNames: ["Pedidos"],
    };
    XLSX.writeFile(workbook, "Pedidos.xlsx");
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
          this.displayedColumns = parsed;
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
        console.error("Error parsing saved production columns configuration", e);
      }
    }
    // Inicializar columnas seleccionadas de producción
    this.selectedColumnsProduccion = this.displayedColumnsProduccion.filter((col) => col.visible);
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
      { field: "producto", header: "Producto", visible: true, type: "text", filterable: true },
      { field: "referencia", header: "Referencia", visible: true, type: "text", filterable: true },
      { field: "ultimaImpresion", header: "Última impresión", visible: true, type: "date", filterable: false },
      { field: "nroPedido", header: "# Pedido", visible: true, type: "text", filterable: true },
      { field: "cantidad", header: "Cantidad", visible: true, type: "text", filterable: true },
      { field: "cliente", header: "Cliente", visible: true, type: "text", filterable: true },
      { field: "estadoPago", header: "Estado de Pago", visible: true, type: "status", filterable: true },
      { field: "estadoProceso", header: "Estado de Proceso", visible: true, type: "status", filterable: true },
      { field: "validacion", header: "Validación", visible: false, type: "status", filterable: true },
      { field: "totalPedidoSinDescuento", header: "Valor Bruto", visible: false, type: "currency", filterable: true },
      { field: "totalDescuento", header: "Descuento", visible: false, type: "currency", filterable: true },
      { field: "totalEnvio", header: "Domicilio", visible: false, type: "currency", filterable: true },
      { field: "subtotal", header: "Subtotal", visible: false, type: "currency", filterable: true },
      { field: "totalImpuesto", header: "IVA", visible: false, type: "currency", filterable: true },
      { field: "totalPedididoConDescuento", header: "Total", visible: false, type: "currency", filterable: true },
      { field: "anticipo", header: "Anticipo", visible: false, type: "currency", filterable: true },
      { field: "faltaPorPagar", header: "Falta por Pagar", visible: false, type: "currency", filterable: true },
      { field: "fechaEntrega", header: "Fecha Entrega", visible: false, type: "date", filterable: true },
      { field: "fechaCreacion", header: "Fecha de compra", visible: false, type: "date", filterable: true },
      { field: "ciudad", header: "Ciudad", visible: false, type: "text", filterable: true },
      { field: "zonaCobro", header: "Zona de Entrega", visible: false, type: "text", filterable: true },
      { field: "formaEntrega", header: "Forma de Entrega", visible: false, type: "text", filterable: true },
      { field: "horarioEntrega", header: "Horario de Entrega", visible: false, type: "text", filterable: true },
      { field: "channel", header: "Canal", visible: false, type: "text", filterable: true },
      { field: "vendedor", header: "Vendedor", visible: false, type: "text", filterable: true }
    ];
    // Asegurar que selectedColumnsProduccion mantenga la nueva configuración
    this.selectedColumnsProduccion = this.displayedColumnsProduccion.filter((col) => col.visible);
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
    } else {
      this.fechaFinal = "";
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
        const todayDate = new Date().toISOString().split("T")[0];
        this.fechaInicial = todayDate;
        this.fechaFinal = todayDate;
        break;
      case "week":
        this.fechaInicial = startOfWeek.toISOString().split("T")[0];
        this.fechaFinal = endOfWeek.toISOString().split("T")[0];
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
        if (state.fechaInicial) this.fechaInicial = state.fechaInicial;
        if (state.fechaFinal) this.fechaFinal = state.fechaFinal;
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

  onPrintProduct(event: { pedido: any, producto: any }) {
    console.log('Imprimir producto:', event.producto, 'del pedido:', event.pedido);
    // Aquí puedes llamar a la lógica de impresión específica por producto
  }

  onOptionsProduccion(event: { pedido: any, producto: any }) {
    this.selectedOrder = event.pedido;
    this.productoSeleccionado = event.producto;
    this.openOptionsModal(event.pedido, event.producto);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
