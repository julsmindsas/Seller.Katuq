import { Component, ElementRef, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { VentasService } from 'src/app/shared/services/ventas/ventas.service';
import { Carrito, Cliente, EstadoPago, EstadoProceso, EstadoProcesoFiltros, Pedido } from '../../ventas/modelo/pedido';
import { Table } from 'primeng/table';
import { PaymentService } from 'src/app/shared/services/ventas/payment.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { jsPDF } from 'jspdf';
import { ServiciosService } from 'src/app/shared/services/servicios.service';
import 'bootstrap';
import html2canvas from 'html2canvas';
import { ClientesComponent } from '../../ventas/clientes/clientes.component';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PedidoEntregaComponent } from '../../ventas/entrega/pedido-entrega.component';
import { PedidosUtilService } from '../../ventas/service/pedidos.util.service';
import { UserLogged } from 'src/app/shared/models/User/UserLogged';
import { UserLite } from 'src/app/shared/models/User/UserLite';

import 'jspdf-autotable';
import { LogisticaService } from 'src/app/shared/services/despachos/logistica.services';
import { FilterService } from 'primeng/api';
import html2pdf from 'html2pdf.js';

@Component({
  selector: 'app-list-despachos',
  templateUrl: './despachos.component.html',
  styleUrls: ['./despachos.component.scss']
})
export class DespachosComponent implements OnInit {
  @ViewChild('clientes', { static: false }) clientes: ClientesComponent;
  @ViewChild('entrega', { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild('pantallaOrdenEnvioModal', { static: false }) pantallaOrdenEnvioModal: TemplateRef<any>;
  @ViewChild('dispatchOrdersModal', { static: false }) dispatchOrdersModal: TemplateRef<any>;

  @ViewChild('printContent', { static: false }) printContent!: ElementRef
  orders: Pedido[] = [];
  loading: boolean = true;
  totalValorProductoBruto: number;
  totalDescuento: number;
  htmlModal: any;
  clienteSeleccionado: Cliente;
  formulario: any;
  pedidoSeleccionado: Pedido;
  estadosPago = Object.values(EstadoPago);
  ciudadSeleccionada: string;
  ESTADOPAGO: any[];
  configuracionCarritoSeleccionado: Carrito;
  fechaInicial: Date;
  fechaFinal: Date;
  transportadorForm: FormGroup;
  ordenEnvioForm: FormGroup;
  metodoEnvio: any;
  pedidosSeleccionados: Pedido[] = [];
  transportadorSeleccionado: any;
  vendors: any;
  nroShippingOrder: any;
  nuevaOrdenEnvio: any;
  dispatchOrders: Pedido[];
  modalRef: any;
  editTransporter: boolean;
  dataEditTransporter: any;
  pedidoModal: any;
  isDialogOpen: boolean;
  pdfSize: any;
  filteredOrderNumbers: any;
  ordersByName: any;
  estadosProcesos: EstadoProcesoFiltros[];
  todasLasTarjetas: any[] = [];
  tienetarjetas: boolean = true;
  detallePedidoEntregado: any;

  constructor(private ventasService: VentasService,
    private service: ServiciosService,
    private logisticaService: LogisticaService,
    private paymentService: PaymentService,
    private filterService: FilterService,
    private modalService: NgbModal, private formBuilder: FormBuilder, private pedidoUtilService: PedidosUtilService) {
    const unaSemana = 15 * 24 * 60 * 60 * 1000; // dos semanas en milisegundos
    this.fechaInicial = new Date(new Date().setDate(new Date().getDate() - 1));
    this.fechaInicial.setHours(0, 0, 0, 0);
    this.fechaFinal = new Date(new Date().getTime() + unaSemana);
    this.fechaFinal.setHours(23, 59, 59, 999);
    this.registerCustomFilters();
  }

  ngOnInit(): void {
    this.estadosProcesos = Object.values(EstadoProcesoFiltros)
    this.estadosPago = Object.values(EstadoPago);
    this.ESTADOPAGO = [
      { id: 1, nombre: 'Pendiente' },
      { id: 2, nombre: 'Pagado' },
      { id: 3, nombre: 'Anulado' },
      { id: 4, nombre: 'Devuelto' }
    ];
    this.refrescarDatos();
    this.initForms();
  }




  imprimirOrdenConHtml2Pdf() {
    const totalPendiente = this.pedidosSeleccionados.reduce(
      (acc, pedido) => acc + (pedido.faltaPorPagar || 0),
      0
    );

    const pedidosHTML = this.pedidosSeleccionados.map(p => {
      const filaPrincipal = `
      <tr>
        <td>${p.nroPedido ?? 'N/A'}</td>
        <td>$${(p.faltaPorPagar ?? 0).toLocaleString()}</td>
        <td>___________</td>
        <td>
          <strong>Nombre:</strong> ${p?.envio?.nombres ?? 'N/A'} 
            ${p?.envio?.apellidos ?? 'N/A'}<br>
          <strong>Teléfono:</strong> ${p?.envio?.celular ?? 'N/A'}<br>
          <strong>WhatsApp:</strong> ${p?.envio?.celular ?? 'N/A'}<br>
          <strong>Otro Número:</strong> ${p?.envio?.otroNumero ?? 'N/A'}<br>
          <strong>Dirección:</strong> 
            ${p?.envio?.direccionEntrega ?? ''}, 
            ${p?.envio?.nombreUnidad ?? ''}, 
            ${p?.envio?.especificacionesInternas ?? ''}, 
            ${p?.envio?.observaciones ?? ''}
        </td>
        <td>${p?.horarioEntrega ?? 'N/A'}</td>
        <td>${p?.envio?.ciudad ?? 'N/A'}</td>
        <td>${p?.envio?.departamento ?? 'N/A'}</td>
      </tr>
    `;

      const filaSecundaria = `
      <tr style="border-bottom: 1px solid #000;border-top: 1px solid #000;">
        <td colspan="4"></td>
        <td colspan="3">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background-color: #000; color: #fff;">
              <th style="border: 1px solid #000;">Zona Entrega</th>
              <th style="border: 1px solid #000;">Barrio</th>
              <th style="border: 1px solid #000;">País</th>
            </tr>
            <tr>
              <td>${p?.envio?.zonaCobro ?? 'N/A'}</td>
              <td>${p?.envio?.barrio ?? 'N/A'}</td>
              <td>${p?.envio?.pais ?? 'N/A'}</td>
            </tr>
          </table>
        </td>
      </tr>
    `;

      return filaPrincipal + filaSecundaria;
    }).join('');

    const tableHeader = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr style="background-color: #000; color: #fff;">
          <th style="border: 1px solid #000; padding: 5px;">Número de Pedido</th>
          <th style="border: 1px solid #000; padding: 5px;">Valor a Cobrar</th>
          <th style="border: 1px solid #000; padding: 5px;">Firma</th>
          <th style="border: 1px solid #000; padding: 5px;">Datos de Entrega</th>
          <th style="border: 1px solid #000; padding: 5px;">Horario de Entrega</th>
          <th style="border: 1px solid #000; padding: 5px;">Ciudad</th>
          <th style="border: 1px solid #000; padding: 5px;">Departamento</th>
        </tr>
      </thead>
      <tbody>
        ${pedidosHTML}
      </tbody>
    </table>
  `;

    const content = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; padding:20px; width:100%;">
      <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
        <tr>
          <td>
            <h2 style="margin:0; font-size: 18px;">
              Orden de Envío: ${this.nroShippingOrder}
            </h2>
          </td>
          <td>
            <h2 style="margin:0; font-size: 18px;">
              Número de pedidos: ${this.pedidosSeleccionados.length}
            </h2>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Fecha de Generación: ${new Date().toLocaleDateString()}
            </p>
          </td>
          <td>
            <p style="margin:0; font-size: 14px;">
              Total a Recaudar: $${totalPendiente.toLocaleString()}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Transportador: ${this.transportadorSeleccionado ?? 'N/A'}
            </p>
          </td>
        </tr>
        <tr>
          <td>
            <p style="margin:0; font-size: 14px;">
              Despachador: ${JSON.parse(localStorage.getItem('user'))?.name ?? 'N/A'}
            </p>
          </td>
          <td>
            <p style="margin:0; font-size: 14px;">
              Fecha y Hora despachado: ${new Date().toISOString()}
            </p>
          </td>
        </tr>
      </table>
      ${tableHeader}
    </div>
  `;

    const element = document.createElement('div');
    element.innerHTML = content;
    document.body.appendChild(element);

    const options = {
      margin: 0.5,
      filename: `orden-envio-${this.nroShippingOrder}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 1.5 },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'landscape'
      }
    };

    html2pdf()
      .from(element)
      .set(options)
      .toPdf()
      .get('pdf')
      .then(pdf => {
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      })
      .finally(() => {
        document.body.removeChild(element);
      })
      .catch(err => {
        console.error("Error generando PDF:", err);
        document.body.removeChild(element);
      });
  }
  refrescarDatos() {

    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      company: JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial,
      estadoProceso: [EstadoProceso.Rechazado, EstadoProceso.ParaDespachar, EstadoProceso.ProducidoTotalmente, EstadoProceso.SinProducir, EstadoProceso.Producido, EstadoProceso.Entregado, EstadoProceso.Despachado, EstadoProceso.Empacado],
      estadosPago: [EstadoPago.PreAprobado, EstadoPago.Aprobado, EstadoPago.Pendiente, EstadoPago.Pospendiente],
      tipoFecha: 'fechaEntrega'
    }
    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      this.orders = data;

      this.orders.forEach(order => {

        order.fechaCreacion = new Date(new Date(order.fechaCreacion).setUTCHours(0, 0, 0, 0)).toISOString();
        if (order.anticipo == null || order.anticipo == undefined) {
          order.anticipo = 0
        }
        order.faltaPorPagar = order.totalPedididoConDescuento - order.anticipo
      })
      this.loading = false;
    });

    this.logisticaService.getTransportadores().subscribe((data) => {
      this.vendors = data;
    });

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


      return new Date(value).getTime() === filter.getTime();


    });
  }

  clear(table: Table) {
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    this.fechaInicial = new Date(new Date().setDate(new Date().getDate() - 1));
    this.fechaInicial.setHours(0, 0, 0, 0);

    this.fechaFinal.setHours(23, 59, 59, 999);
    this.fechaFinal = new Date(this.fechaInicial.getTime() + unaSemana);
    this.refrescar(table);
  }

  refrescar(table: Table) {

    this.refrescarDatos();
    table.clear();
  }
  onOrderSelect(event) {
    this.orders = [event];
    // this.orders= this.ordersByName.filter(P=>)
  }
  filtroGlobal(event: any) {
    const query = event.query;
    this.service.getOrderByName(query).then(res => {

      this.filteredOrderNumbers = res;
      this.ordersByName = res;


    })
  }

  initForms() {

    this.transportadorForm = this.formBuilder.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      cedula: ['', Validators.required],
      telefono: ['', Validators.required],
      whatsapp: [''],
      correo: ['', [Validators.required, Validators.email]],
      fechaNacimiento: ['', Validators.required],
      eps: [''],
      arl: [''],
      marcaMoto: [''],
      lineaMoto: [''],
      modeloMoto: [''],
      placa: [''],
      pwd: ['', Validators.required],
    });

    this.ordenEnvioForm = this.formBuilder.group({
      fechaEnvio: ['', Validators.required],
      metodoEnvio: ['', Validators.required]
    });


  }
  deleteTransporter(item: any) {
    this.logisticaService.deleteTrasportadora(item).subscribe((data) => {
      Swal.fire('Exitio', 'Transportador eliminado con exito', 'success')
      this.refrescarDatos()
    });
  }

  calculateValorBruto() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalPedidoSinDescuento, 0);
  }

  calculateDescuento() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalDescuento, 0);
  }

  calculateTotal() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalPedididoConDescuento, 0);
  }

  calculateFaltaPorPagar() {
    return this.orders.reduce((acc, pedido) => acc + pedido.faltaPorPagar, 0);
  }

  calculateTotalEnvio() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalEnvio, 0);
  }

  calculateAnticipo() {
    return this.orders.reduce((acc, pedido) => acc + pedido.anticipo, 0);
  }

  calculateSubtotal() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalPedidoSinDescuento, 0);
  }

  calculateTotalImpuestos() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalImpuesto, 0);
  }


  editDatosClientes(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: false,
      ariaLabelledBy: 'modal-basic-title'
    }).result.then((result) => {
      this.editOrder(order);
    }, (reason) => {
      if (reason !== 'Cross click') {
        this.editOrder(order);
      }
    });
  }




  // Generar el contenido del PDF con máximo 3 pedidos por página
  pedidosPorPagina = 4;

  // Función para dividir los pedidos en grupos de 3
  dividirPedidosEnPagina(pedidos, pedidosPorPagina) {
    let paginas = [];
    for (let i = 0; i < pedidos.length; i += pedidosPorPagina) {
      paginas.push(pedidos.slice(i, i + pedidosPorPagina));
    }
    return paginas;
  }

  todayDate() {
    return new Date().toISOString();
  }
  // Iterar sobre cada grupo de pedidos y generar una página en el PDF
  async imprimirOrden() {
    this.imprimirOrdenConHtml2Pdf();
  };



  editOrder(order: Pedido) {
    if (order.carrito.length > 0) {
      let fechaEntrega = order.carrito[0].configuracion?.datosEntrega?.fechaEntrega;
      let horarioEntrega = order.carrito[0].configuracion?.datosEntrega?.horarioEntrega;
      order.fechaEntrega = new Date(fechaEntrega.year, fechaEntrega.month, fechaEntrega.day).toISOString();
      order.horarioEntrega = horarioEntrega;
    }
    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos();
      Swal.fire({
        icon: 'success',
        title: 'Pedido actualizado correctamente',
        showConfirmButton: false,
        timer: 1500
      });
    });
  }
  cambiarEstado(order: Pedido, estado) {
    const userLite: UserLite = JSON.parse(localStorage.getItem('user')) as UserLite;
    if (estado == 1) {
      order.estadoProceso = EstadoProceso.Empacado;
      order.fechaHoraEmpacado = new Date().toISOString();
      order.empacador = userLite.name
    } else if (estado == 2) {
      order.estadoProceso = EstadoProceso.ProducidoTotalmente
      order.fechaHoraEmpacado = null
      order.empacador = null
      order.shippingOrder = null
      order.nroShippingOrder = null
      order.despachador = null
      order.fechaYHorarioDespachado = null
      order.transportador = null
    } else if (estado == 3) {
      order.estadoProceso = EstadoProceso.Empacado
      order.shippingOrder = null
      order.nroShippingOrder = null
      order.despachador = null
      order.fechaYHorarioDespachado = null
      order.transportador = null
    } else if (estado == 4) {
      order.estadoProceso = EstadoProceso.Despachado
      order.fechaYHorarioDespachado = new Date().toISOString()
      order.despachador = userLite
      order.transportador = userLite.name
      order.nroShippingOrder = "00"
      order.shippingOrder = "00"
    }
    else if (estado == 5) {
      order.estadoProceso = EstadoProceso.Entregado
      order.despachador = userLite
      order.entregado = userLite;
      order.fechaYHorarioDespachado = new Date().toString();
    }
    this.ventasService.editOrder(order).subscribe((data) => {
      this.refrescarDatos();
      Swal.fire({
        icon: 'success',
        title: 'Pedido actualizado correctamente',
        showConfirmButton: false,
        timer: 1500
      });
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
    this.editOrder(order);
  }

  deleteOrder(order: Pedido) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: "¡No podrás revertir esto!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ventasService.deleteOrder(order).subscribe((data) => {
          this.refrescarDatos();
          Swal.fire(
            'Eliminado',
            'El pedido ha sido eliminado.',
            'success'
          );
        });
      }
    });
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
          this.editOrder(order);
          Swal.fire(
            'Cambiado',
            'El asesor ha sido cambiado.',
            'success'
          );
        }
      });
    } else {
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
    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      company: JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial
    }
    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      this.orders = data;
      this.loading = false;
    });

    if (table) {
      table.clear();
    }
  }

  filtrarParaHoy(): void {
    const fechaActual = new Date();
    this.fechaInicial = new Date(fechaActual.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaActual.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }

  filtrarParaManana(): void {
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = new Date(fechaManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaManana.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }

  filtrarParaPasadoManana(): void {
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = new Date(fechaPasadoManana.setHours(0, 0, 0, 0));
    // this.fechaInicial.setHours(23, 59, 59, 999);
    this.fechaFinal = new Date(fechaPasadoManana.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }

  AsentarPago(content, order: Pedido) {
    if (order.estadoPago === EstadoPago.Aprobado && order.faltaPorPagar <= 0) {
      Swal.fire({
        title: '¡Alerta!',
        text: "Este pedido ya ha sido pagado en su totalidad.",
        icon: 'warning',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }).result.then((result) => {
      order.PagosAsentados.push(result);
      this.actualizarValoresPedido(order);
      this.editOrder(order);
    });
  }

  convertFechaEntregaString(fechaEntrega: { day: number, month: number, year: number }) {
    if (!fechaEntrega) {
      return '';
    }
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }

  openModal(content, edit?: boolean, item?: any) {
    if (edit == true) {
      this.editTransporter = edit
      this.dataEditTransporter = item
      this.transportadorForm.patchValue(item)
    } else {
      this.editTransporter = false
      this.dataEditTransporter = null
      this.transportadorForm.reset()
      this.ordenEnvioForm.reset()
      this.metodoEnvio = undefined
      this.pedidosSeleccionados = []
    }
    this.modalRef = this.modalService.open(content, { size: 'xl', fullscreen: true });
    this.modalRef.result.then(
      (result) => {
        this.refrescarDatos(); // Lógica a ejecutar cuando se cierra el modal
      },
      (reason) => {
        this.refrescarDatos(); // Lógica a ejecutar cuando se cierra el modal
      }
    );
  }
  
  openModalDetalleEntrega(content, pedido) {
    this.detallePedidoEntregado = pedido
    console.log(this.detallePedidoEntregado)
    this.modalRef = this.modalService.open(content, { size: 'xl', fullscreen: true });
  }




  verNotasCliente(pedido) {
    if (!pedido.notasPedido) {
      Swal.fire({
        title: 'Notas del Pedido',
        text: 'No hay notas para mostrar',
        icon: 'info',
        customClass: {
          popup: 'swal2-custom-width'
        },
        didOpen: () => {
          const popup = document.querySelector('.swal2-popup') as HTMLElement;
          if (popup) {
            popup.style.width = '80%';
            popup.style.maxWidth = 'none';
          }
        }
      });
      return;
    }

    // Función para crear el contenido HTML de una lista de notas
    const createNotesList = (notas, tipo) => {
      if (!notas || notas.length === 0) {
        return `<p>No hay notas de ${tipo} para mostrar</p>`;
      }

      return `<ul class="list-group">${notas.map((nota, index) =>
        `<li class="list-group-item"><strong>Nota ${index + 1}:</strong> ${nota.fecha} - ${nota.nota}</li>`).join('')}</ul>`;
    };

    // Crear el contenido HTML para cada categoría de notas
    const notasCliente = createNotesList(pedido.notasPedido.notasCliente, 'cliente');
    const notasDespachos = createNotesList(pedido.notasPedido.notasDespachos, 'despachos');
    const notasEntregas = createNotesList(pedido.notasPedido.notasEntregas, 'entregas');
    const notasProduccion = createNotesList(pedido.notasPedido.notasProduccion, 'produccion')

    // Estructura HTML con pestañas de Bootstrap
    const tabsHtml = `
    <ul class="nav nav-tabs" id="myTab" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="cliente-tab" data-bs-toggle="tab" data-bs-target="#cliente" type="button" role="tab" aria-controls="cliente" aria-selected="true">Notas del Cliente</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="despachos-tab" data-bs-toggle="tab" data-bs-target="#despachos" type="button" role="tab" aria-controls="despachos" aria-selected="false">Notas de Despachos</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="entregas-tab" data-bs-toggle="tab" data-bs-target="#entregas" type="button" role="tab" aria-controls="entregas" aria-selected="false">Notas de entregas</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="produccion-tab" data-bs-toggle="tab" data-bs-target="#produccion" type="button" role="tab" aria-controls="produccion" aria-selected="false">Notas de Producción</button>
      </li>
    </ul>
    <div class="tab-content" id="myTabContent">
      <div class="tab-pane fade show active" id="cliente" role="tabpanel" aria-labelledby="cliente-tab">
        ${notasCliente}
      </div>
      <div class="tab-pane fade" id="despachos" role="tabpanel" aria-labelledby="despachos-tab">
        ${notasDespachos}
      </div>
      <div class="tab-pane fade" id="entregas" role="tabpanel" aria-labelledby="entregas-tab">
        ${notasEntregas}
      </div>
      <div class="tab-pane fade" id="produccion" role="tabpanel" aria-labelledby="produccion-tab">
        ${notasProduccion}
      </div>
    </div>`;

    // Mostrar el modal de SweetAlert2 con las pestañas
    Swal.fire({
      title: 'Notas del Pedido',
      html: tabsHtml,
      customClass: {
        popup: 'swal2-custom-width'
      },
      didOpen: () => {
        const popup = document.querySelector('.swal2-popup') as HTMLElement;
        if (popup) {
          popup.style.width = '80%';
          popup.style.maxWidth = 'none';
        }

        // Inicializar los eventos de Bootstrap para las pestañas
        const triggerTabList = [].slice.call(document.querySelectorAll('#myTab button'));
        triggerTabList.forEach((triggerEl) => {
          const tabTrigger = new (window as any).bootstrap.Tab(triggerEl);
          triggerEl.addEventListener('click', (event) => {
            event.preventDefault();
            tabTrigger.show();
          });
        });
      }
    });
  }
  iterarTarjetas(pedido) {

    const tarjetas = []
    pedido.carrito.forEach(producto => {
      if (producto.configuracion && producto.configuracion.tarjetas) {
        producto.configuracion.tarjetas.map(tarj => {
          if (tarj.de != "" || tarj.para != "" || tarj.mensaje != "") {
            tarjetas.push(tarj)
          }
        })

      }

    });
    return tarjetas.length > 0;
  }
  verTarjetasPedido(pedido) {
    this.todasLasTarjetas = [];

    pedido.carrito.forEach(producto => {
      if (producto.configuracion && producto.configuracion.tarjetas) {
        producto.configuracion.tarjetas.map(tarj => {
          if (tarj.de != "" || tarj.para != "" || tarj.mensaje != "") {
            this.todasLasTarjetas.push({ tarjeta: tarj, pedido: producto.producto.crearProducto.titulo })
          }
        })

      }
    });


    if (this.todasLasTarjetas.length === 0) {
      Swal.fire({
        title: 'Tarjetas de Productos',
        text: 'No hay tarjetas de productos para mostrar',
        icon: 'info',
        customClass: {
          popup: 'swal2-custom-width'
        },
        didOpen: () => {
          const popup = document.querySelector('.swal2-popup') as HTMLElement;
          if (popup) {
            popup.style.width = '80%';
            popup.style.maxWidth = 'none';
          }
        }
      });
    } else {
      const tarjetas = this.todasLasTarjetas.map((tarjeta, index) =>
        `<li>
      
        <strong>Tarjeta ${index + 1}:</strong>.  <strong>Producto:</strong> ${tarjeta.pedido}
        De:${tarjeta.tarjeta.de} - Mensaje:${tarjeta.tarjeta.mensaje} - Para:${tarjeta.tarjeta.para}
        <button class="btn btn-primary imprimir-tarjeta" data-index="${index}">Imprimir</button>
      </li>`).join('');

      Swal.fire({
        title: 'Tarjetas de Productos',
        html: `<ul>${tarjetas}</ul>`,
        customClass: {
          popup: 'swal2-custom-width'
        },
        didOpen: () => {
          const popup = document.querySelector('.swal2-popup') as HTMLElement;
          if (popup) {
            popup.style.width = '80%';
            popup.style.maxWidth = 'none';
          }

          const imprimirButtons = document.querySelectorAll('.imprimir-tarjeta');
          imprimirButtons.forEach(button => {
            button.addEventListener('click', (event) => {
              const index = (event.target as HTMLElement).getAttribute('data-index');
              if (index !== null) {
                const tarjeta = this.todasLasTarjetas[parseInt(index)];
                this.imprimirTarjeta(tarjeta.tarjeta);
              }
            });
          });
        }
      });
    }
  }

  imprimirTarjeta(tarjeta) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'cm',
      format: [10, 15]
    });

    doc.setFont("times", "italic"); // Cambiar la fuente a Times Italic
    doc.setFontSize(12); // Tamaño de la letra

    // Width of the document
    const pageWidth = doc.internal.pageSize.getWidth();

    // Starting y position
    let yPos = 2;

    // Add the "de" field
    if (tarjeta.para) {
      const paraLabelWidth = doc.getTextWidth("Para:");
      const deTextWidth = doc.getTextWidth(tarjeta.para);
      doc.text('Para:', (pageWidth - paraLabelWidth) / 2, yPos)
      yPos += 0.5;
      doc.text(`${tarjeta.para}`, (pageWidth - deTextWidth) / 2, yPos);
    }


    // Calculate the height of the "de" field text
    yPos += doc.getTextDimensions(tarjeta.de).h / 10 + 0.5; // 0.5 cm padding

    // Add the "mensaje" field
    const splitMensaje = doc.splitTextToSize(tarjeta.mensaje, 13); // Wrap text within 13 cm
    const mensajeTextHeight = doc.getTextDimensions(splitMensaje.join('\n')).h / 10;
    splitMensaje.forEach((line) => {
      const lineWidth = doc.getTextWidth(line);
      doc.text(line, (pageWidth - lineWidth) / 2, yPos);
      yPos += mensajeTextHeight / splitMensaje.length;
    });
    yPos += 0.5; // Add padding after mensaje

    // Add the "para" field
    if (tarjeta.de) {
      const paraLabelWidth = doc.getTextWidth("De:");
      const paraTextWidth = doc.getTextWidth(tarjeta.de);
      doc.text('De:', (pageWidth - paraLabelWidth) / 2, yPos)
      yPos += 0.5;
      doc.text(`${tarjeta.de}`, (pageWidth - paraTextWidth) / 2, yPos);
    }


    // Generar el blob y abrir en una nueva ventana
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }



  onMetodoEnvioChange(event) {
    this.metodoEnvio = event.target.value;
    if (this.metodoEnvio === 'mensajeroPropio') {
      // Lógica para cargar los pedidos disponibles
      this.refrescarDatos();
      this.pedidosSeleccionados = [];
      this.nuevaOrdenEnvio = null;
      this.nroShippingOrder = null;
      this.refrescarDatos();
    }
  }
  cargarOrders() {

  }
  // 
  agregarPedido() {
    Swal.fire({
      title: 'Seleccione los pedidos',
      input: 'select',
      inputOptions: this.orders.filter(o => o.transportador == undefined && o.transportador == null && o.formaEntrega == "Envío a Domicilio").reduce((acc, pedido) => {
        if (!this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
          acc[pedido.nroPedido] = `${pedido.nroPedido} - ${pedido.cliente.nombres_completos} - ${pedido.estadoPago}- ${pedido.estadoProceso}-${pedido.envio.ciudad}-${pedido.envio.zonaCobro}-${pedido.formaEntrega}-${pedido.envio.zonaCobro}-${pedido.horarioEntrega} `;
        }
        return acc;
      }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debes seleccionar un pedido';
        }
        if (this.pedidosSeleccionados.some(p => p.nroPedido === value)) {
          return 'El pedido ya ha sido agregado';
        }
        return null;
      },
      customClass: {
        popup: 'swal2-custom-width'
      },
      didOpen: () => {
        const popup = document.querySelector('.swal2-popup') as HTMLElement;
        if (popup) {
          popup.style.width = '80%';
          popup.style.maxWidth = 'none';
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const pedidoSeleccionado = this.orders.find(p => p.nroPedido === result.value);
        if (pedidoSeleccionado) {
          this.pedidosSeleccionados.push(pedidoSeleccionado);
        }

        if (this.nuevaOrdenEnvio) {
          this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
        }
      }
    });
  }
  shouldDisplayPedido(pedido: any): boolean {
    return (
      pedido.transportador === undefined &&
      pedido.transportador === null &&
      pedido.formaEntrega === 'Envío a Domicilio' &&
      !this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)
    );
  }
  agregarPedido1(pedido: any) {
    if (this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'El pedido ya ha sido agregado'
      });
      return;
    }

    this.pedidosSeleccionados.push(pedido);

    if (this.nuevaOrdenEnvio) {
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
    }
  }

  loadPedidosDisponibles() {
    var fechaEnvio = new Date(this.ordenEnvioForm.value.fechaEnvio);
    var fechaEnvioConvert = new Date(fechaEnvio.getFullYear(), fechaEnvio.getMonth(), fechaEnvio.getDate() + 1); // Mantener horas en 0

    return this.orders.filter(o => {
      // Establecer horas, minutos y segundos a 0 para la comparación
      const fechaEntregaNormalized = new Date(new Date(o.fechaEntrega).setHours(0, 0, 0, 0)); // Normaliza a 00:00:00
      const fechaEnvioNormalized = new Date(fechaEnvioConvert.setHours(0, 0, 0, 0)); // Asegurarse de que también esté en 00:00:00

      return fechaEntregaNormalized.getTime() === fechaEnvioNormalized.getTime() &&
        (o.estadoProceso !== EstadoProceso.Entregado && o.estadoProceso !== EstadoProceso.Despachado) &&
        o.formaEntrega.toLocaleUpperCase().includes('DOMICILIO');
    })
      .reduce((acc, pedido) => {
        if (!this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
          acc.push(pedido);
        }
        return acc;
      }, []);
  }


  validatePedido(pedido) {
    if (!pedido) {
      return 'Debes seleccionar un pedido';
    }
    if (this.pedidosSeleccionados.some(p => p.nroPedido === pedido.nroPedido)) {
      return 'El pedido ya ha sido agregado';
    }
    return null;
  }

  addPedidoToOrden(pedido) {
    if (pedido) {

      this.pedidosSeleccionados.push(pedido);

      if (this.nuevaOrdenEnvio) {
        this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
      }
    }
  }

  handleAgregarPedido(pedido: any) {
    const validationMessage = this.validatePedido(pedido);
    if (validationMessage) {
      alert(validationMessage);
      return;
    }
    this.addPedidoToOrden(pedido);
  }

  retirarPedido(pedido: Pedido) {
    const pedidocambiar = pedido
    this.cambiarEstado(pedidocambiar, 3)
    this.pedidosSeleccionados = this.pedidosSeleccionados.filter(p => p.nroPedido !== pedido.nroPedido);
    if (this.nuevaOrdenEnvio) {
      this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;
    }

  }

  verPedidosAgregados() {
    this.openModal(this.pantallaOrdenEnvioModal);
  }

  getEstadoProceso(order: any): string {
    return order.pedidos[0] && order.pedidos[0].estadoProceso === 'Despachado' ? order.pedidos[0].estadoProceso : 'Por despachar';
  }

  despacharOrden() {
    Swal.fire({
      title: 'Asignar Transportador',
      input: 'select',
      inputOptions: this.vendors.reduce((acc, vendor) => {
        acc[`${vendor.nombres} ${vendor.apellidos}-${vendor.telefono}`] = `${vendor.nombres} ${vendor.apellidos}`;
        return acc;
      }, {}),
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar el nombre del transportador';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.transportadorSeleccionado = result.value;
        const userLite: UserLite = JSON.parse(localStorage.getItem('user')) as UserLite;

        this.pedidosSeleccionados.forEach(pedido => {
          pedido.transportador = this.transportadorSeleccionado;
          pedido.despachador = userLite; // Puedes asignar un despachador específico aquí
          pedido.fechaYHorarioDespachado = new Date().toISOString();
          pedido.estadoProceso = EstadoProceso.Despachado;
          pedido.nroShippingOrder = this.nroShippingOrder;
          pedido.shippingOrder = this.nroShippingOrder;
        });

        this.nuevaOrdenEnvio.pedidos = this.pedidosSeleccionados;

        this.logisticaService.dispatchShippingOrder(this.nuevaOrdenEnvio).subscribe(
          response => {
            Swal.fire('Éxito', 'Orden despachada exitosamente', 'success');
            this.imprimirOrden();
            this.modalService.dismissAll();
            this.pedidosSeleccionados = [];
            this.transportadorSeleccionado = null;
            this.nroShippingOrder = null;
          },
          error => {
            Swal.fire('Error', 'Hubo un problema al despachar la orden', 'error');
          }
        );
      }
    });
  }



  onSubmitTransportador() {
    if (this.editTransporter) {
      if (this.transportadorForm.invalid) {
        Swal.fire('Error', 'Verifica los datos ingresados', 'error');
        return;
      }
      const nuevoTransportador = this.transportadorForm.value;
      nuevoTransportador.id = this.dataEditTransporter.id
      nuevoTransportador.date_edit = this.dataEditTransporter.date_edit
      this.logisticaService.createTrasportadora(nuevoTransportador).subscribe(
        response => {
          Swal.fire('Éxito', 'Transportador creado exitosamente', 'success');
          this.refrescarDatos()
          this.modalRef.dismiss();
        },
        error => {
          Swal.fire('Error', 'Hubo un problema al crear el transportador', 'error');
        }
      );
    } else {
      if (this.transportadorForm.invalid) {
        Swal.fire('Error', 'Verifica los datos ingresados', 'error');
        return;
      }
      const nuevoTransportador = this.transportadorForm.value;
      this.logisticaService.createTrasportadora(nuevoTransportador).subscribe(
        response => {
          Swal.fire('Éxito', 'Transportador creado exitosamente', 'success');
          this.refrescarDatos()
          this.modalRef.dismiss();
        },
        error => {
          Swal.fire('Error', 'Hubo un problema al crear el transportador', 'error');
        }
      );
    }
  }
  onEditTransportador() {
    if (this.transportadorForm.invalid) {
      Swal.fire('Error', 'Verifica los datos ingresados', 'error');
      return;
    }
    const nuevoTransportador = this.transportadorForm.value;
    this.logisticaService.createTrasportadora(nuevoTransportador).subscribe(
      response => {
        Swal.fire('Éxito', 'Transportador creado exitosamente', 'success');
        this.refrescarDatos()
        this.modalRef.dismiss();
      },
      error => {
        Swal.fire('Error', 'Hubo un problema al crear el transportador', 'error');
      }
    );
  }

  openPantallaOrdenEnvioModal() {
    this.modalService.open(this.pantallaOrdenEnvioModal, { size: 'lg' });
  }

  onSubmitOrdenEnvio() {
    if (this.ordenEnvioForm.invalid || this.pedidosSeleccionados.length === 0) {
      Swal.fire('Error', 'Debes completar el formulario y seleccionar al menos un pedido', 'error');
      return;
    }

    this.nuevaOrdenEnvio = {
      ...this.ordenEnvioForm.value,
      id: '',
      nroShippingOrder: 0,
      pedidos: this.pedidosSeleccionados
    };

    // hacer un progreso con swal 
    Swal.fire({
      title: 'Cargando...',
      html: 'Por favor espera',
      timer: 1000, // Duración de la barra de progreso en milisegundos
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading()
      },
    }).then((result) => {
      /* Si el temporizador llega a cero */
      // if (result.dismiss === Swal.DismissReason.timer) {

      this.logisticaService.createShippingOrder(this.nuevaOrdenEnvio).subscribe({
        next: response => {
          this.nuevaOrdenEnvio.nroShippingOrder = response.nroShippingOrder
          Swal.close();
          this.nroShippingOrder = response.nroShippingOrder;
          this.nuevaOrdenEnvio.id = response.id;
          this.nuevaOrdenEnvio.nroShippingOrder = response.nroShippingOrder;
          Swal.fire('Éxito', 'Orden de envío ' + response.nroShippingOrder.toString().padStart('0', 4) + ' generada exitosamente', 'success');
          console.log(this.nuevaOrdenEnvio)
          this.nuevaOrdenEnvio.pedidos.map(pedidoEnOrden => {
            this.orders.map(ordenListada => {
              if (pedidoEnOrden.nroPedido == ordenListada.nroPedido) {
                (ordenListada as any).nroShippingOrder = this.nuevaOrdenEnvio.nroShippingOrder
              }
            })
          })
          this.modalService.dismissAll();
          // this.openModal(this.pantallaOrdenEnvioModal);
        },
        error: error => {
          Swal.fire('Error', 'Hubo un problema al crear la orden de envío', 'error');
        }
      });
      // }
    })
  }
  async openOrderInputModal() {
    const { value: orderId } = await Swal.fire({
      title: 'Consultar Orden de Envío',
      input: 'text',
      inputPlaceholder: 'Ingrese el número de orden',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar el número de orden';
        }
        return null;
      }
    });

    if (orderId) {
      // Lógica para manejar la consulta de la orden ingresada
      this.consultarOrden(orderId);
    }
  }
  consultarOrden(orderId: any) {
    this.logisticaService.getShippingOrder(orderId).subscribe({
      next: response => {
        console.log(response);
        this.nuevaOrdenEnvio = response;
        this.pedidosSeleccionados = response.pedidos;
        this.transportadorSeleccionado = response.pedidos[0]?.transportador;
        this.nroShippingOrder = response.nroShippingOrder;
        this.openModal(this.pantallaOrdenEnvioModal, true);
      },
      error: error => {
        Swal.fire('Error', 'Hubo un problema al consultar la orden de envío', 'error');
      }
    });

  }

  imprimirOrderToAction(orderId: any) {
    this.logisticaService.getShippingOrder(orderId).subscribe({
      next: response => {
        console.log(response);
        this.nuevaOrdenEnvio = response;
        this.pedidosSeleccionados = response.pedidos;
        this.transportadorSeleccionado = response.pedidos[0]?.transportador;
        this.nroShippingOrder = response.nroShippingOrder;
        // this.openModal(this.pantallaOrdenEnvioModal, true);
        this.imprimirOrden()
      },
      error: error => {
        Swal.fire('Error', 'Hubo un problema al consultar la orden de envío', 'error');
      }
    });
  }

  actualizarOrdenEnvio() {
    this.logisticaService.createShippingOrder(this.nuevaOrdenEnvio).subscribe({
      next: response => {
        console.log(response);
        Swal.fire('Éxito', 'Orden de envío ' + this.nuevaOrdenEnvio.nroShippingOrder.toString().padStart('0', 4) + ' actualizada exitosamente', 'success');
        this.modalService.dismissAll();
        // this.openModal(this.pantallaOrdenEnvioModal);
      },
      error: error => {
        Swal.fire('Error', 'Hubo un problema al actualizar la orden de envío', 'error');
      }
    });
  }
  viewAllDispatchOrders() {
    // Aquí se añade la lógica para la consulta masiva de órdenes de despacho
    this.logisticaService.getShippingOrders().subscribe((data: Pedido[]) => {
      console.log(data)
      this.dispatchOrders = data.filter(x => {
        return x.company == JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial
      }
      ).sort((a, b) => parseInt(b.nroShippingOrder) - parseInt(a.nroShippingOrder));
      this.modalService.open(this.dispatchOrdersModal, { size: 'xl', fullscreen: true });
    }, (error) => {
      console.error('Error al consultar las órdenes de despacho:', error);
      this.dispatchOrders = [];
      this.modalService.open(this.dispatchOrdersModal, { size: 'xl' });
    });

  }
  isArray(value: any): boolean {
    return Array.isArray(value);
  }
  getFaltaPorPagarSum(order: any): number {
    return order.pedidos.reduce((sum: number, pedido: any) => {
      // Verifica si faltaPorPagar es un número negativo y, si es así, lo reemplaza por 0
      const faltaPorPagar = pedido.faltaPorPagar < 0 ? 0 : pedido.faltaPorPagar || 0;
      return sum + faltaPorPagar;
    }, 0);
  }
  descargarRotulo(pedido: any): void {
    this.pdfSize = '5x5'
    const size = this.pdfSize.split('x').map(Number);
    const width = size[0];
    const height = size[1];

    const rotuloContent = `
    <div style="font-family: Arial, sans-serif; padding: 3px; border: 2px solid #ddd;">
      <div >
          <div style="margin-bottom: 2px;">
            <p style="font-size: 100px; line-height:1.2;"><strong>Número de Pedido:</strong> ${pedido.nroPedido}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Fecha Entrega:</strong> ${pedido.fechaEntrega.split('T')[0]}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Horario de Entrega:</strong> ${pedido.horarioEntrega}</p>
            <p style="font-size: 100px; line-height:1.2;"><strong>Recibe:</strong> ${pedido.envio?.nombres} ${pedido.envio?.apellidos}</p>
            <p style="font-size: 100px; line-height:1.2;">${pedido.envio?.direccionEntrega}, ${pedido.envio?.nombreUnidad}, ${pedido.envio?.especificacionesInternas}, ${pedido.envio?.observaciones}, ${pedido.envio?.zonaCobro}</p>
          </div>
        </div>
    </div>
  `;

    const element = document.createElement('div');
    element.innerHTML = rotuloContent;
    document.body.appendChild(element);

    html2canvas(element).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'cm',
        format: [width, height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 5, 4);
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);

      window.open(url);

      document.body.removeChild(element);
    });
  }


  openSwal(pedido: any): void {
    this.pdfSize = '5x5'; // Establece el tamaño por defecto
    Swal.fire({
      title: 'Descargar Rótulo',
      text: 'El tamaño del rótulo es 5px x 5px',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Descargar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.descargarRotulo(pedido);
      }
    });
  }


  closeDialog(): void {
    this.isDialogOpen = false;
  }

  pdfOrder(content, order: Pedido) {
    this.pedidoSeleccionado = order;
    this.htmlModal = this.paymentService.getHtmlContent(order);
    // this.renderer.setProperty(this.htmlPdf.nativeElement, 'innerHTML', this.htmlModal);
    this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      console.log(result);
      this.htmlModal = null;
    }
      , (reason) => {
        console.log(reason);
      });
  }
}


