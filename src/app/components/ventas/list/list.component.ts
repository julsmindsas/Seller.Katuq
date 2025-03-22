import { Component, ElementRef, EventEmitter, Input, OnInit, Output, Renderer2, ViewChild } from '@angular/core';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import { Carrito, Cliente, EstadoPago, EstadoProceso, EstadoProcesoFiltros, Pedido } from '../modelo/pedido';
import { Table } from 'primeng/table';
import { PaymentService } from '../../../shared/services/ventas/payment.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { jsPDF } from 'jspdf';
import { ActivatedRoute } from "@angular/router";
// import * as jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ClientesComponent } from '../clientes/clientes.component';
import Swal from 'sweetalert2';
import { FormBuilder, Validators } from '@angular/forms';
import { PedidoEntregaComponent } from '../entrega/pedido-entrega.component';
import { PedidosUtilService } from '../service/pedidos.util.service';
import { UserLogged } from '../../../shared/models/User/UserLogged';
import { UserLite } from '../../../shared/models/User/UserLite';
import { FilterService } from 'primeng/api';
import { ServiciosService } from '../../../shared/services/servicios.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-list-orders',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListOrdersComponent implements OnInit {

  @ViewChild('clientes', { static: false }) clientes: ClientesComponent;
  @ViewChild('entrega', { static: false }) entrega: PedidoEntregaComponent;
  @ViewChild('htmlPdf', { static: true }) htmlPdf: ElementRef;

  @Output() producirPedido = new EventEmitter<Pedido>();
  @ViewChild('dt1') table: Table;
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
  ciudadSeleccionada: string;
  ESTADOPAGO: any[]

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
  estadosProcesos: EstadoProcesoFiltros[];
  validaciones: { value: boolean; nombre: string; }[];
  numberProduct: string;
  filteredOrderNumbers: any;
  ordenes: any;
  ordersByName: any;
  UserLogged: UserLogged;
  allBillingZone: any;



  constructor(
    private renderer: Renderer2,
    private service: ServiciosService, private route: ActivatedRoute, private filterService: FilterService, private ventasService: VentasService, private paymentService: PaymentService, private modalService: NgbModal, private formBuilder: FormBuilder,
    private pedidoUtilService: PedidosUtilService,
    private maestroService: MaestroService) {
    this.registerCustomFilters();
    const unaSemana = 7 * 24 * 60 * 60 * 1000;
    this.fechaInicial = new Date();
    this.fechaFinal = new Date(this.fechaInicial.getTime() + unaSemana);
    this.fechaFinal.setHours(23, 59, 59, 999);
    this.numberProduct = this.route.snapshot.queryParamMap.get('nroPedido');
    if (this.numberProduct) {
      this.ventasService.getOrdersByNroPedido(this.numberProduct).subscribe((x: any) => {
        this.orders = x
        console.log(this.orders);
      })
    }

    this.UserLogged = JSON.parse(localStorage.getItem('user')) as UserLogged;
  }


  ngOnInit(): void {
    this.estadosPago = Object.values(EstadoPago);
    // this.estadosProcesos = Object.values(EstadoProceso)
    this.estadosProcesos = Object.values(EstadoProcesoFiltros)
    this.validaciones = [
      { value: false, nombre: "No" },
      { value: true, nombre: "Si" }
    ];
    if (!this.numberProduct) {
      this.refrescarDatos();
    }
    const context = this;
    this.maestroService.getBillingZone().subscribe({
      next(value: any) {
        context.allBillingZone = value;
        sessionStorage.setItem('allBillingZone', JSON.stringify(context.allBillingZone))

      },
      error(err) {
        console.log(err);
      },
    })

  }
  filtroGlobal(event: any) {
    const query = event.query;
    this.service.getOrderByName(query).then(res => {

      this.filteredOrderNumbers = res;
      this.ordersByName = res;


    })
  }
  onOrderSelect(event) {
    console.log(event);
    this.orders = [event];
    // this.orders= this.ordersByName.filter(P=>)
  }
  checkPriceScale(pedido) {
    let totalPrecioSinIVA = 0;
    let totalPrecioSinIVADef = 0;
    pedido.carrito.map(itemCarrito => {
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.map(x => {
          if (itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite) {
            totalPrecioSinIVA = x.valorUnitarioPorVolumenSinIVA * itemCarrito.cantidad;
          } else {
            totalPrecioSinIVA = (itemCarrito.producto?.precio?.precioUnitarioSinIva) * itemCarrito.cantidad;
          }

        });
      } else {
        totalPrecioSinIVA = (itemCarrito.producto?.precio?.precioUnitarioSinIva) * itemCarrito.cantidad;
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach(adicion => {
          totalPrecioSinIVA += (adicion['cantidad'] * adicion['referencia']['precioUnitario']) * itemCarrito.cantidad;
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach(preferencia => {
          totalPrecioSinIVA += (preferencia['valorUnitarioSinIva']) * itemCarrito.cantidad;
        });
      }
      totalPrecioSinIVADef += totalPrecioSinIVA
    });

    return totalPrecioSinIVADef;
  }
  checkIVAPrice(pedido) {
    let totalPrecioIVA = 0;
    let totalPrecioIVADef = 0;
    pedido.carrito.forEach(itemCarrito => {
      if (itemCarrito.producto.precio.preciosVolumen.length > 0) {
        itemCarrito.producto.precio.preciosVolumen.forEach(x => {
          if (itemCarrito.cantidad >= x.numeroUnidadesInicial && itemCarrito.cantidad <= x.numeroUnidadesLimite) {
            totalPrecioIVA = x.valorUnitarioPorVolumenIva * itemCarrito.cantidad;
          } else {
            totalPrecioIVA = (itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad;
          }
        });
      } else {
        totalPrecioIVA = (itemCarrito.producto?.precio?.valorIva) * itemCarrito.cantidad;
      }
      // Sumar precios de adiciones
      if (itemCarrito.configuracion && itemCarrito.configuracion.adiciones) {
        itemCarrito.configuracion.adiciones.forEach(adicion => {
          totalPrecioIVA += (adicion['cantidad'] * adicion['referencia']['precioIva']) * itemCarrito.cantidad;
        });
      }

      // Sumar precios de preferencias
      if (itemCarrito.configuracion && itemCarrito.configuracion.preferencias) {
        itemCarrito.configuracion.preferencias.forEach(preferencia => {
          totalPrecioIVA += preferencia['valorIva'] * itemCarrito.cantidad;;
        });
      }
      totalPrecioIVADef += totalPrecioIVA
    });

    return totalPrecioIVADef;
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

    this.fechaInicial.setHours(0, 0, 0, 0);
    this.fechaFinal.setHours(23, 59, 59, 999);

    const filter = {
      fechaInicial: this.fechaInicial,
      fechaFinal: this.fechaFinal,
      company: JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial,
      tipoFecha: 'fechaEntrega',
      estadoProceso: this.isFromProduction ? [EstadoProceso.SinProducir] : ['Todos']
    }

    // if (this.isFromProduction) {
    //   filter['estadosPago'] = ['Prependiente', 'PreAprobado', 'Aprobado']
    // }

    this.ventasService.getOrdersByFilter(filter).subscribe((data: Pedido[]) => {
      console.log(data);
      this.orders = data;

      this.orders.forEach(order => {
        order.totalPedidoSinDescuento = this.checkPriceScale(order)
        order.totalImpuesto = this.checkIVAPrice(order)
        order.subtotal = order.totalPedidoSinDescuento + order.totalEnvio - order.totalDescuento
        order.totalPedididoConDescuento = order.subtotal + order.totalImpuesto
        if (order.anticipo == null || order.anticipo == undefined) {
          order.anticipo = 0
        }
        order.faltaPorPagar = order.totalPedididoConDescuento - order.anticipo
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

        if (!order.validacion || order.validacion == null || order.validacion == undefined) {
          order.validacion = false
        }



      })
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
    this.fechaInicial = new Date();
    this.fechaFinal = new Date(this.fechaInicial.getTime() + unaSemana);
    this.fechaFinal.setHours(23, 59, 59, 999);
    this.refrescar(table);


  }

  refrescar(table: Table) {
    this.refrescarDatos();
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



  calculateValorBruto() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalPedidoSinDescuento, 0);
  }

  calculateDescuento() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalDescuento, 0);
  }

  calculateEnvio() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalEnvio, 0);
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
    return this.orders.reduce((acc, pedido) => acc + pedido.subtotal, 0);
  }

  calculateTotalImpuestos() {
    return this.orders.reduce((acc, pedido) => acc + pedido.totalImpuesto, 0);
  }

  pdfOrder(content, order: Pedido) {
    this.pedidoSeleccionado = order;
    this.htmlModal = this.paymentService.getHtmlContent(order, this.isFromProduction);
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

  produceOrder(order: Pedido) {
    this.producirPedido.emit(order);
  }

  async convertirImagenesAbase64YGenerarPDF(DATA: HTMLElement) {
    const imagenes = DATA.querySelectorAll('img');
    const promesasDeConversion = Array.from(imagenes).map(async (img) => {
      const url = img.src;
      const base64 = await this.obtenerBase64DeImagen(url);
      img.src = base64;
    });

    await Promise.all(promesasDeConversion);

    // Ahora que todas las imágenes están convertidas y reemplazadas en DATA,
    // puedes proceder con html2canvas y jsPDF como antes.
    html2canvas(DATA, { useCORS: true, allowTaint: false, logging: true }).then(canvas => {
      // El resto del código para generar el PDF sigue igual...
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 210; // Ancho de un A4 en mm
      const pageHeight = 295;  // Altura de un A4 en mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(this.pedidoSeleccionado.nroPedido + '.pdf');
    }).catch(error => {
      console.error('Error al generar PDF', error);
    });
  }

  async obtenerBase64DeImagen(url: string): Promise<string> {
    return fetch(url)
      .then(response => response.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }



  imprimirToPdf() {
    let printContents = document.getElementById('htmlPdf').innerHTML;
    // Suponiendo que printContents es tu string HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = printContents;


    // Continuación después de eliminar los elementos no deseados

    // Selecciona todos los elementos h2 dentro de tempDiv
    const h2Elements = tempDiv.querySelectorAll('h2');

    h2Elements.forEach(h2 => {
      const h3 = document.createElement('h3');

      // Copia el contenido de h2 a h3
      h3.innerHTML = h2.innerHTML;

      // Opcional: Copia los atributos de h2 a h3
      Array.from(h2.attributes).forEach(attr => {
        h3.setAttribute(attr.name, attr.value);
      });

      // Reemplaza h2 por h3 en el DOM
      h2.parentNode.replaceChild(h3, h2);
    });

    // Continúa con el resto del código...

    // IDs de los elementos a eliminar
    const idsToRemove = ['Encabezado', 'piepagina', 'publicidad'];

    idsToRemove.forEach(id => {
      const element = tempDiv.querySelector(`#${id}`);
      if (element) {
        element.parentNode.removeChild(element);
      }
    });

    // Añade una clase para hacer el texto más pequeño
    tempDiv.classList.add('texto-pequeno');
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
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: false,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      console.log(result);

    }
      , (reason) => {
        if (reason == 'Cross click') {
          return;
        }
        this.clienteSeleccionado = null;
        order.cliente = reason;

        this.editOrder(order);

      });

  }

  private editOrder(order: Pedido) {
    if (order.carrito.length > 0) {
      let fechaEntrega = order.carrito[0].configuracion?.datosEntrega?.fechaEntrega;
      let horarioEntrega = order.carrito[0].configuracion?.datosEntrega?.horarioEntrega;
      order.fechaEntrega = new Date(fechaEntrega.year, fechaEntrega.month - 1, fechaEntrega.day).toISOString();
      order.horarioEntrega = horarioEntrega;
    }

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

  editDatosEntrega(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order;

    //inicializr formulario con los datos del cliente tiene las mismas propiedades
    this.initForms(this.clienteSeleccionado);
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: false,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      console.log(result);

    }
      , (reason) => {
        if (reason == 'Cross click') {
          return;
        }
        this.pedidoUtilService.pedido = order;
        order.totalEnvio = Number(this.pedidoUtilService.getShippingCost(this.allBillingZone));
        this.editOrder(order);

      });

  }

  editDatosFacturacion(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order;

    //inicializr formulario con los datos del cliente tiene las mismas propiedades
    this.initForms(this.clienteSeleccionado);
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: false,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      console.log(result);

    }
      , (reason) => {
        if (reason == 'Cross click') {
          return;
        }
        this.editOrder(order);

      });

  }

  // edutar Notas
  editNotas(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order;
    //inicializr formulario con los datos del cliente tiene las mismas propiedades
    this.initForms(this.clienteSeleccionado);
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: false,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      console.log(result);

    }
      , (reason) => {
        if (reason == 'Cross click') {
          return;
        }
        this.editOrder(order);

      });

  }

  convertFechaEntregaString(fechaEntrega: { day: number, month: number, year: number }) {
    if (!fechaEntrega) {
      return '';
    }
    return `${fechaEntrega.day}/${fechaEntrega.month}/${fechaEntrega.year}`;
  }

  // edutar Notas
  editarEstadoPago(content, order: Pedido) {
    this.clienteSeleccionado = order.cliente;
    this.pedidoSeleccionado = order;
    //inicializr formulario con los datos del cliente tiene las mismas propiedades
    this.initForms(this.clienteSeleccionado);
    this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      centered: true,
      fullscreen: false,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      console.log(result);

    }
      , (reason) => {
        if (reason == 'Cross click') {
          return;
        }
        this.editOrder(order);

      });

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

    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    ).result.then((result) => {
      console.log(result);

    }, (configuracionResult) => {
      if (configuracionResult == 'Cross click') {
        return;
      }
      this.configuracionCarritoSeleccionado = configuracionResult;
      const index = order.carrito.findIndex((carrito) => carrito.producto.identificacion.referencia === configuracionResult?.producto.identificacion.referencia);
      if (index !== -1) {
        order.carrito[index] = configuracionResult;
      }
      this.editOrder(order);

    });
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
      console.log(result);

    }, (configuracionResult) => {
      if (configuracionResult == 'Cross click') {
        return;
      }
      order.carrito.push(configuracionResult);
      // actualizar valores del pedido
      order = this.actualizarValoresPedido(order);


      this.editOrder(order);

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
      confirmButtonText: 'Si, eliminarlo'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ventasService.deleteOrder(order).subscribe((data) => {
          console.log(data);
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
      company: JSON.parse(sessionStorage.getItem("currentCompany")).nomComercial,
      estadoProceso: this.isFromProduction ? [EstadoProceso.SinProducir] : ['Todos']
    }
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
    this.fechaInicial = new Date(fechaActual.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaActual.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }
  filter(event) {
    console.log(event)
  }

  filtrarParaManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para mañana
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    this.fechaInicial = new Date(fechaManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaManana.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }

  filtrarParaPasadoManana(): void {
    // Similar a filtrarParaHoy pero ajustando las fechas para pasado mañana
    const fechaPasadoManana = new Date();
    fechaPasadoManana.setDate(fechaPasadoManana.getDate() + 2);
    this.fechaInicial = new Date(fechaPasadoManana.setHours(0, 0, 0, 0));
    this.fechaFinal = new Date(fechaPasadoManana.setHours(23, 59, 59, 999));
    this.refrescarDatos();
  }


  AsentarPago(content, order: Pedido) {

    //validar sino hace falta por pagar 


    this.pedidoSeleccionado = order;
    this.modalService.open(content, {
      size: 'xl',
      scrollable: true,
      centered: true,
      fullscreen: true,
      ariaLabelledBy: 'modal-basic-title'
    }
    )

      .result.then((result) => {
        console.log(result);

      }
        , (reason) => {
          if (reason == 'Cross click') {
            return;
          }

          this.editOrder(reason);

        });
  }

  overridePedidoByEntrega(event: Pedido) {
    this.pedidoSeleccionado = event;
  }

  exportarExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.orders);
    const workbook: XLSX.WorkBook = { Sheets: { 'Pedidos': worksheet }, SheetNames: ['Pedidos'] };
    XLSX.writeFile(workbook, 'Pedidos.xlsx');
  }
}
