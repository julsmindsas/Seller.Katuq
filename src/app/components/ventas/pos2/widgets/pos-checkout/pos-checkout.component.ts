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
   * ✅ FIX: No envía email aquí - se enviará después de confirmar pago
   */
  private guardarPedidoParaWompi(pedido: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('💳 [Wompi] Creando orden pendiente sin enviar email...');

      // Verificar el número de pedido
      this.ventasService.validateNroPedido(pedido.nroPedido).subscribe({
        next: (res: any) => {
          // ✅ NO generar email HTML aquí - se generará después de aprobar pago

          pedido.formaEntrega = 'Recoge en tienda';
          pedido.fechaEntrega = new Date();
          pedido.horarioEntrega = 'ENTRE LAS 8:00 Y 17:00';
          pedido.carrito.forEach((item: any) => {
            if (!item?.configuracion?.datosEntrega) return;

            // datosEntrega puede ser objeto o arreglo; normalizar
            const entregas = Array.isArray(item.configuracion.datosEntrega)
              ? item.configuracion.datosEntrega
              : [item.configuracion.datosEntrega];

            entregas.forEach((entrega: any) => {
              if (!entrega) return;
              entrega.formaEntrega = 'Recoge en tienda';
              entrega.fechaEntrega = new Date();
              entrega.horarioEntrega = 'ENTRE LAS 8:00 Y 17:00';
            });
          });

          // ✅ Guardar pedido SIN enviar email (email se enviará después de aprobar pago)
          this.ventasService.createOrder({ order: pedido }).subscribe({
            next: (res: any) => {
              // Transformar el pedido para facturación electrónica si es necesario
              const orderSiigo = this.facturacionElectronicaService.transformarPedidoLite(pedido);

              // Actualizar la información de pago del pedido si está disponible
              if (res.order) {
                // Asegurar que tenemos el número de pedido correcto del backend
                if (res.order.referencia) {
                  res.order.nroFactura = res.order.referencia;
                  res.order.nroPedido = res.order.referencia;
                }

                if (res.order.pagoInformation) {
                  pedido.pagoInformation = res.order.pagoInformation;
                }

                // Actualizar con la información completa del backend
                pedido = res.order;

                // Propagar los cambios al servicio de checkout
                this.checkoutService.pedido$.next(res.order);

                console.log(`✅ [Wompi] Orden creada exitosamente: ${res.order.nroPedido || res.order.referencia}`);
                console.log('📧 [Wompi] Email NO enviado - se enviará al confirmar pago');
              }

              resolve(true); // Pedido guardado exitosamente
            },
            error: (err: any) => {
              console.error("❌ [Wompi] Error al crear el pedido:", err);
              resolve(false); // Error al guardar el pedido
            }
          });
        },
        error: (err) => {
          console.error("❌ [Wompi] Error al validar número de pedido:", err);
          resolve(false); // Error al validar el número de pedido
        }
      });
    });
  }

  /**
   * Actualiza el estado del pedido después del pago
   * ✅ FIX: Envía email SOLO cuando pago es aprobado, con número correcto del backend
   */
  private actualizarEstadoPedido(numeroPedido: string, estadoPago: EstadoPago): void {
    console.log(`🔄 [Wompi] Actualizando estado de pago: ${estadoPago}`);

    // Obtener el pedido actual
    const pedido = this.checkoutService.pedido$.getValue();
    if (!pedido) {
      console.error("❌ [Wompi] No hay un pedido actual para actualizar");
      return;
    }

    // Actualizar el estado de pago
    pedido.estadoPago = estadoPago;

    // Editar el pedido en el servidor
    this.ventasService.editOrder(pedido).subscribe({
      next: (res: any) => {
        console.log(`✅ [Wompi] Estado actualizado exitosamente a: ${estadoPago}`);

        // Obtener el pedido actualizado de la respuesta del backend
        // Esto asegura que tenemos el número de pedido correcto asignado por el servidor
        const updatedOrder = res.order || pedido;

        // Asegurar que tenemos el número de pedido correcto
        if (updatedOrder.referencia && !updatedOrder.nroPedido) {
          updatedOrder.nroPedido = updatedOrder.referencia;
        }

        // Actualizar el pedido en el servicio de checkout con los datos frescos del backend
        this.checkoutService.pedido$.next(updatedOrder);

        // ✅ SOLO enviar email cuando el pago es APROBADO
        if (estadoPago === EstadoPago.Aprobado) {
          console.log(`📧 [Wompi] Enviando email de confirmación con número: ${updatedOrder.nroPedido || updatedOrder.referencia}`);

          // Generar email HTML con el pedido actualizado que contiene el número correcto del backend
          const htmlConNumeroCorrect = this.paymentService.getHtmlContent(updatedOrder);

          // Enviar correo de confirmación
          this.ventasService.enviarCorreoConfirmacionPedido({
            order: updatedOrder,
            emailHtml: htmlConNumeroCorrect
          }).subscribe({
            next: () => {
              console.log("✅ [Wompi] Email de confirmación enviado exitosamente");
            },
            error: (emailError) => {
              console.error("⚠️ [Wompi] Error al enviar email (no crítico):", emailError);
            }
          });

          // Manejar pedido exitoso (incluye mostrar factura y limpiar datos)
          this.checkoutService.orderCreatorService.handleSuccessfulOrder(updatedOrder);

          // Limpiar datos adicionales del checkout
          this.limpiarDatosDespuesDeVenta();
        } else {
          console.log(`ℹ️ [Wompi] Estado ${estadoPago} - No se envía email al cliente`);
        }
      },
      error: (err: any) => {
        console.error("❌ [Wompi] Error al actualizar el pedido:", err);
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
