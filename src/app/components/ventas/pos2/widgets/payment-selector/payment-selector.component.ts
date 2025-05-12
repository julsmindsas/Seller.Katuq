import { Component } from '@angular/core';
import { PosCheckoutService } from '../../../../../shared/services/ventas/pos-checkout.service';

@Component({
  selector: 'app-payment-selector',
  templateUrl: './payment-selector.component.html',
  styleUrls: ['./payment-selector.component.scss']
})
export class PaymentSelectorComponent {
  // Método de pago seleccionado
  selectedMethod = '';

  constructor(private checkoutService: PosCheckoutService) { }

  /**
   * Maneja el pago en efectivo
   */
  handleCashPayment(): void {
    this.selectedMethod = 'Efectivo';
    this.checkoutService.openPaymentFlow(this.selectedMethod);
  }

  /**
   * Maneja el pago con métodos electrónicos
   */
  handleCardPayment(): void {
    this.selectedMethod = 'Métodos Electrónicos';
    this.checkoutService.openPaymentFlow(this.selectedMethod);
  }

  /**
   * Maneja el pago con billetera electrónica
   */
  handleEWalletPayment(): void {
    this.selectedMethod = 'E-Wallet';
    this.checkoutService.openPaymentFlow(this.selectedMethod);
  }
} 