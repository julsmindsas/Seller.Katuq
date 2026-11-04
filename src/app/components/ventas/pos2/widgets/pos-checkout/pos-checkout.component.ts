import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { PosCheckoutService } from '../../../../../shared/services/ventas/pos-checkout.service';
import { CartService } from '../../../../../shared/services/cart.service';
import { Subscription } from 'rxjs';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import { EstadoPago, EstadoProceso } from '../../../modelo/pedido';
import Swal from 'sweetalert2';
import { PaymentService } from '../../../../../shared/services/ventas/payment.service';
import { FacturacionIntegracionService } from '../../../../../shared/services/integraciones/facturas/facturacion.service';
import { CustomerSectionComponent } from '../customer-section/customer-section.component';
import { PaymentSelectorComponent } from '../payment-selector/payment-selector.component';

/**
 * D-540 (ticket 1340): alto mínimo de la lista del ticket en escritorio.
 * Si no caben 2 líneas (52 px c/u), se desplaza el panel completo
 * («panel completo»); se sale con 128 px para que el modo no parpadee.
 */
const LISTA_MINIMA_ENTRA = 104;
const LISTA_MINIMA_SALE = 128;
const CLASE_PANEL_COMPLETO = 'ticket-apretado';

@Component({
  selector: 'app-pos-checkout',
  templateUrl: './pos-checkout.component.html',
  styleUrls: ['./pos-checkout.component.scss']
})
export class PosCheckoutComponent implements OnInit, AfterViewInit, OnDestroy {
  // Banderas de control
  showPedidoConfirm: boolean = false;
  showSteper: boolean = true;
  processingPayment: boolean = false;
  
  // Datos del checkout
  warehouse: any = null;
  
  // Suscripciones
  private subscriptions: Subscription[] = [];

  // D-540: piezas de alto fijo del ticket en escritorio (solo pantalla).
  @ViewChild(CustomerSectionComponent, { read: ElementRef }) private clienteHost?: ElementRef<HTMLElement>;
  @ViewChild(PaymentSelectorComponent, { read: ElementRef }) private pagosHost?: ElementRef<HTMLElement>;
  private observadorAlto?: ResizeObserver;
  private consultaEscritorio?: MediaQueryList;
  private panelTicket: HTMLElement | null = null;
  private piezasFijas: HTMLElement[] = [];
  private panelCompleto = false;
  private cuadroPendiente = 0;

  constructor(
    public cartService: CartService,
    public checkoutService: PosCheckoutService,
    private ventasService: VentasService,
    private paymentService: PaymentService,
    private facturacionElectronicaService: FacturacionIntegracionService,
    private host: ElementRef<HTMLElement>,
    private renderer: Renderer2,
    private zone: NgZone,
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
  
  /**
   * D-540: vigila el alto del panel y de las piezas fijas (cliente, título,
   * cupón, TOTAL y pagos). La lista y el host del carrito, que sí cambian al
   * cambiar de modo, no se vigilan, así que no hay bucle.
   */
  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined' || typeof window.matchMedia !== 'function') return;
    const host = this.host.nativeElement;
    this.panelTicket = host.parentElement; // <aside class="pos-ticket">
    if (!this.panelTicket) return;

    const carrito = host.querySelector('app-cart-summary');
    this.piezasFijas = [
      this.clienteHost?.nativeElement,
      this.pagosHost?.nativeElement,
      carrito?.querySelector('.tarjeta-cabeza'),
      carrito?.querySelector('.coupon-code'),
      carrito?.querySelector('.total-item'),
    ].filter((el): el is HTMLElement => el instanceof HTMLElement);

    this.consultaEscritorio = window.matchMedia('(min-width: 1001px)');
    this.zone.runOutsideAngular(() => {
      const observador = new ResizeObserver(() => this.programarModoPanel());
      observador.observe(this.panelTicket as HTMLElement);
      this.piezasFijas.forEach(el => observador.observe(el));
      this.observadorAlto = observador;
    });
  }

  ngOnDestroy(): void {
    // Desuscribirse al destruir el componente
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.observadorAlto?.disconnect();
    if (this.cuadroPendiente) cancelAnimationFrame(this.cuadroPendiente);
  }

  /**
   * El cambio de clase se aplica en el cuadro siguiente: al entrar al modo
   * aparece la barra del panel y cambia el ancho de las piezas vigiladas; si
   * se aplicara dentro del callback, el navegador avisaría de un bucle de
   * ResizeObserver.
   */
  private programarModoPanel(): void {
    if (this.cuadroPendiente) return;
    this.cuadroPendiente = requestAnimationFrame(() => {
      this.cuadroPendiente = 0;
      this.actualizarModoPanel();
    });
  }

  private actualizarModoPanel(): void {
    if (!this.panelTicket) return;
    let completo = false;
    if (this.consultaEscritorio?.matches) {
      const fijo = this.piezasFijas.reduce((suma, el) => suma + el.offsetHeight, 0);
      const disponible = this.panelTicket.clientHeight - fijo;
      completo = this.panelCompleto ? disponible < LISTA_MINIMA_SALE : disponible < LISTA_MINIMA_ENTRA;
    }
    if (completo === this.panelCompleto) return;
    this.panelCompleto = completo;
    if (completo) {
      this.renderer.addClass(this.host.nativeElement, CLASE_PANEL_COMPLETO);
    } else {
      this.renderer.removeClass(this.host.nativeElement, CLASE_PANEL_COMPLETO);
    }
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
        // ✅ FIX: Usar el pedido actualizado del backend (con nroPedido e integridad correctos)
        const pedidoActualizado = this.checkoutService.pedido$.getValue();
        if (pedidoActualizado) {
          console.log('🔑 [Wompi] Usando pedido del backend:', pedidoActualizado?.nroPedido);
          console.log('🔐 [Wompi] Integridad:', pedidoActualizado?.pagoInformation?.integridad?.substring(0, 20) + '...');
        }

        // Usar el pedido actualizado que tiene tanto nroPedido como integridad correctos
        const pedidoParaWompi = pedidoActualizado || pedido;

        // Iniciar el widget de Wompi con el pedido actualizado
        this.checkoutService.iniciarPagoConWompi(pedidoParaWompi).then(pagoExitoso => {
          const pedidoActual = this.checkoutService.pedido$.getValue();
          if (pagoExitoso) {
            // Pago aprobado: actualizar estados en BD
            if (pedidoActual) {
              pedidoActual.estadoPago = EstadoPago.Aprobado;
              pedidoActual.estadoProceso = EstadoProceso.Entregado;
              pedidoActual.carrito?.forEach((item: any) => {
                item.estadoProcesoProducto = EstadoProceso.Entregado;
              });
              pedidoActual.anticipo = pedidoActual.totalPedididoConDescuento || 0;
              pedidoActual.faltaPorPagar = 0;
              this.ventasService.editOrder(pedidoActual).subscribe({
                next: () => console.log('✅ [Wompi] Pedido actualizado: Aprobado / Entregado'),
                error: (err: any) => console.error('❌ [Wompi] Error actualizando estado:', err)
              });
            }
            Swal.fire({
              title: "Pago aprobado",
              text: "El pago fue aprobado exitosamente.",
              icon: "success",
              confirmButtonText: "Ok",
            });
            this.limpiarDatosDespuesDeVenta();
          } else {
            // Pago rechazado o cancelado: marcar como Rechazado en BD
            if (pedidoActual) {
              pedidoActual.estadoPago = EstadoPago.Rechazado;
              this.ventasService.editOrder(pedidoActual).subscribe({
                next: () => console.log('🚫 [Wompi] Pedido actualizado: Rechazado'),
                error: (err: any) => console.error('❌ [Wompi] Error actualizando estado:', err)
              });
            }
            console.log("ℹ️ [Wompi Widget] Pago no completado por el usuario.");
            Swal.fire({
              title: "Pago rechazado",
              text: "El pago fue rechazado o cancelado.",
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
              // Actualizar la información de pago del pedido si está disponible
              if (res.order) {
                // Asegurar que tenemos el número de pedido correcto del backend
                if (res.order.referencia) {
                  // D-419: no se copia el número de pedido como número de factura.
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
