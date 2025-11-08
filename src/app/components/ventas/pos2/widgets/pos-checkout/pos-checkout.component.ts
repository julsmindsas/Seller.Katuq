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
            // ✅ INFORMATIVO: El widget se completó, pero el webhook actualizará el estado
            console.log("✅ [Wompi Widget] Pago iniciado exitosamente. El webhook actualizará el estado.");
            Swal.fire({
              title: "Procesando pago",
              text: "El pago está siendo procesado. Recibirás confirmación en unos momentos.",
              icon: "info",
              confirmButtonText: "Ok",
            });

            // Limpiar el estado de procesamiento
            this.limpiarDatosDespuesDeVenta();
          } else {
            // El usuario canceló o cerró el widget
            console.log("ℹ️ [Wompi Widget] Pago no completado por el usuario.");
            Swal.fire({
              title: "Pago cancelado",
              text: "El proceso de pago fue cancelado. El pedido se guardó con estado pendiente.",
              icon: "warning",
              confirmButtonText: "Ok",
            });
          }
          this.processingPayment = false;
        }).catch(error => {
          console.error("❌ [Wompi Widget] Error en el proceso de pago:", error);
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

  // ✅ ELIMINADO: actualizarEstadoPedido - El webhook es el único responsable de actualizar estados


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
