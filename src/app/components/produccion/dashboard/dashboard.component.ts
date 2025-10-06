import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Table } from 'primeng/table';
import { PaymentService } from 'src/app/shared/services/ventas/payment.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { jsPDF } from 'jspdf';
// import * as jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import { FormBuilder, Validators } from '@angular/forms';
import { UserLogged } from 'src/app/shared/models/User/UserLogged';
import { UserLite } from 'src/app/shared/models/User/UserLite';
import { ClientesComponent } from '../../ventas/clientes/clientes.component';
import { PedidoEntregaComponent } from '../../ventas/entrega/pedido-entrega.component';
import { Pedido, Cliente, EstadoPago, Carrito, EstadoProceso } from '../../ventas/modelo/pedido';
import { PedidosUtilService } from '../../ventas/service/pedidos.util.service';
import { ProduccionService } from 'src/app/shared/services/produccion/produccion.service';
import { ProduccionNewService } from 'src/app/shared/services/produccion/produccion-new.service';
import { Detalle, DetallePedido, PedidoParaProduccion, PedidosParaProduccionEnsamble } from '../../../shared/models/produccion/Produccion';
import { FilterMatchMode, PrimeIcons, PrimeNGConfig, TreeNode } from 'primeng/api';
import { UtilsService } from 'src/app/shared/services/utils.service';
import { EstadoProcesoItem, PiezasProduccion } from '../../../shared/models/productos/otrosprocesos';
import { icons } from 'feather-icons';
import { stat } from 'fs';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import { FilterService } from 'primeng/api';
import { finalize } from 'rxjs';
import { parse } from 'flatted';
import { ListOrdersComponent } from '../../ventas/list/list.component';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ProduccionDirectService } from 'src/app/shared/services/produccion/produccion-direct.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('clientes', { static: false }) clientes: ClientesComponent;
  @ViewChild('entrega', { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild('listOrders', { static: false }) listaPedidos: ListOrdersComponent;
  orders: PedidoParaProduccion[] = [];
  orderResponse: { orders: PedidoParaProduccion[], ordersRaw: Pedido[] } = { orders: [], ordersRaw: [] };
  ordersEnsamble: PedidosParaProduccionEnsamble[] = [];
  AllOrdersEnsamble: PedidosParaProduccionEnsamble[] = [];
  loading: boolean = true;
  totalValorProductoBruto: number;
  showMetrics: boolean = false; // Ocultar métricas por defecto
  totalDescuento: number;
  htmlModal: any;
  clienteSeleccionado: Cliente;
  formulario: any;
  pedidoSeleccionado: Pedido;
  estadosPago = Object.values(EstadoPago);
  ciudadSeleccionada: string;
  ESTADOPAGO: any[]
  articuloEnsambleSelected: PedidosParaProduccionEnsamble;


  ESTADOPEDIDO = [
    { id: 1, nombre: 'Pendiente' },
    { id: 2, nombre: 'Pagado' },
    { id: 3, nombre: 'Anulado' },
    { id: 4, nombre: 'Devuelto' }
  ];
  representatives: { name: string; image: string; }[];
  configuracionCarritoSeleccionado: Carrito;
  fechaInicial: Date | null;
  fechaFinal: Date | null;
  horariosEntrega: any[] = [{
    nroPedido: '123',
    horarioEntrega: '10:00-12:00'
  }];

  filterProcess: any[
  ]
  events: any[
  ]
  selectedProcesos: any;
  selectedProcesosFilter: any;
  procesoGlobal = "Proceso Empaque Producción"
  productsToClose: DatosProducto[];
  // Control para tipo de agrupación
  agruparSoloPorArticulo: boolean = false;
  filterProcessCombo: any[];

  columns = [
    { field: 'nombreArticulo', header: 'Artículo', icon: 'pi pi-box', description: 'Nombre del artículo a fabricar' },
    { field: 'nombreProducto', header: 'Producto', icon: 'pi pi-shopping-bag', description: 'Producto principal asociado' },
    { field: 'proceso', header: 'Proceso', icon: 'pi pi-cog', description: 'Estado del proceso de fabricación' },
    { field: 'estadoPago', header: 'Estado Pago', icon: 'pi pi-credit-card', description: 'Estado de pago del pedido' },
    { field: 'tracking', header: 'Tracking', icon: 'pi pi-search', description: 'Seguimiento detallado del proceso' },
    { field: 'cantidadTotalProducto', header: 'Cantidad', icon: 'pi pi-hashtag', description: 'Cantidad total a producir' },
    { field: 'cantidadTotalProductoEnsamble', header: 'Ensamble', icon: 'pi pi-th-large', description: 'Cantidad total en ensamble' },
    { field: 'fechaEntrega', header: 'Entrega', icon: 'pi pi-calendar', description: 'Fecha programada de finalización' },
    { field: 'horarioEntrega', header: 'Horario', icon: 'pi pi-clock', description: 'Horario programado de finalización' }
  ];
  selectedColumns = [...this.columns];

  // Nuevas propiedades para métricas y alertas
  pedidosUrgentes: PedidosParaProduccionEnsamble[] = [];
  pedidosEnRiesgo: PedidosParaProduccionEnsamble[] = [];
  pedidosNormales: PedidosParaProduccionEnsamble[] = [];
  procesosEficiencia: any[] = [];
  capacidadUtilizada: number = 0;
  ensamblesPendientes: number = 0;
  ensamblesProceso: number = 0;
  ensamblesCompletados: number = 0;

  // Añadir una propiedad para controlar la densidad de la tabla
  tableDensity: 'compact' | 'normal' | 'expanded' = 'normal';

  // Opciones para los modos de coincidencia en español
  matchMode: string = 'startsWith';
  matchModeOptions = [
    { label: 'Coincide con todo', value: 'equals' },
    { label: 'Comienza con', value: 'startsWith' },
    { label: 'Contiene', value: 'contains' },
    { label: 'No contiene', value: 'notContains' },
    { label: 'Termina con', value: 'endsWith' }
  ];

  // Propiedades para filtros modernos (inspirados en ventas/list)
  showFilters: boolean = false;
  nroPedido: string | null = null;

  // Filtros rápidos para producción
  quickFilters = {
    estadoPago: 'all',
    estadoProceso: 'all'
  };

  clienteAutocomplete: any[] = [];

  procesoParaImprimir: any = null;
  fechaParaImprimir: Date = new Date();
  listaPorProcesoParaImprimir: { producto: string, articulo: string, cantidad: number, fecha?: string }[] = [];

  @ViewChild('vistaPreviaImpresionModal', { static: false }) vistaPreviaImpresionModal: any;

  estadosProcesoParaImprimir = [
    { label: 'Todos', value: 'Todos' },
    { label: 'Sin Producir', value: 'SinProducir' },
    { label: 'En Proceso', value: 'EnProceso' },
    { label: 'Completado', value: 'Completado' }
  ];
  estadoParaImprimir: string = 'Todos';

  // Variable para almacenar las fechas disponibles por proceso
  fechasDisponiblesPorProceso: { [proceso: string]: Date[] } = {};

  // Variable para almacenar las fechas disponibles para mostrar en la UI
  fechasDisponiblesParaUi: Date[] = [];

  constructor(
    private produccionService: ProduccionNewService,
    private ventasService: VentasService,
    private config: PrimeNGConfig,
    private paymentService: PaymentService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private utilService: UtilsService,
    private filterService: FilterService,
    private changeDetectorRef: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.registerCustomFilters();



    this.events = [
      { status: 'Delivered', date: '16/10/2020 10:00', icon: PrimeIcons.CHECK, color: '#607D8B' }
    ];


    const cincoDias = 30 * 24 * 60 * 60 * 1000; // Cinco días en milisegundos
    this.fechaInicial = new Date();
    this.fechaFinal = new Date(new Date().getTime() + cincoDias);


    this.config.filterMatchModeOptions = {
      text: [
        FilterMatchMode.STARTS_WITH,
        FilterMatchMode.CONTAINS,
        FilterMatchMode.NOT_CONTAINS,
        FilterMatchMode.ENDS_WITH,
        FilterMatchMode.EQUALS,
        FilterMatchMode.NOT_EQUALS
      ],
      numeric: [
        FilterMatchMode.EQUALS,
        FilterMatchMode.NOT_EQUALS,
        FilterMatchMode.LESS_THAN,
        FilterMatchMode.LESS_THAN_OR_EQUAL_TO,
        FilterMatchMode.GREATER_THAN,
        FilterMatchMode.GREATER_THAN_OR_EQUAL_TO
      ],
      date: [
        FilterMatchMode.DATE_IS,
        FilterMatchMode.DATE_IS_NOT,
        FilterMatchMode.DATE_BEFORE,
        FilterMatchMode.DATE_AFTER
      ]
    }
  }

  private registerCustomFilters() {
    this.filterService.register('horarioEntregaCustom', (value, filter): boolean => {
      if (!filter) {
        return true;
      }
      if (value === undefined || value === null) {
        return false;
      }


      const result = filter.some((item) => {
        const filterString = "Pedido: " + item.nroPedido + ' - ' + item.horarioEntrega;
        return value.includes(item.horarioEntrega.toString());
      });
      return result;

    });

    this.filterService.register('customDate', (value, filter): boolean => {
      if (filter === undefined || filter === null) {
        return true;
      }

      if (value === undefined || value === null) {
        return false;
      }

      const valueTransformed = value.toString().split(' - ')

      const result = valueTransformed.some((element) => {
        if (!/(\d{2})\/(\d{2})\/(\d{4})/.test(element)) {
          return false;
        }

        // Convertir valores a Date para comparación
        // const filterDate = new Date(filter.split('/').reverse().join('-'));
        const valueDate = new Date(element.split('/').reverse().join('-') + 'T00:00:00');
        return valueDate.getTime() === filter.getTime();

      });

      return result;

    });
  }

  ngOnInit(): void {
    this.estadosPago = Object.values(EstadoPago);
    this.ESTADOPAGO = [
      { id: 1, nombre: 'Pendiente' },
      { id: 2, nombre: 'Pospendiente' },
      { id: 3, nombre: 'PreAprobado' },
      { id: 4, nombre: 'Aprobado' },
      { id: 5, nombre: 'Rechazado' },
      { id: 6, nombre: 'Precancelado' },
      { id: 7, nombre: 'Cancelado' }
    ];
    this.selectedColumns = [...this.columns];

    // Cargar estado de filtros guardado (incluye inicialización de defaults si no hay datos guardados)
    this.loadFiltersFromStorage();

    this.refrescarDatosEnsamble();
  }

  /**
   * Alterna la visibilidad de las métricas avanzadas
   */
  toggleMetrics(): void {
    this.showMetrics = !this.showMetrics;
  }

  async refrescarDatos() {
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      estadosPago: ['Pospendiente', 'PreAprobado', 'Aprobado', 'Pendiente'],
      company: JSON.parse(localStorage.getItem("currentCompany") || '{}').nomComercial || ''
    }
    this.loading = true;
    const context = this;
    this.produccionService.getOrdersByFiltersFlatProduct(filter).subscribe(
      (data) => {
        this.loading = false;
        this.orderResponse = data;
        this.orders = data.orders;
      },
      (error) => {
        this.loading = false;
        console.error('Error al cargar los datos:', error);
      }
    );
  }

  filterHorarioEntrega(value: string) {
    this.filterService.filters['horarioEntrega'](value, "contains")
  }

  clear(table: Table) {
    table.clear();
    this.selectedProcesosFilter = null;
    this.ordersEnsamble = this.utilService.deepClone(this.AllOrdersEnsamble);
  }

  refrescar(table: Table) {
    this.refrescarDatos();
    table.clear();
  }

  refrescarEnsamble(table: Table) {
    this.refrescarDatosEnsamble();
    table.clear();
  }

  initForms(cliente: Cliente) {
    this.formulario = this.formBuilder.group({
      // Datos del comprador
      nombres_completos: [cliente.nombres_completos || "", Validators.required],
      tipo_documento_comprador: [cliente.tipo_documento_comprador || "", Validators.required],
      documento: [cliente.documento || "", Validators.required],
      indicativo_celular_comprador: [cliente.indicativo_celular_comprador || "", Validators.required],
      numero_celular_comprador: [cliente.numero_celular_comprador || "", Validators.required],
      correo_electronico_comprador: [
        cliente.correo_electronico_comprador || "",
        [Validators.required, Validators.email],
      ],
      indicativo_celular_whatsapp: [cliente.indicativo_celular_whatsapp || "", Validators.required],
      numero_celular_whatsapp: [cliente.numero_celular_whatsapp || "", Validators.required],
      datosFacturacionElectronica: [cliente.datosFacturacionElectronica || [""]],
      datosEntrega: [cliente.datosEntrega || [""]],
      notas: [cliente.notas || [""]],
      estado: [cliente.estado || "Activo"],
    });
  }



  pdfOrder(content, order: Pedido) {
    this.htmlModal = this.paymentService.getHtmlContent(order);
    this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      this.htmlModal = null;
    }
      , (reason) => {
      });
  }

  imprimirToPdf() {
    const DATA = document.getElementById('htmlPdf');

    // Validar que el elemento exista
    if (!DATA) {
      console.error('No se encontró el elemento con ID "htmlPdf"');
      return;
    }

    const options = {
      useCORS: true,
      allowTaint: true,
      logging: true, // Para depuración, puede desactivarse en producción
    };

    html2canvas(DATA, options).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF();

      // Ajustes para el tamaño del PDF
      const imgWidth = 210; // Ancho de un A4 en mm
      const pageHeight = 295;  // Altura de un A4 en mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, heightLeft);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('tu-archivo-pdf.pdf');
    });
  }


  private editOrder(order: Pedido) {
    this.ventasService.editOrder(order).subscribe(
      (data) => {
        // Ejecutar dentro de NgZone para asegurar la detección de cambios
        this.ngZone.run(() => {
          // Refrescar datos de la pestaña plano
          this.refrescarDatos();

          // Refrescar datos de la pestaña ensamble (la vista principal de producción)
          this.refrescarDatosEnsamble();

          // Dar tiempo para que Angular procese los cambios antes de refrescar el componente hijo
          setTimeout(() => {
            // También refrescar la lista de pedidos si está visible
            if (this.listaPedidos) {
              this.listaPedidos.refrescarDatos();
              // Forzar la detección de cambios
              this.changeDetectorRef.detectChanges();
              this.changeDetectorRef.markForCheck();
            }
          }, 500);

          Swal.fire({
            icon: 'success',
            title: 'Pedido  actualizado correctamente',
            showConfirmButton: false,
            timer: 1500
          });
        });
      },
      (error) => {
        console.error('Error al actualizar el pedido:', error);

        // Ejecutar dentro de NgZone incluso en caso de error
        this.ngZone.run(() => {
          // Refrescar datos incluso en caso de error para mantener sincronización
          this.refrescarDatos();
          this.refrescarDatosEnsamble();

          setTimeout(() => {
            if (this.listaPedidos) {
              this.listaPedidos.refrescarDatos();
              this.changeDetectorRef.detectChanges();
            }
          }, 500);

          Swal.fire({
            icon: 'error',
            title: 'Error al actualizar el pedido',
            text: 'Por favor, intente nuevamente',
            showConfirmButton: true
          });
        });
      }
    );
  }

  // Helper functions for data validation
  private isValidPedido(pedido: Pedido): boolean {
    return !!(
      pedido &&
      pedido._id &&
      pedido.carrito &&
      Array.isArray(pedido.carrito) &&
      pedido.carrito.length > 0
    );
  }

  private isValidOrdersArray(orders: Pedido[]): boolean {
    return !!(
      orders &&
      Array.isArray(orders) &&
      orders.length > 0 &&
      orders.every(order => this.isValidPedido(order))
    );
  }

  private logOrdersValidationError(orders: Pedido[], context: string): void {
    console.error(`[${context}] Invalid orders array:`, {
      orders,
      isArray: Array.isArray(orders),
      length: orders?.length,
      isEmpty: !orders || orders.length === 0,
      hasInvalidOrders: orders?.some(order => !this.isValidPedido(order))
    });
  }

  private editMultipleOrders(orders: Pedido[]) {
    // Final validation before API call
    if (!this.isValidOrdersArray(orders)) {
      console.error('editMultipleOrders: Invalid orders array passed to method');
      return;
    }

    console.log(`editMultipleOrders: Processing ${orders.length} orders`);

    this.ventasService.editMultipleOrders({ orders: orders }).subscribe(
      (data) => {
        console.log('editMultipleOrders: Success response:', data);
        this.refrescarDatos();
        Swal.fire({
          icon: 'success',
          title: 'Pedidos actualizados correctamente',
          showConfirmButton: false,
          timer: 1500
        });
      },
      (error) => {
        console.error('editMultipleOrders: API error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar los pedidos',
          text: error?.message || 'Error desconocido al actualizar pedidos',
          showConfirmButton: true
        });
      }
    );
  }


  convertFechaEntregaString(fechaEntrega: { day: number, month: number, year: number }) {
    if (!fechaEntrega) {
      return '';
    }
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }


  confProductToCart(content, carritoConfiguracion: Carrito, order: Pedido) {
    this.configuracionCarritoSeleccionado = carritoConfiguracion;

    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {

    }, (configuracionResult) => {
      if (configuracionResult == 'Cross click') {
        return;
      }
      this.configuracionCarritoSeleccionado = configuracionResult;

      // Verificar si order.carrito existe
      if (!order.carrito) {
        console.error('El carrito del pedido no existe');
        return;
      }

      const index = order.carrito.findIndex((carrito) =>
        carrito && carrito.producto && carrito.producto.identificacion &&
        configuracionResult && configuracionResult.producto && configuracionResult.producto.identificacion &&
        carrito.producto.identificacion.referencia === configuracionResult.producto.identificacion.referencia
      );

      if (index !== -1) {
        order.carrito[index] = configuracionResult;
      }
      // this.editOrder(order);
    });
  }

  handleChange(e) {
    var index = e.index;
    switch (index) {
      case 0:
        this.refrescarDatosEnsamble();
        break;
      case 1:
        this.listaPedidos.refrescarDatos();
        break;
    }
  }
  handleFilter(event: any) {
    // Aquí puedes añadir lógica adicional según necesites
  }

  /**
   * Alterna entre los modos de agrupación y refresca los datos
   */
  toggleGrouping() {
    this.agruparSoloPorArticulo = !this.agruparSoloPorArticulo;
    this.refrescarDatosEnsamble();
  }

  /**
   * Agrupa los datos solo por artículo, concatenando productos separados por comas
   */
  private agruparPorArticulo(dataEnsamble: any[]): PedidosParaProduccionEnsamble[] {
    console.log('🧮 [DEBUG] Iniciando agrupación por artículo - Items de entrada:', dataEnsamble.length);
    const resultadoAgrupado = dataEnsamble.reduce((acumulador, item) => {
      const clave = item.nombreArticulo.trim(); // Solo por artículo

      if (!acumulador[clave]) {
        acumulador[clave] = {
          nombreProducto: item.nombreProducto, // Primer producto
          nombreArticulo: item.nombreArticulo.trim(),
          productos: [item.nombreProducto], // Array de productos
          detalles: [],
          detallePedido: [],
          cantidadTotalProducto: 0,
          cantidadTotalProductoEnsamble: 0
        };
      }

      // Agregar producto si no existe ya en la lista
      if (!acumulador[clave].productos.includes(item.nombreProducto)) {
        acumulador[clave].productos.push(item.nombreProducto);
      }

      const detalle: Detalle = {
        nombreProceso: item.nombreProceso,
        centroTrabajo: item.centroTrabajo,
        cantidadArticulo: item.cantidadArticulo,
        nroPedido: item.nroPedido
      };

      const detallePedido: DetallePedido = {
        orderId: item.orderId,
        nroPedido: item.nroPedido,
        estadoPago: item.estadoPago,
        fechaCompra: item.fechaCompra,
        fechaEntrega: item.fechaEntrega,
        formaEntrega: item.formaEntrega,
        horarioEntrega: item.horarioEntrega,
        estadoProceso: item.estadoProceso,
        cantidad: Number(item.cantidadProducto) || 0,
        cantidadArticulosPorPedido: (Number(item.cantidadArticulo) || 0) * (Number(item.cantidadTotalProductoEnsamble) || 0),
        historialPiezasProducidas: item.historialPiezasProducidas || [],
        piezasProducidas: 0,
        proceso: item.nombreProceso,
        nombreProducto: item.nombreProducto
      };

      // Crear clave compuesta para evitar duplicados por producto+pedido
      const claveDetallePedido = `${detallePedido.nroPedido}|${item.nombreProducto}`;

      // Validar duplicados usando clave compuesta
      if (acumulador[clave].detallePedido.findIndex((detalle) =>
        `${detalle.nroPedido}|${detalle.nombreProducto}` === claveDetallePedido) === -1) {

        // Convertir valores a números para evitar concatenación de strings
        const cantidadProductoNum = Number(item.cantidadProducto) || 0;
        const cantidadArticuloNum = Number(item.cantidadArticulo) || 0;

        console.log(`🧮 [DEBUG] Agregando: ${item.nombreProducto} -> ${item.nombreArticulo} (Pedido: ${item.nroPedido})`);
        console.log(`🧮 [DEBUG] - Cantidad Producto: ${item.cantidadProducto} (tipo: ${typeof item.cantidadProducto}) -> ${cantidadProductoNum} (número)`);
        console.log(`🧮 [DEBUG] - Cantidad Artículo: ${item.cantidadArticulo} (tipo: ${typeof item.cantidadArticulo}) -> ${cantidadArticuloNum} (número)`);

        //valida si el detallePedido ya existe
        if (acumulador[clave].detallePedido.findIndex((detalle) => detalle.nroPedido === detallePedido.nroPedido) === -1) {
          acumulador[clave].detallePedido.push(detallePedido);
        }
        else {
          //sumar los valores de los detalles
          acumulador[clave].detallePedido.forEach(detalle => {
            if (detalle.nroPedido === detallePedido.nroPedido) {
              detalle.cantidad += detallePedido.cantidad;
              detalle.cantidadArticulosPorPedido += detallePedido.cantidadArticulosPorPedido;
            }
          });
        }

        // Usar valores numéricos para evitar concatenación de strings
        acumulador[clave].cantidadTotalProducto += cantidadProductoNum;
        acumulador[clave].cantidadTotalProductoEnsamble += cantidadArticuloNum;

        console.log(`🧮 [DEBUG] - Totales acumulados: Productos=${acumulador[clave].cantidadTotalProducto} (tipo: ${typeof acumulador[clave].cantidadTotalProducto}), Artículos=${acumulador[clave].cantidadTotalProductoEnsamble} (tipo: ${typeof acumulador[clave].cantidadTotalProductoEnsamble})`);
      }

      acumulador[clave].detalles.push(detalle);

      return acumulador;
    }, {});

    // Convertir a resultado final, concatenando productos con comas
    const resultado = Object.values(resultadoAgrupado).map((grupo: any) => {
      console.log(`🧮 [DEBUG] Procesando artículo final: ${grupo.nombreArticulo}`);
      console.log(`🧮 [DEBUG] - Productos: ${grupo.productos.join(', ')}`);
      console.log(`🧮 [DEBUG] - Cantidad total productos: ${grupo.cantidadTotalProducto}`);
      console.log(`🧮 [DEBUG] - Cantidad total artículos: ${grupo.cantidadTotalProductoEnsamble}`);

      return {
        nombreProducto: grupo.productos.join(', '), // Concatenar con comas
        nombreArticulo: grupo.nombreArticulo,
        cantidadTotalProducto: grupo.cantidadTotalProducto,
        detallePedido: grupo.detallePedido,
        fechaEntrega: this.getFechaEntregaProgramada(grupo.detallePedido),
        horarioEntrega: this.getHorarioEntregaProgramada(grupo.detallePedido),
        tracking: [],
        // Para agrupación por artículo, usar directamente la cantidad acumulada de artículos
        cantidadTotalProductoEnsamble: grupo.cantidadTotalProductoEnsamble,
        detalles: grupo.detalles
      } as PedidosParaProduccionEnsamble;
    });

    console.log('🧮 [DEBUG] Resultado final agrupación por artículo:', resultado.length, 'grupos');
    return resultado;
  }

  refrescarDatosEnsamble() {
    let fechaInicial = this.fechaInicial;
    let fechaFinal = this.fechaFinal;

    // Si no hay fechas configuradas, usar rango por defecto (hoy a 30 días)
    if (!fechaInicial) {
      fechaInicial = new Date();
    }
    if (!fechaFinal) {
      fechaFinal = new Date(new Date().getTime() + (30 * 24 * 60 * 60 * 1000));
    }

    // Corregir si las fechas están al revés
    if (fechaInicial > fechaFinal) {
      const temp = fechaInicial;
      fechaInicial = fechaFinal;
      fechaFinal = temp;
    }

    // Configurar horas: fecha inicial 00:00, fecha final 23:59
    const fechaInicialFormatted = new Date(fechaInicial);
    fechaInicialFormatted.setHours(0, 0, 0, 0);

    const fechaFinalFormatted = new Date(fechaFinal);
    fechaFinalFormatted.setHours(23, 59, 59, 999);

    // Configurar estados de pago basado en filtros modernos
    let estadosPago = [EstadoPago.Pospendiente, EstadoPago.PreAprobado, EstadoPago.Aprobado, EstadoPago.Pendiente];
    if (this.quickFilters.estadoPago !== "all") {
      estadosPago = [this.quickFilters.estadoPago as unknown as EstadoPago];
    }

    // Configurar estados de proceso basado en filtros modernos
    let estadoProceso = ['En proceso', 'En ensamble'];
    if (this.quickFilters.estadoProceso !== "all") {
      estadoProceso = [this.quickFilters.estadoProceso];
    }

    const filter = {
      fechaInicial: fechaInicialFormatted,
      fechaFinal: fechaFinalFormatted,
      estadosPago: estadosPago,
      estadoProceso: estadoProceso,
      company: JSON.parse(localStorage.getItem("currentCompany") || '{}').nomComercial || '',
      // Incluir filtro de proceso si está seleccionado
      proceso: this.selectedProcesosFilter ? this.selectedProcesosFilter.nombre : null
    }

    console.log('🔍 [DEBUG] Filtro enviado al API:', filter);
    console.log('🔍 [DEBUG] Proceso seleccionado:', this.selectedProcesosFilter);

    this.produccionService.getOrdersByFiltersFlatProduct(filter).subscribe((data) => {
      console.log('📡 [DEBUG] Respuesta del API recibida:', data);
      console.log('📡 [DEBUG] Cantidad de órdenes del API:', data.orders?.length || 0);
      let filteredOrders = data.orders;

      // Aplicar filtro por número de pedido si existe
      if (this.nroPedido && this.nroPedido.trim() !== '') {
        filteredOrders = filteredOrders.filter(pedido =>
          pedido.nroPedido && pedido.nroPedido.toLowerCase().includes(this.nroPedido!.toLowerCase())
        );
      }

      this.filterProcess = filteredOrders.flatMap((pedido) => {

        return pedido.producto.otrosProcesos.modulosVariables.produccion.flatMap((produccion) => {
          return produccion.procesos.flatMap((proceso, index) => {
            return {
              label: proceso.nombre,
              value: {
                nombre: proceso.nombre, position: index
              }
            }
          })
        });
      }
      ).filter((item, index, self) =>
        index === self.findIndex((t) => (
          t.label === item.label
        ))
      );

      this.filterProcessCombo = this.utilService.deepClone(this.filterProcess);


      let dataEnsamble = filteredOrders.flatMap((pedido) => {
        let articulosConProcesos = [];
        const variables: TreeNode[] = parse(pedido.producto.procesoComercial.variablesForm);

        if (!pedido.producto.crearProducto?.paraProduccion) {
          return [];
        }

        const procesosDefinidios = pedido.producto.otrosProcesos.modulosVariables.produccion.flatMap((produccion) => {

          const isVariable = variables.some(variable =>
            variable.children.some(child =>
              child.data.titulo === produccion.titulo
            )
          );

          const posibleNombreArticulo = pedido.configuracion.preferencias.filter(p => p.paraProduccion).filter(p => p.subtitulo == produccion.titulo)
          if (posibleNombreArticulo.length > 0) {
            produccion.titulo = posibleNombreArticulo[0].titulo + ": " + posibleNombreArticulo[0].subtitulo;
          }
          else {
            if (isVariable) {
              //no debe devolver nada
              return [];
            }
          }
          return produccion.procesos.flatMap((proceso) => {
            return proceso.centrosTrabajo.flatMap((centrosTrabajo) => {
              return {
                nombreProceso: proceso.nombre,
                nombreArticulo: produccion.titulo,
                cantidadArticulo: produccion.cantidadUnitaria,
                produccion: produccion,
                centroTrabajo: centrosTrabajo,
                referenciaProducto: pedido.producto.identificacion.referencia,
                nombreProducto: pedido.producto.crearProducto.titulo,
                cantidadProducto: pedido.cantidad,
                cantidadTotalProductoEnsamble: pedido.cantidad,
                orderId: pedido.orderId,
                nroPedido: pedido.nroPedido,
                estadoPago: pedido.estadoPago,
                fechaCompra: pedido.fechaCompra,
                fechaEntrega: pedido.fechaEntrega,
                formaEntrega: pedido.formaEntrega,
                horarioEntrega: pedido.horarioEntrega,
                estadoProceso: pedido.estadoProceso,
                historialPiezasProducidas: proceso?.historialPiezasProducidas,
                piezasPorPedido: proceso.piezasPorPedido
              }
            });
          });

        }).flat();

        articulosConProcesos = articulosConProcesos.concat(procesosDefinidios);




        return articulosConProcesos;
      });

      console.log(dataEnsamble);

      const resultadoAgrupado = dataEnsamble.reduce((acumulador, item) => {
        const clave = `${item.nombreProducto}|${item.nombreArticulo}`;
        if (!acumulador[clave]) {
          acumulador[clave] = {
            nombreProducto: item.nombreProducto,
            nombreArticulo: item.nombreArticulo,
            detalles: [],
            detallePedido: [],
            cantidadTotalProducto: 0,
            cantidadTotalProductoEnsamble: 0
          };
        }
        const detalle: Detalle = {
          nombreProceso: item.nombreProceso,
          centroTrabajo: item.centroTrabajo,
          cantidadArticulo: item.cantidadArticulo,
          nroPedido: item.nroPedido

        };


        const detallePedido: DetallePedido = {
          orderId: item.orderId,
          nroPedido: item.nroPedido,
          estadoPago: item.estadoPago,
          fechaCompra: item.fechaCompra,
          fechaEntrega: item.fechaEntrega,
          formaEntrega: item.formaEntrega,
          horarioEntrega: item.horarioEntrega,
          estadoProceso: item.estadoProceso,
          cantidad: Number(item.cantidadProducto) || 0,
          cantidadArticulosPorPedido: (Number(item.cantidadArticulo) || 0) * (Number(item.cantidadTotalProductoEnsamble) || 0),
          historialPiezasProducidas: item.historialPiezasProducidas || [],
          piezasProducidas: 0,
          proceso: item.nombreProceso
        };
        //validar si ya existe el nroPedido
        if (acumulador[clave].detallePedido.findIndex((detalle) => detalle.nroPedido === detallePedido.nroPedido) === -1) {
          acumulador[clave].detallePedido.push(detallePedido);
          // Convertir a número para evitar concatenación de strings
          acumulador[clave].cantidadTotalProducto += Number(item.cantidadProducto) || 0;
        }
        acumulador[clave].detalles.push(detalle);
        // Convertir a número para evitar concatenación de strings
        acumulador[clave].cantidadTotalProductoEnsamble = Number(item.cantidadArticulo) || 0;
        return acumulador;
      }, {});



      const resultadoAgrupadoPorProducto = dataEnsamble.reduce((acumulador, item) => {
        const clave = item.nombreProducto;
        if (!acumulador[clave]) {
          acumulador[clave] = {
            nombreProducto: item.nombreProducto,
            detalles: [],
            detallePedido: [],
            items: [], // Agregamos la propiedad items
            cantidadTotalProducto: 0,
            cantidadTotalProductoEnsamble: 0,
          };
        }

        const detalle: any = {
          nombreProceso: item.nombreProceso,
          centroTrabajo: item.centroTrabajo,
          cantidadArticulo: item.cantidadArticulo,
          nroPedido: item.nroPedido
        };

        const detallePedido: any = {
          orderId: item.orderId,
          nroPedido: item.nroPedido,
          estadoPago: item.estadoPago,
          fechaCompra: item.fechaCompra,
          fechaEntrega: item.fechaEntrega,
          formaEntrega: item.formaEntrega,
          horarioEntrega: item.horarioEntrega,
          estadoProceso: item.estadoProceso,
          cantidad: Number(item.cantidadProducto) || 0,
          cantidadArticulosPorPedido: (Number(item.cantidadArticulo) || 0) * (Number(item.cantidadTotalProductoEnsamble) || 0),
          historialPiezasProducidas: item.historialPiezasProducidas || [],
          piezasProducidas: 0,
          nombreArticulo: item.nombreArticulo,
          proceso: item.nombreProceso
        };

        // Validar si ya existe el nroPedido
        if (acumulador[clave].detallePedido.findIndex((detalle) => detalle.nroPedido === detallePedido.nroPedido) === -1) {
          acumulador[clave].detallePedido.push(detallePedido);
          // Convertir a número para evitar concatenación de strings
          acumulador[clave].cantidadTotalProducto += Number(item.cantidadProducto) || 0;
        }

        if (!acumulador[clave].detalles.find((detalle) => detalle.nombreProceso === detalle.nombreProceso)) {
          acumulador[clave].detalles.push(detalle);
          // Convertir a número para evitar concatenación de strings
          acumulador[clave].cantidadTotalProductoEnsamble += Number(item.cantidadArticulo) || 0;
        }


        return acumulador;
      }, {});

      const resultado2 = Object.values(resultadoAgrupadoPorProducto).map((grupo: any) => ({
        nombreProducto: grupo.nombreProducto,
        cantidadTotalProducto: grupo.cantidadTotalProducto,
        cantidadTotalProductoEnsamble: grupo.cantidadTotalProductoEnsamble,
        detalles: grupo.detalles,
        detallePedido: grupo.detallePedido
      }));

      // Solución al error de tipado: se debe usar (grupo: unknown) y hacer type assertion dentro del map
      const resultado = Object.values(resultadoAgrupado).map((grupo: unknown) => {
        const grupoTyped = grupo as PedidosParaProduccionEnsamble;
        return {
          nombreProducto: grupoTyped.nombreProducto,
          nombreArticulo: grupoTyped.nombreArticulo,
          cantidadTotalProducto: grupoTyped.cantidadTotalProducto,
          detallePedido: grupoTyped.detallePedido,
          fechaEntrega: this.getFechaEntregaProgramada(grupoTyped.detallePedido),
          horarioEntrega: this.getHorarioEntregaProgramada(grupoTyped.detallePedido),
          tracking: [],
          cantidadTotalProductoEnsamble: grupoTyped.cantidadTotalProductoEnsamble * grupoTyped.cantidadTotalProducto,
          detalles: grupoTyped.detalles
        } as PedidosParaProduccionEnsamble;
      });

      this.horariosEntrega = Array.from(new Set(resultado.flatMap((pedido) => {
        return pedido.detallePedido.flatMap((detalle) => {
          return JSON.stringify({
            nroPedido: detalle.nroPedido,
            horarioEntrega: detalle.horarioEntrega
          });
        });
      }))).map(item => JSON.parse(item));

      // Validate that horarioEntrega is not repeated
      const horariosEntregaSet = new Set();
      this.horariosEntrega = this.horariosEntrega.filter((item) => {
        if (!horariosEntregaSet.has(item.horarioEntrega)) {
          horariosEntregaSet.add(item.horarioEntrega);
          return true;
        }
        return false;
      });


      this.orders = data.orders;
      this.orderResponse = data;

      console.log('🧩 [DEBUG] Resultado procesado:', resultado.length, 'órdenes');
      console.log('🧩 [DEBUG] Procesos encontrados en resultado:', [...new Set(resultado.flatMap(order => order.detalles.map(d => d.nombreProceso)))]);

      // Usar agrupación condicional basada en la configuración
      if (this.agruparSoloPorArticulo) {
        this.ordersEnsamble = this.agruparPorArticulo(dataEnsamble);
        console.log('🧩 [DEBUG] Usando agrupación solo por artículo:', this.ordersEnsamble.length, 'grupos');
      } else {
        this.ordersEnsamble = resultado;
        console.log('🧩 [DEBUG] Usando agrupación por producto+artículo:', this.ordersEnsamble.length, 'grupos');
        // Verificar tipos de datos en agrupación original
        if (this.ordersEnsamble.length > 0) {
          console.log('🧩 [DEBUG] Muestra de cantidades en agrupación original:');
          console.log(`🧩 [DEBUG] - cantidadTotalProducto: ${this.ordersEnsamble[0].cantidadTotalProducto} (tipo: ${typeof this.ordersEnsamble[0].cantidadTotalProducto})`);
          console.log(`🧩 [DEBUG] - cantidadTotalProductoEnsamble: ${this.ordersEnsamble[0].cantidadTotalProductoEnsamble} (tipo: ${typeof this.ordersEnsamble[0].cantidadTotalProductoEnsamble})`);
        }
      }
      this.AllOrdersEnsamble = this.utilService.deepClone(this.ordersEnsamble);

      console.log('💾 [DEBUG] AllOrdersEnsamble actualizado:', this.AllOrdersEnsamble.length, 'órdenes');
      console.log('💾 [DEBUG] ordersEnsamble actual:', this.ordersEnsamble.length, 'órdenes');

      // Si hay un filtro de proceso aplicado, aplicar filtrado local inmediatamente
      if (this.selectedProcesosFilter) {
        console.log('🔄 [DEBUG] Re-aplicando filtro de proceso después de refresh API:', this.selectedProcesosFilter.nombre);
        this.ordersEnsamble = this.utilService.deepClone(
          this.AllOrdersEnsamble.filter((order) => {
            return order.detalles.find((detalle) => {
              return detalle.nombreProceso === this.selectedProcesosFilter.nombre;
            });
          })
        );
        console.log('✅ [DEBUG] Filtro re-aplicado:', this.ordersEnsamble.length, 'órdenes filtradas');
      }

      this.loading = false;

      // Después de cargar los datos, clasificar los pedidos
      this.clasificarPedidosPorUrgencia();
      this.calcularEstadisticasProduccion();
    });
  }

  onDateFilter(value: Date, filterCallback: Function, dt: any) {
    if (value) {
      filterCallback(value);
    } else {
      filterCallback(null);
    }
    dt.filterGlobal('', 'contains'); // Fuerza el refresco del filtro
  }

  addProductToCart(content, order: Pedido) {
    this.ciudadSeleccionada = order.envio?.ciudad || '';
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
    }, (configuracionResult) => {
      if (configuracionResult == 'Cross click') {
        return;
      }

      // Verificar si order.carrito existe
      if (!order.carrito) {
        console.error('El carrito del pedido no existe');
        return;
      }

      // Solo agregar al carrito si se configuró correctamente el producto
      if (configuracionResult?.producto?.identificacion?.referencia &&
          configuracionResult?.configuracion) { // Verificar que tiene configuración válida
        order.carrito.push(configuracionResult);
        // actualizar valores del pedido
        order = this.actualizarValoresPedido(order);
        // this.editOrder(order);
      }
    });
  }
  actualizarValoresPedido(order: Pedido) {
    this.pedidoUtilService.pedido = order;
    order.totalDescuento = this.pedidoUtilService.getDiscount();
    order.totalPedidoSinDescuento = this.pedidoUtilService.getSubtotal();

    // Asegurarse de que totalEnvio sea un número, usando 0 si es undefined
    const totalEnvio = order.totalEnvio || 0;
    order.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(totalEnvio);

    return order;
  }

  deleteProductToCart(order: Pedido, carrito: Carrito) {
    // Verificar si order.carrito existe
    if (!order.carrito) {
      console.error('El carrito del pedido no existe');
      return;
    }

    // Verificar si carrito.producto e identificacion existen
    if (!carrito || !carrito.producto || !carrito.producto.identificacion) {
      console.error('El producto o su identificación no existen');
      return;
    }

    const index = order.carrito.findIndex((item) =>
      item && item.producto && item.producto.identificacion &&
      item.producto.identificacion.referencia === carrito?.producto?.identificacion?.referencia
    );

    if (index !== -1) {
      order.carrito.splice(index, 1);
    }
    // this.editOrder(order);
  }


  editSeller(order: Pedido) {
    // Verificar que exista un asesor asignado
    if (!order.asesorAsignado) {
      console.error('No hay asesor asignado al pedido');
      return;
    }

    if (order.asesorAsignado.nit === '9999') {
      Swal.fire({
        title: '¿Estás seguro?',
        text: "Estás a punto de cambiar el asesor asignado a este pedido.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, cambiar asesor',
        cancelButtonText: 'No, cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          const userString = localStorage.getItem('user');

          // Verificar que userString no sea null
          if (!userString) {
            console.error('No se encontró información del usuario en localStorage');
            return;
          }

          try {
            const user = JSON.parse(userString) as UserLogged;
            const userLite: UserLite = {
              name: user.name,
              email: user.email,
              nit: user.nit
            }
            order.asesorAsignado = userLite;
            // this.editOrder(order);
            Swal.fire(
              'Cambiado',
              'El asesor ha sido cambiado.',
              'success'
            );
          } catch (error) {
            console.error('Error al procesar la información del usuario:', error);
          }
        }
      })
    }
    else {
      Swal.fire({
        title: '¡Alerta!',
        text: "Este pedido ya tiene un asesor asignado.",
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
      });
    }
  }


  buscarPorFechas(table?: Table): void {
    // Implementar lógica para filtrar los pedidos entre fechaInicial y fechaFinal
    const currentCompanyData = localStorage.getItem("currentCompany");

    if (!currentCompanyData) {
      console.error('No hay información de la compañía en sessionStorage');
      return;
    }

    try {
      const currentCompany = JSON.parse(currentCompanyData);
      const filter = {
        fechaInicial: this.fechaInicial,
        fechaFinal: this.fechaFinal,
        estadosPago: ['Prependiente', 'PreAprobado', 'Aprobado'],
        company: currentCompany.nomComercial || ''
      }

      this.produccionService.getOrdersByFiltersFlatProduct(filter).subscribe((data) => {
        this.orders = data.orders;
        this.loading = false;
      });

      if (table) {
        table.clear();
      }
    } catch (error) {
      console.error('Error al procesar la información de la compañía:', error);
    }
  }

  buscarPorFechasEnsamble(table?: Table): void {
    // Implementar lógica para filtrar los pedidos entre fechaInicial y fechaFinal

    if (table) {
      table.clear();
    }

    this.refrescarDatosEnsamble();
  }

  filtrarParaHoy(): void {
    // Implementar lógica para ajustar fechaInicial y fechaFinal al día actual y luego filtrar
    const fechaActual = new Date();
    this.fechaInicial = new Date(fechaActual.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaActual.setHours(23, 59, 59, 999));
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  filtrarParaManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para mañana
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = new Date(fechaManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaManana.setHours(23, 59, 59, 999));
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  filtrarParaPasadoManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para pasado mañana
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = new Date(fechaPasadoManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaPasadoManana.setHours(23, 59, 59, 999));
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  getFechaEntregaProgramada(detallePedido: DetallePedido[]): string {
    let infoFechas = "";
    detallePedido.forEach((detalle) => {
      // infoFechas += "Pedido: " + detalle.nroPedido + " - " + (detalle.fechaEntrega) + " ";
      if (detalle.fechaEntrega) {
        try {
          let fecha = new Date(detalle.fechaEntrega);
          let formattedDate = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
          infoFechas += "Pedido: " + detalle.nroPedido + " - " + formattedDate + "-";
        } catch (error) {
          console.warn('Error al formatear fecha:', error);
          infoFechas += "Pedido: " + detalle.nroPedido + " - Sin fecha-";
        }
      } else {
        // Si no hay fecha de entrega, mostrar "Sin fecha"
        infoFechas += "Pedido: " + detalle.nroPedido + " - Sin fecha-";
      }
    });
    return infoFechas.substring(0, infoFechas.length - 1);
  }

  getHorarioEntregaProgramada(detallePedido: DetallePedido[]): string {

    let infoFechas = "";
    detallePedido.forEach((detalle) => {
      infoFechas += "Pedido: " + detalle.nroPedido + " - " + detalle.horarioEntrega + " ";
    });
    return infoFechas;
  }



  onRowSelect(event) {
  }

  selectedOrdersEnsamble: PedidosParaProduccionEnsamble[] = [];

  seleccionarProcesoACerrar(content, event) {
    // Si todos los procesos están completados, no abrir el modal
    if (this.getProcessStatusClass(event) === 'status-complete') {
      Swal.fire({
        icon: 'info',
        title: 'Procesos completados',
        text: 'Todos los procesos para este artículo ya están completados.'
      });
      return;
    }

    this.selectedOrdersEnsamble = [event]
    // buscar el nombre del articulo seleccionado y obtener los procesos de ese articulo en orders
    // a filter process debe tener los procesos agrupados
    this.selectedProcesos = null;
    this.processStatusProductionProcess();

    // Verificar si hay algún proceso seleccionable (totalmente completado o en estado parcial)
    const hayProcesosSeleccionables = this.filterProcess.some(proceso =>
      proceso.statusJararquiaProcess ||
      proceso.icon === 'pi-sync' ||
      proceso.icon === 'pi-cog');

    // Verificar si quedan procesos por completar
    const hayProcesosPendientes = this.filterProcess.some(proceso =>
      proceso.status !== EstadoProcesoItem.ProducidasTotalmente);

    // Si todos los procesos están completados, no abrir el modal
    if (!hayProcesosPendientes) {
      Swal.fire({
        icon: 'info',
        title: 'Procesos completados',
        text: 'Todos los procesos para este artículo ya están completados.'
      });
      return;
    }

    if (!hayProcesosSeleccionables) {
      Swal.fire({
        icon: 'warning',
        title: 'No hay procesos disponibles',
        text: 'No hay procesos que puedan ser seleccionados en este momento. Asegúrese de completar los procesos previos.'
      });
      return;
    }

    this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      fullscreen: false,
      centered: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      if (result === 'cerrar') {
      }
    });
  }

  selectProcess(proceso) {
    // Permitir selección para procesos con estado parcial (COG o SYNC)
    if (!proceso.statusJararquiaProcess &&
      proceso.icon !== 'pi-sync' &&
      proceso.icon !== 'pi-cog') {
      return; // No permitir seleccionar procesos deshabilitados que no están en estado parcial
    }
    this.selectedProcesos = proceso.label;
  }

  private processStatusProductionProcess() {
    this.filterProcess = this.selectedOrdersEnsamble.flatMap((pedido) => {
      return pedido.detalles.flatMap((detalle, index) => {
        const status = this.getProcessStatus(detalle.nombreProceso, pedido);
        const statusProcessPrevious = this.validatePreviousStatusProduced(pedido, index);
        let iconSelected = 'pi-sign-in';
        //validar status y statusprevies 
        if (status === EstadoProcesoItem.ProducidasTotalmente) {
          iconSelected = 'pi-check';
        }
        else if (status === EstadoProcesoItem.ProducidasParcialmente) {
          iconSelected = 'pi-sync'; // Cambiado de pi-cog a pi-sync para ser consistente
        }
        else if (!statusProcessPrevious) {
          iconSelected = 'pi-times';
        }


        return {
          label: detalle.nombreProceso,
          value: {
            nombre: detalle.nombreProceso
          },
          index,
          status: status,
          statusJararquiaProcess: statusProcessPrevious,
          dateProcess: '',
          icon: iconSelected
        };
      });
    }).filter(p => p.label !== this.procesoGlobal).filter((item, index, self) => index === self.findIndex((t) => (
      t.label === item.label
    ))
    );
  }

  private validatePreviousStatusProduced(pedido: PedidosParaProduccionEnsamble, index: number): boolean {
    if (index === 0) {
      // No hay ítem anterior para el primer ítem, retorna true
      return true;
    } else {
      const detalleAnterior = pedido.detalles[index - 1];
      const statusAnterior = this.getProcessStatus(detalleAnterior.nombreProceso, pedido)
      return statusAnterior === EstadoProcesoItem.ProducidasTotalmente;
    }
  }


  getProcessStatus(nombreProceso: string, pedido: PedidosParaProduccionEnsamble): EstadoProcesoItem {

    const piezasProducidas = pedido.detallePedido?.reduce((acc2, item2) => {
      return acc2 + item2.historialPiezasProducidas?.filter(p => p.proceso == nombreProceso).reduce((acc3, item3) => acc3 + item3.piezasProducidas, 0) || 0;
    }, 0);

    if (!piezasProducidas)
      return EstadoProcesoItem.SinProducir;

    if (piezasProducidas === pedido.detallePedido.reduce((acc, item) => acc + item.cantidadArticulosPorPedido, 0)) {
      return EstadoProcesoItem.ProducidasTotalmente;
    }

    if (pedido.detallePedido.reduce((acc, item) => acc + item.cantidadArticulosPorPedido, 0) > 0) {
      return EstadoProcesoItem.ProducidasParcialmente;
    }

    // Retorno por defecto para evitar error de TypeScript
    return EstadoProcesoItem.SinProducir;
  }

  cerrarArticuloEnsamble(content, process) {
    this.selectedProcesos = process.label;
    if (!this.selectedProcesos) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor, seleccione un proceso'
      });
      return;
    }


    //abrir modal para cerrar articulo
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      fullscreen: true,
      centered: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      if (result === 'cerrar') {


        this.selectedOrdersEnsamble.forEach((item, index) => {
          this.ordersEnsamble.forEach((order) => {
            // Filtro condicional según modo de agrupación para actualización de estado local
            const isProductMatch = this.agruparSoloPorArticulo ?
              item.nombreProducto.includes(order.nombreProducto) :
              order.nombreProducto === item.nombreProducto;

            if (isProductMatch && order.nombreArticulo === item.nombreArticulo) {
              order.piezasProducidas = item.detallePedido.reduce((acc, item) => acc + item.piezasProducidas, 0);
            }
          });
        }
        );

        const ordersPushToUpdate: Pedido[] = [];

        this.selectedOrdersEnsamble.forEach((item) => {

          item.detallePedido.forEach((detallePedido) => {

            this.orders
              .filter((order) => {
                // Filtro condicional según modo de agrupación para búsqueda de órdenes
                const isProductMatch = this.agruparSoloPorArticulo ?
                  item.nombreProducto.includes(order.producto.crearProducto.titulo) :
                  order.producto.crearProducto.titulo === item.nombreProducto;

                return isProductMatch && order.nroPedido == detallePedido.nroPedido;
              })
              .forEach((order) => {
                const produccion = order.producto.otrosProcesos.modulosVariables.produccion.find(
                  (prod) => prod.titulo.trim() === item.nombreArticulo.trim()
                );

                if (produccion) {
                  const proceso = produccion.procesos.find(
                    (proc) => proc.nombre === this.selectedProcesos
                  );

                  if (proceso) {
                    const user = JSON.parse(localStorage.getItem('user')) as UserLogged;
                    const piezasProduccion: PiezasProduccion = {
                      fecha: new Date().toISOString(),
                      piezasProducidas: detallePedido.piezasProducidas,
                      personaResponsable: user,
                      proceso: this.selectedProcesos
                    }
                    detallePedido.piezasProducidas = 0;
                    if (!proceso.historialPiezasProducidas) {
                      proceso.historialPiezasProducidas = [];
                    }

                    if (!detallePedido.historialPiezasProducidas) {
                      detallePedido.historialPiezasProducidas = [];
                    }

                    detallePedido.historialPiezasProducidas.push(piezasProduccion);
                    proceso.historialPiezasProducidas.push(piezasProduccion);


                    proceso.piezasPorPedido = detallePedido.cantidad;
                    //cambiar el estado si la suma de historial es igual a piezas por pedido
                    const piezasProducidasSumadas = proceso.historialPiezasProducidas.reduce((acc, item) => acc + item.piezasProducidas, 0);
                    if (piezasProducidasSumadas === proceso.piezasPorPedido) {
                      proceso.estadoProceso = EstadoProcesoItem.ProducidasTotalmente;
                      order.estadoProceso = EstadoProceso.ProducidoTotalmente
                    } else {
                      detallePedido.estadoProceso = EstadoProcesoItem.ProducidasParcialmente;
                      order.estadoProceso = EstadoProceso.SinProducir;
                    }
                  }

                  order.estadoProceso = EstadoProceso.SinProducir;
                  let orderToUpdate = this.orderResponse.ordersRaw.find(x => x._id == order.orderId);

                  // Verificar si orderToUpdate y su propiedad carrito existen
                  if (!orderToUpdate) {
                    console.error('No se encontró la orden a actualizar');
                    return;
                  }

                  if (!orderToUpdate.carrito) {
                    console.error('La orden a actualizar no tiene carrito');
                    return;
                  }

                  let carrito = orderToUpdate.carrito.find(x => x.producto?.identificacion?.referencia == order.producto?.identificacion?.referencia);

                  // Verificar si se encontró el carrito
                  if (!carrito) {
                    console.error('No se encontró el carrito correspondiente en la orden');
                    return;
                  }

                  carrito.producto = this.utilService.deepClone(order.producto);

                  // Verificar si la estructura del producto existe antes de acceder
                  if (!carrito.producto || !carrito.producto.otrosProcesos ||
                    !carrito.producto.otrosProcesos.modulosVariables ||
                    !carrito.producto.otrosProcesos.modulosVariables.produccion) {
                    console.error('La estructura del producto en el carrito es incompleta');
                    return;
                  }

                  //validar si todos los procesos de todos los articulos estan producidos
                  carrito.producto.otrosProcesos.modulosVariables.produccion.forEach((prod) => {
                    if (!prod || !prod.procesos) {
                      return; // Si no hay proceso o procesos, saltar este ítem
                    }

                    const allProcesosProduced = prod.procesos.filter(p => p.nombre != this.procesoGlobal).every((proceso) => {
                      return proceso.estadoProceso === EstadoProcesoItem.ProducidasTotalmente;
                    });

                    if (allProcesosProduced) {
                      prod.estadoArticulo = EstadoProcesoItem.ProducidasTotalmente;
                    } else {
                      prod.estadoArticulo = EstadoProcesoItem.ProducidasParcialmente;
                    }
                  });


                  //validar si todos los estadoArticulo de todos los articulos estan producidos
                  if (!carrito.producto || !carrito.producto.otrosProcesos ||
                    !carrito.producto.otrosProcesos.modulosVariables ||
                    !carrito.producto.otrosProcesos.modulosVariables.produccion) {
                    console.error('Estructura del producto incompleta al validar estados de artículos');
                    return;
                  }

                  const allArticulosProduced = carrito.producto.otrosProcesos.modulosVariables.produccion.every((prod) => {
                    return prod && prod.estadoArticulo === EstadoProcesoItem.ProducidasTotalmente;
                  });

                  //si es true se le cambia el estado al producto
                  if (allArticulosProduced) {
                    carrito.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;
                  } else {
                    //validar si almenos un articulo es diferente de sin producir
                    const allArticulosProducedPartial = carrito.producto.otrosProcesos.modulosVariables.produccion.some((prod) => {
                      return prod && prod.estadoArticulo !== EstadoProcesoItem.SinProducir;
                    });

                    if (allArticulosProducedPartial) {
                      carrito.estadoProcesoProducto = EstadoProceso.ProducidoParcialmente;
                    } else {
                      carrito.estadoProcesoProducto = EstadoProceso.SinProducir;
                    }
                  }

                  //validar si todos los productos de la orden estan producidos
                  if (!orderToUpdate.carrito) {
                    console.error('Carrito undefined al validar todos los productos');
                    return;
                  }

                  const allProductsProduced = orderToUpdate.carrito.every((carritoItem) => {
                    return carritoItem && carritoItem.estadoProcesoProducto === EstadoProceso.ProducidoTotalmente;
                  });

                  if (allProductsProduced) {
                    orderToUpdate.estadoProceso = EstadoProceso.ProducidoTotalmente;
                  } else {
                    //validar si almenos un producto es diferente de sin producir
                    const allProductsProducedPartial = orderToUpdate.carrito.some((carritoItem) => {
                      return carritoItem && carritoItem.estadoProcesoProducto !== EstadoProceso.SinProducir;
                    });

                    if (allProductsProducedPartial) {
                      orderToUpdate.estadoProceso = EstadoProceso.ProducidoParcialmente;
                    } else {
                      orderToUpdate.estadoProceso = EstadoProceso.SinProducir;
                    }
                  }

                  // this.editOrder(orderToUpdate);
                  ordersPushToUpdate.push(orderToUpdate);
                }
              });
          });

          // Validate and process orders with improved error handling
          try {
            if (!this.isValidOrdersArray(ordersPushToUpdate)) {
              this.logOrdersValidationError(ordersPushToUpdate, 'editMultipleOrders call');

              if (!ordersPushToUpdate || ordersPushToUpdate.length === 0) {
                console.warn('No valid orders to update - skipping API call');
                return;
              }

              // Filter out invalid orders and log warnings
              const validOrders = ordersPushToUpdate.filter(order => this.isValidPedido(order));
              if (validOrders.length === 0) {
                console.warn('All orders are invalid - skipping API call');
                return;
              }

              if (validOrders.length !== ordersPushToUpdate.length) {
                console.warn(`Filtered ${ordersPushToUpdate.length - validOrders.length} invalid orders`);
              }

              this.editMultipleOrders(validOrders);
            } else {
              this.editMultipleOrders(ordersPushToUpdate);
            }
          } catch (error) {
            console.error('Error processing orders for update:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error procesando pedidos',
              text: 'Hubo un problema al procesar los pedidos para actualización',
              showConfirmButton: true
            });
          }

          //buscar en allorders y reemplazar el item
          const index = this.AllOrdersEnsamble.findIndex((order) => order.nombreProducto === item.nombreProducto && order.nombreArticulo === item.nombreArticulo);
          if (index !== -1) {
            this.AllOrdersEnsamble[index].detallePedido = this.utilService.deepClone(item).detallePedido;
          }

          Swal.fire({
            icon: 'success',
            title: 'Proceso cerrado correctamente',
            showConfirmButton: false,
            timer: 1500
          });

        });


      }
      this.processStatusProductionProcess();

    }
      ,
      (reason) => {
        if (reason == 'Cross click') {
          this.processStatusProductionProcess();
          return;
        }
      });

  }

  filterOrderByProcess(event: any) {
    // Limpiar selección actual
    this.selectedOrdersEnsamble = [];

    // Actualizar filtro de proceso
    this.selectedProcesosFilter = event.value;

    // FILTRADO LOCAL INMEDIATO para feedback visual instantáneo
    if (event.value) {
      console.log('Filtrando localmente por proceso:', event.value.nombre);
      this.ordersEnsamble = this.utilService.deepClone(
        this.AllOrdersEnsamble.filter((order) => {
          return order.detalles.find((detalle) => {
            return detalle.nombreProceso === event.value.nombre;
          });
        })
      );
      console.log(`Filtrado local: ${this.ordersEnsamble.length} órdenes de ${this.AllOrdersEnsamble.length} total`);
    } else {
      // Mostrar todas las órdenes cuando no hay filtro
      console.log('Removiendo filtro de proceso - mostrando todas las órdenes');
      this.ordersEnsamble = this.utilService.deepClone(this.AllOrdersEnsamble);
    }

    // Guardar estado en sessionStorage
    this.saveFiltersToStorage();

    // OPCIONAL: También refrescar desde API para persistencia (con debouncing)
    // this.debounceApiRefresh();
  }


  mostrarTracking(content: any, mostrarTracking: PedidosParaProduccionEnsamble) {
    this.articuloEnsambleSelected = mostrarTracking;
    //abrir modal para cerrar articulo
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      if (result === 'cerrar') {
      }
    }
      ,
      (reason) => {
        if (reason == 'Cross click') {
          return;
        }
      });
  }


  validarParaCerrarProducto() {
    const producto = this.selectedOrdersEnsamble[0].nombreProducto;

    const orders = this.ordersEnsamble.filter((order) => order.nombreProducto === producto);
    const procesos = orders.flatMap((order) => order.detalles).map((detalle) => detalle.nombreProceso).filter((item, index, self) => index === self.findIndex((t) => (
      t === item && t != this.procesoGlobal
    )));

    for (const proceso of procesos) {
      const ordersFiltered = orders.filter((order) => order.detalles.find((detalle) => detalle.nombreProceso === proceso));
      for (const order of ordersFiltered) {
        const detalle = order.detallePedido.find((detalle) => detalle.historialPiezasProducidas?.find(h => h.proceso === proceso));
        if (!detalle) {
          Swal.fire({
            icon: 'error',
            title: 'Error no se puede cerrar el producto ' + producto,
            text: 'No se puede cerrar el producto porque producir completamente el proceso ' + proceso + ' del articulo ' + order.nombreArticulo + ' no se ha producido ninguna pieza'
          });
          return false;
        }
        const piezasProducidas = detalle.historialPiezasProducidas.reduce((acc, item) => acc + item.piezasProducidas, 0);
        if (piezasProducidas !== detalle.cantidadArticulosPorPedido) {
          Swal.fire({
            icon: 'error',
            title: 'Error no se puede cerrar el producto ' + producto,
            text: 'No se puede cerrar el proceso, la cantidad de piezas producidas no coincide con la cantidad total de ensamble'
          });
          return false;
        }
      }
    }

    return true;
  }

  cerrarProductosSeleccionados(content: any) {
    this.productsToClose = this.convertirJSONaDatosProductos(this.AllOrdersEnsamble, this.procesoGlobal);

    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      if (result === 'cerrar') {
        // this.editOrder(reason);
      }
    }
      ,
      (reason) => {
        if (reason == 'Cross click') {
          return;
        }

        if (reason === 'cerrar') {

          this.productsToClose.forEach(product => {
            // Filtro condicional según modo de agrupación
            const filteredOrders = this.agruparSoloPorArticulo ?
              // En modo agrupación por artículo: usar includes para productos concatenados
              this.AllOrdersEnsamble.filter(x => product.producto.includes(x.nombreProducto)) :
              // En modo normal: comparación directa del producto
              this.AllOrdersEnsamble.filter(x => x.nombreProducto === product.producto);

            filteredOrders.forEach(z => {
              z.estadoProductoArticulo = product.estadoProcesoProducto;
              z.detallePedido.forEach(detallePedido => {
                product.articulosConProcesos.forEach(articulo => {
                  articulo.procesos.forEach(proceso => {
                    if (proceso.proceso == detallePedido.proceso) {
                      detallePedido.estadoProceso = proceso.statusProceso;
                    }
                  });
                });
              });

              // Filtro condicional según modo de agrupación para órdenes
              const filteredOrders = this.agruparSoloPorArticulo ?
                this.orders.filter(p => product.producto.includes(p.producto.crearProducto.titulo)) :
                this.orders.filter(p => p.producto.crearProducto.titulo === product.producto);

              filteredOrders.forEach(x => {
                x.producto.otrosProcesos.modulosVariables.produccion.filter(
                  y => y.titulo == z.nombreArticulo
                ).forEach(p => {
                  p.procesos.forEach(proceso => {
                    if (proceso.nombre == this.procesoGlobal) {
                      proceso.estadoProceso = product.estadoProcesoProducto as EstadoProcesoItem;
                    }
                  });
                });
              })

            });

          });

          let productsToClose = this.productsToClose.filter(x => x.estadoProcesoProducto == EstadoProceso.ProducidoTotalmente);

          //buscar en orderresponse orderraw y editar la orden
          productsToClose.forEach(product => {
            // Filtrar sólo los elementos que tienen carrito y producto definidos con la estructura esperada
            this.orderResponse.ordersRaw
              .filter(x => x.carrito && Array.isArray(x.carrito))
              .forEach(order => {
                // Buscar el carrito correspondiente con verificaciones de nulidad y lógica condicional
                const carritoSelected = this.agruparSoloPorArticulo ?
                  order.carrito.find(x => x && x.producto && x.producto.crearProducto &&
                    product.producto.includes(x.producto.crearProducto.titulo)) :
                  order.carrito.find(x => x && x.producto && x.producto.crearProducto &&
                    x.producto.crearProducto.titulo === product.producto);

                // Si no se encuentra el carrito, saltar este elemento con logging mejorado
                if (!carritoSelected) {
                  console.warn(`[Cierre Artículo] No se encontró un carrito para el producto: ${product.producto}`);
                  console.warn(`[Cierre Artículo] Modo agrupación: ${this.agruparSoloPorArticulo ? 'Solo por artículo' : 'Producto + artículo'}`);
                  console.warn(`[Cierre Artículo] Productos disponibles en carrito:`, order.carrito.map(x => x?.producto?.crearProducto?.titulo).filter(Boolean));
                  return;
                }

                carritoSelected.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;
                let orderToUpdate = order;

                // Verificar la estructura del producto con logging mejorado
                if (!carritoSelected.producto ||
                  !carritoSelected.producto.otrosProcesos ||
                  !carritoSelected.producto.otrosProcesos.modulosVariables ||
                  !carritoSelected.producto.otrosProcesos.modulosVariables.produccion) {
                  console.warn(`[Cierre Artículo] Estructura incompleta en el producto: ${product.producto}`);
                  console.warn(`[Cierre Artículo] Estructura disponible:`, {
                    hasProducto: !!carritoSelected.producto,
                    hasOtrosProcesos: !!carritoSelected.producto?.otrosProcesos,
                    hasModulosVariables: !!carritoSelected.producto?.otrosProcesos?.modulosVariables,
                    hasProduccion: !!carritoSelected.producto?.otrosProcesos?.modulosVariables?.produccion
                  });
                  return;
                }

                // Validar si todos los procesos de todos los artículos están producidos
                carritoSelected.producto.otrosProcesos.modulosVariables.produccion.forEach((prod) => {
                  if (!prod || !prod.procesos) {
                    return; // Saltar si no hay procesos
                  }
                  prod.procesos.forEach((proceso) => {
                    proceso.estadoProceso = EstadoProcesoItem.ProducidasTotalmente;
                  });
                  prod.estadoArticulo = EstadoProcesoItem.ProducidasTotalmente;
                });

                carritoSelected.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;

                // Verificar que orderToUpdate.carrito exista
                if (!orderToUpdate.carrito) {
                  console.error('El carrito en orderToUpdate no existe');
                  return;
                }

                // Validar si todos los productos de la orden están producidos
                const allProductsProduced = orderToUpdate.carrito.every((carritoItem) => {
                  return carritoItem && carritoItem.estadoProcesoProducto === EstadoProceso.ProducidoTotalmente;
                });

                if (allProductsProduced) {
                  orderToUpdate.estadoProceso = EstadoProceso.ProducidoTotalmente;
                } else {
                  orderToUpdate.estadoProceso = EstadoProceso.SinProducir;
                }

                this.editOrder(orderToUpdate);
              });
          });



          this.selectedOrdersEnsamble = [];



        }
      });


  }

  convertirJSONaDatosProductos(jsonData: any[], procesoGlobal: string): DatosProducto[] {
    // Agrupar productos por nombreProducto
    const agrupadosPorProducto = jsonData.reduce((acc, item) => {
      const clave = item.nombreProducto;
      if (!acc[clave]) {
        acc[clave] = [];
      }
      acc[clave].push(item);
      return acc;
    }, {});

    return Object.entries(agrupadosPorProducto).map(([nombreProducto, articulos]) => {
      // Convertir articulos a ArticuloConProcesos[]
      const articulosConProcesos = (articulos as any[]).map((articulo: any) => {
        const procesos = articulo.detalles
          .filter(detalle => detalle.nombreProceso !== procesoGlobal)
          .map(detalle => {
            const piezas = articulo.detallePedido
              .filter(pedido => pedido.proceso === detalle.nombreProceso)
              .reduce((total, pedido) => total + pedido.piezasProducidas, 0);

            let estadoProceso;

            estadoProceso = this.getProcessStatus(detalle.nombreProceso, articulo);

            return {
              proceso: detalle.nombreProceso,
              piezasProducidas: piezas,
              statusProceso: estadoProceso
            };
          });
        return {
          articulo: articulo.nombreArticulo,
          procesos: procesos
        };
      });

      return {
        producto: nombreProducto,
        articulosConProcesos: articulosConProcesos
      };
    });
  }


  producirPedido(pedido: Pedido) {
    // validacion de confirmacion

    const textConfirm = pedido.estadoProceso != EstadoProceso.ProducidoTotalmente ? '¿Estás seguro de producir el pedido?' : '¿Estás seguro de cancelar la producción del pedido?';
    const textButton = pedido.estadoProceso != EstadoProceso.ProducidoTotalmente ? 'Sí, producir' : 'Sí, cancelar';
    Swal.fire({
      title: '¿Estás seguro?',
      text: textConfirm,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: textButton,
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.producirPedidoLogic(pedido);
      }
    })
  }

  producirPedidoLogic(pedido: Pedido) {
    // Verificar si el pedido existe y tiene la propiedad carrito
    if (!pedido) {
      console.error('El pedido no existe');
      return;
    }

    if (!pedido.carrito) {
      console.error('El pedido no tiene la propiedad carrito');
      return;
    }

    if (pedido.estadoProceso != EstadoProceso.ProducidoTotalmente) {
      pedido.estadoProceso = EstadoProceso.ProducidoTotalmente;
      pedido.carrito.forEach(carrito => {
        if (!carrito || !carrito.producto || !carrito.producto.otrosProcesos ||
          !carrito.producto.otrosProcesos.modulosVariables ||
          !carrito.producto.otrosProcesos.modulosVariables.produccion) {
          return; // Saltar este carrito si no tiene la estructura esperada
        }

        carrito.producto.otrosProcesos.modulosVariables.produccion.forEach(produccion => {
          if (!produccion || !produccion.procesos) {
            return; // Saltar esta producción si no tiene procesos
          }

          produccion.procesos.forEach(proceso => {
            proceso.estadoProceso = EstadoProcesoItem.ProducidasTotalmente;
          });
          produccion.estadoArticulo = EstadoProcesoItem.ProducidasTotalmente;
        });
        carrito.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;
      });
    }
    else {
      pedido.estadoProceso = EstadoProceso.SinProducir;
      pedido.carrito.forEach(carrito => {
        if (!carrito || !carrito.producto || !carrito.producto.otrosProcesos ||
          !carrito.producto.otrosProcesos.modulosVariables ||
          !carrito.producto.otrosProcesos.modulosVariables.produccion) {
          return; // Saltar este carrito si no tiene la estructura esperada
        }

        carrito.producto.otrosProcesos.modulosVariables.produccion.forEach(produccion => {
          if (!produccion || !produccion.procesos) {
            return; // Saltar esta producción si no tiene procesos
          }

          produccion.procesos.forEach(proceso => {
            proceso.estadoProceso = EstadoProcesoItem.SinProducir;
          });
          produccion.estadoArticulo = EstadoProcesoItem.SinProducir;
        });
        carrito.estadoProcesoProducto = EstadoProceso.SinProducir;
      });
    }

    this.editOrder(pedido);
  }

  resetColumnConfig() {
    this.selectedColumns = [...this.columns];
  }

  /**
   * Obtiene la clase CSS para el indicador de estado del proceso
   */
  getProcessStatusClass(row: PedidosParaProduccionEnsamble): string {
    // Verificar si hay detalles de proceso
    if (!row.detalles || row.detalles.length === 0) {
      return 'status-none';
    }

    // Enfoque mejorado que considera la jerarquía y dependencias entre procesos
    const procesosConEstado = this.getProcesosConEstado(row);

    // Si todos los procesos están completados
    if (procesosConEstado.every(p => p.status === EstadoProcesoItem.ProducidasTotalmente)) {
      return 'status-complete';
    }
    // Si al menos un proceso está completo o parcial y todos los anteriores están completos
    else if (procesosConEstado.some(p =>
      (p.status === EstadoProcesoItem.ProducidasTotalmente ||
        p.status === EstadoProcesoItem.ProducidasParcialmente) &&
      p.statusJararquiaProcess)) {
      return 'status-partial';
    }
    // En cualquier otro caso
    else {
      return 'status-pending';
    }
  }

  /**
   * Obtiene el ícono para el indicador de estado del proceso
   */
  getProcessStatusIcon(row: PedidosParaProduccionEnsamble): string {
    // Verificar si hay detalles de proceso
    if (!row.detalles || row.detalles.length === 0) {
      return 'pi pi-question-circle';
    }

    // Enfoque mejorado que considera la jerarquía y dependencias entre procesos
    const procesosConEstado = this.getProcesosConEstado(row);

    // Si todos los procesos están completados
    if (procesosConEstado.every(p => p.status === EstadoProcesoItem.ProducidasTotalmente)) {
      return 'pi pi-check-circle';
    }
    // Si al menos un proceso está completo o parcial y todos los anteriores están completos
    else if (procesosConEstado.some(p =>
      (p.status === EstadoProcesoItem.ProducidasTotalmente ||
        p.status === EstadoProcesoItem.ProducidasParcialmente) &&
      p.statusJararquiaProcess)) {
      return 'pi pi-sync'; // Importante: Este es el icono que debe coincidir con 'pi-sync'
    }
    // En cualquier otro caso
    else {
      return 'pi pi-clock';
    }
  }

  /**
   * Obtiene el tooltip para el indicador de estado del proceso
   */
  getProcessStatusTooltip(row: PedidosParaProduccionEnsamble): string {
    // Verificar si hay detalles de proceso
    if (!row.detalles || row.detalles.length === 0) {
      return 'Sin información de procesos';
    }

    // Enfoque mejorado que considera la jerarquía y dependencias entre procesos
    const procesosConEstado = this.getProcesosConEstado(row);

    // Contar estados
    const procesosCompletados = procesosConEstado.filter(p => p.status === EstadoProcesoItem.ProducidasTotalmente).length;
    const procesosParciales = procesosConEstado.filter(p => p.status === EstadoProcesoItem.ProducidasParcialmente).length;
    const procesosPendientes = procesosConEstado.filter(p => p.status !== EstadoProcesoItem.ProducidasTotalmente &&
      p.status !== EstadoProcesoItem.ProducidasParcialmente).length;

    // Identificar procesos bloqueados por dependencias
    const procesosBloqueados = procesosConEstado.filter(p => !p.statusJararquiaProcess).length;

    // Construir mensaje detallado
    let mensaje = `Estado: ${procesosCompletados} completados, ${procesosParciales} parciales, ${procesosPendientes} pendientes de ${procesosConEstado.length} procesos`;

    // Agregar información sobre procesos bloqueados si existen
    if (procesosBloqueados > 0) {
      mensaje += `\n${procesosBloqueados} procesos bloqueados por dependencias sin completar`;
    }

    return mensaje;
  }

  /**
   * Método auxiliar para obtener los procesos con su estado y jerarquía
   */
  private getProcesosConEstado(row: PedidosParaProduccionEnsamble): Array<{
    nombreProceso: string;
    status: EstadoProcesoItem;
    statusJararquiaProcess: boolean;
    index: number;
  }> {
    return row.detalles.map((detalle, index) => {
      const status = this.getProcessStatus(detalle.nombreProceso, row);
      const statusProcessPrevious = this.validatePreviousStatusProduced(row, index);

      return {
        nombreProceso: detalle.nombreProceso,
        status,
        statusJararquiaProcess: statusProcessPrevious,
        index
      };
    }).filter(p => p.nombreProceso !== this.procesoGlobal);
  }

  /**
   * Obtiene el estado de pago predominante de un pedido de producción
   * Prioriza estados críticos (Rechazado, Cancelado) sobre estados normales
   */
  getPaymentStatus(row: PedidosParaProduccionEnsamble): string {
    if (!row.detallePedido || row.detallePedido.length === 0) {
      return 'Sin información';
    }

    // Obtener todos los estados de pago únicos
    const estadosPago = [...new Set(row.detallePedido.map(detalle => detalle.estadoPago))];

    // Si solo hay un estado, retornarlo
    if (estadosPago.length === 1) {
      return estadosPago[0] || 'Sin información';
    }

    // Prioridad de estados (de mayor a menor importancia)
    const prioridades: { [key: string]: number } = {
      'Rechazado': 6,
      'Cancelado': 5,
      'Precancelado': 4,
      'Pendiente': 3,
      'Pospendiente': 2,
      'PreAprobado': 1,
      'Aprobado': 0
    };

    // Encontrar el estado con mayor prioridad (número más alto = más crítico)
    const estadoMasCritico = estadosPago.reduce((estadoActual, estadoNuevo) => {
      const prioridadActual = prioridades[estadoActual] ?? -1;
      const prioridadNueva = prioridades[estadoNuevo] ?? -1;
      return prioridadNueva > prioridadActual ? estadoNuevo : estadoActual;
    });

    return estadoMasCritico;
  }

  /**
   * Obtiene la clase CSS para el badge de estado de pago
   */
  getPaymentStatusClass(estadoPago: string): string {
    switch (estadoPago) {
      case 'Aprobado':
        return 'payment-status-approved';
      case 'PreAprobado':
        return 'payment-status-preapproved';
      case 'Pendiente':
      case 'Pospendiente':
        return 'payment-status-pending';
      case 'Rechazado':
        return 'payment-status-rejected';
      case 'Cancelado':
      case 'Precancelado':
        return 'payment-status-cancelled';
      default:
        return 'payment-status-unknown';
    }
  }

  /**
   * Obtiene el icono para el estado de pago
   */
  getPaymentStatusIcon(estadoPago: string): string {
    switch (estadoPago) {
      case 'Aprobado':
        return 'pi pi-check-circle';
      case 'PreAprobado':
        return 'pi pi-clock';
      case 'Pendiente':
      case 'Pospendiente':
        return 'pi pi-exclamation-triangle';
      case 'Rechazado':
        return 'pi pi-times-circle';
      case 'Cancelado':
      case 'Precancelado':
        return 'pi pi-ban';
      default:
        return 'pi pi-question-circle';
    }
  }

  /**
   * Clasifica los pedidos en urgentes, en riesgo y normales según la fecha de entrega
   */
  clasificarPedidosPorUrgencia() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Limpiar los arreglos
    this.pedidosUrgentes = [];
    this.pedidosEnRiesgo = [];
    this.pedidosNormales = [];

    if (!this.ordersEnsamble || this.ordersEnsamble.length === 0) {
      return;
    }

    this.ordersEnsamble.forEach(orden => {
      // Verificar si hay detallePedido y si tiene elementos
      if (!orden.detallePedido || orden.detallePedido.length === 0) {
        this.pedidosNormales.push(orden);
        return;
      }

      // Buscar la fecha de entrega más cercana entre todos los detalles
      let fechaMasCercana: Date | null = null;

      for (const detalle of orden.detallePedido) {
        if (detalle.fechaEntrega) {
          try {
            const fecha = new Date(detalle.fechaEntrega);
            // Verificar si la fecha es válida
            if (!isNaN(fecha.getTime())) {
              if (!fechaMasCercana || fecha < fechaMasCercana) {
                fechaMasCercana = fecha;
              }
            }
          } catch (error) {
            console.warn('Error al convertir fecha:', detalle.fechaEntrega);
          }
        }
      }

      // Si no hay fecha válida, considerar como normal
      if (!fechaMasCercana) {
        this.pedidosNormales.push(orden);
        return;
      }

      // Calcular días de diferencia
      const diferenciaTiempo = fechaMasCercana.getTime() - hoy.getTime();
      const diferenciaDias = Math.ceil(diferenciaTiempo / (1000 * 3600 * 24));

      // Clasificar según la urgencia
      if (diferenciaDias <= 2) {
        this.pedidosUrgentes.push(orden);
      } else if (diferenciaDias <= 5) {
        this.pedidosEnRiesgo.push(orden);
      } else {
        this.pedidosNormales.push(orden);
      }
    });

    // Ordenar por fecha de entrega (más cercanas primero)
    this.ordenarPorFechaEntrega(this.pedidosUrgentes);
    this.ordenarPorFechaEntrega(this.pedidosEnRiesgo);
    this.ordenarPorFechaEntrega(this.pedidosNormales);
  }

  /**
   * Ordena un array de pedidos por fecha de entrega
   */
  ordenarPorFechaEntrega(pedidos: PedidosParaProduccionEnsamble[]) {
    // Definir una fecha futura lejana para pedidos sin fecha (baja prioridad)
    const fechaFutura = new Date();
    fechaFutura.setFullYear(fechaFutura.getFullYear() + 10);

    pedidos.sort((a, b) => {
      // Función para obtener una fecha válida o la fecha futura por defecto
      const obtenerFechaValida = (orden: PedidosParaProduccionEnsamble): Date => {
        // Verificar si hay detallePedido y si tiene elementos
        if (!orden.detallePedido || orden.detallePedido.length === 0) {
          return fechaFutura;
        }

        // Buscar el primer pedido con fecha válida
        for (const detalle of orden.detallePedido) {
          if (detalle.fechaEntrega) {
            try {
              const fecha = new Date(detalle.fechaEntrega);
              // Verificar si la fecha es válida
              if (!isNaN(fecha.getTime())) {
                return fecha;
              }
            } catch (error) {
              console.warn('Error al convertir fecha:', detalle.fechaEntrega);
            }
          }
        }

        // Si no encontramos fechas válidas, usar la fecha futura
        return fechaFutura;
      };

      // Obtener fechas válidas para ambos órdenes
      const fechaA = obtenerFechaValida(a);
      const fechaB = obtenerFechaValida(b);

      // Comparar fechas
      return fechaA.getTime() - fechaB.getTime();
    });
  }

  /**
   * Calcula estadísticas de producción para los KPIs
   */
  calcularEstadisticasProduccion() {
    if (!this.ordersEnsamble || this.ordersEnsamble.length === 0) {
      return;
    }

    // 1. Calcular estadísticas de ensambles
    this.ensamblesPendientes = 0;
    this.ensamblesProceso = 0;
    this.ensamblesCompletados = 0;

    this.ordersEnsamble.forEach(orden => {
      // En lugar de usar la propiedad procesos (que no existe), 
      // usamos los datos de detallePedido y detalles que sí existen
      const totalProcesos = orden.detalles ? orden.detalles.length : 0;
      let procesosCompletados = 0;
      let procesosParciales = 0;

      if (orden.detalles && orden.detalles.length > 0) {
        // Para cada proceso/detalle, verificamos su estado
        orden.detalles.forEach(detalle => {
          const estadoProceso = this.getProcessStatus(detalle.nombreProceso, orden);
          if (estadoProceso === EstadoProcesoItem.ProducidasTotalmente) {
            procesosCompletados++;
          } else if (estadoProceso === EstadoProcesoItem.ProducidasParcialmente) {
            procesosParciales++;
          }
        });
      }

      if (procesosCompletados === totalProcesos && totalProcesos > 0) {
        this.ensamblesCompletados++;
      } else if (procesosCompletados > 0 || procesosParciales > 0) {
        this.ensamblesProceso++;
      } else {
        this.ensamblesPendientes++;
      }
    });

    // 2. Calcular capacidad utilizada (relación entre completados+proceso y total)
    const total = this.ordersEnsamble.length;
    this.capacidadUtilizada = total > 0 ?
      Math.round(((this.ensamblesProceso * 0.5) + this.ensamblesCompletados) / total * 100) : 0;

    // 3. Calcular eficiencia por proceso
    // Recopilamos la información de todos los procesos
    const procesos = new Map<string, { total: number, completados: number, parciales: number }>();

    this.ordersEnsamble.forEach(orden => {
      if (!orden.detalles || orden.detalles.length === 0) return;

      orden.detalles.forEach(detalle => {
        const nombreProceso = detalle.nombreProceso;

        if (!procesos.has(nombreProceso)) {
          procesos.set(nombreProceso, { total: 0, completados: 0, parciales: 0 });
        }

        const datosProceso = procesos.get(nombreProceso);
        if (datosProceso) {
          datosProceso.total++;

          const estadoProceso = this.getProcessStatus(nombreProceso, orden);
          if (estadoProceso === EstadoProcesoItem.ProducidasTotalmente) {
            datosProceso.completados++;
          } else if (estadoProceso === EstadoProcesoItem.ProducidasParcialmente) {
            datosProceso.parciales++;
          }
        }
      });
    });

    // Convertir a array para la vista
    this.procesosEficiencia = Array.from(procesos.entries()).map(([nombre, datos]) => {
      const { total, completados, parciales } = datos;
      // Calculamos la eficiencia ponderada: completados valen 100%, parciales 50%
      const eficiencia = total > 0 ?
        Math.round(((completados * 1) + (parciales * 0.5)) / total * 100) : 0;

      return { nombre, eficiencia };
    });

    // Ordenamos de mayor a menor eficiencia
    this.procesosEficiencia.sort((a, b) => b.eficiencia - a.eficiencia);

    // Limitamos a máximo 4 procesos para visualización
    if (this.procesosEficiencia.length > 4) {
      this.procesosEficiencia = this.procesosEficiencia.slice(0, 4);
    }
  }

  /**
   * Muestra recomendaciones de optimización de producción
   */
  mostrarRecomendacionesProduccion() {
    // Aquí puedes mostrar un modal o mensaje con recomendaciones
    // Ejemplo usando algún servicio de notificaciones como SweetAlert o PrimeNG Toast
    // Por ahora, solo mostramos un console.log como ejemplo
    console.log('Mostrando recomendaciones de producción...');

    // Variables para calcular recomendaciones
    const urgentes = this.pedidosUrgentes.length;
    const enRiesgo = this.pedidosEnRiesgo.length;
    const capacidad = this.capacidadUtilizada;

    // Construir mensaje de recomendación
    let mensaje = 'Recomendaciones para optimizar producción:\n\n';

    if (urgentes > 0) {
      mensaje += `• Prioriza ${urgentes} artículo(s) urgente(s) para entrega inmediata\n`;
    }

    if (enRiesgo > 0) {
      mensaje += `• Programa ${enRiesgo} artículo(s) en riesgo para evitar retrasos\n`;
    }

    if (capacidad > 90) {
      mensaje += '• La capacidad está al límite, considera redistribuir la carga\n';
    } else if (capacidad < 50) {
      mensaje += '• Capacidad subutilizada, puedes aceptar más pedidos\n';
    }

    // Procesos con baja eficiencia
    const procesosIneficientes = this.procesosEficiencia.filter(p => p.eficiencia < 60);
    if (procesosIneficientes.length > 0) {
      mensaje += `• Mejora la eficiencia de: ${procesosIneficientes.map(p => p.nombre).join(', ')}\n`;
    }

    alert(mensaje);
  }

  /**
   * Establece la densidad de visualización de la tabla
   */
  setTableDensity(density: 'compact' | 'normal' | 'expanded'): void {
    // Actualizar la propiedad que controla la densidad
    this.tableDensity = density;

    // No es necesario manipular el DOM directamente ya que la clase 
    // se aplica automáticamente mediante la vinculación en el HTML:
    // styleClass="modern-production-table density-{{tableDensity}}"

    // Guardar preferencia en localStorage para mantenerla entre sesiones
    try {
      localStorage.setItem('tableDensityPreference', density);
    } catch (e) {
      console.warn('No se pudo guardar la preferencia de densidad', e);
    }

    // Mensaje para confirmar que el cambio se realizó (opcional)
    console.log(`Densidad de tabla cambiada a: ${density}`);
  }

  /**
   * Ajusta automáticamente el ancho de las columnas según su contenido
   */
  autoAdjustColumns(): void {
    // Obtener todas las celdas con nombres de artículos y productos
    const articleCells = document.querySelectorAll('.article-name');
    const productCells = document.querySelectorAll('.product-name');

    // Calcular el ancho máximo para cada tipo de celda
    let maxArticleWidth = 150; // Ancho mínimo por defecto
    let maxProductWidth = 150; // Ancho mínimo por defecto

    articleCells.forEach(cell => {
      const textLength = (cell.textContent || '').length;
      const estimatedWidth = Math.min(300, Math.max(150, textLength * 8)); // Estimar 8px por carácter, con límites
      maxArticleWidth = Math.max(maxArticleWidth, estimatedWidth);
    });

    productCells.forEach(cell => {
      const textLength = (cell.textContent || '').length;
      const estimatedWidth = Math.min(280, Math.max(150, textLength * 7)); // Estimar 7px por carácter, con límites
      maxProductWidth = Math.max(maxProductWidth, estimatedWidth);
    });

    // Aplicar los anchos calculados a las columnas
    const articleColumn = document.querySelector('th[data-field="nombreArticulo"]');
    const productColumn = document.querySelector('th[data-field="nombreProducto"]');

    if (articleColumn) {
      (articleColumn as HTMLElement).style.width = `${maxArticleWidth}px`;
    }

    if (productColumn) {
      (productColumn as HTMLElement).style.width = `${maxProductWidth}px`;
    }

    // Notificar al usuario
    // Usar PrimeNG Toast o similar si está disponible en el proyecto
  }

  /**
   * Inicializar la densidad de la tabla al cargar el componente
   */
  ngAfterViewInit() {
    // Cargar preferencia guardada previamente, si existe
    try {
      const savedDensity = localStorage.getItem('tableDensityPreference');
      if (savedDensity && ['compact', 'normal', 'expanded'].includes(savedDensity)) {
        this.setTableDensity(savedDensity as 'compact' | 'normal' | 'expanded');
      }

      // Añadir atributo data-field a las columnas para facilitar la selección en el ajuste automático
      setTimeout(() => {
        const headers = document.querySelectorAll('.modern-production-table th');
        headers.forEach((header, index) => {
          if (this.selectedColumns[index - 1]) { // -1 para compensar la columna de acciones
            header.setAttribute('data-field', this.selectedColumns[index - 1].field);
          }
        });
      }, 500);
    } catch (e) {
      console.warn('Error al cargar preferencias de densidad', e);
    }

    // Cargar estado de filtros guardado
    this.loadFiltersFromStorage();
  }

  // Métodos para filtros modernos (inspirados en ventas/list)

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.saveFiltersToStorage();
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.fechaInicial) count++;
    if (this.fechaFinal) count++;
    if (this.nroPedido) count++;
    if (this.quickFilters.estadoPago !== "all") count++;
    if (this.quickFilters.estadoProceso !== "all") count++;
    if (this.selectedProcesosFilter) count++;
    return count;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.fechaInicial ||
      this.fechaFinal ||
      this.nroPedido ||
      this.quickFilters.estadoPago !== "all" ||
      this.quickFilters.estadoProceso !== "all" ||
      this.selectedProcesosFilter
    );
  }

  clearQuickFilter(type: "estadoPago" | "estadoProceso"): void {
    this.quickFilters[type] = "all";
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  clearAllFilters(): void {
    this.fechaInicial = new Date();
    this.fechaFinal = new Date(new Date().getTime() + (30 * 24 * 60 * 60 * 1000));
    this.nroPedido = null;
    this.selectedProcesosFilter = null;
    this.quickFilters = {
      estadoPago: "all",
      estadoProceso: "all",
    };
    // Cerrar filtros si no hay filtros activos
    if (!this.hasActiveFilters()) {
      this.showFilters = false;
      this.saveFiltersToStorage();
    }
    this.refrescarDatosEnsamble();
  }

  // Métodos para persistir estado de filtros en sessionStorage
  private loadFiltersFromStorage(): void {
    const savedState = sessionStorage.getItem("produccionFiltersState");
    if (savedState) {
      try {
        const state = JSON.parse(savedState);

        // Cargar estado de visibilidad de filtros
        this.showFilters = state.showFilters || false;

        // Cargar valores de filtros
        if (state.fechaInicial) {
          this.fechaInicial = new Date(state.fechaInicial);
        }
        if (state.fechaFinal) {
          this.fechaFinal = new Date(state.fechaFinal);
        }
        if (state.nroPedido) {
          this.nroPedido = state.nroPedido;
        }
        if (state.selectedProcesosFilter) {
          this.selectedProcesosFilter = state.selectedProcesosFilter;
        }
        if (state.quickFilters) {
          this.quickFilters = { ...this.quickFilters, ...state.quickFilters };
        }

        // Si hay filtros activos, abrir automáticamente
        if (this.hasActiveFilters()) {
          this.showFilters = true;
        }

        console.log("Filtros cargados desde sessionStorage:", state);
      } catch (e) {
        console.error("Error loading filters from sessionStorage", e);
        this.initializeDefaultFilters();
      }
    } else {
      this.initializeDefaultFilters();
    }
  }

  private saveFiltersToStorage(): void {
    const state = {
      showFilters: this.showFilters,
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      nroPedido: this.nroPedido,
      selectedProcesosFilter: this.selectedProcesosFilter,
      quickFilters: this.quickFilters,
      timestamp: new Date().getTime(),
    };

    sessionStorage.setItem("produccionFiltersState", JSON.stringify(state));
    console.log("Filtros guardados en sessionStorage:", state);
  }

  private initializeDefaultFilters(): void {
    this.fechaInicial = new Date();
    this.fechaFinal = new Date(new Date().getTime() + (30 * 24 * 60 * 60 * 1000));
    this.nroPedido = null;
    this.selectedProcesosFilter = null;
    this.quickFilters = {
      estadoPago: "all",
      estadoProceso: "all",
    };
    this.showFilters = false;
  }

  // Auto-abrir filtros cuando se aplicuen filtros rápidos
  setQuickFilter(type: "estadoPago" | "estadoProceso", value: string): void {
    this.quickFilters[type] = value;
    // Abrir filtros si se aplica un filtro
    if (value !== "all" && !this.showFilters) {
      this.showFilters = true;
    }
    // Guardar filtros cuando cambian
    this.saveFiltersToStorage();
    // Refrescar datos cuando cambian los filtros rápidos
    this.refrescarDatosEnsamble();
  }

  /**
   * Maneja el click en las métricas breadcrumb para aplicar filtros de ensamble
   */
  onMetricEnsambleClick(estadoProceso: string): void {
    if (estadoProceso === 'all') {
      // Limpiar todos los filtros de estado
      this.quickFilters.estadoProceso = 'all';
    } else if (estadoProceso === 'urgentes') {
      // Filtrar solo pedidos urgentes (usando la tabla local ya filtrada)
      // No hay un estado específico, pero podríamos implementarlo
      console.log('Filtro de urgentes - Feature en desarrollo');
      return;
    } else if (estadoProceso === 'riesgo') {
      // Filtrar solo pedidos en riesgo (usando la tabla local ya filtrada)
      console.log('Filtro de riesgo - Feature en desarrollo');
      return;
    } else {
      // Aplicar filtro por estado de proceso
      this.setQuickFilter('estadoProceso', estadoProceso);
      return; // setQuickFilter ya llama a refrescarDatosEnsamble
    }

    // Guardar y refrescar solo si no retornamos antes
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  // Manejar cambios en las fechas
  onDateChange(): void {
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  // Manejar cambios en el número de pedido
  onOrderNumberChange(): void {
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  // Métodos helper para limpiar filtros individuales
  clearDateFilter(type: 'inicial' | 'final'): void {
    if (type === 'inicial') {
      this.fechaInicial = null;
    } else {
      this.fechaFinal = null;
    }
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  clearOrderNumberFilter(): void {
    this.nroPedido = null;
    this.saveFiltersToStorage();
    this.refrescarDatosEnsamble();
  }

  clearProcessFilter(): void {
    this.selectedProcesosFilter = null;
    this.saveFiltersToStorage();
    this.filterOrderByProcess({ value: null });
  }

  abrirModalImprimirListaPorProceso(modalRef) {
    this.procesoParaImprimir = null;
    this.fechaParaImprimir = new Date();
    this.listaPorProcesoParaImprimir = [];
    this.fechasDisponiblesParaUi = []; // Limpiar fechas al abrir el modal
    this.modalService.open(modalRef, { size: 'md', centered: true });
  }

  // Genera la lista filtrada y abre la vista previa
  async generarVistaPreviaImpresion(parentModal) {
    if (!this.procesoParaImprimir) return;

    let procesoStr = '';
    // Extraer el nombre del proceso de forma segura
    if (typeof this.procesoParaImprimir === 'string') {
      procesoStr = this.procesoParaImprimir;
    } else if (this.procesoParaImprimir && typeof this.procesoParaImprimir === 'object') {
      if (this.procesoParaImprimir.value && typeof this.procesoParaImprimir.value === 'object' && this.procesoParaImprimir.value.nombre) {
        procesoStr = this.procesoParaImprimir.value.nombre;
      } else if (this.procesoParaImprimir.label && typeof this.procesoParaImprimir.label === 'string') {
        procesoStr = this.procesoParaImprimir.label;
      } else if (this.procesoParaImprimir.nombre && typeof this.procesoParaImprimir.nombre === 'string') {
        procesoStr = this.procesoParaImprimir.nombre;
      } else {
        try {
          procesoStr = String(this.procesoParaImprimir);
        } catch (e) {
          console.error('No se pudo convertir el proceso a string', this.procesoParaImprimir);
          procesoStr = '';
        }
      }
    }
    const proceso = procesoStr.toLowerCase().trim();

    const estado = this.estadoParaImprimir;
    const lista: { producto: string, articulo: string, cantidad: number, fecha?: string }[] = [];
    let fechasFiltro: Date[] = [];
    const filtrarPorFecha = this.fechaParaImprimir !== null && this.fechaParaImprimir !== undefined;

    if (filtrarPorFecha) {
      if (Array.isArray(this.fechaParaImprimir)) {
        const startDate = this.fechaParaImprimir[0];
        const endDate = this.fechaParaImprimir[1];

        // Si hay fecha de inicio y de fin, es un rango
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);

          let d = new Date(start);
          while (d <= end) {
            fechasFiltro.push(new Date(d));
            d.setDate(d.getDate() + 1);
          }
        }
        // Si solo hay fecha de inicio, es un día único
        else if (startDate) {
          const f = new Date(startDate);
          f.setHours(0, 0, 0, 0);
          fechasFiltro = [f];
        }
      }
      // Si es un solo objeto Date
      else if (this.fechaParaImprimir instanceof Date) {
        const f = new Date(this.fechaParaImprimir);
        f.setHours(0, 0, 0, 0);
        fechasFiltro = [f];
      }
    }


    const sonMismaFecha = (fecha1: Date, fecha2: Date): boolean => {
      return fecha1.getDate() === fecha2.getDate() &&
        fecha1.getMonth() === fecha2.getMonth() &&
        fecha1.getFullYear() === fecha2.getFullYear();
    };

    // Recorremos los pedidos filtrando por proceso
    this.ordersEnsamble.forEach(order => {

      order.detallePedido.forEach(detalle => {
        // Comparación de proceso insensible a mayúsculas/minúsculas
        const procesoDetalle = detalle.proceso?.toLowerCase()?.trim() || '';
        const coincideProceso = procesoDetalle === proceso;

        if (coincideProceso) {
          let coincideFecha = true;

          // Si hay que filtrar por fecha, verificar coincidencia
          if (filtrarPorFecha && detalle.fechaEntrega) {
            const fechaEntrega = new Date(detalle.fechaEntrega);
            fechaEntrega.setHours(0, 0, 0, 0);


            // Comparar usando día/mes/año en vez de timestamp
            coincideFecha = fechasFiltro.some(f => sonMismaFecha(f, fechaEntrega));

          }

          // Si coincide proceso y fecha (o no hay que filtrar por fecha)
          if (coincideFecha) {
            lista.push({
              producto: order.nombreProducto,
              articulo: order.nombreArticulo.trim(),
              cantidad: detalle.cantidadArticulosPorPedido,
              fecha: detalle.fechaEntrega ? new Date(detalle.fechaEntrega).toLocaleDateString() : 'Sin fecha'
            });
          }
        }
      });
    });

    // Aplicar agrupación por artículo si está habilitada
    let listaFinal = lista;

    if (this.agruparSoloPorArticulo) {
      // Agrupar por artículo sumando cantidades
      const agrupadoPorArticulo = lista.reduce((acumulador, item) => {
        const clave = item.articulo.trim();

        if (!acumulador[clave]) {
          acumulador[clave] = {
            producto: item.producto,
            articulo: item.articulo,
            cantidad: 0,
            fecha: item.fecha
          };
        }

        // Sumar cantidades del mismo artículo
        acumulador[clave].cantidad += item.cantidad;

        return acumulador;
      }, {});

      // Convertir el objeto agrupado a array
      listaFinal = Object.values(agrupadoPorArticulo);
    }

    // Ordenar alfabéticamente por artículo A-Z sin importar mayúsculas o minúsculas
    this.listaPorProcesoParaImprimir = listaFinal.sort((a, b) => {
      // Asegurar que los valores no sean null o undefined
      const articuloA = (a.articulo || '').toString().trim();
      const articuloB = (b.articulo || '').toString().trim();

      // Usar localeCompare para ordenamiento correcto en español
      return articuloA.localeCompare(articuloB, 'es', {
        sensitivity: 'base',
        numeric: true
      });
    });


    // Si no hay resultados, mostrar mensaje adicional
    if (lista.length === 0) {
      // Contar cuántos pedidos tienen el proceso seleccionado (para diagnóstico)
      let pedidosConProceso = 0;
      this.ordersEnsamble.forEach(order => {
        order.detallePedido.forEach(detalle => {
          if (detalle.proceso?.toLowerCase()?.trim() === proceso) {
            pedidosConProceso++;
          }
        });
      });
    }

    parentModal.close();
    setTimeout(() => {
      this.modalService.open(this.vistaPreviaImpresionModal, { size: 'lg', centered: true });
    }, 100);
  }

  // Imprime la lista mostrada en la vista previa
  imprimirListaPorProceso() {
    const printContents = document.getElementById('printable-lista-proceso')?.innerHTML;
    if (!printContents) return;
    const win = window.open('', '', 'height=700,width=900');
    if (win) {
      win.document.write('<html><head><title>Lista por Proceso</title>');
      win.document.write('<style>body{font-family:Arial,sans-serif;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:8px;text-align:left;}th{background:#f5f5f5;}h5{margin-bottom:1rem;}</style>');
      win.document.write('</head><body>');
      win.document.write(printContents);
      win.document.write('</body></html>');
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }
  }

  // Calcula la suma total de cantidades de artículos en la lista de impresión
  getTotalCantidad(): number {
    return this.listaPorProcesoParaImprimir.reduce((sum, item) => sum + (item.cantidad || 0), 0);
  }

  // Función para identificar fechas disponibles para un proceso
  mostrarFechasDisponibles(): void {
    if (!this.procesoParaImprimir) {
      this.fechasDisponiblesParaUi = [];
      return;
    }

    let procesoStr = '';
    // Extraer el nombre del proceso de forma segura
    if (typeof this.procesoParaImprimir === 'string') {
      procesoStr = this.procesoParaImprimir;
    } else if (this.procesoParaImprimir && typeof this.procesoParaImprimir === 'object') {
      if (this.procesoParaImprimir.value && typeof this.procesoParaImprimir.value === 'object' && this.procesoParaImprimir.value.nombre) {
        procesoStr = this.procesoParaImprimir.value.nombre;
      } else if (this.procesoParaImprimir.label && typeof this.procesoParaImprimir.label === 'string') {
        procesoStr = this.procesoParaImprimir.label;
      } else if (this.procesoParaImprimir.nombre && typeof this.procesoParaImprimir.nombre === 'string') {
        procesoStr = this.procesoParaImprimir.nombre;
      } else {
        try {
          procesoStr = String(this.procesoParaImprimir);
        } catch (e) {
          console.error('No se pudo convertir el proceso a string', this.procesoParaImprimir);
          procesoStr = '';
        }
      }
    }
    const proceso = procesoStr.toLowerCase().trim();

    // Usar un Map para almacenar fechas únicas (clave YYYY-MM-DD, valor objeto Date)
    const fechasMap: Map<string, Date> = new Map();

    this.ordersEnsamble.forEach(order => {
      order.detallePedido.forEach(detalle => {
        const procesoDetalle = detalle.proceso?.toLowerCase()?.trim() || '';
        if (procesoDetalle === proceso && detalle.fechaEntrega) {
          const fechaEntrega = new Date(detalle.fechaEntrega);
          // Normalizar la fecha para usarla como clave única, ignorando la hora
          const key = `${fechaEntrega.getFullYear()}-${fechaEntrega.getMonth()}-${fechaEntrega.getDate()}`;
          if (!fechasMap.has(key)) {
            // Guardar la fecha con la hora reseteada para evitar problemas de timezone
            fechaEntrega.setHours(0, 0, 0, 0);
            fechasMap.set(key, fechaEntrega);
          }
        }
      });
    });

    // Convertir el Map a un array de fechas y ordenarlas
    const fechasArray = Array.from(fechasMap.values()).sort((a, b) => a.getTime() - b.getTime());

    this.fechasDisponiblesParaUi = fechasArray;

    console.log(`📅 FECHAS DISPONIBLES PARA "${proceso.toUpperCase()}":`, this.fechasDisponiblesParaUi.map(d => d.toLocaleDateString()));
  }

  // Verifica si dos fechas representan el mismo día (ignorando hora)
  isSameDay(fechaTag: Date, fechaSeleccionada: Date | Date[]): boolean {
    if (!fechaTag || !fechaSeleccionada) return false;

    // El calendario en modo rango devuelve un array, tomamos la primera fecha
    const fechaAComparar = Array.isArray(fechaSeleccionada) ? fechaSeleccionada[0] : fechaSeleccionada;
    if (!fechaAComparar) return false;

    return fechaTag.getDate() === fechaAComparar.getDate() &&
      fechaTag.getMonth() === fechaAComparar.getMonth() &&
      fechaTag.getFullYear() === fechaAComparar.getFullYear();
  }

  // Mostrar fechas disponibles cuando se selecciona un proceso
  onProcesoChange(): void {
    if (this.procesoParaImprimir) {
      this.mostrarFechasDisponibles();
    } else {
      this.fechasDisponiblesParaUi = [];
    }
  }

  // Función para seleccionar una fecha cuando se hace clic en su etiqueta
  seleccionarFecha(fecha: Date): void {
    this.fechaParaImprimir = fecha;
    console.log('Fecha seleccionada:', this.fechaParaImprimir);
  }

  getFormattedDateForPrint(): string {
    if (!this.fechaParaImprimir) {
      return 'Todas las fechas';
    }

    if (Array.isArray(this.fechaParaImprimir)) {
      const startDate = this.fechaParaImprimir[0];
      const endDate = this.fechaParaImprimir[1];

      if (startDate && endDate) {
        const startStr = startDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endStr = endDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        if (startStr === endStr) {
          return `Fecha: ${startStr}`;
        }
        return `Rango: ${startStr} - ${endStr}`;
      } else if (startDate) {
        return `Fecha: ${startDate.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      }
    }

    if (this.fechaParaImprimir instanceof Date) {
      return `Fecha: ${this.fechaParaImprimir.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }

    return 'Todas las fechas';
  }

  shouldShowDateColumnForPrint(): boolean {
    if (Array.isArray(this.fechaParaImprimir)) {
      // Mostrar columna solo si es un rango de fechas válido y diferente
      if (this.fechaParaImprimir[0] && this.fechaParaImprimir[1]) {
        const start = new Date(this.fechaParaImprimir[0]);
        const end = new Date(this.fechaParaImprimir[1]);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return start.getTime() !== end.getTime();
      }
    }
    return false;
  }

}




// Definiciones de interfaces para la estructura de datos del modal

export interface ProcesoLite {
  proceso: string;
  piezasProducidas: number;
  statusProceso: string;
}

export interface ArticuloConProcesos {
  articulo: string;
  procesos: ProcesoLite[];
}

export interface DatosProducto {
  producto: string; // Supongo que también necesitas almacenar el nombre del producto
  articulosConProcesos: ArticuloConProcesos[];
  procesosUnicos?: string[];
  estadoProcesoProducto?: string;
}
