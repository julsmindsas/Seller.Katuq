import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { PosV2ApiService } from '../../services/pos-v2-api.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import { PosV2ReturnReason } from '../../models/pos-v2.models';

interface ReturnableItem {
  cartItemId: string;
  productName: string;
  productRef: string;
  quantity: number;
  maxQuantity: number;
  unitPrice: number;
  selected: boolean;
}

@Component({
  selector: 'app-pos-v2-return-dialog',
  templateUrl: './return-dialog.component.html',
  styleUrls: ['./return-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReturnDialogComponent {
  @Input() visible = false;
  @Output() created = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  // Step 1: Search order
  orderSearchQuery = '';
  searchLoading = false;
  orderFound: any = null;
  searchError = '';

  // Step 2: Select items
  returnableItems: ReturnableItem[] = [];

  // Step 3: Reason
  selectedReason: PosV2ReturnReason = 'defective';
  reasons = [
    { value: 'defective', label: 'Defectuoso' },
    { value: 'exchange', label: 'Cambio' },
    { value: 'regret', label: 'Arrepentimiento' },
    { value: 'price_error', label: 'Error de precio' },
    { value: 'other', label: 'Otro' }
  ];
  notes = '';

  submitting = false;

  constructor(
    private apiService: PosV2ApiService,
    private terminalService: PosV2TerminalService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  searchOrder(): void {
    if (!this.orderSearchQuery.trim()) return;
    this.searchLoading = true;
    this.searchError = '';
    this.orderFound = null;
    this.returnableItems = [];
    this.cdr.markForCheck();

    this.apiService.getOrderByNumber(this.orderSearchQuery.trim()).subscribe({
      next: (found: any) => {
        if (found) {
          this.orderFound = found;
          this.returnableItems = (found.carrito || []).map((item: any) => ({
            cartItemId: item.cartItemId || item._id,
            productName: item.producto?.crearProducto?.titulo || item.product?.crearProducto?.titulo || 'Producto',
            productRef: item.producto?.crearProducto?.referencia || item.product?.crearProducto?.referencia || '',
            quantity: 1,
            maxQuantity: item.cantidad || item.quantity || 1,
            unitPrice: item.precioUnitarioConIva || item.unitPriceWithTax || item.unitPrice || 0,
            selected: false
          }));
        } else {
          this.searchError = 'Orden no encontrada';
        }
        this.searchLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.searchError = 'Error al buscar la orden';
        this.searchLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get selectedItems(): ReturnableItem[] {
    return this.returnableItems.filter(i => i.selected);
  }

  get totalRefund(): number {
    return this.selectedItems.reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0);
  }

  get canSubmit(): boolean {
    return this.selectedItems.length > 0 && !!this.selectedReason;
  }

  submitReturn(): void {
    if (!this.canSubmit || this.submitting) return;
    this.submitting = true;
    this.cdr.markForCheck();

    const terminal = this.terminalService.getTerminalSnapshot();
    const register = this.terminalService.getCashRegisterSnapshot();

    const returnData = {
      orderId: this.orderFound._id,
      orderNumber: this.orderFound.nroPedido,
      items: this.selectedItems.map(i => ({
        cartItemId: i.cartItemId,
        quantity: i.quantity
      })),
      reason: this.selectedReason,
      notes: this.notes,
      totalRefunded: this.totalRefund,
      terminalId: terminal?.id || '',
      cashRegisterId: register?.id || ''
    };

    this.apiService.createReturn(returnData).subscribe({
      next: (response: any) => {
        this.submitting = false;
        const msg = response?.msg || 'Devolucion procesada exitosamente';
        this.toastr.success(msg, 'Devolucion');
        this.resetForm();
        this.created.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.submitting = false;
        this.toastr.error('Error al procesar la devolucion', 'Error');
        this.cdr.markForCheck();
      }
    });
  }

  onClose(): void {
    this.resetForm();
    this.closed.emit();
  }

  updateItemQuantity(item: ReturnableItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty >= 1 && newQty <= item.maxQuantity) {
      item.quantity = newQty;
      this.cdr.markForCheck();
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private resetForm(): void {
    this.orderSearchQuery = '';
    this.orderFound = null;
    this.returnableItems = [];
    this.selectedReason = 'defective';
    this.notes = '';
    this.searchError = '';
  }
}
