import { Component, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { PosV2CartService } from '../../services/pos-v2-cart.service';

@Component({
  selector: 'app-pos-v2-cart-fab',
  templateUrl: './cart-fab.component.html',
  styleUrls: ['./cart-fab.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartFabComponent {
  @Output() fabClicked = new EventEmitter<void>();

  itemCount$: Observable<number> = this.cartService.itemCount$;
  total$: Observable<number> = this.cartService.total$;
  isEmpty$: Observable<boolean> = this.cartService.isEmpty$;

  constructor(private cartService: PosV2CartService) {}

  onTap(): void {
    this.fabClicked.emit();
  }
}
