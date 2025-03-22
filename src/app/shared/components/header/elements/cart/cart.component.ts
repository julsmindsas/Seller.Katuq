import { Component, OnInit, OnDestroy } from '@angular/core';
import { CartSingletonService } from 'src/app/shared/services/ventas/cart.singleton.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {

  public openCart: boolean = false;
  public cartData: any = [];
  totalCarrito: number = 0;

  constructor(private cartService: CartSingletonService
  ) { }

  ngOnInit() {
    this.cartService.productInCart.subscribe(data => {
      this.cartData = data;
      this.totalCarrito = this.cartData.reduce((acc, item) => acc + item?.producto.precio?.precioUnitarioConIva, 0);
    });

  }



  // For Mobile Device
  toggleCart() {
    this.openCart = !this.openCart;
  }
}
