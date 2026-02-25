import { Component } from '@angular/core';
import { CartService } from '../../../../../shared/services/cart.service';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})
export class CartSummaryComponent {
  couponCode: string = '';
  public defaultImage: string = 'assets/images/placeholders/product-not-found.svg';

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

  /**
   * Obtiene la URL de la imagen del item del carrito de forma segura
   * @param item El item del carrito del cual obtener la imagen
   * @returns URL de la imagen o imagen por defecto si no existe
   */
  trackByTitle(index: number, item: any): string {
    return item?.crearProducto?.titulo || index.toString();
  }

  getCartItemImageUrl(item: any): string {
    // Verificar que existan todas las propiedades necesarias
    if (item?.crearProducto?.imagenesPrincipales && 
        Array.isArray(item.crearProducto.imagenesPrincipales) &&
        item.crearProducto.imagenesPrincipales.length > 0 &&
        item.crearProducto.imagenesPrincipales[0]?.urls) {
      return item.crearProducto.imagenesPrincipales[0].urls;
    }
    
    // Si no hay imagen disponible, retornar imagen por defecto
    return this.defaultImage;
  }
} 