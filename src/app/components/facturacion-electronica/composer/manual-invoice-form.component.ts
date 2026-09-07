import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { InvoiceCustomerPickerComponent } from './invoice-customer-picker.component';
import { invoiceTotals, ManualInvoice, PAYMENT_METHODS } from './invoice-composer.models';

@Component({
  selector: 'app-manual-invoice-form',
  templateUrl: './manual-invoice-form.component.html',
  styleUrls: ['./invoice-composer.component.scss'],
})
export class ManualInvoiceFormComponent implements OnDestroy {
  @Input() disabled = false;
  @Input() companyId = '';
  @Output() review = new EventEmitter<ManualInvoice>();
  @Output() saveDraft = new EventEmitter<ManualInvoice>();
  @Output() edited = new EventEmitter<void>();
  @ViewChild(InvoiceCustomerPickerComponent) customerPicker?: InvoiceCustomerPickerComponent;
  paymentMethods = PAYMENT_METHODS;
  attempted = false;
  form = this.fb.group({
    customerId: ['', Validators.required], billingProfile: [-1], addressIndex: [null],
    items: this.fb.array([this.createItem()]),
    payment: this.fb.group({ meansId: ['1', Validators.required], meansCode: ['', Validators.required], dueDate: [''] }),
  });
  private changes: Subscription = this.form.valueChanges.subscribe(() => this.edited.emit());
  constructor(private fb: FormBuilder) {}
  get items(): FormArray { return this.form.get('items') as FormArray; }
  get totals() { return invoiceTotals(this.items.getRawValue()); }
  lineTotal(index: number): number { return invoiceTotals([this.items.at(index).value]).total; }
  lineDiscount(index: number): number { return invoiceTotals([this.items.at(index).value]).discount; }
  get minDate(): string { return new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10); }
  createItem() {
    return this.fb.group({
      description: ['', [Validators.required, Validators.maxLength(300)]], reference: ['', Validators.maxLength(50)],
      quantity: [1, [Validators.required, Validators.min(0.001), Validators.max(1000000)]],
      unitPrice: [null as number | null, [Validators.required, Validators.min(0.01), Validators.max(1000000000)]], taxRate: [null as number | null, Validators.required],
      discountPercent: [0, [Validators.required, Validators.min(0), Validators.max(99.99), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    });
  }
  chooseCustomer(customer: { customerId: string; billingProfile: number; addressIndex?: number } | null): void {
    this.form.patchValue({ customerId: customer?.customerId || '', billingProfile: customer?.billingProfile ?? -1, addressIndex: customer?.addressIndex ?? null });
  }
  addItem(): void { if (!this.disabled && this.items.length < 100) this.items.push(this.createItem()); }
  removeItem(index: number): void { if (!this.disabled && this.items.length > 1) this.items.removeAt(index); }
  changePayment(): void {
    const control = this.form.get('payment.dueDate');
    const credit = this.form.get('payment.meansId')?.value === '2';
    control?.setValidators(credit ? [Validators.required] : []);
    if (!credit) control?.setValue('');
    control?.updateValueAndValidity();
  }
  invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!(control?.invalid && (control.touched || this.attempted));
  }
  reviewInvoice(): void {
    this.attempted = true; this.form.markAllAsTouched();
    if (this.disabled || this.form.invalid) return;
    this.review.emit(this.form.getRawValue() as ManualInvoice);
  }
  storeDraft(): void {
    if (!this.disabled) this.saveDraft.emit(this.form.getRawValue() as ManualInvoice);
  }
  restoreDraft(value: ManualInvoice): void {
    this.attempted = false;
    this.items.clear({emitEvent: false});
    for (const line of value.items?.length ? value.items : [{}]) {
      const item = this.createItem(); item.patchValue(line, {emitEvent: false}); this.items.push(item, {emitEvent: false});
    }
    this.form.patchValue(value, {emitEvent: false});
    this.changePayment(); this.form.markAsPristine();
    if (this.customerPicker) {
      this.customerPicker.reset();
      if (value.customerId) {
        this.customerPicker.billingProfile = value.billingProfile;
        this.customerPicker.addressIndex = value.addressIndex ?? undefined;
        this.customerPicker.refresh(value.customerId, true);
      }
    }
  }
  resetDraft(): void {
    this.attempted = false; this.customerPicker?.reset();
    this.items.clear(); this.items.push(this.createItem());
    this.form.reset({ customerId: '', billingProfile: -1, addressIndex: null, payment: { meansId: '1', meansCode: '', dueDate: '' } });
    this.items.at(0).patchValue({ quantity: 1, reference: '', discountPercent: 0 });
    this.changePayment();
  }
  ngOnDestroy(): void { this.changes.unsubscribe(); }
}
