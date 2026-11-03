import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import { DianInvoiceService } from './dian-invoice.service';
import { InvoiceCustomerPickerComponent } from './invoice-customer-picker.component';
import { CREDIT_TERM_OPTIONS, daysUntilDue, dueDateFromDays, invoiceTotals, ManualInvoice, MAX_CREDIT_DAYS, PAYMENT_METHODS, todayInColombia } from './invoice-composer.models';

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
  readonly paymentIcons: Record<string, string> = { '10': 'pi-money-bill', '42': 'pi-building', '47': 'pi-arrow-right-arrow-left', '48': 'pi-credit-card', '49': 'pi-credit-card' };
  attempted = false;
  readonly termOptions = CREDIT_TERM_OPTIONS;
  readonly maxCreditDays = MAX_CREDIT_DAYS;
  /** Medio de pago que se precargó con el de la última factura del cliente (D-623); '' si lo eligió la persona. */
  recalledMethod = '';
  // IVA que el formulario sugirió por línea (D-623). No es parte del valor del formulario: no viaja al servidor.
  private suggestedTax = new WeakMap<AbstractControl, number>();
  private recalledFor = '';
  private recall?: Subscription;
  form = this.fb.group({
    customerId: ['', Validators.required], billingProfile: [-1], addressIndex: [null],
    items: this.fb.array([this.createItem()]),
    payment: this.fb.group({ meansId: ['1', Validators.required], meansCode: ['', Validators.required], dueDate: [''] }),
  });
  private changes: Subscription = this.form.valueChanges.subscribe(() => this.edited.emit());
  constructor(private fb: FormBuilder, private invoices: DianInvoiceService, private features: CompanyFeaturesService) {}
  /** Bandera `facturaFormularioMejorado` (D-623 fase 1): plazo en días, IVA sugerido y medio de pago recordado. */
  get improved(): boolean { return this.features.isEnabled('facturaFormularioMejorado'); }
  get items(): FormArray { return this.form.get('items') as FormArray; }
  get totals() { return invoiceTotals(this.items.getRawValue()); }
  lineTotal(index: number): number { return invoiceTotals([this.items.at(index).value]).total; }
  lineDiscount(index: number): number { return invoiceTotals([this.items.at(index).value]).discount; }
  get customerDone(): boolean { return !!this.form.get('customerId')?.value; }
  get itemsDone(): boolean { return this.items.length > 0 && this.items.controls.every(item => item.valid) && this.totals.total > 0; }
  get paymentDone(): boolean { return !!this.form.get('payment')?.valid; }
  get isCredit(): boolean { return this.form.get('payment.meansId')?.value === '2'; }
  get meansCode(): string { return String(this.form.get('payment.meansCode')?.value || ''); }
  setMeans(meansId: '1' | '2'): void {
    if (this.disabled) return;
    this.form.get('payment.meansId')?.setValue(meansId);
    this.form.get('payment.meansId')?.markAsTouched();
    this.changePayment();
  }
  setMethod(code: string): void {
    if (this.disabled) return;
    const control = this.form.get('payment.meansCode');
    control?.setValue(code); control?.markAsTouched();
    this.recalledMethod = '';
  }
  get minDate(): string { return todayInColombia(); }
  /** Días de plazo que corresponden al vencimiento escrito (null si no hay o ya pasó). */
  get creditDays(): number | null { return daysUntilDue(this.form.get('payment.dueDate')?.value); }
  /** 'DD/MM/AAAA' del vencimiento, sin pasar por la zona horaria del navegador. */
  get dueDateLabel(): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(this.form.get('payment.dueDate')?.value || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
  }
  get dueDateExpired(): boolean {
    const due = String(this.form.get('payment.dueDate')?.value || '');
    return this.improved && this.isCredit && !!due && due < this.minDate;
  }
  /** Plazo rápido (30, 60, 90) o escrito a mano: calcula el vencimiento con la fecha de hoy en Colombia. */
  setCreditDays(days: unknown): void {
    if (this.disabled) return;
    const control = this.form.get('payment.dueDate');
    control?.setValue(dueDateFromDays(days)); control?.markAsDirty(); control?.markAsTouched();
  }
  private notPast = (control: AbstractControl): ValidationErrors | null => {
    const due = String(control.value || '');
    return due && due < todayInColombia() ? { past: true } : null;
  };
  /** Sugiere el IVA de la última línea con IVA de esta factura; la persona lo puede cambiar. */
  taxSuggested(item: AbstractControl): boolean {
    const suggested = this.suggestedTax.get(item);
    return suggested !== undefined && item.get('taxRate')?.value === suggested;
  }
  clearSuggestion(item: AbstractControl): void { this.suggestedTax.delete(item); }
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
    if (customer?.customerId) this.recallPaymentMethod(customer.customerId);
    else this.dropRecalledMethod();
  }
  /** Quita el medio de pago solo si venía de la precarga (nunca el que la persona eligió) y cancela la consulta en vuelo. */
  private dropRecalledMethod(): void {
    this.recall?.unsubscribe();
    const control = this.form.get('payment.meansCode');
    if (this.recalledMethod && control?.value === this.recalledMethod) control.setValue('');
    this.recalledMethod = ''; this.recalledFor = '';
  }
  /** D-623: precarga el medio de pago de la última factura aceptada de este cliente, solo si la persona aún no eligió uno. */
  private recallPaymentMethod(customerId: string): void {
    if (!this.improved || this.disabled || customerId === this.recalledFor) return;
    const control = this.form.get('payment.meansCode');
    const autoFilled = !!this.recalledMethod && control?.value === this.recalledMethod;
    this.recalledFor = customerId;
    if (control?.value && !autoFilled) return;
    // El medio precargado era del cliente anterior: se quita antes de preguntar, para que ni la espera ni un error
    // (403, 429, tiempo agotado) dejen el medio de otro cliente con el aviso «recordado».
    this.dropRecalledMethod(); this.recalledFor = customerId;
    this.recall = this.invoices.lastPaymentMethod(customerId).subscribe({
      next: ({ meansCode }) => {
        if (this.form.get('customerId')?.value !== customerId) return;
        const current = control?.value;
        if (current && !(this.recalledMethod && current === this.recalledMethod)) return;
        const known = this.paymentMethods.some(method => method.code === meansCode);
        control?.setValue(known ? meansCode : '');
        this.recalledMethod = known ? String(meansCode) : '';
      },
      error: () => { /* Solo es una ayuda: el medio ya quedó vacío y obligatorio, y la persona lo elige. */ },
    });
  }
  addItem(): void {
    if (this.disabled || this.items.length >= 100) return;
    const item = this.createItem();
    if (this.improved) {
      const last = [...this.items.controls].reverse().map(line => line.get('taxRate')?.value).find(rate => [0, 5, 19].includes(rate));
      if (last !== undefined) { item.patchValue({ taxRate: last }, { emitEvent: false }); this.suggestedTax.set(item, last); }
    }
    this.items.push(item);
  }
  removeItem(index: number): void { if (!this.disabled && this.items.length > 1) this.items.removeAt(index); }
  changePayment(): void {
    const control = this.form.get('payment.dueDate');
    const credit = this.form.get('payment.meansId')?.value === '2';
    control?.setValidators(credit ? (this.improved ? [Validators.required, this.notPast] : [Validators.required]) : []);
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
    this.attempted = false; this.recall?.unsubscribe(); this.recalledFor = ''; this.recalledMethod = '';
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
    this.recall?.unsubscribe(); this.recalledFor = ''; this.recalledMethod = '';
    this.items.clear(); this.items.push(this.createItem());
    this.form.reset({ customerId: '', billingProfile: -1, addressIndex: null, payment: { meansId: '1', meansCode: '', dueDate: '' } });
    this.items.at(0).patchValue({ quantity: 1, reference: '', discountPercent: 0 });
    this.changePayment();
  }
  ngOnDestroy(): void { this.changes.unsubscribe(); this.recall?.unsubscribe(); }
}
