import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { cartItems } from '../../../assets/data/cart';
import Swal from 'sweetalert2';
// import { posOrder } from '../../../assets/data/pos';
// import { OrderDetailsProduct } from '../../shared/models/pos/order';
//interface/order';


@Injectable({
  providedIn: 'root'
})

export class CartService {

  public cartItems: any[] = [];
  public posCartItems: any[] = [];

  constructor(private toast: ToastrService) {

    const items = localStorage.getItem('cart');
    if (items && items !== 'null' && items !== '' && JSON.parse(items).length > 0) {
      this.cartItems = JSON.parse(items);
    } else {
      this.cartItems = cartItems;
      localStorage.setItem('cart', JSON.stringify(this.cartItems));
    }
  }

  updateQuantity(value: number, item: any) {
    if (value == -1) {
      item.cantidad -= 1;
      if (item.cantidad < 1) {
        this.deleteCartItem(item)
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
    this.posCartItems = this.posCartItems.filter((product) => product.crearProducto.titulo !== item.crearProducto.titulo);
    localStorage.setItem('cart', JSON.stringify(this.posCartItems))
  }

  clearCart() {
    this.posCartItems = [];
    localStorage.setItem('cart', JSON.stringify(this.posCartItems))
  }

  getSubTotal() {
    if (this.cartItems) {
      const subTotal = this.cartItems.reduce((acc, item) => {
        const price = item.discount_price ? item.discount_price : item.precio.precioUnitarioConIva || 0;
        const quantity = item.cantidad || 0;
        return acc + (price * quantity);
      }, 0)

      return `$${subTotal.toFixed(2)}`
    }
  }

  posAddToCart(item: any) {
    const cartItem = this.posCartItems.find((cartItem: any) => cartItem.crearProducto.titulo === item.crearProducto.titulo);

    Swal.fire({
      title: '¡Producto adicionado!',
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
        this.posCartItems.push({ ...item });
      } else {
        cartItem.cantidad += item.cantidad;
      }
      return;
    }

    // Si es inventariable, validar stock
    const totalQuantityInCart = this.posCartItems.reduce((total, cartItem) => {
      if (cartItem.crearProducto.titulo === item.crearProducto.titulo) {
        return total + cartItem.cantidad;
      }
      return total;
    }, 0);

    if (totalQuantityInCart + item.cantidad <= item.disponibilidad.cantidadDisponible) {
      if (!cartItem) {
        this.posCartItems.push({ ...item });
      } else {
        if (totalQuantityInCart + item.cantidad <= item.disponibilidad.cantidadDisponible) {
          cartItem.cantidad += item.cantidad;
        } else {
          Swal.fire({
            title: '¡Error!',
            text: `Solo hay ${item.disponibilidad.cantidadDisponible} unidades disponibles.`,
            icon: 'error',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
          });
        }
      }
    } else {
      Swal.fire({
        title: '¡Error!',
        text: `Solo hay ${item.disponibilidad.cantidadDisponible} unidades en total.`,
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    }
  }

  updatePOSQuantity(value: number, item: any) {
    const cartItem = this.posCartItems.find((cartItem: any) => cartItem.crearProducto.titulo === item.crearProducto.titulo);

    if (!cartItem) return;

    if (value === -1) {
      cartItem.cantidad -= 1;
      if (cartItem.cantidad < 1) {
        this.posRemoveCartItem(item)
        this.getPOSSubTotal();
      }
    } else if (value == 1) {
      // Si el producto no es inventariable, permitir cualquier cantidad
      if (!item.disponibilidad?.inventariable) {
        cartItem.cantidad += 1;
        this.getPOSSubTotal();
        return;
      }

      // Si es inventariable, validar stock
      if (cartItem.cantidad < item.disponibilidad.cantidadDisponible) {
        cartItem.cantidad += 1;
        this.getPOSSubTotal();
      } else {
        Swal.fire({
          title: '¡Error!',
          text: `No se pueden agregar más de ${item.disponibilidad.cantidadDisponible} unidades.`,
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
    this.posCartItems = this.posCartItems.filter((product) => product.crearProducto.titulo !== item.crearProducto.titulo);
  }

  getPOSSubTotal() {
    if (this.posCartItems) {
      const subTotal = this.posCartItems.reduce((acc, item) => {
        const price = item.discount_price ? item.discount_price : item.precio.precioUnitarioConIva || 0;
        const quantity = item.cantidad || 0;
        return acc + (price * quantity);
      }, 0)

      return `$${subTotal.toFixed(2)}`
    }
  }

  getPOSCantidad() {
    if (this.posCartItems) {
      const subTotal = this.posCartItems.reduce((acc, item) => {
        const quantity = item.cantidad || 0;
        return acc + (quantity);
      }, 0)

      return `${subTotal.toFixed(0)}`
    }
  }

}
