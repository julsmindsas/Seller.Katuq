import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  HostListener
} from '@angular/core';

@Component({
  selector: 'app-pos-v2-cart-bottom-sheet',
  templateUrl: './cart-bottom-sheet.component.html',
  styleUrls: ['./cart-bottom-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartBottomSheetComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() openPayment = new EventEmitter<void>();

  onBackdropClick(): void {
    this.closed.emit();
  }

  onSheetClick(event: Event): void {
    event.stopPropagation();
  }

  onCheckout(): void {
    this.openPayment.emit();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isOpen) {
      this.closed.emit();
    }
  }
}
