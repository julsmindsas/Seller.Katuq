// import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
// import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

import { CreateCustomerModalComponent } from '../create-customer-modal/create-customer-modal.component';
import { checkoutMethod } from '../../../../../../assets/data/pos';
import { CartService } from '../../../../../shared/services/cart.service';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { PaymentModalComponent } from '../payment-modal.ts/payment-modal';
import { CrearClienteModalComponent } from '../../../clientes/crear-cliente-modal/crear-cliente-modal.component';
import { CashPaymentComponent } from '../cash-payment/cash-payment';
import { CardPaymentComponent } from '../card-payment/card-payment';
import { EWalletPaymentComponent } from '../ewallet-payment/ewallet-payment';
import { POSPedido } from '../../../../pos/pos-modelo/pedido';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import { PaymentService } from '../../../../../shared/services/ventas/payment.service';
import { FacturaTirillaComponent } from '../../../../pos/factura-tirilla/factura-tirilla.component';
import { FacturacionIntegracionService } from '../../../../../shared/services/integraciones/facturas/facturacion.service';
import { Pedido, EstadoProceso, EstadoPago } from '../../../modelo/pedido';
import { UserLite } from '../../../../../shared/models/User/UserLite';
// import { DataStoreService } from '../../../../../shared/services/dataStoreService'

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})

export class PosCheckoutComponent {
  @ViewChild('clienteBuscar') clienteBuscar: ElementRef;

  public checkoutMethod1 = checkoutMethod;
  datosCliente: any = '';
  isModalOpen = false;
  selectedPaymentType = '';
  method = '';
  pedido: POSPedido;
  showPedidoConfirm: boolean = false;
  showSteper: boolean = true;
  warehouse: any;

  constructor(
    public cartService: CartService,
    private modal: NgbModal,
    private service: MaestroService,
    public ventasService: VentasService,
    public paymentService: PaymentService,
    public facturacionElectronicaService: FacturacionIntegracionService
  ) {
    const nombre: string = this.checkoutMethod1[0].title;
    this.pedido = this.getPedido();
  }

  // Helper para mostrar alertas
  private showAlert(title: string, text: string, icon: any = 'warning') {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'Ok'
    });
  }

  // Validación centralizada
  private validateCheckout(requireWarehouse: boolean = false): boolean {
    if (!this.datosCliente) {
      this.showAlert('Cliente!', 'Debes buscar o crear un cliente');
      return false;
    }
    const total = this.cartService.getPOSSubTotal();
    const valor = parseFloat(total?.replace('$', '') || '0');
    if (valor === 0) {
      this.showAlert('Productos!', 'Debes adicionar productos para la venta');
      return false;
    }
    if (requireWarehouse) {
      this.warehouse = JSON.parse(localStorage.getItem('warehousePOS') || '{}');
      if (!this.warehouse) {
        this.showAlert('Bodega!', 'Debes seleccionar una bodega');
        return false;
      }
    }
    return true;
  }

  private limpiarCarroYCliente() {
    try {
      this.cartService.clearCart();
    } catch { }
    try {
      this.limpiar();
    } catch { }
  }

  openModalPayment(): void {
    if (!this.validateCheckout(false)) return;
    if (!this.method) {
      this.showAlert('Método de pago!', 'Debes seleccionar un método de pago');
      return;
    }
    this.selectedPaymentType = this.method;
    const modalRef = this.modal.open(PaymentModalComponent, {
      centered: true,
      size: 'xl'
    });
    modalRef.componentInstance.paymentType = this.selectedPaymentType;
    modalRef.componentInstance.title = 'Método de Pago: ' + this.selectedPaymentType;
    modalRef.result.then(
      (result: any) => {
        if (result !== 'Pagado') return;
        console.log('Pagado con éxito:', result);
        // Tareas: guardar pedido, descontar inventario, limpiar carro y cliente
        this.pedido.pagoRecibido = result.amountReceived;
        this.pedido.cambioEntregado = result.change;
        this.pedido.estadoPago = EstadoPago.Aprobado;
        this.pedido.estadoProceso = EstadoProceso.Entregado;
        this.pedido.formaEntrega = this.selectedPaymentType;
        this.pedido.formaDePago = this.selectedPaymentType;
        this.pedido.nroFactura = this.pedido.nroPedido;
        this.pedido.pdfUrlInvoice = '';


        this.comprarYPagar();
        this.limpiarCarroYCliente();
      },
      (reason: any) => {
        console.log('Modal cerrado por:', reason);
      }
    );
  }

  validaciones() {
    // Obsoleto: usar validateCheckout(true)
    return this.validateCheckout(true);
  }

  selectMethod(method: string) {
    this.method = method;
  }

  closeModalPayment(): void {
    // this.isModalOpen = false;
  }

  openModal() {
    this.modal.open(CrearClienteModalComponent, { centered: true, size: 'xl', modalDialogClass: 'create-customers custom-input' });
  }

  limpiar() {
    this.datosCliente = '';
    if (this.clienteBuscar) {
      this.clienteBuscar.nativeElement.value = '';
    }
  }

  buscar() {
    if (!this.clienteBuscar?.nativeElement.value) return;
    const data = { documento: this.clienteBuscar.nativeElement.value };
    this.service.getClientByDocument(data).subscribe((res: any) => {
      if (!res.company) {
        this.showAlert('No encontrado!', 'No se encuentra el documento. Si desea crearlo llene los datos a continuacion');
      } else {
        try {
          this.datosCliente = res;
        } catch (error) {
          console.log(error);
        }
      }
    });
  }

  openCashModal() {
    this.method = 'Efectivo';
    if (!this.validateCheckout(true)) return;
    let res = this.modal.open(CashPaymentComponent, { size: 'md' });
    const total = this.cartService.getPOSSubTotal();
    const valor = parseFloat(total?.replace('$', '') || '0');
    res.componentInstance.totalAmount = valor;
    res.result.then(
      (result: any) => {
        // if (result !== 'Pagado') return;
        console.log('Pagado con éxito:', result);
        this.pedido.pagoRecibido = result.amountReceived;
        this.pedido.cambioEntregado = result.change;
        this.comprarYPagar();
        this.limpiarCarroYCliente();
      },
      (reason: any) => {
        console.log('Modal cerrado por:', reason);
      }
    );
  }

  openCardModal() {
    this.method = 'Tarjeta';
    if (!this.validateCheckout(true)) return;
    this.modal.open(CardPaymentComponent, { size: 'md' });
  }

  openEWalletModal() {
    this.method = 'E-Wallet';
    if (!this.validateCheckout(true)) return;
    this.modal.open(EWalletPaymentComponent, { size: 'md' });
  }

  getPedido(): POSPedido {
    const company = JSON.parse(localStorage.getItem('company') || '{}').nomComercial || '';
    const texto = company.toString() || '';
    const ultimasLetras = texto.substring(texto.length - 3);
    const pedido: POSPedido = {
      referencia: `POS-${new Date().getTime()}`,
      nroPedido: ultimasLetras + '-' + new Date().getTime().toString().padStart(6, '0'),
      bodegaId: this.warehouse?.idBodega || '',
      company: this.datosCliente?.company || '',
      cliente: {
        estado: this.datosCliente?.estado || '',
        tipo_documento_comprador: this.datosCliente?.tipo_documento_comprador || '',
        correo_electronico_comprador: this.datosCliente?.correo_electronico_comprador || '',
        documento: this.datosCliente?.documento || '',
        indicativo_celular_comprador: this.datosCliente?.indicativo_celular_comprador || '',
        numero_celular_comprador: this.datosCliente?.numero_celular_comprador || '',
        nombres_completos: this.datosCliente?.nombres_completos || '',
        numero_celular_whatsapp: this.datosCliente?.numero_celular_whatsapp || '',
        apellidos_completos: this.datosCliente?.apellidos_completos || '',
        indicativo_celular_whatsapp: this.datosCliente?.indicativo_celular_whatsapp || '',
        datosFacturacionElectronica: this.datosCliente?.datosFacturacionElectronica,
        datosEntrega: this.datosCliente?.datosEntrega,
        notas: this.datosCliente?.notas
      },
      carrito: this.cartService.posCartItems.map(item => ({
        producto: item,
        cantidad: item.cantidad,
        estadoProcesoProducto: EstadoProceso.SinProducir
      })),
      formaDePago: this.method,
      estadoProceso: EstadoProceso.SinProducir,
      estadoPago: EstadoPago.Aprobado,
      fechaCreacion: new Date().toISOString(),
      formaEntrega: "RECOGE",
      fechaEntrega: new Date().toISOString(),
      horarioEntrega: "08:00 - 18:00",
      subtotal: parseFloat(this.cartService.getPOSSubTotal()?.replace('$', '') || '0'),
      totalPedidoSinDescuento: parseFloat(this.cartService.getPOSSubTotal()?.replace('$', '') || '0'),
      totalPedididoConDescuento: parseFloat(this.cartService.getPOSSubTotal()?.replace('$', '') || '0'),
      totalEnvio: 0,
      totalImpuesto: 0,
      totalDescuento: 0,
      anticipo: 0,
      faltaPorPagar: 0,

    };

    return pedido;
  }

  // Adaptación de comprarYPagar desde pos-crear-ventas.component.ts
  comprarYPagar() {
    const pedido = this.getPedido();
    this.pedido.estadoPago = EstadoPago.Aprobado;
    this.pedido.estadoProceso = EstadoProceso.Entregado;
    this.pedido.formaEntrega = this.selectedPaymentType;
    this.pedido.formaDePago = this.selectedPaymentType;
    this.pedido.nroFactura = this.pedido.nroPedido;
    this.pedido.pdfUrlInvoice = '';

    this.pedido = pedido as unknown as POSPedido;
    this.pedido.typeOrder = 'POS';
    const context = this;
    context.ventasService.validateNroPedido(context.pedido.nroPedido).subscribe({
      next: (res: any) => {
        if (res.nextConsecutive !== -1) {
          const texto = context.pedido.company?.toString() || '';
          const ultimasLetras = texto.substring(texto.length - 3);
          context.pedido.nroPedido = ultimasLetras + '-' + res.nextConsecutive.toString().padStart(6, '0');
        }
        context.pedido.asesorAsignado = (localStorage.getItem('user') ?? '') as unknown as UserLite;
        const htmlSanizado = context.paymentService.getHtmlPOSContent(context.pedido);
        // Cambiar estado de productos que no se producen
        context.pedido.carrito?.forEach((x: any) => {
          if (!x.producto?.crearProducto?.paraProduccion) {
            x.estadoProcesoProducto = 'ParaDespachar';
          }
        });
        context.ventasService.createOrder({ order: context.pedido, emailHtml: htmlSanizado }).subscribe({
          next: (res: any) => {
            context.cartService.clearCart();
            if (context.pedido.generarFacturaElectronica) {
              const orderSiigo = context.facturacionElectronicaService.transformarPedidoCompletoParaCrearUsuarioDesdeLaVenta(context.pedido);
              context.pedido = res.order;
              context.facturacionElectronicaService.createFacturaSiigo(orderSiigo).subscribe({
                next: (value: any) => {
                  if (value.isSuccess) {
                    context.showPedidoConfirm = true;
                    context.showSteper = false;
                    Swal.fire({
                      title: 'Pedido creado!',
                      text: `Pedido creado con exito y factura ${value.result.name} creada`,
                      icon: 'success',
                      confirmButtonText: 'Ok',
                    });
                    context.pedido.nroFactura = value.result.name;
                    context.pedido.pdfUrlInvoice = value.result.public_url;
                    context.ventasService.editOrder(context.pedido).subscribe();
                    context.modal.open(FacturaTirillaComponent, { size: 'xl', fullscreen: true }).componentInstance.pedido = context.pedido;
                  } else {
                    Swal.fire({
                      title: 'Error al crear el pedido y generar el pedido',
                      text: value.result.error[0].message,
                      icon: 'error',
                      confirmButtonText: 'Ok',
                    });
                  }
                },
                error: (err: any) => {
                  Swal.fire({
                    title: 'Error!',
                    text: 'Error al crear el pedido y generar el pedido',
                    icon: 'error',
                    confirmButtonText: 'Ok',
                  });
                }
              });
            } else {
              context.showPedidoConfirm = true;
              context.showSteper = false;
              context.modal.open(FacturaTirillaComponent, { size: 'xl', fullscreen: true }).componentInstance.pedido = context.pedido;
              Swal.fire({
                title: 'Pedido creado!',
                text: 'Pedido creado con exito',
                icon: 'success',
                confirmButtonText: 'Ok',
              });
            }
          },
          error: (err: any) => {
            Swal.fire({
              title: 'Error!',
              text: 'Error al crear el pedido: ' + (err.error?.msg || ''),
              icon: 'error',
              confirmButtonText: 'Ok',
            });
          }
        });
      },
      error: (err) => {
        Swal.fire({
          title: 'Error!',
          text: 'Error al validar el número de pedido',
          icon: 'error',
          confirmButtonText: 'Ok',
        });
      },
    });
  }
  // getPedido(): Pedido {

  //   const pedido: Pedido = {
  //   }
  //   return pedido;  
  // }

}
