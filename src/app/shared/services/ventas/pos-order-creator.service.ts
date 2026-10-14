import { Injectable, Inject, forwardRef } from '@angular/core';
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
import { EstadoPago, EstadoProceso, Pedido } from '../../../components/ventas/modelo/pedido';
import { CartService } from '../cart.service';
import { VentasService } from './ventas.service';
import { PaymentService } from './payment.service';
import { UserLite } from '../../models/User/UserLite';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { FacturacionAutomaticaService } from '../facturacion/facturacion-automatica.service';
import { camposPedido, FacturacionPos } from '../../utils/facturacion-pos';
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
    private facturacionAutomatica: FacturacionAutomaticaService,
    private toastr: ToastrService,
    private modal: NgbModal
  ) { }

  /**
   * Crea un objeto pedido a partir de los datos básicos
   */
  createPedidoObject(customer: any, paymentMethod: string, warehouse: any, facturacion?: FacturacionPos): Pedido {
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
        estadoProcesoProducto: EstadoProceso.SinProducir,
        // Configuración por defecto para POS: entrega en tienda el mismo día
        configuracion: {
          producto: item,
          datosEntrega: {
            tipoEntrega: 'SOLO RECOGE',
            formaEntrega: 'Recoge en tienda',
            fechaEntrega: this.formatDateStruct(new Date()),
            horarioEntrega: 'ENTRE LAS 8:00 Y 17:00',
            genero: [],
            ocasion: '',
            colores: [],
            observaciones: ''
          },
          preferencias: [],
          adiciones: [],
          tarjetas: []
        }
      })),
      formaDePago: paymentMethod,
      estadoProceso: EstadoProceso.SinProducir,
      estadoPago: EstadoPago.PreAprobado,
      fechaCreacion: new Date().toISOString(),
      formaEntrega: 'Recoge en tienda',
      fechaEntrega: new Date().toISOString(),
      horarioEntrega: 'ENTRE LAS 8:00 Y 17:00',
      subtotal: parseFloat(this.cartService.getPOSSubTotal()?.replace('$', '') || '0'),
      totalPedidoSinDescuento: parseFloat(this.cartService.getPOSSubTotal()?.replace('$', '') || '0'),
      totalPedididoConDescuento: parseFloat(this.cartService.getPOSSubTotal()?.replace('$', '') || '0'),
      totalEnvio: 0,
      totalImpuesto: 0,
      totalDescuento: 0,
      anticipo: 0,
      faltaPorPagar: 0,
      typeOrder: 'POS',
      // D-419 (ticket 1171): a quién se factura y si se factura.
      ...camposPedido(facturacion),
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
   // this.ventasService.validateNroPedido(pedido.nroPedido!).subscribe({
     // next: (res: any) => {
        // Actualizar número de pedido si es necesario
    //    if (res.nextConsecutive !== -1) {
          const texto = pedido.company?.toString() || '';
          const ultimasLetras = texto.substring(texto.length - 3);
          pedido.nroPedido = ultimasLetras + '-' + '1'.toString().padStart(6, '0');
      //  }

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

        // Cambiar estado de productos que no se producen
        this.updateProductStates(pedido);

        // Asegurar fechaEntrega para filtro en lista de pedidos
        if (!pedido.fechaEntrega) {
          pedido.fechaEntrega = new Date().toISOString();
        }

        // Crear el pedido SIN el emailHtml (se enviará después con el número correcto)
        this.ventasService.createOrder({ order: pedido }).subscribe({
          next: (res: any) => {
            // Usar la referencia que viene en res.order.referencia
            const orderFromResponse = res.order;
            if (orderFromResponse && orderFromResponse.referencia) {
              // D-419: el número de factura solo lo escribe el sistema contable al
              // emitirla; antes se copiaba el del pedido y la venta quedaba como
              // "ya facturada" sin factura.
              orderFromResponse.nroPedido = orderFromResponse.referencia;
            }

            // AHORA generar y enviar el email con el número de pedido CORRECTO
            this.sendConfirmationEmail(orderFromResponse);

            this.handleSuccessfulOrder(orderFromResponse);

            // D-419 (ticket 1171): factura electrónica en segundo plano con el
            // proveedor contable de la empresa; el cobro no la espera.
            if (pedido.generarFacturaElectronica) {
              this.encolarFactura(orderFromResponse);
            }
          },
          error: (err: any) => {
            this.showErrorAlert('Error al crear el pedido: ' + (err.error?.msg || ''));
          }
        });
      //},
      //error: () => {
      //  this.showErrorAlert('Error al validar el número de pedido');
      //} 
    //});
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
   * Envía el email de confirmación con el número de pedido correcto
   */
  private async sendConfirmationEmail(order: any): Promise<void> {
    try {
      // Generar HTML con el número de pedido CORRECTO que viene del backend.
      // Ticket 1053: espera los maestros y nunca manda el aviso de "Cargando…".
      const htmlWithCorrectNumber = await this.paymentService.getHtmlContentAsync(order);
      if (!htmlWithCorrectNumber) return;

      // Enviar email de confirmación
      this.ventasService.enviarCorreoConfirmacionPedido({
        order: order,
        emailHtml: htmlWithCorrectNumber
      }).subscribe({
        next: () => {
          console.log('✅ Email de confirmación enviado con número de pedido:', order.nroPedido);
        },
        error: (err) => {
          console.error('❌ Error enviando email de confirmación:', err);
          // No mostramos alerta al usuario porque el pedido ya fue creado exitosamente
          // Solo registramos el error en consola para debugging
        }
      });
    } catch (error) {
      console.error('❌ Error generando HTML para email:', error);
    }
  }

  /**
   * Actualiza los estados de los productos según si requieren producción o no
   */
  private updateProductStates(pedido: Pedido): void {
    pedido.carrito?.forEach((x: any) => {
      if (!x.producto?.crearProducto?.paraProduccion) {
        // En POS todos los ítems se entregan en el momento, quedan Entregado
        x.estadoProcesoProducto = EstadoProceso.Entregado;
      }
    });
  }

  /**
   * D-419 (ticket 1171): encola la factura electrónica de la venta POS con el
   * proveedor contable configurado (ruta asíncrona con candado contra doble
   * factura). Si no se puede, la venta queda para facturar desde Pedidos.
   */
  private encolarFactura(order: any): void {
    const orderId = order?._id || order?.id || order?.cd;
    const nro = order?.nroPedido || order?.referencia || '';
    const avisarPendiente = (detalle: string) =>
      this.toastr.warning(
        `${detalle} Puedes facturar la venta ${nro} desde Pedidos.`,
        'Factura no generada',
        { timeOut: 10000 },
      );
    if (!orderId) {
      avisarPendiente('No se recibió el id del pedido.');
      return;
    }
    this.facturacionAutomatica.resolverProveedor().subscribe({
      next: (proveedor) => {
        if (!proveedor) {
          avisarPendiente('La empresa no tiene un sistema de facturación configurado.');
          return;
        }
        this.facturacionAutomatica.encolar(proveedor, orderId).subscribe({
          next: () => this.toastr.info(
            `La factura de ${nro} se está generando en ${proveedor.nombre}. Te avisaremos cuando esté lista.`,
            'Factura en proceso',
            { timeOut: 6000 },
          ),
          error: (err) => avisarPendiente(err?.error?.message || 'No se pudo enviar a facturar.'),
        });
      },
      error: () => avisarPendiente('No se pudo consultar el sistema de facturación.'),
    });
  }

  /**
   * Maneja un pedido creado exitosamente (sin factura electrónica)
   */
  public handleSuccessfulOrder(order: any): void {
    // Limpiar el carrito después de una venta exitosa
    this.cartService.clearCart();
    
    // Limpiar datos del cliente (usando localStorage ya que no hay servicio de checkout inyectado)
    this.clearCustomerData();
    
    // Mostrar la factura/tirilla
    this.modal.open(FacturaTirillaComponent, { size: 'xl', fullscreen: true }).componentInstance.pedido = order;
    
    // Mostrar mensaje de éxito
    this.showSuccessAlert('Pedido creado con éxito');
  }
  
  /**
   * Limpia los datos del cliente almacenados
   */
  private clearCustomerData(): void {
    // Limpiar datos del cliente que puedan estar en localStorage
    localStorage.removeItem('selectedCustomerPOS');
    
    // También limpiar cualquier otro dato temporal del POS si existe
    // localStorage.removeItem('tempOrderData');
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

  /**
   * Convierte una fecha JS a estructura {day, month, year} similar al DateStruct usado en configuraciones.
   */
  private formatDateStruct(date: Date): { day: number; month: number; year: number } {
    return {
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear()
    };
  }
} 