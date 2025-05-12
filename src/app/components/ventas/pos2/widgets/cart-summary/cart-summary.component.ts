import { Component } from '@angular/core';
import { CartService } from '../../../../../shared/services/cart.service';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})
export class CartSummaryComponent {
  couponCode: string = '';

  constructor(public cartService: CartService) { }

  /**
   * Aplica un cupón de descuento (funcionalidad pendiente)
   */
  applyCoupon(): void {
    if (!this.couponCode) return;
    
    // Aquí iría la lógica para aplicar el cupón
    console.log('Aplicando cupón:', this.couponCode);
    
    // Reiniciar el código del cupón
    this.couponCode = '';
  }
} 