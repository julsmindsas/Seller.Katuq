// card-payment.component.ts
import { Component } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PosCheckoutService } from '../../../../../shared/services/ventas/pos-checkout.service';
import { EstadoPago } from '../../../modelo/pedido';

@Component({
  selector: 'app-card-payment',
  templateUrl: './card-payment.html',
  styleUrls: ['./card-payment.scss']
})
export class CardPaymentComponent {
  constructor(
    public activeModal: NgbActiveModal, 
    private checkoutService: PosCheckoutService
  ) {}

  /**
   * Selecciona un método de pago y cierra el modal devolviendo la información
   * @param method Nombre del método de pago seleccionado
   */
  selectPaymentMethod(method: string) {
    if (method.toLowerCase() === 'wompi') {
      // Si es Wompi, primero se guarda el pedido y luego se procesa con el widget de Wompi
      this.activeModal.close({
        paymentMethod: method,
        useWompiIntegration: true
      });
    } else {
      // Para otros métodos de pago electrónicos, solo se cierra el modal
      this.activeModal.close({
        paymentMethod: method
      });
    }
  }

  /**
   * Inicia el proceso de pago con Wompi
   * Este método puede ser llamado desde el servicio de checkout
   */
  iniciarPagoConWompi(pedido: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Configuración del widget de Wompi
        const amountInCents = Math.round((pedido?.totalPedididoConDescuento ?? 0) * 100); // Convertir a centavos

        // Clave pública de Wompi (debería venir de environment)
        const wompiPublicKey = 'pub_test_sNdWRfLNp683Ex0hLby4nxcOBIkH38Jy';

        // Usar el número de pedido como referencia
        const reference = pedido.nroPedido || `order-${new Date().getTime()}`;

        // Configurar datos del cliente para el formulario de pago
        const customerData = {
          fullName: pedido.cliente?.nombres_completos || '',
          phoneNumber: pedido.cliente?.numero_celular_comprador || '',
          phoneNumberPrefix: pedido.cliente?.indicativo_celular_comprador || '57',
          email: pedido.cliente?.correo_electronico_comprador || ''
        };

        // Inicializar el widget de Wompi
        const checkout = new window['WidgetCheckout']({
          currency: 'COP',
          amountInCents: amountInCents,
          reference: reference,
          publicKey: wompiPublicKey,
          redirectUrl: 'http://localhost:4200/payment-callback', // Debería venir de environment
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

            resolve(true); // Pago exitoso
          } else {
            pedido.estadoPago = EstadoPago.Rechazado;
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
}