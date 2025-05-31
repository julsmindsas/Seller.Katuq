import { Component, OnInit, OnDestroy } from '@angular/core';
import { PosCheckoutService } from '../../../../../shared/services/ventas/pos-checkout.service';
import { CartService } from '../../../../../shared/services/cart.service';
import { Subscription } from 'rxjs';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import { EstadoPago, EstadoProceso } from '../../../modelo/pedido';
import Swal from 'sweetalert2';
import { PaymentService } from '../../../../../shared/services/ventas/payment.service';
import { FacturacionIntegracionService } from '../../../../../shared/services/integraciones/facturas/facturacion.service';

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})
export class PosCheckoutComponent implements OnInit, OnDestroy {
  // Banderas de control
  showPedidoConfirm: boolean = false;
  showSteper: boolean = true;
  processingPayment: boolean = false;
  
  // Datos del checkout
  warehouse: any = null;
  
  // Suscripciones
  private subscriptions: Subscription[] = [];

  constructor(
    public cartService: CartService,
    public checkoutService: PosCheckoutService,
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private facturacionElectronicaService: FacturacionIntegracionService
  ) { }

  ngOnInit(): void {
    // Verificar si hay bodega en localStorage al iniciar
    this.checkWarehouseFromStorage();
    
    // Suscribirse a cambios en la bodega
    this.subscriptions.push(
      this.checkoutService.warehouse$.subscribe(warehouse => {
        this.warehouse = warehouse;
        console.log('PosCheckoutComponent - Bodega actualizada:', warehouse);
      })
    );

    // Suscribirse a eventos de procesamiento de pagos con Wompi
    this.subscriptions.push(
      this.checkoutService.wompiPaymentRequested$.subscribe(paymentData => {
        if (paymentData && paymentData.pedido) {
          this.procesarPagoWompi(paymentData.pedido);
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    // Desuscribirse al destruir el componente
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  /**
   * Verifica si hay una bodega en localStorage y la carga
   */
  private checkWarehouseFromStorage(): void {
    try {
      const warehouseStr = localStorage.getItem('warehousePOS');
      if (warehouseStr) {
        const warehouse = JSON.parse(warehouseStr);
        if (warehouse && warehouse.idBodega) {
          console.log('PosCheckoutComponent - Bodega encontrada en localStorage:', warehouse);
          this.checkoutService.warehouse$.next(warehouse);
        }
      }
    } catch (error) {
      console.error('Error al verificar bodega en localStorage:', error);
    }
  }

  /**
   * Procesa el pago con Wompi para el POS
   * @param pedido El pedido a procesar con Wompi
   */
  procesarPagoWompi(pedido: any): void {
    if (this.processingPayment) {
      return; // Evitar procesamientos múltiples
    }

    this.processingPayment = true;

    // Asegurar que el pedido tenga estado pendiente inicialmente
    pedido.estadoPago = EstadoPago.Pendiente;
    
    // Guardar el pedido antes de iniciar el pago
    this.guardarPedidoParaWompi(pedido).then(pedidoGuardado => {
      if (pedidoGuardado) {
        // Iniciar el widget de Wompi
        this.checkoutService.iniciarPagoConWompi(pedido).then(pagoExitoso => {
          if (pagoExitoso) {
            // Actualizar el estado del pedido a Aprobado
            this.actualizarEstadoPedido(pedido.nroPedido, EstadoPago.Aprobado);
            Swal.fire({
              title: "¡Pago aprobado!",
              text: "El pago ha sido procesado exitosamente.",
              icon: "success",
              confirmButtonText: "Ok",
            });
          } else {
            // Actualizar el estado del pedido a Rechazado
            this.actualizarEstadoPedido(pedido.nroPedido, EstadoPago.Rechazado);
            Swal.fire({
              title: "Pago no completado",
              text: "No se pudo completar el pago. El pedido ha sido guardado con estado pendiente.",
              icon: "warning",
              confirmButtonText: "Ok",
            });
          }
          this.processingPayment = false;
        }).catch(error => {
          console.error("Error en el proceso de pago:", error);
          Swal.fire({
            title: "Error en el pago",
            text: "Ocurrió un error durante el proceso de pago.",
            icon: "error",
            confirmButtonText: "Ok",
          });
          this.processingPayment = false;
        });
      } else {
        Swal.fire({
          title: "Error",
          text: "No se pudo guardar el pedido para procesar el pago.",
          icon: "error",
          confirmButtonText: "Ok",
        });
        this.processingPayment = false;
      }
    });
  }

  /**
   * Guarda el pedido antes de iniciar el pago con Wompi
   */
  private guardarPedidoParaWompi(pedido: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Verificar el número de pedido
      this.ventasService.validateNroPedido(pedido.nroPedido).subscribe({
        next: (res: any) => {
          const htmlSanizado = this.paymentService.getHtmlContent(pedido);

          // Guardar pedido con estado de pago pendiente
          this.ventasService.createOrder({ order: pedido, emailHtml: htmlSanizado }).subscribe({
            next: (res: any) => {
              // Transformar el pedido para facturación electrónica si es necesario
              const orderSiigo = this.facturacionElectronicaService.transformarPedidoLite(pedido);
              
              // Actualizar la información de pago del pedido si está disponible
              if (res.order && res.order.pagoInformation) {
                pedido.pagoInformation = res.order.pagoInformation;
                pedido = res.order;
                // Propagar los cambios al servicio de checkout
                this.checkoutService.pedido$.next(res.order);
              }
              
              resolve(true); // Pedido guardado exitosamente
            },
            error: (err: any) => {
              console.error("Error al crear el pedido:", err);
              resolve(false); // Error al guardar el pedido
            }
          });
        },
        error: (err) => {
          console.error("Error al validar número de pedido:", err);
          resolve(false); // Error al validar el número de pedido
        }
      });
    });
  }

  /**
   * Actualiza el estado del pedido después del pago
   */
  private actualizarEstadoPedido(numeroPedido: string, estadoPago: EstadoPago): void {
    // Obtener el pedido actual
    const pedido = this.checkoutService.pedido$.getValue();
    if (!pedido) {
      console.error("No hay un pedido actual para actualizar");
      return;
    }

    // Actualizar el estado de pago
    pedido.estadoPago = estadoPago;

    // Editar el pedido en el servidor
    this.ventasService.editOrder(pedido).subscribe({
      next: (res: any) => {
        console.log("Pedido actualizado con nuevo estado:", estadoPago);
        
        // Actualizar el pedido en el servicio de checkout
        this.checkoutService.pedido$.next(pedido);

        // Enviar correo de confirmación si el pago fue aprobado
        if (estadoPago === EstadoPago.Aprobado) {
          const htmlSanizado = this.paymentService.getHtmlContent(pedido);
          this.ventasService.enviarCorreoConfirmacionPedido({
            order: pedido,
            emailHtml: htmlSanizado
          }).subscribe({
            next: () => console.log("Correo de confirmación enviado"),
            error: (err) => console.error("Error al enviar correo:", err)
          });

          // Manejar pedido exitoso (incluye mostrar factura y limpiar datos)
          this.checkoutService.orderCreatorService.handleSuccessfulOrder(pedido);
          
          // Limpiar datos adicionales del checkout
          this.limpiarDatosDespuesDeVenta();
        }
      },
      error: (err: any) => {
        console.error("Error al actualizar el pedido:", err);
      }
    });
  }
  
  /**
   * Limpia datos específicos del checkout después de una venta exitosa
   */
  private limpiarDatosDespuesDeVenta(): void {
    // Resetear las banderas de control
    this.showPedidoConfirm = false;
    this.showSteper = true;
    this.processingPayment = false;
    
    // Limpiar el pedido actual
    this.checkoutService.pedido$.next(null);
    
    // Resetear método de pago
    this.checkoutService.setPaymentMethod('');
  }
}
