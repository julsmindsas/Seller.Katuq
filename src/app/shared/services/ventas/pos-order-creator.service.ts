import { Injectable } from '@angular/core';
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
import { EstadoPago, EstadoProceso, Pedido } from '../../../components/ventas/modelo/pedido';
import { CartService } from '../cart.service';
import { VentasService } from './ventas.service';
import { PaymentService } from './payment.service';
import { UserLite } from '../../models/User/UserLite';
import { FacturacionIntegracionService } from '../integraciones/facturas/facturacion.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaTirillaComponent } from '../../../components/pos/factura-tirilla/factura-tirilla.component';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class PosOrderCreatorService {

  constructor(
    private cartService: CartService,
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private facturacionElectronicaService: FacturacionIntegracionService,
    private modal: NgbModal
  ) { }

  /**
   * Crea un objeto pedido a partir de los datos básicos
   */
  createPedidoObject(customer: any, paymentMethod: string, warehouse: any): Pedido {
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}').nomComercial || '';
    const texto = company.toString() || '';
    const ultimasLetras = texto.substring(texto.length - 3);
    
    // Crear el pedido básico
    const pedido: Pedido = {
      referencia: ultimasLetras + '-' + new Date().getTime().toString().padStart(6, '0'),
      nroPedido: ultimasLetras + '-' + new Date().getTime().toString().padStart(6, '0'),
      bodegaId: warehouse?.idBodega || '',
      company: customer?.company || '',
      cliente: this.formatCustomerData(customer),
      carrito: this.cartService.posCartItems.map(item => ({
        producto: item,
        cantidad: item.cantidad,
        estadoProcesoProducto: EstadoProceso.SinProducir
      })),
      formaDePago: paymentMethod,
      estadoProceso: EstadoProceso.SinProducir,
      estadoPago: EstadoPago.PreAprobado,
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
      typeOrder: 'POS'
    };

    return pedido;
  }

  /**
   * Formatea los datos del cliente para el pedido
   */
  private formatCustomerData(customer: any): any {
    if (!customer) return {};
    
    return {
      estado: customer?.estado || '',
      tipo_documento_comprador: customer?.tipo_documento_comprador || '',
      correo_electronico_comprador: customer?.correo_electronico_comprador || '',
      documento: customer?.documento || '',
      indicativo_celular_comprador: customer?.indicativo_celular_comprador || '',
      numero_celular_comprador: customer?.numero_celular_comprador || '',
      nombres_completos: customer?.nombres_completos || '',
      numero_celular_whatsapp: customer?.numero_celular_whatsapp || '',
      apellidos_completos: customer?.apellidos_completos || '',
      indicativo_celular_whatsapp: customer?.indicativo_celular_whatsapp || '',
      datosFacturacionElectronica: customer?.datosFacturacionElectronica,
      datosEntrega: customer?.datosEntrega,
      notas: customer?.notas
    };
  }

  /**
   * Guarda el pedido en el sistema y procesa la facturación si es necesario
   */
  savePedido(pedido: Pedido): void {
    // Validar número de pedido
    this.ventasService.validateNroPedido(pedido.nroPedido!).subscribe({
      next: (res: any) => {
        // Actualizar número de pedido si es necesario
        if (res.nextConsecutive !== -1) {
          const texto = pedido.company?.toString() || '';
          const ultimasLetras = texto.substring(texto.length - 3);
          pedido.nroPedido = ultimasLetras + '-' + res.nextConsecutive.toString().padStart(6, '0');
        }

        //asentar el pago
        pedido.PagosAsentados = [{
          fechaHoraAprobacionRechazo: new Date().toISOString(),
          numeroPedido: pedido.nroPedido,
          estadoVerificacion: pedido.estadoPago,
          formaPago:  pedido.formaDePago,
          valorRegistrado: pedido.totalPedididoConDescuento || 0
        }];

        pedido.fechaEntrega = new Date().toISOString();
        
        // Asignar asesor
        this.assignUserToOrder(pedido);
        
        // Preparar contenido HTML para email
        const htmlSanizado = this.paymentService.getHtmlContent(pedido);
        
        // Cambiar estado de productos que no se producen
        this.updateProductStates(pedido);
        
        // Crear el pedido
        this.ventasService.createOrder({ order: pedido, emailHtml: htmlSanizado }).subscribe({
          next: (res: any) => {
            // Limpiar carrito (esto ahora se maneja desde el servicio de checkout)
            
            // Procesar factura electrónica si es necesario
            if (pedido.generarFacturaElectronica) {
              this.processElectronicInvoice(pedido, res.order);
            } else {
              this.handleSuccessfulOrder(res.order);
            }
          },
          error: (err: any) => {
            this.showErrorAlert('Error al crear el pedido: ' + (err.error?.msg || ''));
          }
        });
      },
      error: () => {
        this.showErrorAlert('Error al validar el número de pedido');
      }
    });
  }

  /**
   * Asigna el usuario actual como asesor del pedido
   */
  public assignUserToOrder(pedido: Pedido): void {
    const user = (JSON.parse(localStorage.getItem('user') ?? '{}')) as unknown as UserLite;
    const userLite: UserLite = {
      name: user.name,
      email: user.email,
      nit: user.nit
    };
    pedido.asesorAsignado = userLite;
  }

  /**
   * Actualiza los estados de los productos según si requieren producción o no
   */
  private updateProductStates(pedido: Pedido): void {
    pedido.carrito?.forEach((x: any) => {
      if (!x.producto?.crearProducto?.paraProduccion) {
        x.estadoProcesoProducto = 'ParaDespachar';
      }
    });
  }

  /**
   * Procesa la factura electrónica
   */
  private processElectronicInvoice(originalPedido: Pedido, savedPedido: any): void {
    const orderSiigo = this.facturacionElectronicaService.transformarPedidoCompletoParaCrearUsuarioDesdeLaVenta(originalPedido);
    
    this.facturacionElectronicaService.createFacturaSiigo(orderSiigo).subscribe({
      next: (value: any) => {
        if (value.isSuccess) {
          savedPedido.nroFactura = value.result.name;
          savedPedido.pdfUrlInvoice = value.result.public_url;
          
          // Actualizar el pedido con la información de la factura
          this.ventasService.editOrder(savedPedido).subscribe();
          
          // Mostrar la factura
          this.modal.open(FacturaTirillaComponent, { size: 'xl', fullscreen: true }).componentInstance.pedido = savedPedido;
          
          // Mostrar mensaje de éxito
          this.showSuccessAlert('Pedido creado con éxito y factura ' + value.result.name + ' creada');
        } else {
          this.showErrorAlert('Error al crear el pedido y generar la factura: ' + value.result.error[0].message);
        }
      },
      error: () => {
        this.showErrorAlert('Error al crear el pedido y generar la factura');
      }
    });
  }

  /**
   * Maneja un pedido creado exitosamente (sin factura electrónica)
   */
  public handleSuccessfulOrder(order: any): void {
    // Mostrar la factura/tirilla
    this.modal.open(FacturaTirillaComponent, { size: 'xl', fullscreen: true }).componentInstance.pedido = order;
    
    // Mostrar mensaje de éxito
    this.showSuccessAlert('Pedido creado con éxito');
  }

  /**
   * Muestra una alerta de éxito
   */
  private showSuccessAlert(message: string): void {
    Swal.fire({
      title: 'Pedido creado!',
      text: message,
      icon: 'success',
      confirmButtonText: 'Ok',
    });
  }

  /**
   * Muestra una alerta de error
   */
  private showErrorAlert(message: string): void {
    Swal.fire({
      title: 'Error!',
      text: message,
      icon: 'error',
      confirmButtonText: 'Ok',
    });
  }
} 