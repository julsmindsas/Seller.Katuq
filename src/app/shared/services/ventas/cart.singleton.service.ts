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
    carrito.push(productoCompra);
    const nuevoCarrito = [...carrito];
    this.productInCart.next(nuevoCarrito);
    this.syncWithLocalStorage(nuevoCarrito);
    console.log('➕ Producto agregado al carrito:', productoCompra.producto?.crearProducto?.titulo || 'Producto sin nombre');
  }

  // Remover producto
  removeProduct(producto: any) {
    let products = this.productInCart.value;
    const index = products.findIndex((p: any) => p.producto.crearProducto.cd === producto.producto.crearProducto.cd);
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
    const index = products.findIndex((p: any) => p.producto.crearProducto.cd === producto.producto.crearProducto.cd);
    if (index !== -1) {
      products[index] = producto;
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
}
