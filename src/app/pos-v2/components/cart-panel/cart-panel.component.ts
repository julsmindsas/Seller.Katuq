import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { PosV2CartService } from '../../services/pos-v2-cart.service';
import { PosV2CartItem } from '../../models/pos-v2.models';

@Component({
  selector: 'app-pos-v2-cart-panel',
  templateUrl: './cart-panel.component.html',
  styleUrls: ['./cart-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartPanelComponent {
  @Output() openPayment = new EventEmitter<void>();

  items$: Observable<PosV2CartItem[]> = this.cartService.items$;
  subtotal$: Observable<number> = this.cartService.subtotal$;
  tax$: Observable<number> = this.cartService.tax$;
  total$: Observable<number> = this.cartService.total$;
  isEmpty$: Observable<boolean> = this.cartService.isEmpty$;
  itemCount$: Observable<number> = this.cartService.itemCount$;

  constructor(private cartService: PosV2CartService) {}

  increaseQty(item: PosV2CartItem): void {
    this.cartService.updateQty(item.cartItemId, 1);
  }

  decreaseQty(item: PosV2CartItem): void {
    this.cartService.updateQty(item.cartItemId, -1);
  }

  removeItem(item: PosV2CartItem): void {
    this.cartService.removeItem(item.cartItemId);
  }

  clearCart(): void {
    this.cartService.clear();
  }

  onCheckout(): void {
    this.openPayment.emit();
  }

  trackByCartItemId(_index: number, item: PosV2CartItem): string {
    return item.cartItemId;
  }

  getProductName(item: PosV2CartItem): string {
    return item.product?.crearProducto?.titulo || item.product?.identificacion?.referencia || 'Producto';
  }

  getProductImage(item: PosV2CartItem): string | null {
    const images = item.product?.crearProducto?.imagenesPrincipales;
    if (Array.isArray(images) && images.length > 0) {
      return images[0]?.urls || null;
    }
    return null;
  }

  getProductRef(item: PosV2CartItem): string {
    return item.product?.identificacion?.referencia || '';
  }
}
