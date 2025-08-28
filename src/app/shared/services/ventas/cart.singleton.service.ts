import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CartSingletonService {
  private readonly CART_STORAGE_KEY = 'carrito';
  public productInCart: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  // Suscripción para detectar cambios en el carrito
  productInCartChanges$ = this.productInCart.asObservable();

  constructor(private httpClient: HttpClient) {
    // Inicializar desde localStorage si existe
    this.initializeFromLocalStorage();
  }

  /**
   * Inicializa el carrito desde localStorage
   */
  private initializeFromLocalStorage(): void {
    try {
      const carritoGuardado = localStorage.getItem(this.CART_STORAGE_KEY);
      if (carritoGuardado) {
        const carrito = JSON.parse(carritoGuardado);
        if (Array.isArray(carrito)) {
          this.productInCart.next(carrito);
          console.log('🛒 Carrito inicializado desde localStorage:', carrito.length, 'productos');
        }
      }
    } catch (error) {
      console.error('Error al inicializar carrito desde localStorage:', error);
      // Si hay error, limpiar localStorage y empezar con carrito vacío
      localStorage.removeItem(this.CART_STORAGE_KEY);
      this.productInCart.next([]);
    }
  }

  /**
   * Sincroniza el estado actual con localStorage
   */
  private syncWithLocalStorage(carrito: any[]): void {
    try {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(carrito));
      console.log('💾 Carrito sincronizado con localStorage:', carrito.length, 'productos');
    } catch (error) {
      console.error('Error al sincronizar carrito con localStorage:', error);
    }
  }

  // Refrescar el estado del BehaviorSubject
  refreshCart() {
    return this.productInCart.asObservable();
  }

  // Agregar producto al carrito
  addToCart(productoCompra: any) {
    const carrito = this.productInCart.value;
    // Asignar un identificador único por ítem de carrito si no existe
    if (!productoCompra.cartItemId && !productoCompra._cartUid) {
      productoCompra.cartItemId = this.generateCartItemId(productoCompra);
    }
    carrito.push(productoCompra);
    const nuevoCarrito = [...carrito];
    this.productInCart.next(nuevoCarrito);
    this.syncWithLocalStorage(nuevoCarrito);
    console.log('➕ Producto agregado al carrito:', productoCompra.producto?.crearProducto?.titulo || 'Producto sin nombre');
  }

  // Remover producto
  removeProduct(producto: any) {
    let products = this.productInCart.value;
    const index = this.getCartItemIndex(products, producto);
    if (index !== -1) {
      products.splice(index, 1);
      const nuevoCarrito = [...products];
      this.productInCart.next(nuevoCarrito);
      this.syncWithLocalStorage(nuevoCarrito);
      console.log('➖ Producto removido del carrito:', producto.producto?.crearProducto?.titulo || 'Producto sin nombre');
    }
  }

  // Actualizar cantidad de producto
  updateProductQuantity(producto: any) {
    const products = this.productInCart.value;
    const index = this.getCartItemIndex(products, producto);
    if (index !== -1) {
      // Mantener el mismo objeto si es posible para evitar perder referencias internas
      const updated = { ...products[index], ...producto };
      // Forzar cantidad numérica
      if (updated && typeof updated.cantidad !== 'number') {
        const parsed = parseInt(updated.cantidad);
        updated.cantidad = isNaN(parsed) ? (products[index]?.cantidad || 1) : parsed;
      }
      // preservar id único si existía
      updated.cartItemId = products[index]?.cartItemId || producto?.cartItemId || products[index]?._cartUid || producto?._cartUid;
      products[index] = updated;
      const nuevoCarrito = [...products];
      this.productInCart.next(nuevoCarrito);
      this.syncWithLocalStorage(nuevoCarrito);
      console.log('🔄 Cantidad actualizada:', producto.producto?.crearProducto?.titulo, 'nueva cantidad:', producto.cantidad);
    }
  }

  // Limpiar carrito
  clearCart() {
    const carritoVacio: any[] = [];
    this.productInCart.next(carritoVacio);
    this.syncWithLocalStorage(carritoVacio);
    console.log('🧹 Carrito limpiado completamente');
  }

  // Calcular total del carrito
  calculateTotal(): number {
    const products = this.productInCart.value;
    return products.reduce((total, p) => total + p.producto.crearProducto.precio, 0);
  }

  /**
   * Busca el índice exacto del ítem del carrito a partir de la identidad del objeto
   * o un identificador único, con retrocompatibilidad a `cd`.
   */
  private getCartItemIndex(products: any[], producto: any): number {
    if (!Array.isArray(products)) return -1;

    // 1) Coincidencia por referencia de objeto
    let index = products.findIndex((p: any) => p === producto);
    if (index !== -1) return index;

    // 2) Coincidencia por id interno del ítem de carrito
    const targetId = producto?.cartItemId || producto?._cartUid;
    if (targetId) {
      index = products.findIndex((p: any) => (p?.cartItemId || p?._cartUid) === targetId);
      if (index !== -1) return index;
    }

    // 3) Coincidencia por cd (solo si existe), intentando además coincidir la configuración
    const cd = producto?.producto?.crearProducto?.cd;
    if (cd) {
      index = products.findIndex((p: any) => p?.producto?.crearProducto?.cd === cd && p?.configuracion === producto?.configuracion);
      if (index !== -1) return index;
      index = products.findIndex((p: any) => p?.producto?.crearProducto?.cd === cd);
      if (index !== -1) return index;
    }

    // 4) Coincidencia por objeto de producto anidado (último recurso)
    index = products.findIndex((p: any) => p?.producto === producto?.producto);
    return index;
  }

  /**
   * Genera un id único del ítem de carrito.
   */
  private generateCartItemId(productoCompra: any): string {
    const base = productoCompra?.producto?.crearProducto?.cd || productoCompra?.producto?.identificacion?.referencia || 'item';
    return `${base}::${Date.now()}::${Math.random().toString(36).slice(2)}`;
  }
}
