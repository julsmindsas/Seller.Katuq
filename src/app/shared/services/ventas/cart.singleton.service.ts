import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class CartSingletonService {
  public productInCart: BehaviorSubject<any[]> = new BehaviorSubject(this.getProductsFromLocalStorage());

  // Suscripción para detectar cambios en el carrito
  productInCartChanges$ = this.productInCart.asObservable();

  constructor(private httpClient: HttpClient) {
    this.refreshCart();  // Asegura que el BehaviorSubject esté inicializado correctamente
  }

  private getProductsFromLocalStorage(): any[] {
    return JSON.parse(localStorage.getItem('carrito') || '[]');
  }

  // Obtener productos del carrito y refrescar el estado del BehaviorSubject
  refreshCart() {
    const products = this.getProductsFromLocalStorage();
    this.productInCart.next(products);
    return this.productInCart.asObservable();
  }

  // Agregar producto al carrito
  addToCart(productoCompra: any) {
    const carrito = this.getProductsFromLocalStorage();
    carrito.push(productoCompra);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    this.productInCart.next(carrito); // Actualizar BehaviorSubject
  }

  // Remover producto
  removeProduct(producto: any) {
    let products = this.getProductsFromLocalStorage();
    const index = products.findIndex((p: any) => p.producto.crearProducto.cd === producto.producto.crearProducto.cd);
    if (index !== -1) {
      products.splice(index, 1);
      localStorage.setItem("carrito", JSON.stringify(products));
      this.productInCart.next(products); // Actualizar BehaviorSubject
    }
  }

  // Limpiar carrito
  clearCart() {
    localStorage.removeItem("carrito");
    this.productInCart.next([]); // Actualizar BehaviorSubject
  }

  // Calcular total del carrito
  calculateTotal(): number {
    const products = this.getProductsFromLocalStorage();
    return products.reduce((total, p) => total + p.producto.crearProducto.precio, 0);
  }
}
