import { Component } from '@angular/core';
import { CartService } from '../../../../../shared/services/cart.service';
import { imagenDeProducto } from '../../../../../shared/utils/imagen-producto';

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
   * Total del ticket como NÚMERO, solo para mostrarlo con separadores de miles.
   * OJO: no se toca getPOSSubTotal(); pos-order-creator hace
   * parseFloat(getPOSSubTotal().replace('$','')) al crear el pedido, así que
   * cambiar el formato del servicio rompería el monto de la orden.
   */
  get totalNumerico(): number {
    const raw = this.cartService.getPOSSubTotal();
    return parseFloat(String(raw ?? '0').replace(/[^0-9.-]/g, '')) || 0;
  }

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
  getCartItemImageUrl(item: any): string {
    // La ruta que guarda Osmosis es relativa y no carga servida tal cual:
    // `imagenDeProducto` la resuelve contra el CDN. Ver shared/utils.
    return imagenDeProducto(item, this.defaultImage);
  }
} 