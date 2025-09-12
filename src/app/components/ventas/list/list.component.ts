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
  datosEntregaDelCliente: any[] = [];
  estadosPago = Object.values(EstadoPago);
  ciudadSeleccionada: any;

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
  localSearchQuery: string = '';
  filteredOrders: Pedido[] = [];
  isLocalSearchActive: boolean = false;
  originalOrders: Pedido[] = [];
  hasLoadedOrdersOnce: boolean = false;

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
   * Verifica si se pueden ELIMINAR productos del pedido
   * SOLO se pueden eliminar productos si el pedido está en estado "Pendiente" o "SinProducir"
   * @param order Pedido a verificar
   * @returns true si se pueden eliminar productos, false si no
   */
  canDeleteProducts(order: Pedido): boolean {
    if (!order || !order.estadoProceso) {
      return false;
    }

    // Solo permitir eliminación en estados muy tempranos del proceso
    const estadosPermitidos = [
      'Pendiente',           // Pedido recién creado
      'SinProducir'          // Pedido confirmado pero sin iniciar producción
    ];

    return estadosPermitidos.includes(order.estadoProceso);
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
   * Verifica si se puede editar la dirección de entrega basado en la forma de entrega
   * @param order Pedido a verificar
   * @returns true si se puede editar (solo si forma de entrega contiene "domicilio")
   */
  canEditDeliveryAddressByDeliveryType(order: Pedido): boolean {
    if (!order?.formaEntrega) return false;

    const formaEntregaLower = order.formaEntrega.toLowerCase();

    // Bloquear si contiene "recoge"
    if (formaEntregaLower.includes('recoge')) {
      return false;
    }

    // Activar si contiene "domicilio"
    if (formaEntregaLower.includes('domicilio')) {
      return true;
    }

    // Por defecto bloquear si no coincide con ninguna condición
    return false;
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
    // Solo administradores pueden asignar asesores
    return !!(
      this.UserLogged?.rol &&
      (this.UserLogged.rol.toLowerCase() === 'administrador' ||
        this.UserLogged.rol.toLowerCase() === 'admin' ||
        this.UserLogged.rol.toLowerCase() === 'super administrador')
    );
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
    private changeDetectorRef: ChangeDetectorRef
  ) {
    console.log('🔧 Constructor - Registrando filtros personalizados...');
    this.registerCustomFilters();
    console.log('✅ Constructor - Filtros personalizados registrados');
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

  // ===== MÉTODOS PARA BÚSQUEDA LOCAL ADICIONAL =====

  /**
   * Inicializa la búsqueda local
   */
  initializeLocalSearch(): void {
    this.localSearchQuery = '';
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

    this.filteredOrders = this.originalOrders.filter(order => {
      // Buscar por número de pedido
      if (order.nroPedido && order.nroPedido.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Buscar por nombre del cliente
      if (order.cliente?.nombres_completos &&
        order.cliente.nombres_completos.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Buscar por documento del cliente
      if (order.cliente?.documento &&
        order.cliente.documento.toLowerCase().includes(searchTerm)) {
        return true;
      }

      // Buscar por referencia
      if (order.referencia &&
        order.referencia.toLowerCase().includes(searchTerm)) {
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
    this.localSearchQuery = '';
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
    return this.originalOrders.length > 0 ||
      this.isLocalSearchActive ||
      this.localSearchQuery.trim().length > 0 ||
      this.hasLoadedOrdersOnce;
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

    // Inicializar búsqueda local
    this.initializeLocalSearch();

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
    console.log('🔧 registerCustomFilters - Iniciando registro...');

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
    console.log('✅ Filtro horarioEntregaCustom registrado');

    this.filterService.register("customDate", (value, filter): boolean => {
      console.log('🔍 FILTRO customDate - Valor:', value, 'Filtro:', filter);

      if (filter === undefined || filter === null) {
        console.log('✅ Filtro vacío, retornando true');
        return true;
      }

      if (value === undefined || value === null) {
        console.log('❌ Valor vacío, retornando false');
        return false;
      }

      // Convertir el valor de la tabla (que puede ser string o Date) a Date
      let valueDate: Date;
      if (typeof value === 'string') {
        // Si es string, convertir desde formato dd/MM/yyyy
        const parts = value.split('/');
        if (parts.length === 3) {
          valueDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          console.log('📅 Valor string convertido:', value, '->', valueDate);
        } else {
          valueDate = new Date(value);
          console.log('📅 Valor string genérico convertido:', value, '->', valueDate);
        }
      } else {
        valueDate = new Date(value);
        console.log('📅 Valor Date convertido:', value, '->', valueDate);
      }

      // Convertir el filtro (que viene del calendario) a Date
      const filterDate = new Date(filter);
      console.log('📅 Filtro convertido:', filter, '->', filterDate);

      // Verificar si las fechas son válidas
      if (isNaN(valueDate.getTime()) || isNaN(filterDate.getTime())) {
        console.log('❌ Fecha inválida detectada - Valor:', valueDate, 'Filtro:', filterDate);
        return false;
      }

      // Comparar solo la fecha (sin hora)
      const valueDateOnly = new Date(valueDate.getFullYear(), valueDate.getMonth(), valueDate.getDate());
      const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

      console.log('📅 Comparando fechas:', valueDateOnly, 'vs', filterDateOnly);

      const result = valueDateOnly.getTime() === filterDateOnly.getTime();
      console.log('✅ Resultado del filtro:', result);

      return result;
    });
    console.log('✅ Filtro customDate registrado');

    console.log('🎯 registerCustomFilters - Todos los filtros registrados exitosamente');
  }

  // ✅ NUEVO: Flag para controlar refrescos automáticos
  private ultimoRefresco = 0;
  private refrescoEnProgreso = false;

  // Método para debug del filtro de fecha
  onDateFilterSelect(event: any, filterCallback: Function) {
    console.log('🗓️ EVENTO onSelect del calendario:', event);
    console.log('🗓️ Tipo de evento:', typeof event);
    console.log('🗓️ Valor del evento:', event);
    console.log('🗓️ Filter callback:', filterCallback);
    console.log('🗓️ Filter callback tipo:', typeof filterCallback);

    try {
      // Llamar al callback original
      console.log('🗓️ Ejecutando filterCallback...');
      filterCallback(event);
      console.log('🗓️ filterCallback ejecutado exitosamente');
    } catch (error) {
      console.error('❌ Error al ejecutar filterCallback:', error);
    }
  }

  // Método alternativo para probar el filtro
  testDateFilter(event: any) {
    console.log('🧪 TEST - Evento del calendario:', event);
    console.log('🧪 TEST - Tipo de evento:', typeof event);

    if (event && event.target) {
      console.log('🧪 TEST - Valor del input:', event.target.value);
    }
  }

  // Método para probar el filtro manualmente
  testFilter(filterCallback: Function) {
    console.log('🧪 TEST FILTER - Iniciando prueba manual del filtro');
    console.log('🧪 TEST FILTER - Filter callback:', filterCallback);
    console.log('🧪 TEST FILTER - Tipo de callback:', typeof filterCallback);

    try {
      // Crear una fecha de prueba
      const testDate = new Date();
      console.log('🧪 TEST FILTER - Fecha de prueba:', testDate);

      // Ejecutar el filtro con la fecha de prueba
      filterCallback(testDate);
      console.log('🧪 TEST FILTER - Filtro ejecutado exitosamente');
    } catch (error) {
      console.error('❌ TEST FILTER - Error al ejecutar filtro:', error);
    }
  }

  refrescarDatos(forceRefresh: boolean = false) {
    // ✅ PROTECCIÓN: Evitar refrescos automáticos muy frecuentes
    // Esta función se ejecuta automáticamente en varios eventos del navegador
    // Por eso agregamos protección para evitar cambios automáticos de estados de pago
    const ahora = Date.now();
    const tiempoDesdeUltimoRefresco = ahora - this.ultimoRefresco;
    const tiempoMinimoEntreRefrescos = 30 * 1000; // 30 segundos mínimo entre refrescos

    if (!forceRefresh && tiempoDesdeUltimoRefresco < tiempoMinimoEntreRefrescos) {
      console.log(`⏰ REFRESCO OMITIDO - Último refresco hace ${(tiempoDesdeUltimoRefresco / 1000).toFixed(1)}s (mínimo ${tiempoMinimoEntreRefrescos / 1000}s)`);
      return;
    }

    if (this.refrescoEnProgreso) {
      console.log(`🔄 REFRESCO EN PROGRESO - Omitiendo solicitud duplicada`);
      return;
    }

    this.refrescoEnProgreso = true;
    this.ultimoRefresco = ahora;

    console.log(`🔄 INICIANDO REFRESCO - Forzado: ${forceRefresh}, Tiempo desde último: ${(tiempoDesdeUltimoRefresco / 1000).toFixed(1)}s`);

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

    this.ventasService.getOrdersByFilter(filter).subscribe({
      next: (data: Pedido[]) => {
        console.log(data);


        // Limpiar orders antes de asignar nuevos datos para forzar detección de cambios
        this.orders = [];
        this.changeDetectorRef.detectChanges();

        data.forEach((order: any) => {
          // Recalcular montos base con consistencia
          order.totalPedidoSinDescuento = Number(this.checkPriceScale(order) || 0);
          order.totalImpuesto = Number(this.checkIVAPrice(order) || 0);
          // Subtotal estándar: solo productos sin IVA
          order.subtotal = Number(order.totalPedidoSinDescuento || 0);
          // Total = subtotal + IVA + envío − descuento
          const envio = Number(order.totalEnvio || 0);
          const descuento = Number(order.totalDescuento || 0);
          order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto + envio - descuento;

          // Calcular anticipo basado en PagosAsentados si existen
          if (order.PagosAsentados && order.PagosAsentados.length > 0) {
            console.log(`🔍 PROCESANDO PAGOS - Pedido ${order.nroPedido}:`, {
              totalPagos: order.PagosAsentados.length,
              pagos: order.PagosAsentados.map(p => ({
                formaPago: p.formaPago,
                estadoVerificacion: p.estadoVerificacion,
                valor: p.valor || p.valorRegistrado,
                numeroComprobante: p.numeroComprobante
              }))
            });

            order.anticipo = order.PagosAsentados.reduce((acc, pago) => {
              // ✅ CORREGIDO: Incluir TODOS los pagos, incluso los pendientes
              // Los pagos pendientes también representan dinero que el cliente ya pagó
              // Solo excluir pagos rechazados o cancelados

              // Verificar si el pago está en un estado válido para sumar
              const estadoValido = pago.estadoVerificacion !== "Rechazado" &&
                pago.estadoVerificacion !== "Cancelado";

              if (estadoValido) {
                // Considerar tanto valor como valorRegistrado
                const valorPago = Number(pago.valor || pago.valorRegistrado || 0);
                console.log(`💰 PAGO INCLUIDO - Pedido ${order.nroPedido}:`, {
                  formaPago: pago.formaPago,
                  estadoVerificacion: pago.estadoVerificacion,
                  valor: valorPago,
                  numeroComprobante: pago.numeroComprobante
                });
                return acc + valorPago;
              } else {
                console.log(`❌ PAGO EXCLUIDO - Pedido ${order.nroPedido}:`, {
                  formaPago: pago.formaPago,
                  estadoVerificacion: pago.estadoVerificacion,
                  valor: pago.valor || pago.valorRegistrado,
                  numeroComprobante: pago.numeroComprobante,
                  razon: "Estado inválido"
                });
                return acc;
              }
            }, 0);

            console.log(`📊 RESUMEN CÁLCULO - Pedido ${order.nroPedido}:`, {
              anticipoCalculado: order.anticipo,
              faltaPorPagar: order.faltaPorPagar,
              totalPedido: order.totalPedididoConDescuento
            });
          } else if (order.anticipo == null || order.anticipo == undefined) {
            order.anticipo = 0;
          }

          // Calcular falta por pagar basado en el total y anticipo real
          order.faltaPorPagar = Math.max(0, Number(order.totalPedididoConDescuento || 0) - Number(order.anticipo || 0));

          // 🔍 DEBUG: Log del estado de pago antes de procesar
          console.log(`💰 ESTADO DE PAGO - Pedido ${order.nroPedido}:`, {
            estadoActual: order.estadoPago,
            _estadoCalculadoEnFrontend: order._estadoCalculadoEnFrontend,
            _timestamp: order._timestamp,
            anticipo: order.anticipo,
            faltaPorPagar: order.faltaPorPagar,
            totalPedido: order.totalPedididoConDescuento,
            pagosAsentados: order.PagosAsentados?.length || 0
          });

          // 🔍 VERIFICACIÓN SIMPLIFICADA: Solo recalcular si NO fue calculado en frontend
          // ✅ CORREGIDO: Eliminar la lógica de expiración temporal para evitar recálculos automáticos
          const debeRecalcular = !order._estadoCalculadoEnFrontend ||
            (order.estadoPago === "Precancelado" || order.estadoPago === "Cancelado");

          console.log(`🔍 VERIFICACIÓN ESTADO - Pedido ${order.nroPedido}:`, {
            _estadoCalculadoEnFrontend: order._estadoCalculadoEnFrontend,
            _timestamp: order._timestamp,
            debeRecalcular: debeRecalcular,
            estadoActual: order.estadoPago
          });

          // Actualizar estado de pago basado en los cálculos reales
          // SOLO recalcular estado si no viene ya calculado del frontend
          if (
            debeRecalcular &&
            order.estadoPago !== "Precancelado" &&
            order.estadoPago !== "Cancelado"
          ) {
            // Regla: si la forma de entrega es "Recoge", el estado de pago debe ser siempre "Pendiente"
            const formaEntregaActual =
              (order.formaEntrega as string) ||
              (order?.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega as string) ||
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

              console.log(`🔄 ESTADO RECALCULADO - Pedido ${order.nroPedido}:`, {
                estadoAnterior: order.estadoPago,
                estadoNuevo: order.estadoPago,
                razon: "Recalculado en refrescarDatos",
                anticipo: order.anticipo,
                faltaPorPagar: order.faltaPorPagar,
                totalPedido: order.totalPedididoConDescuento
              });
            }
          } else if (order._estadoCalculadoEnFrontend &&
            order.estadoPago !== "Precancelado" &&
            order.estadoPago !== "Cancelado") {

            // 🔒 PROTECCIÓN MEJORADA: Si el estado ya fue calculado en el frontend, 
            // verificar que sea consistente con los pagos actuales para evitar inconsistencias

            // Verificar si hay inconsistencias entre el estado y los pagos
            const totalPedido = Number(order.totalPedididoConDescuento || 0);
            const anticipoReal = Number(order.anticipo || 0);
            const faltaPorPagarReal = Math.max(0, totalPedido - anticipoReal);

            // ✅ CORREGIDO: Solo corregir inconsistencias CRÍTICAS y OBVIAS
            // Evitar cambios automáticos que puedan causar confusión
            let estadoCorregido = false;

            if (order.estadoPago === "Aprobado" && faltaPorPagarReal > 0) {
              // Solo corregir si la inconsistencia es muy clara (falta más del 10% del total)
              const porcentajeFaltante = (faltaPorPagarReal / totalPedido) * 100;
              if (porcentajeFaltante > 10) {
                if (faltaPorPagarReal < totalPedido) {
                  order.estadoPago = "PreAprobado";
                } else {
                  order.estadoPago = "Pendiente";
                }
                estadoCorregido = true;
                console.log(`⚠️ CORRECCIÓN CRÍTICA - Pedido ${order.nroPedido}: Estado Aprobado → ${order.estadoPago} (falta ${porcentajeFaltante.toFixed(1)}%)`);
              }
            } else if (order.estadoPago === "PreAprobado" && faltaPorPagarReal <= 0) {
              // Solo corregir si realmente no falta nada por pagar
              if (faltaPorPagarReal <= 0) {
                order.estadoPago = "Aprobado";
                estadoCorregido = true;
                console.log(`⚠️ CORRECCIÓN CRÍTICA - Pedido ${order.nroPedido}: Estado PreAprobado → Aprobado (pago completo)`);
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
                console.log(`⚠️ CORRECCIÓN CRÍTICA - Pedido ${order.nroPedido}: Estado Pendiente → ${order.estadoPago} (pagado ${porcentajePagado.toFixed(1)}%)`);
              }
            }

            if (!estadoCorregido) {
              // ✅ NO SOBRESCRIBIR el estado si ya fue calculado en frontend y no hay inconsistencias críticas
              console.log(`🔒 ESTADO PRESERVADO - Pedido ${order.nroPedido}:`, {
                estadoPreservado: order.estadoPago,
                razon: "Ya calculado en frontend - Sin inconsistencias críticas",
                _estadoCalculadoEnFrontend: order._estadoCalculadoEnFrontend,
                _timestamp: order._timestamp
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

        // Forzar actualización de la tabla usando setTimeout para el siguiente ciclo de detección
        setTimeout(() => {
          this.orders = [...data];
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

          console.log(`✅ REFRESCO COMPLETADO - ${this.orders.length} pedidos procesados`);
          // Si hay una referencia a la tabla, forzar su actualización
          if (this.table) {
            this.table.reset();
            this.table.value = this.orders;
            this.table.totalRecords = this.orders.length;
            this.table.loading = false;
          }
        }, 100);
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


      },
      error: (error) => {
        console.error("❌ ERROR EN REFRESCO:", error);
        // ✅ RESETEAR FLAGS EN CASO DE ERROR
        this.refrescoEnProgreso = false;
        this.loading = false;

        Swal.fire({
          icon: "error",
          title: "Error al cargar pedidos",
          text: "No se pudieron cargar los pedidos. Por favor, intente nuevamente.",
          confirmButtonText: "Reintentar",
        });
      }
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
      (acc, pedido: any) => {
        // El subtotal debe incluir el valor del domicilio
        const subtotalConDomicilio = (pedido.subtotal || 0) + (pedido.totalEnvio || 0);
        return acc + subtotalConDomicilio;
      },
      0,
    );
  }

  /**
   * Calcula el subtotal de un pedido individual incluyendo el domicilio
   */
  getSubtotalConDomicilio(pedido: any): number {
    return (pedido.subtotal || 0) + (pedido.totalEnvio || 0);
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

    // 🔄 CRÍTICO: Actualizar valores del pedido ANTES de generar PDF
    // Esto asegura que el PDF muestre los valores más recientes
    const pedidoActualizado = this.actualizarPedidoParaPDF(order);
    this.pedidoSeleccionado = pedidoActualizado;

    // ✅ Ahora generar PDF con pedido ACTUALIZADO
    this.htmlModal = this.paymentService.getHtmlContent(
      pedidoActualizado,  // ← Pedido con valores actualizados
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

    // No refrescar aquí con timeout arbitrario
    // El componente padre debe llamar a refrescarDatos() cuando termine
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

    console.log('📊 PDF - Pedido actualizado antes de generar:', {
      nroPedido: pedidoActualizado.nroPedido,
      formaEntrega: pedidoActualizado.formaEntrega,
      totalPedidoSinDescuento: pedidoActualizado.totalPedidoSinDescuento,
      totalEnvio: pedidoActualizado.totalEnvio,
      totalDescuento: pedidoActualizado.totalDescuento,
      totalPedididoConDescuento: pedidoActualizado.totalPedididoConDescuento
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

    console.log('🔄 SINCRONIZACIÓN - Estado inicial:', {
      nroPedido: pedido.nroPedido,
      formaEntregaPedido: pedido.formaEntrega,
      formaEntregaCarrito: pedido.carrito[0]?.configuracion?.datosEntrega?.formaEntrega,
      totalEnvio: pedido.totalEnvio
    });

    // Obtener la forma de entrega más reciente del carrito
    const formasEntregaCarrito = pedido.carrito
      .map(item => item.configuracion?.datosEntrega?.formaEntrega)
      .filter(forma => forma && forma.trim() !== '');

    let formaEntregaFinal = '';

    // Si hay formas de entrega en el carrito, usar la primera no vacía
    if (formasEntregaCarrito.length > 0) {
      formaEntregaFinal = formasEntregaCarrito[0];

      // Actualizar el pedido con la forma de entrega del carrito
      pedido.formaEntrega = formaEntregaFinal;

      // Asegurar que todos los items del carrito tengan la misma forma de entrega
      pedido.carrito.forEach(item => {
        if (item.configuracion?.datosEntrega) {
          item.configuracion.datosEntrega.formaEntrega = formaEntregaFinal;
        }
      });

      console.log('🔄 SINCRONIZACIÓN - Forma de entrega sincronizada desde carrito:', {
        nroPedido: pedido.nroPedido,
        formaEntrega: formaEntregaFinal,
        itemsActualizados: pedido.carrito.length
      });
    }
    // Si el pedido tiene forma de entrega pero el carrito no, sincronizar hacia el carrito
    else if (pedido.formaEntrega) {
      formaEntregaFinal = pedido.formaEntrega;

      pedido.carrito.forEach(item => {
        if (item.configuracion?.datosEntrega) {
          item.configuracion.datosEntrega.formaEntrega = pedido.formaEntrega;
        }
      });

      console.log('🔄 SINCRONIZACIÓN - Forma de entrega sincronizada desde pedido:', {
        nroPedido: pedido.nroPedido,
        formaEntrega: pedido.formaEntrega,
        itemsActualizados: pedido.carrito.length
      });
    }

    // 🚚 MANEJO DEL COSTO DE ENVÍO según la forma de entrega
    if (formaEntregaFinal && formaEntregaFinal.toLowerCase().includes('recoge')) {
      // Si es "recoge en tienda", el costo de envío debe ser 0
      if (pedido.totalEnvio && pedido.totalEnvio > 0) {
        console.log('🚚 SINCRONIZACIÓN - Cambiando costo de envío a 0 para recoge en tienda:', {
          nroPedido: pedido.nroPedido,
          formaEntrega: formaEntregaFinal,
          totalEnvioAnterior: pedido.totalEnvio,
          totalEnvioNuevo: 0
        });

        pedido.totalEnvio = 0;

        // Recalcular totales del pedido
        this.recalcularTotalesPedido(pedido);
      }
    }

    console.log('🔄 SINCRONIZACIÓN - Estado final:', {
      nroPedido: pedido.nroPedido,
      formaEntregaPedido: pedido.formaEntrega,
      formaEntregaCarrito: pedido.carrito[0]?.configuracion?.datosEntrega?.formaEntrega,
      totalEnvio: pedido.totalEnvio
    });
  }

  /**
   * 🧮 RECALCULA los totales del pedido después de cambiar el costo de envío
   */
  private recalcularTotalesPedido(pedido: Pedido): void {
    if (!pedido) return;

    // Recalcular totales usando el servicio de utilidades
    this.pedidoUtilService.pedido = pedido;

    // Actualizar totales
    const subtotalSinEnvio = this.pedidoUtilService.getSubtotalSinEnvio();
    const totalDescuento = Number(pedido.totalDescuento) || 0;
    const totalImpuesto = Number(pedido.totalImpuesto) || 0;
    const totalEnvio = Number(pedido.totalEnvio) || 0;

    // Calcular total final
    const totalFinal = subtotalSinEnvio + totalEnvio + totalImpuesto - totalDescuento;

    // Actualizar propiedades del pedido
    pedido.totalPedidoSinDescuento = subtotalSinEnvio + totalEnvio;
    pedido.totalPedididoConDescuento = totalFinal;
    pedido.faltaPorPagar = totalFinal - (Number(pedido.anticipo) || 0);

    console.log('🧮 RECÁLCULO - Totales actualizados:', {
      nroPedido: pedido.nroPedido,
      subtotalSinEnvio,
      totalEnvio,
      totalDescuento,
      totalImpuesto,
      totalFinal,
      faltaPorPagar: pedido.faltaPorPagar
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
      const formaEntrega = order.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega;

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
        order.carrito.forEach(item => {
          if (item.configuracion?.datosEntrega && order.formaEntrega) {
            item.configuracion.datosEntrega.formaEntrega = order.formaEntrega;
          }
        });
      }
    }

    // Log del payload que se envía al servicio
    console.log('📤 PAYLOAD EDIT ORDER:', {
      nroPedido: order.nroPedido,
      formaEntrega: order.formaEntrega,
      carritoFormaEntrega: order.carrito?.map(item => ({
        referencia: item.producto?.identificacion?.referencia,
        formaEntrega: item.configuracion?.datosEntrega?.formaEntrega
      })),
      payloadCompleto: order
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
    this.clienteSeleccionado = order.cliente ?? {} as Cliente;
    this.pedidoSeleccionado = order;

    // Buscar datos actualizados del cliente usando búsqueda activa
    if (order.cliente?.documento) {
      const data = { documento: order.cliente.documento };
      this.maestroService.getClientByDocument(data).subscribe({
        next: (res: any) => {
          // Usar datos actualizados de la base de datos
          this.datosEntregaDelCliente = this.convertirDatosEntregaAArray(res.datosEntrega);
          this.initForms(this.clienteSeleccionado);
          this.openEntregaModal(content, order);
        },
        error: (error) => {
          console.warn('Error al buscar cliente, usando datos del pedido:', error);
          // Fallback: usar datos del pedido si hay error en la búsqueda
          this.datosEntregaDelCliente = this.convertirDatosEntregaAArray(order.cliente?.datosEntrega);
          this.initForms(this.clienteSeleccionado);
          this.openEntregaModal(content, order);
        }
      });
    } else {
      // Fallback: usar datos del pedido si no hay documento
      this.datosEntregaDelCliente = this.convertirDatosEntregaAArray(order.cliente?.datosEntrega);
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
    // Prevenir ejecución cuando está en modo producción
    if (this.isFromProduction) {
      return;
    }

    // Cerrar el modal de opciones primero
    this.closeOptionsModal();

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

  confProductToCart(content, carritoConfiguracion: Carrito, order: Pedido) {
    // Evitar warning de aria-hidden con foco persistente en botones bajo app-root
    try {
      const active = document.activeElement as HTMLElement | null;
      if (active && typeof active.blur === 'function') {
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

    // Establecer el producto seleccionado desde la configuración del carrito
    this.productoSeleccionado = carritoConfiguracion?.producto;

    console.log('🔄 Abriendo modal de configuración:', {
      configuracion: carritoConfiguracion,
      producto: this.productoSeleccionado,
      preferencias: carritoConfiguracion?.configuracion?.preferencias?.length || 0
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

          // Sincronizar forma de entrega antes de actualizar valores
          console.log('🔄 CONFIGURACIÓN - Antes de sincronizar:', {
            nroPedido: order.nroPedido,
            formaEntregaPedido: order.formaEntrega,
            formaEntregaCarrito: order.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega
          });

          this.sincronizarFormaEntrega(order);

          console.log('🔄 CONFIGURACIÓN - Después de sincronizar:', {
            nroPedido: order.nroPedido,
            formaEntregaPedido: order.formaEntrega,
            formaEntregaCarrito: order.carrito?.[0]?.configuracion?.datosEntrega?.formaEntrega
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

          // Sincronizar forma de entrega antes de actualizar valores
          this.sincronizarFormaEntrega(order);

          order = this.actualizarValoresPedido(order);
          this.editOrder(order);
        },
      );
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
            "Pedido Eliminado"
          );

          // Remover el pedido de la lista local
          const index = this.orders.findIndex(order => order._id === pedido._id);
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
            "Error al Eliminar"
          );
        }
      });
    } catch (error) {
      console.error("❌ Error inesperado al eliminar pedido:", error);
      this.toastrService.error(
        "Ocurrió un error inesperado al eliminar el pedido",
        "Error"
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
      allowEscapeKey: false
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          console.log(`🗑️ Eliminando pedido sin productos: ${pedido.nroPedido}`);

          // Eliminar el pedido del backend
          this.ventasService.deleteOrder(pedido).subscribe({
            next: (response) => {
              console.log("✅ Pedido sin productos eliminado exitosamente:", response);

              // Mostrar mensaje de éxito
              this.toastrService.success(
                `Pedido ${pedido.nroPedido} eliminado automáticamente por no tener productos`,
                "Pedido Eliminado"
              );

              // Remover el pedido de la lista local
              const index = this.orders.findIndex(order => order._id === pedido._id);
              if (index !== -1) {
                this.orders.splice(index, 1);
              }

              // Refrescar los datos para actualizar la UI
              this.refrescarDatos();
            },
            error: (error) => {
              console.error("❌ Error al eliminar pedido sin productos:", error);
              this.toastrService.error(
                `Error al eliminar el pedido ${pedido.nroPedido}. Inténtalo nuevamente.`,
                "Error al Eliminar"
              );
            }
          });
        } catch (error) {
          console.error("❌ Error inesperado al eliminar pedido sin productos:", error);
          this.toastrService.error(
            "Ocurrió un error inesperado al eliminar el pedido",
            "Error"
          );
        }
      } else {
        // Si el usuario cancela, mostrar mensaje informativo
        this.toastrService.info(
          `El pedido ${pedido.nroPedido} se mantendrá en el sistema pero no tendrá productos. Considera agregar productos o eliminarlo manualmente.`,
          "Pedido Mantenido"
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
    if (!this.canDeleteProducts(pedido)) {
      this.toastrService.warning(
        `No se pueden eliminar productos. Solo se permiten eliminaciones en pedidos con estado "Pendiente" o "SinProducir". Estado actual: ${pedido.estadoProceso}`,
        "Eliminación No Permitida",
      );
      return;
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
      text: `Al eliminar "${item.producto?.crearProducto?.titulo || 'este producto'}" el pedido ${pedido.nroPedido} se quedará sin productos. Los pedidos sin productos no están permitidos en el sistema. ¿Deseas eliminar el producto y el pedido completo?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar producto y pedido",
      cancelButtonText: "Cancelar",
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          // Eliminar el producto del carrito
          const index = pedido.carrito?.findIndex(
            (carritoItem) =>
              carritoItem.producto?.identificacion?.referencia ===
              item.producto?.identificacion?.referencia
          );

          if (index !== -1 && index !== undefined) {
            // Eliminar el producto del carrito
            pedido.carrito?.splice(index, 1);

            console.log(`🗑️ Último producto eliminado del pedido ${pedido.nroPedido}:`, {
              producto: item.producto?.crearProducto?.titulo,
              referencia: item.producto?.identificacion?.referencia,
              cantidad: item.cantidad
            });

            // Recalcular todos los valores del pedido
            pedido = this.actualizarValoresPedido(pedido);

            // Actualizar el pedido en el backend
            this.editOrder(pedido);

            // Mostrar mensaje de éxito
            this.toastrService.success(
              `Producto "${item.producto?.crearProducto?.titulo || 'eliminado'}" removido del pedido exitosamente`,
              "Producto Eliminado"
            );

            // Ahora eliminar el pedido completo directamente ya que está vacío
            this.eliminarPedidoCompleto(pedido);
          } else {
            this.toastrService.error(
              "No se pudo encontrar el producto en el pedido",
              "Error al Eliminar"
            );
          }
        } catch (error) {
          console.error("Error al eliminar último producto del pedido:", error);
          this.toastrService.error(
            "Ocurrió un error al eliminar el producto",
            "Error"
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
      text: `¿Estás seguro de que quieres eliminar "${item.producto?.crearProducto?.titulo || 'este producto'}" del pedido?`,
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
              item.producto?.identificacion?.referencia
          );

          if (index !== -1 && index !== undefined) {
            // Eliminar el producto del carrito
            pedido.carrito?.splice(index, 1);

            console.log(`🗑️ Producto eliminado del pedido ${pedido.nroPedido}:`, {
              producto: item.producto?.crearProducto?.titulo,
              referencia: item.producto?.identificacion?.referencia,
              cantidad: item.cantidad
            });

            // Recalcular todos los valores del pedido
            pedido = this.actualizarValoresPedido(pedido);

            // Actualizar el pedido en el backend
            this.editOrder(pedido);

            // Mostrar mensaje de éxito
            this.toastrService.success(
              `Producto "${item.producto?.crearProducto?.titulo || 'eliminado'}" removido del pedido exitosamente`,
              "Producto Eliminado"
            );
          } else {
            this.toastrService.error(
              "No se pudo encontrar el producto en el pedido",
              "Error al Eliminar"
            );
          }
        } catch (error) {
          console.error("Error al eliminar producto del pedido:", error);
          this.toastrService.error(
            "Ocurrió un error al eliminar el producto",
            "Error"
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
        costoEnvioNuevo = Number(this.pedidoUtilService.getShippingCost(this.allBillingZone));
        order.totalEnvio = costoEnvioNuevo;

        console.log('🚚 ACTUALIZAR VALORES - Envío domicilio detectado:', {
          costoAnterior: costoEnvioAnterior,
          costoNuevo: costoEnvioNuevo,
          formaEntrega: 'Domicilio',
          zonaCobro: order.envio.zonaCobro
        });
      } catch (e) {
        console.warn('No se pudo calcular el costo de envío:', e);
        order.totalEnvio = 0;
        costoEnvioNuevo = 0;
      }
    } else {
      // Recoge en tienda o sin zona de cobro
      if (order.totalEnvio !== 0) {
        console.log('🚚 ACTUALIZAR VALORES - Envío removido (recoge en tienda)');
      }
      order.totalEnvio = 0;
      costoEnvioNuevo = 0;
    }

    // 🔄 CALCULAR SUBTOTAL CORRECTAMENTE
    // 1. Obtener subtotal SOLO de productos
    const subtotalProductos = this.pedidoUtilService.getSubtotal();

    // 2. Sumar envío al subtotal
    order.totalPedidoSinDescuento = subtotalProductos + (order.totalEnvio || 0);

    console.log('💰 ACTUALIZAR VALORES - Cálculo del subtotal:', {
      subtotalProductos,
      totalEnvio: order.totalEnvio,
      subtotalFinal: order.totalPedidoSinDescuento,
      cambioEnvio: costoEnvioAnterior !== costoEnvioNuevo,
      formaEntrega: order.carrito?.map(c => c.configuracion?.datosEntrega?.formaEntrega)
    });

    // Recalcular total con descuentos (el envío ya está incluido en el subtotal)
    const totalConDescuento = this.pedidoUtilService.getTotalToPay(0); // 0 porque el subtotal ya incluye envío
    order.totalPedididoConDescuento = totalConDescuento;

    // Recalcular falta por pagar si hay anticipos
    if (order.PagosAsentados && order.PagosAsentados.length > 0) {
      const anticipoReal = order.PagosAsentados.reduce((sum, pago) => {
        if (pago.formaPago?.toLowerCase().includes("wompi") &&
          pago.estadoVerificacion === "Pendiente") {
          return sum; // No sumar pagos de Wompi pendientes
        }
        const valorPago = pago.valor || pago.valorRegistrado || 0;
        return sum + valorPago;
      }, 0);

      order.anticipo = anticipoReal;
      order.faltaPorPagar = Math.max(0, order.totalPedididoConDescuento - anticipoReal);
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
    this.maestroService.consultarUsuarios().subscribe((usuarios: any) => {
      // Filtrar solo usuarios activos de la empresa específica que puedan ser asesores
      const asesoresDisponibles = usuarios.filter((usuario: any) =>
        usuario.activo &&
        (usuario.empresa === empresaPedido || usuario.company === empresaPedido) &&
        usuario.roles &&
        (usuario.roles.toLowerCase().includes('vendedor') ||
          usuario.roles.toLowerCase().includes('asesor') ||
          usuario.roles.toLowerCase().includes('comercial') ||
          usuario.roles.toLowerCase().includes('ventas'))
      );

      if (asesoresDisponibles.length === 0) {
        Swal.fire({
          title: "Error",
          text: `No hay asesores disponibles en la empresa ${empresaPedido}.`,
          icon: "error",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "Aceptar",
        });
        return;
      }

      // Crear opciones para el select
      const options = asesoresDisponibles.map((asesor: any) => ({
        value: asesor.cd,
        label: `${asesor.nombre} ${asesor.apellido} (${asesor.email})`
      }));

      // Agregar opción para el asesor actual si existe
      if (order.asesorAsignado && order.asesorAsignado.nit !== "9999") {
        const asesorActual = asesoresDisponibles.find((a: any) => a.nit === order.asesorAsignado?.nit);
        if (asesorActual) {
          options.unshift({
            value: asesorActual.cd,
            label: `${asesorActual.nombre} ${asesorActual.apellido} (${asesorActual.email}) - ACTUAL`
          });
        }
      }

      Swal.fire({
        title: "Asignar Asesor",
        text: `Selecciona el asesor que deseas asignar a este pedido de ${empresaPedido}:`,
        input: 'select',
        inputOptions: options.reduce((acc, option) => {
          acc[option.value] = option.label;
          return acc;
        }, {} as any),
        inputValue: order.asesorAsignado?.nit !== "9999" ?
          asesoresDisponibles.find((a: any) => a.nit === order.asesorAsignado?.nit)?.cd : '',
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Asignar Asesor",
        cancelButtonText: "Cancelar",
        inputValidator: (value) => {
          if (!value) {
            return 'Debes seleccionar un asesor';
          }
          return null;
        }
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          const asesorSeleccionado = asesoresDisponibles.find((a: any) => a.cd === result.value);

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
    }, (error) => {
      console.error('Error al cargar usuarios:', error);
      Swal.fire({
        title: "Error",
        text: "No se pudo cargar la lista de asesores. Intenta nuevamente.",
        icon: "error",
        confirmButtonColor: "#3085d6",
        confirmButtonText: "Aceptar",
      });
    });
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

  /**
   * Duplica un pedido: clona los datos relevantes, reinicia estados e identificadores
   * y lo guarda como un nuevo pedido en la base de datos.
   */
  duplicarPedido(order: Pedido): void {
    if (!order) {
      this.toastrService.error('Pedido inválido', 'Error');
      return;
    }

    try {
      const empresaActual = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyNom: string = empresaActual?.nomComercial || (order.company as unknown as string) || '';

      // Clonar profundamente el pedido seleccionado
      const cloned: Pedido = JSON.parse(JSON.stringify(order));

      // Limpiar identificadores y campos que no deben heredarse
      delete (cloned as any)._id;
      delete (cloned as any).transaccionId;
      delete (cloned as any).shippingOrder;
      (cloned as any).nroShippingOrder = '';
      cloned.referencia = '';
      cloned.nroFactura = '';
      cloned.fechaFactura = '';
      cloned.fechaCreacion = new Date().toISOString();
      cloned.company = companyNom as any;

      // Reiniciar estados y datos de seguimiento/logística
      cloned.estadoPago = EstadoPago.Pendiente;
      cloned.estadoProceso = EstadoProceso.SinProducir;
      cloned.PagosAsentados = [];
      cloned.anticipo = 0;
      cloned.faltaPorPagar = undefined as any;
      (cloned as any).empacador = '';
      (cloned as any).despachador = undefined;
      (cloned as any).entregado = undefined;
      (cloned as any).fechaYHorarioDespachado = '';
      (cloned as any).fechaHoraEmpacado = '';
      cloned.validacion = false;

      // Recalcular totales
      this.pedidoUtilService.pedido = cloned as any;
      cloned.subtotal = this.pedidoUtilService.getSubtotal();
      cloned.totalImpuesto = this.pedidoUtilService.checkIVAPrice();
      cloned.totalEnvio = cloned.totalEnvio || 0;
      cloned.totalDescuento = cloned.totalDescuento || 0;
      cloned.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(Number(cloned.totalEnvio || 0));

      // Obtener el siguiente consecutivo y crear el pedido duplicado
      this.ventasService.getNextRef(companyNom).subscribe({
        next: (res: any) => {
          const texto = companyNom?.toString?.() || '';
          const ultimasLetras = texto.substring(Math.max(0, texto.length - 3));
          const nextConsecutive = (res?.nextConsecutive ?? res ?? 0).toString().padStart(6, '0');
          cloned.nroPedido = `${ultimasLetras}-${nextConsecutive}`;

          const html = this.paymentService.getHtmlContent(cloned, this.isFromProduction);
          this.ventasService.createOrder({ order: cloned, emailHtml: html }).subscribe({
            next: () => {
              this.toastrService.success('Pedido duplicado correctamente', 'Éxito');
              this.refrescarDatos();
            },
            error: () => {
              this.toastrService.error('No se pudo duplicar el pedido', 'Error');
            },
          });
        },
        error: () => {
          this.toastrService.error('No se pudo obtener el consecutivo para el nuevo pedido', 'Error');
        },
      });
    } catch (e) {
      this.toastrService.error('Ocurrió un error al duplicar el pedido', 'Error');
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
    console.log('🔍 Verificando preferencias del carrito:', {
      carrito: carritoConfiguracion,
      configuracion: carritoConfiguracion?.configuracion,
      preferencias: carritoConfiguracion?.configuracion?.preferencias,
      cantidadPreferencias: carritoConfiguracion?.configuracion?.preferencias?.length || 0
    });

    if (carritoConfiguracion?.configuracion?.preferencias) {
      carritoConfiguracion.configuracion.preferencias.forEach((pref: any, index: number) => {
        console.log(`📋 Preferencia ${index + 1} del carrito:`, {
          titulo: pref.titulo,
          tipo: pref.tipo,
          subtitulo: pref.subtitulo,
          valorUnitarioSinIva: pref.valorUnitarioSinIva
        });
      });
    } else {
      console.warn('⚠️ No hay preferencias en la configuración del carrito');
    }
  }
}
