import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { PosV2PaymentInfo } from '../../models/pos-v2.models';

@Component({
  selector: 'app-pos-v2-payment-dialog',
  templateUrl: './payment-dialog.component.html',
  styleUrls: ['./payment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() paymentMethod: 'cash' | 'card' | 'ewallet' | 'transfer' = 'cash';
  @Input() total = 0;

  @Output() confirmed = new EventEmitter<PosV2PaymentInfo>();
  @Output() closed = new EventEmitter<void>();

  amountReceived: number | null = null;
  transactionReference = '';
  tipAmount: number = 0;

  quickAmounts = [10000, 20000, 50000, 100000];
  quickTipPercentages = [10, 15, 20];

  get change(): number {
    if (this.paymentMethod !== 'cash' || !this.amountReceived) return 0;
    return this.amountReceived - this.total;
  }

  get canConfirm(): boolean {
    switch (this.paymentMethod) {
      case 'cash':
        return !!this.amountReceived && this.amountReceived >= this.total;
      case 'card':
      case 'ewallet':
      case 'transfer':
        return this.transactionReference.trim().length > 0;
      default:
        return false;
    }
  }

  get dialogTitle(): string {
    switch (this.paymentMethod) {
      case 'cash': return 'Pago en efectivo';
      case 'card': return 'Pago con tarjeta';
      case 'ewallet': return 'Pago con billetera';
      case 'transfer': return 'Pago por transferencia';
      default: return 'Pago';
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.visible && changes.visible.currentValue) {
      this.resetForm();
    }
  }

  setQuickAmount(amount: number): void {
    this.amountReceived = amount;
  }

  setExactAmount(): void {
    this.amountReceived = this.total;
  }

  setTipPercentage(pct: number): void {
    this.tipAmount = Math.round(this.total * pct / 100);
  }

  clearTip(): void {
    this.tipAmount = 0;
  }

  onConfirm(): void {
    if (!this.canConfirm) return;

    const paymentInfo: PosV2PaymentInfo = {
      method: this.paymentMethod,
      amount: this.paymentMethod === 'cash' ? (this.amountReceived || this.total) : this.total,
      change: this.paymentMethod === 'cash' ? this.change : 0,
      reference: this.paymentMethod !== 'cash' ? this.transactionReference.trim() : undefined,
      tipAmount: this.tipAmount
    };

    this.confirmed.emit(paymentInfo);
  }

  onClose(): void {
    this.closed.emit();
  }

  private resetForm(): void {
    this.amountReceived = null;
    this.transactionReference = '';
    this.tipAmount = 0;
  }
}
