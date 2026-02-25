import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { cartItems } from '../../../assets/data/cart';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  public cartItems: any[] = [];

  // --- POS Reactive State ---
  private _posCartItems$ = new BehaviorSubject<any[]>([]);
  public posCartItems$: Observable<any[]> = this._posCartItems$.asObservable();

  // Derived observables
  public posSubTotal$: Observable<number> = this._posCartItems$.pipe(
    map(items => items.reduce((acc, item) => {
      const price = item.discount_price ? item.discount_price : item.precio?.precioUnitarioConIva || 0;
      const quantity = item.cantidad || 0;
      return acc + (price * quantity);
    }, 0))
  );

  public posSubTotalFormatted$: Observable<string> = this.posSubTotal$.pipe(
    map(total => `$${total.toFixed(2)}`)
  );

  public posItemCount$: Observable<number> = this._posCartItems$.pipe(
    map(items => items.reduce((acc, item) => acc + (item.cantidad || 0), 0))
  );

  // Backward-compatible getter for existing code
  get posCartItems(): any[] {
    return this._posCartItems$.getValue();
  }

  set posCartItems(items: any[]) {
    this._posCartItems$.next(items);
  }

  constructor(private toast: ToastrService) {
    const items = localStorage.getItem('cart');
    if (items && items !== 'null' && items !== '' && JSON.parse(items).length > 0) {
      this.cartItems = JSON.parse(items);
    } else {
      this.cartItems = cartItems;
      localStorage.setItem('cart', JSON.stringify(this.cartItems));
    }
  }

  /** Emit updated cart state */
  private emitCartUpdate(): void {
    this._posCartItems$.next([...this._posCartItems$.getValue()]);
  }

  updateQuantity(value: number, item: any) {
    if (value == -1) {
      item.cantidad -= 1;
      if (item.cantidad < 1) {
        this.deleteCartItem(item);
      }
    } else if (value == 1) {
      if (item.cantidad < item.disponibilidad.cantidadDisponible) {
        item.cantidad += 1;
      } else {
        this.toast.error(`Cannot add more than ${item.disponibilidad.cantidadDisponible} items`, '', {
          timeOut: 800000
        });
      }
    }
  }

  deleteCartItem(item: any) {
    const items = this._posCartItems$.getValue().filter(
      (product) => product.crearProducto.titulo !== item.crearProducto.titulo
    );
    this._posCartItems$.next(items);
    localStorage.setItem('cart', JSON.stringify(items));
  }

  clearCart() {
    this._posCartItems$.next([]);
    localStorage.setItem('cart', JSON.stringify([]));
  }

  getSubTotal() {
    if (this.cartItems) {
      const subTotal = this.cartItems.reduce((acc, item) => {
        const price = item.discount_price ? item.discount_price : item.precio.precioUnitarioConIva || 0;
        const quantity = item.cantidad || 0;
        return acc + (price * quantity);
      }, 0);
      return `$${subTotal.toFixed(2)}`;
    }
  }

  posAddToCart(item: any) {
    const currentItems = this._posCartItems$.getValue();
    const cartItem = currentItems.find(
      (ci: any) => ci.crearProducto.titulo === item.crearProducto.titulo
    );

    Swal.fire({
      title: 'Producto adicionado!',
      text: `Producto ${item.crearProducto.titulo} adicionado correctamente al carrito`,
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });

    // Si el producto no es inventariable, agregar directamente al carrito
    if (!item.disponibilidad?.inventariable) {
      if (!cartItem) {
        this._posCartItems$.next([...currentItems, { ...item }]);
      } else {
        cartItem.cantidad += item.cantidad;
        this.emitCartUpdate();
      }
      return;
    }

    // Si es inventariable, validar stock
    const totalQuantityInCart = currentItems.reduce((total, ci) => {
      if (ci.crearProducto.titulo === item.crearProducto.titulo) {
        return total + ci.cantidad;
      }
      return total;
    }, 0);

    if (totalQuantityInCart + item.cantidad <= item.disponibilidad.cantidadDisponible) {
      if (!cartItem) {
        this._posCartItems$.next([...currentItems, { ...item }]);
      } else {
        cartItem.cantidad += item.cantidad;
        this.emitCartUpdate();
      }
    } else {
      Swal.fire({
        title: 'Error!',
        text: `Solo hay ${item.disponibilidad.cantidadDisponible} unidades en total.`,
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }

  /**
   * Optimized add for barcode scanner mode.
   * No SweetAlert, returns true/false for feedback handling by caller.
   */
  addByBarcode(item: any): boolean {
    const currentItems = this._posCartItems$.getValue();
    const cartItem = currentItems.find(
      (ci: any) => ci.crearProducto?.titulo === item.crearProducto?.titulo
    );

    // Non-inventoriable: always add
    if (!item.disponibilidad?.inventariable) {
      if (!cartItem) {
        this._posCartItems$.next([...currentItems, { ...item, cantidad: 1 }]);
      } else {
        cartItem.cantidad += 1;
        this.emitCartUpdate();
      }
      return true;
    }

    // Inventoriable: validate stock
    const totalInCart = currentItems.reduce((total, ci) => {
      if (ci.crearProducto?.titulo === item.crearProducto?.titulo) {
        return total + ci.cantidad;
      }
      return total;
    }, 0);

    if (totalInCart + 1 <= (item.disponibilidad?.cantidadDisponible || 0)) {
      if (!cartItem) {
        this._posCartItems$.next([...currentItems, { ...item, cantidad: 1 }]);
      } else {
        cartItem.cantidad += 1;
        this.emitCartUpdate();
      }
      return true;
    }

    return false; // Stock insuficiente
  }

  updatePOSQuantity(value: number, item: any) {
    const currentItems = this._posCartItems$.getValue();
    const cartItem = currentItems.find(
      (ci: any) => ci.crearProducto.titulo === item.crearProducto.titulo
    );

    if (!cartItem) return;

    if (value === -1) {
      cartItem.cantidad -= 1;
      if (cartItem.cantidad < 1) {
        this.posRemoveCartItem(item);
        return;
      }
      this.emitCartUpdate();
    } else if (value === 1) {
      // Si el producto no es inventariable, permitir cualquier cantidad
      if (!item.disponibilidad?.inventariable) {
        cartItem.cantidad += 1;
        this.emitCartUpdate();
        return;
      }

      // Si es inventariable, validar stock
      if (cartItem.cantidad < item.disponibilidad.cantidadDisponible) {
        cartItem.cantidad += 1;
        this.emitCartUpdate();
      } else {
        Swal.fire({
          title: 'Error!',
          text: `No se pueden agregar mas de ${item.disponibilidad.cantidadDisponible} unidades.`,
          icon: 'error',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        });
      }
    }
  }

  posRemoveCartItem(item: any) {
    const items = this._posCartItems$.getValue().filter(
      (product) => product.crearProducto.titulo !== item.crearProducto.titulo
    );
    this._posCartItems$.next(items);
  }

  getPOSSubTotal() {
    const items = this._posCartItems$.getValue();
    if (items) {
      const subTotal = items.reduce((acc, item) => {
        const price = item.discount_price ? item.discount_price : item.precio?.precioUnitarioConIva || 0;
        const quantity = item.cantidad || 0;
        return acc + (price * quantity);
      }, 0);
      return `$${subTotal.toFixed(2)}`;
    }
  }

  getPOSCantidad() {
    const items = this._posCartItems$.getValue();
    if (items) {
      const total = items.reduce((acc, item) => {
        const quantity = item.cantidad || 0;
        return acc + quantity;
      }, 0);
      return `${total.toFixed(0)}`;
    }
  }
}
