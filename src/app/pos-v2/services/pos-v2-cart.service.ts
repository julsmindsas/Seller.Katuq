import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PosV2CartItem } from '../models/pos-v2.models';

@Injectable({ providedIn: 'root' })
export class PosV2CartService {

  private readonly STORAGE_KEY = 'posV2Cart';

  private cartSubject = new BehaviorSubject<PosV2CartItem[]>([]);

  items$: Observable<PosV2CartItem[]> = this.cartSubject.asObservable();

  itemCount$: Observable<number> = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.quantity, 0))
  );

  subtotal$: Observable<number> = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.subtotal, 0))
  );

  tax$: Observable<number> = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + (item.total - item.subtotal), 0))
  );

  total$: Observable<number> = this.items$.pipe(
    map(items => items.reduce((sum, item) => sum + item.total, 0))
  );

  isEmpty$: Observable<boolean> = this.items$.pipe(
    map(items => items.length === 0)
  );

  constructor() {
    this.initializeFromLocalStorage();
  }

  private initializeFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        if (Array.isArray(items)) {
          this.cartSubject.next(items);
        }
      }
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
      this.cartSubject.next([]);
    }
  }

  private syncWithLocalStorage(items: PosV2CartItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Silently fail on storage quota errors
    }
  }

  addItem(product: any, quantity: number = 1): void {
    const items = this.cartSubject.value;
    const taxRate = product?.precio?.impuesto ?? 0;
    const unitPrice = product?.precio?.precioUnitarioSinIva ?? 0;
    const unitPriceWithTax = product?.precio?.precioUnitarioConIva ?? unitPrice;

    const productKey = this.getProductKey(product);

    const existing = items.find(
      i => this.getProductKey(i.product) === productKey
    );

    if (existing) {
      existing.quantity += quantity;
      existing.subtotal = existing.quantity * existing.unitPrice;
      existing.total = existing.quantity * existing.unitPriceWithTax;
      const updated = [...items];
      this.cartSubject.next(updated);
      this.syncWithLocalStorage(updated);
      return;
    }

    const newItem: PosV2CartItem = {
      cartItemId: `${productKey}::${Date.now()}::${Math.random().toString(36).slice(2)}`,
      product,
      quantity,
      unitPrice,
      unitPriceWithTax,
      taxRate,
      subtotal: quantity * unitPrice,
      total: quantity * unitPriceWithTax,
    };

    const updated = [...items, newItem];
    this.cartSubject.next(updated);
    this.syncWithLocalStorage(updated);
  }

  private getProductKey(product: any): string {
    return product?._id
      || product?.identificacion?.referencia
      || product?.identificacion?.codigoBarras
      || 'item';
  }

  removeItem(cartItemId: string): void {
    const items = this.cartSubject.value.filter(i => i.cartItemId !== cartItemId);
    this.cartSubject.next(items);
    this.syncWithLocalStorage(items);
  }

  updateQty(cartItemId: string, delta: number): void {
    const items = this.cartSubject.value;
    const item = items.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeItem(cartItemId);
      return;
    }

    item.quantity = newQty;
    item.subtotal = newQty * item.unitPrice;
    item.total = newQty * item.unitPriceWithTax;

    const updated = [...items];
    this.cartSubject.next(updated);
    this.syncWithLocalStorage(updated);
  }

  clear(): void {
    this.cartSubject.next([]);
    this.syncWithLocalStorage([]);
  }

  getSnapshot(): PosV2CartItem[] {
    return [...this.cartSubject.value];
  }

  getTotal(): number {
    return this.cartSubject.value.reduce((sum, item) => sum + item.total, 0);
  }
}
