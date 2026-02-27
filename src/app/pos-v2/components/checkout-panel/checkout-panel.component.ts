import {
  Component,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  ChangeDetectorRef
} from '@angular/core';
import { Observable } from 'rxjs';
import { PosV2CartService } from '../../services/pos-v2-cart.service';
import { PosV2PaymentInfo } from '../../models/pos-v2.models';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';

@Component({
  selector: 'app-pos-v2-checkout-panel',
  templateUrl: './checkout-panel.component.html',
  styleUrls: ['./checkout-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutPanelComponent {
  @Output() orderCompleted = new EventEmitter<any>();
  @Output() back = new EventEmitter<void>();

  total$: Observable<number> = this.cartService.total$;
  subtotal$: Observable<number> = this.cartService.subtotal$;
  tax$: Observable<number> = this.cartService.tax$;

  customerSuggestions: any[] = [];
  selectedCustomer: any = null;
  selectedPaymentMethod: 'cash' | 'card' | 'ewallet' | 'transfer' = 'cash';
  showPaymentDialog = false;

  discountType: 'percentage' | 'fixed' = 'percentage';
  discountValue: number = 0;
  currentTotal: number = 0;

  paymentMethods = [
    { value: 'cash', label: 'Efectivo', icon: 'pi pi-wallet' },
    { value: 'card', label: 'Tarjeta', icon: 'pi pi-credit-card' },
    { value: 'ewallet', label: 'Billetera', icon: 'pi pi-mobile' },
    { value: 'transfer', label: 'Transferencia', icon: 'pi pi-send' }
  ];

  constructor(
    private cartService: PosV2CartService,
    private maestroService: MaestroService,
    private cdr: ChangeDetectorRef
  ) {
    this.total$.subscribe(t => this.currentTotal = t);
  }

  get discountAmount(): number {
    if (!this.discountValue || this.discountValue <= 0) return 0;
    if (this.discountType === 'percentage') {
      const pct = Math.min(this.discountValue, 100);
      return Math.round(this.currentTotal * pct / 100);
    }
    return Math.min(this.discountValue, this.currentTotal);
  }

  get totalAfterDiscount(): number {
    return Math.max(this.currentTotal - this.discountAmount, 0);
  }

  searchCustomer(event: { query: string }): void {
    const term = event.query?.trim();
    if (!term || term.length < 2) {
      this.customerSuggestions = [];
      return;
    }
    this.maestroService.searchClients(term).subscribe({
      next: (results: any) => {
        this.customerSuggestions = Array.isArray(results) ? results : [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.customerSuggestions = [];
        this.cdr.markForCheck();
      }
    });
  }

  onCustomerSelect(event: any): void {
    this.selectedCustomer = event;
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
  }

  setConsumidorFinal(): void {
    this.selectedCustomer = {
      documento: '0000000000',
      nombres_completos: 'Consumidor Final',
      correo_electronico_comprador: '',
      numero_celular_comprador: ''
    };
  }

  selectPaymentMethod(method: 'cash' | 'card' | 'ewallet' | 'transfer'): void {
    this.selectedPaymentMethod = method;
  }

  openPaymentDialog(): void {
    this.showPaymentDialog = true;
  }

  onPaymentCompleted(paymentInfo: PosV2PaymentInfo): void {
    this.showPaymentDialog = false;
    this.orderCompleted.emit({
      customer: this.selectedCustomer,
      payment: paymentInfo,
      discount: {
        type: this.discountType,
        value: this.discountValue,
        amount: this.discountAmount
      }
    });
  }

  onPaymentDialogClosed(): void {
    this.showPaymentDialog = false;
  }

  goBack(): void {
    this.back.emit();
  }

  getCustomerDisplayName(customer: any): string {
    if (!customer) return '';
    const name = customer.nombres_completos || '';
    const doc = customer.documento || '';
    return doc ? `${name} (${doc})` : name;
  }
}
