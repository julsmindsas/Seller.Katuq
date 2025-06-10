import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CartSingletonService {
  public productInCart: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  // Suscripción para detectar cambios en el carrito
  productInCartChanges$ = this.productInCart.asObservable();

  constructor(private httpClient: HttpClient) {
    // Solo inicializar con array vacío, sin localStorage
  }

  // Refrescar el estado del BehaviorSubject
  refreshCart() {
    return this.productInCart.asObservable();
  }

  // Agregar producto al carrito
  addToCart(productoCompra: any) {
    const carrito = this.productInCart.value;
    carrito.push(productoCompra);
    this.productInCart.next([...carrito]); // Crear nuevo array para triggering change
  }

  // Remover producto
  removeProduct(producto: any) {
    let products = this.productInCart.value;
    const index = products.findIndex((p: any) => p.producto.crearProducto.cd === producto.producto.crearProducto.cd);
    if (index !== -1) {
      products.splice(index, 1);
      this.productInCart.next([...products]); // Crear nuevo array para triggering change
    }
  }

  // Actualizar cantidad de producto
  updateProductQuantity(producto: any) {
    const products = this.productInCart.value;
    const index = products.findIndex((p: any) => p.producto.crearProducto.cd === producto.producto.crearProducto.cd);
    if (index !== -1) {
      products[index] = producto;
      this.productInCart.next([...products]); // Crear nuevo array para triggering change
    }
  }

  // Limpiar carrito
  clearCart() {
    this.productInCart.next([]); // Actualizar BehaviorSubject
  }

  // Calcular total del carrito
  calculateTotal(): number {
    const products = this.productInCart.value;
    return products.reduce((total, p) => total + p.producto.crearProducto.precio, 0);
  }
}
