import { Component, OnInit, ViewChild } from '@angular/core';
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
import { Detalle, DetallePedido, PedidoParaProduccion, PedidosParaProduccionEnsamble } from '../../../shared/models/produccion/Produccion';
import { FilterMatchMode, PrimeIcons, PrimeNGConfig, TreeNode } from 'primeng/api';
import { UtilsService } from 'src/app/shared/services/utils.service';
import { EstadoProcesoItem, PiezasProduccion } from '../../../shared/models/productos/otrosprocesos';
import { icons } from 'feather-icons';
import { stat } from 'fs';
import { VentasService } from 'src/app/shared/services/ventas/ventas.service';
import { FilterService } from 'primeng/api';
import { finalize } from 'rxjs';
import { parse } from 'flatted';
import { ListOrdersComponent } from '../../ventas/list/list.component';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {

  @ViewChild('clientes', { static: false }) clientes: ClientesComponent;
  @ViewChild('entrega', { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild('listOrders', { static: false }) listaPedidos: ListOrdersComponent;
  orders: PedidoParaProduccion[] = [];
  orderResponse: { orders: PedidoParaProduccion[], ordersRaw: Pedido[] } = { orders: [], ordersRaw: [] };
  ordersEnsamble: PedidosParaProduccionEnsamble[] = [];
  AllOrdersEnsamble: PedidosParaProduccionEnsamble[] = [];
  loading: boolean = true;
  totalValorProductoBruto: number;
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
  fechaInicial: Date;
  fechaFinal: Date;
  horariosEntrega: any[] = [{
    nroPedido: '123',
    horarioEntrega: '10:00-12:00'
  }];

  filterProcess: any[] = [
  ]
  events: any[
  ]
  selectedProcesos: any;
  selectedProcesosFilter: any;
  procesoGlobal = "Proceso Empaque Producción"
  productsToClose: DatosProducto[];
  filterProcessCombo: any[];

  constructor(private produccionService: ProduccionService,
    private ventasService: VentasService,
    private config: PrimeNGConfig, private paymentService: PaymentService, private modalService: NgbModal, private formBuilder: FormBuilder, private pedidoUtilService: PedidosUtilService,
    private utilService: UtilsService, private filterService: FilterService
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
      { id: 2, nombre: 'Pagado' },
      { id: 3, nombre: 'Anulado' },
      { id: 4, nombre: 'Devuelto' }
    ];
    this.refrescarDatosEnsamble();
    this.refrescarDatos();

  }

  async refrescarDatos() {
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      estadosPago: ['Prependiente', 'PreAprobado', 'Aprobado'],
      company: JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial
    }
    this.loading = true;
    const context = this;
    this.produccionService.getOrdersByFiltersFlatProduct(filter)
      .pipe(
        finalize(() => context.loading = false)
      )
      .subscribe({
        next: (data) => {
          context.orderResponse = data;
          context.orders = data.orders;
        },
        error: (error) => {
          console.error('Error al cargar los datos:', error);
          // Manejar el error apropiadamente (por ejemplo, mostrar un mensaje al usuario)
        }
      });
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
    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos();
      Swal.fire({
        icon: 'success',
        title: 'Pedido  actualizado correctamente',
        showConfirmButton: false,
        timer: 1500
      });
    });
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
      const index = order.carrito.findIndex((carrito) => carrito.producto.identificacion.referencia === configuracionResult?.producto.identificacion.referencia);
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


  refrescarDatosEnsamble() {
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      estadosPago: ['Prependiente', 'PreAprobado', 'Aprobado'],
      company: JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial
    }

    this.refrescarDatos();

    this.produccionService.getOrdersByFiltersFlatProduct(filter).subscribe((data) => {

      this.filterProcess = data.orders.flatMap((pedido) => {

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


      let dataEnsamble = data.orders.flatMap((pedido) => {
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
          cantidad: item.cantidadProducto,
          cantidadArticulosPorPedido: item.cantidadArticulo * item.cantidadTotalProductoEnsamble,
          historialPiezasProducidas: item.historialPiezasProducidas || [],
          piezasProducidas: 0,
          proceso: ''
        };
        //validar si ya existe el nroPedido
        if (acumulador[clave].detallePedido.findIndex((detalle) => detalle.nroPedido === detallePedido.nroPedido) === -1) {
          acumulador[clave].detallePedido.push(detallePedido);
          acumulador[clave].cantidadTotalProducto += item.cantidadProducto;
        }
        acumulador[clave].detalles.push(detalle);
        acumulador[clave].cantidadTotalProductoEnsamble = item.cantidadArticulo;
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
          cantidad: item.cantidadProducto,
          cantidadArticulosPorPedido: item.cantidadArticulo * item.cantidadTotalProductoEnsamble,
          historialPiezasProducidas: item.historialPiezasProducidas || [],
          piezasProducidas: 0,
          nombreArticulo: item.nombreArticulo,
          proceso: ''
        };

        // Validar si ya existe el nroPedido
        if (acumulador[clave].detallePedido.findIndex((detalle) => detalle.nroPedido === detallePedido.nroPedido) === -1) {
          acumulador[clave].detallePedido.push(detallePedido);
          acumulador[clave].cantidadTotalProducto += item.cantidadProducto;
        }

        if (!acumulador[clave].detalles.find((detalle) => detalle.nombreProceso === detalle.nombreProceso)) {
          acumulador[clave].detalles.push(detalle);
          acumulador[clave].cantidadTotalProductoEnsamble += item.cantidadArticulo;
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

      const resultado = Object.values(resultadoAgrupado).map((grupo: PedidosParaProduccionEnsamble) => ({
        nombreProducto: grupo.nombreProducto,
        nombreArticulo: grupo.nombreArticulo,
        cantidadTotalProducto: grupo.cantidadTotalProducto,
        detallePedido: grupo.detallePedido,
        fechaEntrega: this.getFechaEntregaProgramada(grupo.detallePedido),
        horarioEntrega: this.getHorarioEntregaProgramada(grupo.detallePedido),
        tracking: [],
        cantidadTotalProductoEnsamble: grupo.cantidadTotalProductoEnsamble * grupo.cantidadTotalProducto,
        detalles: grupo.detalles
      } as PedidosParaProduccionEnsamble));

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

      this.ordersEnsamble = resultado;
      this.AllOrdersEnsamble = this.utilService.deepClone(this.ordersEnsamble);
      this.loading = false;
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
    this.ciudadSeleccionada = order.envio?.ciudad;
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
      order.carrito.push(configuracionResult);
      // actualizar valores del pedido
      order = this.actualizarValoresPedido(order);


      // this.editOrder(order);

    });
  }
  actualizarValoresPedido(order: Pedido) {
    this.pedidoUtilService.pedido = order;
    order.totalDescuento = this.pedidoUtilService.getDiscount();
    order.totalPedidoSinDescuento = this.pedidoUtilService.getSubtotal();
    order.totalPedididoConDescuento = this.pedidoUtilService.getTotalToPay(order.totalEnvio);
    return order;
  }

  deleteProductToCart(order: Pedido, carrito: Carrito) {
    const index = order.carrito.findIndex((carrito) => carrito.producto.identificacion.referencia === carrito.producto.identificacion.referencia);
    if (index !== -1) {
      order.carrito.splice(index, 1);
    }
    // this.editOrder(order);
  }


  editSeller(order: Pedido) {
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
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      estadosPago: ['Prependiente', 'PreAprobado', 'Aprobado'],
      company: JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial
    }
    this.produccionService.getOrdersByFiltersFlatProduct(filter).subscribe((data) => {
      this.orders = data.orders;
      this.loading = false;
    });

    if (table) {
      table.clear();
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
    this.refrescarDatosEnsamble();
  }

  filtrarParaManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para mañana
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = new Date(fechaManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaManana.setHours(23, 59, 59, 999));
    this.refrescarDatosEnsamble();
  }

  filtrarParaPasadoManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para pasado mañana
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = new Date(fechaPasadoManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaPasadoManana.setHours(23, 59, 59, 999));
    this.refrescarDatosEnsamble();
  }

  getFechaEntregaProgramada(detallePedido: DetallePedido[]): string {

    let infoFechas = "";
    detallePedido.forEach((detalle) => {
      // infoFechas += "Pedido: " + detalle.nroPedido + " - " + (detalle.fechaEntrega) + " ";
      let fecha = new Date(detalle.fechaEntrega);
      let formattedDate = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
      infoFechas += "Pedido: " + detalle.nroPedido + " - " + formattedDate + "-";
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
    this.selectedOrdersEnsamble = [event]
    // buscar el nombre del articulo seleccionado y obtener los procesos de ese articulo en orders
    // a filter process debe tener los procesos agrupados
    this.selectedProcesos = null;
    this.processStatusProductionProcess();


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

  private processStatusProductionProcess() {
    this.filterProcess = this.selectedOrdersEnsamble.flatMap((pedido) => {
      return pedido.detalles.flatMap((detalle, index) => {
        const status = this.getProcessStatus(detalle.nombreProceso, pedido);
        const statusProcessPrevious = this.validatePreviousStatusProduced(pedido, index);
        let iconSelected = PrimeIcons.SIGN_IN;
        //validar status y statusprevies 
        if (status === EstadoProcesoItem.ProducidasTotalmente) {
          iconSelected = PrimeIcons.CHECK;
        }
        else if (status === EstadoProcesoItem.ProducidasParcialmente) {
          iconSelected = PrimeIcons.COG;
        }
        else if (!statusProcessPrevious) {
          iconSelected = PrimeIcons.TIMES;
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
            if (order.nombreProducto === item.nombreProducto && order.nombreArticulo === item.nombreArticulo) {
              order.piezasProducidas = item.detallePedido.reduce((acc, item) => acc + item.piezasProducidas, 0);
            }
          });
        }
        );

        this.selectedOrdersEnsamble.forEach((item) => {

          item.detallePedido.forEach((detallePedido) => {

            this.orders
              .filter(
                (order) =>
                  order.producto.crearProducto.titulo === item.nombreProducto &&
                  order.nroPedido == detallePedido.nroPedido
              )
              .forEach((order) => {
                const produccion = order.producto.otrosProcesos.modulosVariables.produccion.find(
                  (prod) => prod.titulo === item.nombreArticulo
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
                  let carrito = orderToUpdate.carrito.find(x => x.producto.identificacion.referencia == order.producto.identificacion.referencia);

                  carrito.producto = this.utilService.deepClone(order.producto);

                  //validar si todos los procesos de todos los articulos estan producidos
                  carrito.producto?.otrosProcesos.modulosVariables.produccion.forEach((prod) => {
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
                  const allArticulosProduced = carrito.producto.otrosProcesos.modulosVariables.produccion.every((prod) => {
                    return prod.estadoArticulo === EstadoProcesoItem.ProducidasTotalmente;
                  });


                  //si es true se le cambia el estado al producto
                  if (allArticulosProduced) {
                    carrito.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;
                  } else {
                    //validar si almenos un articulo es diferente de sin producir
                    const allArticulosProducedPartial = carrito.producto.otrosProcesos.modulosVariables.produccion.some((prod) => {
                      return prod.estadoArticulo !== EstadoProcesoItem.SinProducir;
                    });

                    if (allArticulosProducedPartial) {
                      carrito.estadoProcesoProducto = EstadoProceso.ProducidoParcialmente;
                    } else {

                      carrito.estadoProcesoProducto = EstadoProceso.SinProducir;
                    }
                  }

                  //validar si todos los productos de la orden estan producidos
                  const allProductsProduced = orderToUpdate.carrito.every((carrito) => {
                    return carrito.estadoProcesoProducto === EstadoProceso.ProducidoTotalmente;
                  });

                  if (allProductsProduced) {
                    orderToUpdate.estadoProceso = EstadoProceso.ProducidoTotalmente;
                  } else {
                    //validar si almenos un producto es diferente de sin producir
                    const allProductsProducedPartial = orderToUpdate.carrito.some((carrito) => {
                      return carrito.estadoProcesoProducto !== EstadoProceso.SinProducir;
                    });
                    if (allProductsProducedPartial) {
                      orderToUpdate.estadoProceso = EstadoProceso.ProducidoParcialmente;
                    } else {
                      orderToUpdate.estadoProceso = EstadoProceso.SinProducir;
                    }
                  }

                  this.editOrder(orderToUpdate);
                }
              });
          });

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
    this.selectedOrdersEnsamble = [];

    this.ordersEnsamble = this.utilService.deepClone(this.AllOrdersEnsamble.filter((order) => {
      return order.detalles.find((detalle) => {
        return detalle.nombreProceso === event.value.nombre;
      });
    }));

    // this.ordersEnsamble = this.ordersEnsamble.map((order) => {

    //   order.detalles = order.detalles.filter((detalle) => {
    //     return detalle.nombreProceso === event.value;
    //   });

    //   return order;
    // });


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
            this.AllOrdersEnsamble.filter(x => x.nombreProducto == product.producto).forEach(z => {
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

              this.orders.filter(p => {
                p.producto.crearProducto.titulo == product.producto
              }).forEach(x => {
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
            this.orderResponse.ordersRaw.filter(x => x.carrito.find(y => y.producto.crearProducto.titulo == product.producto)).forEach(order => {
              let carritoSelected = order.carrito.find(x => x.producto.crearProducto.titulo == product.producto);
              carritoSelected.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;
              let orderToUpdate = order;


              //validar si todos los procesos de todos los articulos estan producidos
              carritoSelected.producto?.otrosProcesos.modulosVariables.produccion.forEach((prod) => {
                prod.procesos.forEach((proceso) => {
                  proceso.estadoProceso = EstadoProcesoItem.ProducidasTotalmente;
                });

                prod.estadoArticulo = EstadoProcesoItem.ProducidasTotalmente;


              });

              carritoSelected.estadoProcesoProducto = EstadoProceso.ProducidoTotalmente;
              //validar si todos los productos de la orden estan producidos
              const allProductsProduced = orderToUpdate.carrito.every((carrito) => {
                return carrito.estadoProcesoProducto === EstadoProceso.ProducidoTotalmente;
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

    if (pedido.estadoProceso != EstadoProceso.ProducidoTotalmente) {
      pedido.estadoProceso = EstadoProceso.ProducidoTotalmente;
      pedido.carrito.forEach(carrito => {
        carrito.producto.otrosProcesos.modulosVariables.produccion.forEach(produccion => {
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
        carrito.producto.otrosProcesos.modulosVariables.produccion.forEach(produccion => {
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
