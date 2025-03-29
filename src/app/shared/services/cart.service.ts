import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

import { cartItems } from '../../../assets/data/cart';
import { posOrder } from '../../../assets/data/pos';
import { OrderDetailsProduct } from '../../shared/models/pos/order';
//interface/order';


@Injectable({
  providedIn: 'root'
})

export class CartService {

  public cartItems: OrderDetailsProduct[];
  public posCartItems: OrderDetailsProduct[] = posOrder;

  constructor(private toast: ToastrService) {

    const items = localStorage.getItem('cart');
    if (items && items !== 'null' && items !== '' && JSON.parse(items).length > 0) {
      this.cartItems = JSON.parse(items);
    } else {
      this.cartItems = cartItems;
      localStorage.setItem('cart', JSON.stringify(this.cartItems));
    }
  }

  updateQuantity(value: number, item: OrderDetailsProduct) {
    if(value == -1) {
      item.quantity -= 1;
      if(item.quantity < 1) {
        this.deleteCartItem(item)
      }
    } else if(value == 1) {
      if(item.quantity < item.total_quantity) {
        item.quantity += 1;
      } else {
        this.toast.error(`Cannot add more than ${item.total_quantity} items`,'',{
          timeOut: 80000000
        });
      }
    }
  }

  deleteCartItem(item: OrderDetailsProduct) {
    this.cartItems = this.cartItems.filter((product) => product.id !== item.id);
    localStorage.setItem('cart', JSON.stringify(this.cartItems))
  }

  clearCart() {
    this.cartItems = [];
    localStorage.setItem('cart', JSON.stringify(this.cartItems))
  }

  getSubTotal() {
    if(this.cartItems) {
      const subTotal = this.cartItems.reduce((acc, item) => {
        const price = item.discount_price ? item.discount_price : item.price || 0;
        const quantity = item.quantity || 0;
        return acc + (price * quantity);
      }, 0)

      return `$${subTotal.toFixed(2)}`
    }
  }

  posAddToCart(item: OrderDetailsProduct) {
    const cartItem = this.posCartItems.find(cartItem => cartItem.id === item.id);

    this.toast.success(`Product has been Add To Card Succesfully !`, '',{
    timeOut: 700000
    });
   
    const totalQuantityInCart = this.posCartItems.reduce((total, cartItem) => {
      if (cartItem.id === item.id) {
        return total + cartItem.quantity;
      }
    
      return total;
    }, 0);

    if (totalQuantityInCart + item.quantity <= item.total_quantity) {
      if (!cartItem) {
        this.posCartItems.push({ ...item });
      } else {
        if (totalQuantityInCart + item.quantity <= item.total_quantity) {
          cartItem.quantity += item.quantity;

        } else {
          this.toast.error(`Cannot add more than ${item.total_quantity} items.`,'',{
            timeOut: 80000000
          });
        }
      }
    } else {
      this.toast.error(`Cannot add more than ${item.total_quantity} items in total.`,'',{
        timeOut: 80000000
      });
    }
  }

  updatePOSQuantity(value: number, item: OrderDetailsProduct) {
    const cartItem = this.posCartItems.find(cartItem => cartItem.id === item.id);

    if (!cartItem) return;

    if (value === -1) {
      cartItem.quantity -= 1;
      if(cartItem.quantity < 1) {
        this.posRemoveCartItem(item)
      }
    } else if (value == 1) {
      if(cartItem.quantity < item.total_quantity) {
        cartItem.quantity += 1;
      } else {
        this.toast.error(`Cannot add more than ${item.total_quantity} items`,'',{
          timeOut: 80000000
        })
      }
    } 
    
  }

  posRemoveCartItem(item: OrderDetailsProduct) {
    this.posCartItems = this.posCartItems.filter((product) => product.id !== item.id);
  }

  getPOSSubTotal() {
    if(this.posCartItems) {
      const subTotal = this.posCartItems.reduce((acc, item) => {
        const price = item.discount_price ? item.discount_price : item.price || 0;
        const quantity = item.quantity || 0;
        return acc + (price * quantity);
      }, 0)

      return `$${subTotal.toFixed(2)}`
    }
  }
  
}
