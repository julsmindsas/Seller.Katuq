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

import { ColumnDefinition } from "../interfaces/column-definition.interface";
import * as XLSX from "xlsx";
import { EcomerceProductsComponent } from "../catalogo/ecomerce-products/ecomerce-products.component";

@Component({
  selector: "app-list-orders",
  templateUrl: "./list.component.html",
  styleUrls: ["./list.component.scss"],
})
export class ListOrdersComponent implements OnInit, AfterViewInit {
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
  @ViewChild('recompra', { static: false }) recompraCmp: EcomerceProductsComponent;

  // --- Ciudades de entrega para el selector en el modal de recompra ---
  public ciudadesEntrega: any[] = [];

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

  openOptionsModal(order: any) {
    this.selectedOrder = order;
    this.modalVisible = true;
    // Usar clase CSS en lugar de manipulación directa del style
    document.body.classList.add("modal-open");
  }

  closeOptionsModal() {
    this.modalVisible = false;
    this.selectedOrder = null;
    // Remover la clase CSS para restaurar el scroll
    document.body.classList.remove("modal-open");
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
    ];
    return !!(
      this.UserLogged?.email && authorizedEmails.includes(this.UserLogged.email)
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
  UserLogged: UserLogged;
  allBillingZone: any;
  selectedOrder: any;
  modalVisible = false;

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
    {
      field: "vendedor",
      header: "Vendedor",
      visible: false,
      type: "text",
      filterable: true,
    },
  ];

  selectedColumns: ColumnDefinition[] = [];
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
  ) {
    this.registerCustomFilters();

    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    // this.fechaInicial = new Date('01-' + (new Date().getMonth() + 1) + '-' + new Date().getFullYear());
    // this.fechaFinal = new Date(); //new Date().getTime() + unaSemana);
    // this.fechaFinal.setHours(23, 59, 59, 999);

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

    // this.fechaInicialCtrl.nativeElement.value = new Date().toISOString().split('T')[0] + '00:00:00.0000Z'; //new Date('01-' + (new Date().getMonth() + 1) + '-' + new Date().getFullYear());
    // this.fechaFinalCtrl.nativeElement.value = new Date().toISOString().split('T')[0] + '23:59:59.0000Z'; //new Date(new Date().getTime() + unaSemana);

    this.fechaInicial = new Date().toISOString().split("T")[0];
    //    new Date('01-' + (new Date().getMonth() + 1) + '-' + new Date().getFullYear()).toISOString().split('T')[0];
    this.fechaFinal = new Date().toISOString().split("T")[0];

    this.UserLogged = JSON.parse(localStorage.getItem("user")!) as UserLogged;

    this.cargando = false;

    // Cargar listado de bodegas disponibles para el modal de recompra
    this.cargarBodegas();

    // Cargar ciudades de entrega disponibles (igual que en Crear-Ventas)
    try {
      const currentCompany = JSON.parse(sessionStorage.getItem("currentCompany") || '{}');
      if (currentCompany?.ciudadess?.ciudadesEntrega) {
        this.ciudadesEntrega = currentCompany.ciudadess.ciudadesEntrega;
      }
    } catch (e) {
      console.error('No se pudo obtener ciudadesEntrega de currentCompany', e);
    }

    // Fallback: intentar vía servicio util si no existen
    if (this.ciudadesEntrega.length === 0) {
      this.pedidoUtilService.getAllMaestro$().subscribe((data: any) => {
        if (data?.empresaActual?.ciudadess?.ciudadesEntrega) {
          this.ciudadesEntrega = data.empresaActual.ciudadess.ciudadesEntrega;
        }
      });
    }
  }

  ngOnInit(): void {
    this.estadosPago = Object.values(EstadoPago);
    // this.estadosProcesos = Object.values(EstadoProceso)
    this.estadosProcesos = Object.values(EstadoProcesoFiltros);
    this.validaciones = [
      { value: false, nombre: "No" },
      { value: true, nombre: "Si" },
    ];

    // Cargar configuración de columnas guardada
    this.loadColumnConfiguration();

    // Asegurar que las columnas estén en el orden correcto
    this.initializeColumns();

    // Debug: Verificar configuración de columnas
    console.log("Columnas mostradas:", this.displayedColumns);
    console.log("Columnas seleccionadas:", this.selectedColumns);
    console.log("¿Detalles visible?", this.isColumnVisible("detalles"));

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

  filtroGlobal(event: any) {
    const query = event.query;
    this.service.getOrderByName(query).then((res) => {
      this.filteredOrderNumbers = res;
      this.ordersByName = res;
    });
  }

  onOrderSelect(event) {
    console.log(event);
    this.orders = [event];
    // this.orders= this.ordersByName.filter(P=>)
  }

  checkPriceScale(pedido) {
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0;
    pedido.carrito.map((itemCarrito) => {
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
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
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
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
          } catch (error) {}
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
    // this.fechaInicial.setHours(0, 0, 0, 0);
    // this.fechaFinal.setHours(23, 59, 59, 999);

    const filter: any = {
      fechaInicial: this.fechaInicial + "T00:00:00.0000Z",
      fechaFinal: this.fechaFinal + "T23:59:59.9999Z",
      company: JSON.parse(sessionStorage.getItem("currentCompany")!)
        .nomComercial,
      tipoFecha: "fechaEntrega",
      estadoProceso: this.isFromProduction
        ? [EstadoProceso.SinProducir]
        : ["Todos"],
    };

    // Aplicar filtros rápidos
    if (this.quickFilters.estadoPago !== "all") {
      filter.estadosPago = [this.quickFilters.estadoPago];
    }

    if (this.quickFilters.estadoProceso !== "all" && !this.isFromProduction) {
      filter.estadoProceso = [this.quickFilters.estadoProceso];
    }

    // if (this.isFromProduction) {
    //   filter['estadosPago'] = ['Prependiente', 'PreAprobado', 'Aprobado']
    // }

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
        order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto;
        
        // Calcular anticipo basado en PagosAsentados si existen
        if (order.PagosAsentados && order.PagosAsentados.length > 0) {
          order.anticipo = order.PagosAsentados.reduce((acc, pago) => acc + (pago.valor || 0), 0);
        } else if (order.anticipo == null || order.anticipo == undefined) {
          order.anticipo = 0;
        }
        
        // Calcular falta por pagar basado en el total y anticipo real
        order.faltaPorPagar = Math.max(0, order.totalPedididoConDescuento - order.anticipo);
        
        // Actualizar estado de pago basado en los cálculos reales
        // SOLO recalcular estado si no viene ya calculado del frontend
        if (!order._estadoCalculadoEnFrontend && order.estadoPago !== 'Precancelado' && order.estadoPago !== 'Cancelado') {
          if (order.faltaPorPagar <= 0) {
            order.estadoPago = 'Aprobado';
          } else if (order.faltaPorPagar > 0 && order.faltaPorPagar < order.totalPedididoConDescuento) {
            order.estadoPago = 'PreAprobado';
          } else if (order.preAprobadoManual) {
            order.estadoPago = 'PreAprobado';
          } else {
            order.estadoPago = 'Pendiente';
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
      const anticipoReal = pedido.PagosAsentados && pedido.PagosAsentados.length > 0 
        ? pedido.PagosAsentados.reduce((sum, pago) => sum + (pago.valor || 0), 0)
        : (pedido.anticipo || 0);
      const faltaPorPagar = (pedido.totalPedididoConDescuento || 0) - anticipoReal;
      return acc + Math.max(0, faltaPorPagar); // Evitar valores negativos
    }, 0);
  }

  calculateTotalEnvio() {
    return this.orders.reduce((acc, pedido: any) => acc + pedido.totalEnvio, 0);
  }

  calculateAnticipo() {
    return this.orders.reduce((acc, pedido: any) => {
      // Calcular anticipo basado en PagosAsentados si existen
      const anticipoReal = pedido.PagosAsentados && pedido.PagosAsentados.length > 0 
        ? pedido.PagosAsentados.reduce((sum, pago) => sum + (pago.valor || 0), 0)
        : (pedido.anticipo || 0);
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

  pdfOrder(content, order: Pedido) {
    this.pedidoSeleccionado = order;
    this.htmlModal = this.paymentService.getHtmlContent(
      order,
      this.isFromProduction,
    );
    // this.renderer.setProperty(this.htmlPdf.nativeElement, 'innerHTML', this.htmlModal);
    this.modalService
      .open(content, {
        size: "lg",
        scrollable: true,
        centered: true,
        fullscreen: true,
        ariaLabelledBy: "modal-basic-title",
      })
      .result.then(
        (result) => {
          console.log(result);
          this.htmlModal = null;
        },
        (reason) => {
          console.log(reason);
        },
      );
  }

  produceOrder(order: Pedido) {
    this.producirPedido.emit(order);
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
    let printContents = document.getElementById("htmlPdf").innerHTML;
    // Suponiendo que printContents es tu string HTML
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = printContents;

    // Continuación después de eliminar los elementos no deseados

    // Selecciona todos los elementos h2 dentro de tempDiv
    const h2Elements = tempDiv.querySelectorAll("h2");

    h2Elements.forEach((h2) => {
      const h3 = document.createElement("h3");

      // Copia el contenido de h2 a h3
      h3.innerHTML = h2.innerHTML;

      // Opcional: Copia los atributos de h2 a h3
      Array.from(h2.attributes).forEach((attr) => {
        h3.setAttribute(attr.name, attr.value);
      });

      // Reemplaza h2 por h3 en el DOM
      h2.parentNode.replaceChild(h3, h2);
    });

    // Continúa con el resto del código...

    // IDs de los elementos a eliminar
    const idsToRemove = ["Encabezado", "piepagina", "publicidad"];

    idsToRemove.forEach((id) => {
      const element: any = tempDiv.querySelector(`#${id}`);
      if (element) {
        element.parentNode.removeChild(element);
      }
    });

    // Añade una clase para hacer el texto más pequeño
    tempDiv.classList.add("texto-pequeno");
    // Actualiza printContents con el HTML modificado
    printContents = tempDiv.innerHTML;

    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    // Elimina los paddings de document.body
    document.body.style.padding = "0";

    // Ajusta el tamaño de la letra
    document.body.style.fontSize = "small";

    // Opcional: Ajusta otros estilos para intentar hacer que todo quepa en una página
    document.body.style.lineHeight = "1.2";

    window.print();

    setTimeout(() => {
      // Restaura el contenido original del cuerpo después de un retraso
      // document.body.innerHTML = originalContents;
      window.location.reload();
      // O recarga la página para restablecer el estado completamente
      // window.location.reload();
    }, 500); // Ajusta el retraso según sea necesario
  }

  editDatosClientes(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
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
          console.log(result);
        },
        (reason) => {
          if (reason == "Cross click") {
            return;
          }
          this.clienteSeleccionado = null;
          order.cliente = reason;

          this.editOrder(order);
        },
      );
  }

  private editOrder(order: Pedido) {
    if (order.carrito.length > 0) {
      let fechaEntrega =
        order.carrito[0].configuracion?.datosEntrega?.fechaEntrega;
      let horarioEntrega =
        order.carrito[0].configuracion?.datosEntrega?.horarioEntrega;
      
      // Solo actualizar fechas si existen en la configuración
      if (fechaEntrega && fechaEntrega.year && fechaEntrega.month && fechaEntrega.day) {
        order.fechaEntrega = new Date(
          fechaEntrega.year,
          fechaEntrega.month - 1,
          fechaEntrega.day,
        ).toISOString();
      }
      
      if (horarioEntrega) {
        order.horarioEntrega = horarioEntrega;
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
      console.error('🚨 ABORT: Carrito vacío, no se actualizará nada');
      Swal.fire({
        icon: 'error',
        title: 'Error Crítico',
        text: 'El pedido no tiene productos. No se puede actualizar.',
        confirmButtonText: 'Recargar',
        preConfirm: () => window.location.reload()
      });
      return;
    }

    console.log('🛡️ VERIFICACIÓN OK: Carrito tiene', order.carrito.length, 'productos');
    
    // Crear objeto minimalista solo con notas para actualizar
    const notasUpdate = {
      _id: order._id,
      nroPedido: order.nroPedido,
      notasPedido: order.notasPedido,
      // INCLUIR CARRITO COMPLETO PARA ASEGURAR QUE NO SE PIERDA
      carrito: order.carrito
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
    console.log('💰 ACTUALIZANDO PAGOS EN BACKEND');
    console.log('Pagos a enviar:', order.PagosAsentados?.length || 0);
    console.log('Anticipo calculado:', order.anticipo);
    console.log('Falta por pagar:', order.faltaPorPagar);
    console.log('Estado de pago:', order.estadoPago);

    // Crear objeto con solo los campos relacionados a pagos
    const pagosUpdate = {
      _id: order._id,
      nroPedido: order.nroPedido,
      PagosAsentados: order.PagosAsentados || [],
      anticipo: order.anticipo,
      faltaPorPagar: order.faltaPorPagar,
      estadoPago: order.estadoPago,
      // Incluir campos mínimos para identificación
      totalPedididoConDescuento: order.totalPedididoConDescuento
    };

    this.ventasService.editOrder(pagosUpdate as any).subscribe({
      next: (data) => {
        console.log('✅ Pagos actualizados en backend exitosamente');
        
        // Actualizar el pedido en la lista SIN recargar todo
        const index = this.orders.findIndex(p => p.nroPedido === order.nroPedido);
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
        console.error('❌ Error actualizando pagos:', error);
        Swal.fire({
          icon: "error",
          title: "Error al actualizar pagos",
          text: "No se pudieron guardar los cambios en el servidor",
          confirmButtonText: "Reintentar"
        });
      }
    });
  }

  editDatosEntrega(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order;

    //inicializr formulario con los datos del cliente tiene las mismas propiedades
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
          console.log(result);
        },
        (reason) => {
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

  editDatosFacturacion(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order;

    //inicializr formulario con los datos del cliente tiene las mismas propiedades
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
          console.log(result);
        },
        (reason) => {
          if (reason == "Cross click") {
            return;
          }
          this.editOrder(order);
        },
      );
  }

  // edutar Notas
  editNotas(content, order: Pedido) {
    // VERIFICACIÓN CRÍTICA ANTES DE ABRIR MODAL
    if (!order.carrito || order.carrito.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'No se puede editar',
        text: 'Este pedido no tiene productos en el carrito.',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    
    console.log('🛡️ APERTURA SEGURA: Pedido tiene', order.carrito.length, 'productos');
    
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order; // NO hacer copia, usar referencia original
    //inicializr formulario con los datos del cliente tiene las mismas propiedades
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
          console.log(result);
        },
        (reason) => {
          if (reason == "Cross click") {
            return;
          }
          // CRÍTICO: Solo actualizar las notas, NO el pedido completo
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
        console.error('🚨 ALERTA CRÍTICA: El carrito original está vacío o corrupto');
        Swal.fire({
          icon: 'error',
          title: 'Error Crítico',
          text: 'Se detectó un problema con los productos del pedido. No se actualizarán las notas por seguridad.',
          confirmButtonText: 'Entendido'
        });
        return;
      }
      
      // Solo actualizar las notas manteniendo TODO lo demás intacto
      this.pedidoSeleccionado = {
        ...this.pedidoSeleccionado,
        notasPedido: event.notasPedido,
        // FORZAR que el carrito se mantenga exactamente igual
        carrito: carritoOriginalCompleto
      };
      
      // VERIFICACIÓN POST-ACTUALIZACIÓN
      const productosDespues = this.pedidoSeleccionado.carrito?.length || 0;
      
      if (productosDespues !== productosAntes) {
        console.error('🚨 PÉRDIDA DE PRODUCTOS DETECTADA');
        Swal.fire({
          icon: 'error',
          title: '¡PRODUCTOS PERDIDOS!',
          text: `Se perdieron productos: Antes ${productosAntes}, Después ${productosDespues}`,
          confirmButtonText: 'Recargar página',
          preConfirm: () => {
            window.location.reload();
          }
        });
        return;
      }
      
      console.log('✅ CARRITO PRESERVADO - Productos:', productosAntes);
      console.log('✅ NOTAS ACTUALIZADAS SEGURAMENTE');
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
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order;
    //inicializr formulario con los datos del cliente tiene las mismas propiedades
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
          console.log(result);
        },
        (reason) => {
          if (reason == "Cross click") {
            return;
          }
          this.editOrder(order);
        },
      );
  }

  cambiarEstadoPago(order: Pedido) {
    // this.editOrder(order);
    // if(order.estadoPago=='PreAprobado'){
    //   order.preAprobadoManual=true
    // }
    this.modalService.dismissAll();
  }

  confProductToCart(content, carritoConfiguracion: Carrito, order: Pedido) {
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
          console.log(result);
        },
        (configuracionResult) => {
          if (configuracionResult == "Cross click") {
            return;
          }
          this.configuracionCarritoSeleccionado = configuracionResult;
          const index = order.carrito.findIndex(
            (carrito) =>
              carrito.producto.identificacion.referencia ===
              configuracionResult?.producto.identificacion.referencia,
          );
          if (index !== -1) {
            order.carrito[index] = configuracionResult;
          }

          // ===== NUEVO: Recalcular valor de envío (domicilio) =====
          // Si alguna línea del carrito tiene una forma de entrega que incluya la palabra "domicilio",
          // se calcula el envío con base en la zona de cobro; de lo contrario se pone en 0 (recoge en tienda).
          const tieneDomicilio = (order.carrito ?? []).some(car => {
            const forma = car?.configuracion?.datosEntrega?.formaEntrega || '';
            return forma.toLowerCase().includes('domicilio');
          });

          if (tieneDomicilio) {
            // Utilizar el servicio utilitario para obtener el costo de envío según la zona
            this.pedidoUtilService.pedido = order;
            try {
              order.totalEnvio = Number(this.pedidoUtilService.getShippingCost(this.allBillingZone));
            } catch (e) {
              // Fallback si las zonas no están aún en memoria
              const zonas = this.allBillingZone || JSON.parse(sessionStorage.getItem('allBillingZone') || '[]');
              order.totalEnvio = Number(this.pedidoUtilService.getShippingCost(zonas));
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
          console.log(result);
        },
        (configuracionResult) => {
          if (configuracionResult == "Cross click") {
            return;
          }
          order.carrito?.push(configuracionResult);
          // actualizar valores del pedido
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
      order.totalEnvio,
    );
    return order;
  }

  deleteProductToCart(order: Pedido, carrito: Carrito) {
    const index: any = order.carrito?.findIndex(
      (carrito: any) =>
        carrito.producto.identificacion.referencia ===
        carrito.producto.identificacion.referencia,
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
    if (order.asesorAsignado.nit === "9999") {
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
          const userString = localStorage.getItem("user");
          const user = JSON.parse(userString) as UserLogged;
          const userLite: UserLite = {
            name: user.name,
            email: user.email,
            nit: user.nit,
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
      company: JSON.parse(sessionStorage.getItem("currentCompany")!)
        .nomComercial,
      estadoProceso: this.isFromProduction
        ? [EstadoProceso.SinProducir]
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
    //validar sino hace falta por pagar

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
          console.log(result);
        },
        (reason) => {
          if (reason == "Cross click") {
            return;
          }

          // El reason contiene el pedido actualizado con los pagos
          if (reason && reason.nroPedido) {
            // Actualizar el pedido en la lista inmediatamente
            const index = this.orders.findIndex(p => p.nroPedido === reason.nroPedido);
            if (index !== -1) {
              this.orders[index] = { ...reason };
              console.log('✅ Pedido actualizado en lista con pagos:', reason.PagosAsentados?.length || 0);
            }
            
            // Usar método específico para pagos en lugar de editOrder general
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
  }

  secondEvent(ev): void {
    if (ev < this.fechaInicial) {
      this.fechaInicial = ev;
      this.clearFilter();
    }
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
      {
        field: "vendedor",
        header: "Vendedor",
        visible: false,
        type: "text",
        filterable: true,
      },
    ];

    // Re-inicializar para asegurar orden correcto
    this.initializeColumns();

    // Asegurar que selectedColumns mantenga el orden correcto con 'detalles' primero
    this.selectedColumns = this.displayedColumns.filter((col) => col.visible);
    this.saveColumnConfiguration();
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
  }

  clearSearchFilter(): void {
    this.nroPedido = null;
    this.orders = [];
    this.refrescarDatos();
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
  }

  // Métodos para filtros rápidos (movido abajo para evitar duplicación)

  clearQuickFilter(type: "estadoPago" | "estadoProceso"): void {
    this.quickFilters[type] = "all";
    this.refrescarDatos();
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
      this.saveFiltersState();
    }
    this.refrescarDatos();
  }

  // Métodos para persistir estado de filtros
  private loadFiltersState(): void {
    const savedState = localStorage.getItem("ventasFiltersState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        this.showFilters = state.showFilters || false;
        // Si hay filtros activos, abrir automáticamente
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
      this.saveFiltersState();
    }
    this.refrescarDatos();
  }

  // ==================== BODEGAS ====================
  private cargarBodegas(): void {
    this.bodegaService.getBodegasByChannelName('Venta Asistida').subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
      },
      error: () => {
        console.error('Error cargando bodegas');
      }
    });
  }

  onWarehouseChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedId = target.value;
    const selected = this.bodegas.find(b => b.idBodega === selectedId);

    if (selected) {
      this.selectedWarehouse = selected;

      if (this.recompraCmp) {
        // Pasar objeto completo de bodega para mantener formato de filtro en e-commerce (igual que Crear-Ventas)
        this.recompraCmp.bodega = selected;
        if (typeof this.recompraCmp.filtrarProductos === 'function') {
          this.recompraCmp.filtrarProductos();
        }
      }
    } else {
      this.selectedWarehouse = null;
    }
  }

  // === Maneja el evento citySelected proveniente de app-ecomerce-products ===
  onCitySelect(ciudad: any): void {
    if (ciudad && ciudad !== 'seleccione') {
      this.ciudadSeleccionada = ciudad;
    } else {
      this.ciudadSeleccionada = '';
    }
  }
}
