import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CartSingletonService } from 'src/app/shared/services/ventas/cart.singleton.service';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  public openCart: boolean = false;
  public cartData: any = [];
  totalCarrito: number = 0;

  constructor(private cartService: CartSingletonService
  ) { }

  ngOnInit() {
    this.cartService.productInCart
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.cartData = data;
        this.totalCarrito = this.cartData.reduce((acc, item) => acc + (item?.producto?.precio?.precioUnitarioConIva || 0), 0);
      });
  }



  // For Mobile Device
  toggleCart() {
    this.openCart = !this.openCart;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
