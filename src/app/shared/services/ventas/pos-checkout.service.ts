import { Injectable, InjectionToken } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject, Subject } from 'rxjs';
import Swal from 'sweetalert2';

import { CardPaymentComponent } from '../../../components/ventas/pos2/widgets/card-payment/card-payment';
import { CashPaymentComponent } from '../../../components/ventas/pos2/widgets/cash-payment/cash-payment';
import { EWalletPaymentComponent } from '../../../components/ventas/pos2/widgets/ewallet-payment/ewallet-payment';
import { CartService } from '../cart.service';
import { PosValidationService } from './pos-validation.service';
import { PosOrderCreatorService } from './pos-order-creator.service';
import { POSPedido } from '../../../components/pos/pos-modelo/pedido';
import { EstadoPago, EstadoProceso, Pedido } from '../../../components/ventas/modelo/pedido';

// Crear un token para PosCheckoutService
export const POS_CHECKOUT_SERVICE = new InjectionToken<PosCheckoutService>('PosCheckoutService');

@Injectable({
  providedIn: 'root',
  useFactory: posCheckoutServiceFactory,
  deps: [NgbModal, PosValidationService, PosOrderCreatorService, CartService]
})
export class PosCheckoutService {
  // Observables para el estado del checkout
  customer$ = new BehaviorSubject<any>(null);
  paymentMethod$ = new BehaviorSubject<string>('');
  warehouse$ = new BehaviorSubject<any>(null);
  pedido$ = new BehaviorSubject<Pedido | null>(null);
  
  // Observable para manejar solicitudes de pago con Wompi
  wompiPaymentRequested$ = new Subject<{pedido: any, options?: any}>();
  
  constructor(
    private modal: NgbModal,
    private validationService: PosValidationService,
    public orderCreatorService: PosOrderCreatorService,
    private cartService: CartService
  ) {
    // Cargar la bodega desde localStorage al iniciar
    this.loadWarehouseFromStorage();
  }
  
  /**
   * Carga la bodega seleccionada desde el localStorage
   */
  private loadWarehouseFromStorage(): void {
    try {
      console.log('Intentando cargar bodega desde localStorage');
      const warehouseStr = localStorage.getItem('warehousePOS');
      console.log('Bodega en localStorage:', warehouseStr);
      
      if (!warehouseStr) {
        console.log('No hay bodega guardada en localStorage');
        return;
      }
      
      const warehouse = JSON.parse(warehouseStr);
      console.log('Bodega parseada:', warehouse);
      
      if (warehouse && warehouse.idBodega) {
        console.log('Bodega válida encontrada, estableciendo en warehouse$');
        this.warehouse$.next(warehouse);
      } else {
        console.log('Bodega no válida (sin idBodega)');
      }
    } catch (error) {
      console.error('Error al cargar la bodega desde localStorage:', error);
    }
  }

  /**
   * Establece el cliente seleccionado
   */
  setCustomer(customer: any): void {
    this.customer$.next(customer);
  }

  /**
   * Limpia los datos del cliente
   */
  clearCustomer(): void {
    this.customer$.next(null);
  }
  
  /**
   * Establece el método de pago seleccionado
   */
  setPaymentMethod(method: string): void {
    this.paymentMethod$.next(method);
  }

  /**
   * Abre el flujo de pago según el método seleccionado
   */
  openPaymentFlow(method: string): void {
    this.setPaymentMethod(method);
    
    // Validar antes de continuar
    if (!this.validationService.validateCheckout(true)) return;
    
    switch(method) {
      case 'Efectivo':
        this.openCashPaymentModal();
        break;
      case 'Métodos Electrónicos':
        this.openCardPaymentModal();
        break;
      case 'E-Wallet':
        this.openEWalletPaymentModal();
        break;
      default:
        this.showAlert('Método no soportado', 'El método de pago seleccionado no está implementado');
    }
  }
  
  /**
   * Abre el modal de pago en efectivo
   */
  private openCashPaymentModal(): void {
    const modalRef = this.modal.open(CashPaymentComponent, { size: 'md' });
    const total = this.cartService.getPOSSubTotal();
    const valor = parseFloat(total?.replace('$', '') || '0');
    
    modalRef.componentInstance.totalAmount = valor;
    
    modalRef.result.then(
      (result: any) => {
        if (!result) return;
        this.processPurchase({
          amountReceived: result.amountReceived,
          change: result.change
        });
      },
      () => {}
    );
  }
  
  /**
   * Abre el modal de pago con tarjeta
   */
  private openCardPaymentModal(): void {
    const modalRef = this.modal.open(CardPaymentComponent, { 
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });
    
    modalRef.result.then(
      (result: any) => {
        if (result && result.paymentMethod) {
          this.setPaymentMethod(result.paymentMethod);
          
          // Si se seleccionó Wompi, iniciar flujo especial
          if (result.useWompiIntegration) {
            this.processPurchaseWithWompi(result.paymentMethod);
          } else {
            // Para otros métodos, usar el flujo normal
            this.processPurchase({});
          }
        }
      },
      () => {}
    );
  }
  
  /**
   * Abre el modal de pago con billetera electrónica
   */
  private openEWalletPaymentModal(): void {
    const modalRef = this.modal.open(EWalletPaymentComponent, { size: 'md' });
    
    modalRef.result.then(
      (result: any) => {
        if (!result) return;
        this.processPurchase(result);
      },
      () => {}
    );
  }
  
  /**
   * Procesa la compra con los datos proporcionados
   */
  processPurchase(paymentDetails: any): void {
    const customer = this.customer$.getValue();
    const paymentMethod = this.paymentMethod$.getValue();
    const warehouse = this.warehouse$.getValue();
    
    // Crear el pedido
    const pedido = this.orderCreatorService.createPedidoObject(customer, paymentMethod, warehouse);
    
    // Actualizar campos específicos del pago
    if (paymentDetails.amountReceived) {
      pedido.pagoRecibido = paymentDetails.amountReceived;
    }
    
    if (paymentDetails.change) {
      pedido.cambioEntregado = paymentDetails.change;
    }
    
    // Establecer estados
    pedido.estadoPago = EstadoPago.Aprobado;
    pedido.estadoProceso = EstadoProceso.Entregado;
    pedido.formaEntrega = paymentMethod;
    pedido.formaDePago = paymentMethod;
    pedido.nroFactura = pedido.nroPedido;
    
    // Guardar el pedido
    this.orderCreatorService.savePedido(pedido);
  }
  
  /**
   * Procesa una compra usando Wompi como método de pago
   */
  processPurchaseWithWompi(paymentMethod: string): void {
    const customer = this.customer$.getValue();
    const warehouse = this.warehouse$.getValue();
    
    // Crear el pedido con estado pendiente
    const pedido = this.orderCreatorService.createPedidoObject(customer, paymentMethod, warehouse);
    
    // Establecer estado inicial como pendiente
    pedido.estadoPago = EstadoPago.Pendiente;
    pedido.formaEntrega = paymentMethod;
    pedido.formaDePago = paymentMethod;
    this.orderCreatorService.assignUserToOrder(pedido);
    
    // Actualizar el Observable del pedido
   // this.pedido$.next(pedido);
    
    // Emitir evento para procesar pago Wompi
    this.wompiPaymentRequested$.next({ pedido });
  }
  
  /**
   * Inicia el pago con Wompi
   */
  iniciarPagoConWompi(pedido: Pedido): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Configuración del widget de Wompi
        const amountInCents = Math.round((pedido?.totalPedididoConDescuento ?? 0) * 100);
        
        // Clave pública de Wompi (debería venir de environment)
        const wompiPublicKey = 'pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy';
        const wompiProdPublicKey = 'pub_prod_cN70rb6aXdHMiBWj9fwY26Xyh1Oz5PUf';
        
        // Usar el número de pedido como referencia
        const reference = pedido.nroPedido || `order-${new Date().getTime()}`;
        
        // Configurar datos del cliente para el formulario de pago
        const customerData = {
          fullName: pedido.cliente?.nombres_completos || '',
          phoneNumber: pedido.cliente?.numero_celular_comprador || '',
          phoneNumberPrefix: pedido.cliente?.indicativo_celular_comprador || '57',
          email: pedido.cliente?.correo_electronico_comprador || ''
        };
        const redirectUrl = window.location.origin + '/payment-callback';
        // Inicializar el widget de Wompi
        const checkout = new window['WidgetCheckout']({
          currency: 'COP',
          amountInCents: amountInCents,
          reference: reference,
          publicKey: wompiProdPublicKey,
          redirectUrl: redirectUrl, // Debería venir de environment
          taxInCents: {
            vat: Math.round((pedido?.totalImpuesto ?? 0) * 100),
            consumption: 0
          },
          signature: {
            integrity: pedido?.pagoInformation?.integridad || '',
          },
          customerData: customerData,
        });
        
        // Abrir el widget y manejar la respuesta
        checkout.open((result) => {
          const { transaction } = result;
          pedido = this.pedido$.getValue() as Pedido;
          if (transaction.status === 'APPROVED') {
            // Almacenar los datos de la transacción en el pedido
            pedido.transaccionId = transaction.id;
            pedido.estadoPago = EstadoPago.Aprobado;
            pedido.PagosAsentados = [{
              fechaHoraAprobacionRechazo: new Date().toISOString(),
              numeroPedido: reference,
              numeroComprobante: transaction.id,
              estadoVerificacion: 'Aprobado',
              formaPago: 'Wompi',
              valorRegistrado: pedido.totalPedididoConDescuento || 0
            }];

            if (pedido.pagoInformation) {
              pedido.pagoInformation.estado = 'Aprobado';
              pedido.pagoInformation.fecha = new Date().toISOString();
              pedido.pagoInformation.hora = new Date().toISOString();
            }
            
            // Actualizar el pedido en el Observable
            this.pedido$.next(pedido);
            
            resolve(true); // Pago exitoso
          } else {
            pedido.estadoPago = EstadoPago.Rechazado;
            
            // Actualizar el pedido en el Observable
            this.pedido$.next(pedido);
            
            resolve(false); // Pago rechazado
          }
        }, (error) => {
          console.error('Error en el widget de Wompi:', error);
          reject(error);
        });
        
      } catch (error) {
        console.error('Error al inicializar el widget de Wompi:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Limpia el carrito y los datos del cliente
   */
  resetCheckout(): void {
    this.cartService.clearCart();
    this.clearCustomer();
  }
  
  /**
   * Muestra una alerta con SweetAlert2
   */
  private showAlert(title: string, text: string, icon: any = 'warning'): void {
    Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: 'Ok'
    });
  }
}

export function posCheckoutServiceFactory(
  modal: NgbModal,
  validationService: PosValidationService,
  orderCreatorService: PosOrderCreatorService,
  cartService: CartService
) {
  return new PosCheckoutService(modal, validationService, orderCreatorService, cartService);
} 