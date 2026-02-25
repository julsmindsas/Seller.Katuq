import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  Output,
  EventEmitter
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CartService } from '../../../../../shared/services/cart.service';
import { InventarioService } from '../../../../../shared/services/inventarios/inventario.service';
import { PosFeedbackService } from '../../../../../shared/services/pos-feedback.service';

interface ScannedEntry {
  title: string;
  barcode: string;
  price: number;
  quantity: number;
  timestamp: Date;
  success: boolean;
}

@Component({
  selector: 'app-scanner-mode',
  templateUrl: './scanner-mode.component.html',
  styleUrls: ['./scanner-mode.component.scss']
})
export class ScannerModeComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;
  @Output() productAdded = new EventEmitter<void>();

  barcodeValue = '';
  isProcessing = false;
  lastError = '';
  scanLog: ScannedEntry[] = [];
  bodegaId: string | null = null;
  private refocusEnabled = true;
  private subscriptions: Subscription[] = [];

  constructor(
    public cartService: CartService,
    private inventarioService: InventarioService,
    private feedback: PosFeedbackService
  ) {}

  ngOnInit(): void {
    // Get warehouse from localStorage
    const warehouse = JSON.parse(localStorage.getItem('warehousePOS') || 'null');
    this.bodegaId = warehouse?.idBodega || null;
  }

  ngAfterViewInit(): void {
    this.focusInput();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  /** Re-focus input on any document click (unless a modal is open) */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.refocusEnabled) return;
    const target = event.target as HTMLElement;
    // Don't steal focus from modals or other inputs
    if (target.closest('.modal') || target.closest('.swal2-container')) {
      return;
    }
    setTimeout(() => this.focusInput(), 50);
  }

  focusInput(): void {
    if (this.barcodeInput?.nativeElement) {
      this.barcodeInput.nativeElement.focus();
    }
  }

  /** Disable refocus (called when payment modal opens) */
  disableRefocus(): void {
    this.refocusEnabled = false;
  }

  /** Enable refocus (called when payment modal closes) */
  enableRefocus(): void {
    this.refocusEnabled = true;
    this.focusInput();
  }

  /** Handle barcode scan (Enter key) */
  onBarcodeEnter(): void {
    const barcode = this.barcodeValue.trim();
    if (!barcode || this.isProcessing) return;

    if (!this.bodegaId) {
      this.lastError = 'Selecciona una bodega primero';
      this.feedback.playBeepError();
      this.barcodeValue = '';
      return;
    }

    this.isProcessing = true;
    this.lastError = '';

    // First try local search in already-loaded cart items or products
    this.inventarioService.buscarProductoPorBarcode(this.bodegaId, barcode).subscribe({
      next: (response) => {
        if (response?.producto) {
          const product = response.producto;
          const added = this.cartService.addByBarcode(product);

          if (added) {
            this.feedback.playBeepSuccess();
            this.scanLog.unshift({
              title: product.crearProducto?.titulo || 'Producto',
              barcode: barcode,
              price: product.precio?.precioUnitarioConIva || 0,
              quantity: 1,
              timestamp: new Date(),
              success: true
            });
            this.productAdded.emit();
          } else {
            this.feedback.playBeepWarning();
            this.lastError = `Sin stock: ${product.crearProducto?.titulo}`;
            this.scanLog.unshift({
              title: product.crearProducto?.titulo || 'Producto',
              barcode: barcode,
              price: 0,
              quantity: 0,
              timestamp: new Date(),
              success: false
            });
          }
        }

        // Keep only last 20 entries
        if (this.scanLog.length > 20) {
          this.scanLog = this.scanLog.slice(0, 20);
        }

        this.barcodeValue = '';
        this.isProcessing = false;
        this.focusInput();
      },
      error: (err) => {
        this.feedback.playBeepError();
        this.lastError = err.status === 404
          ? `No encontrado: ${barcode}`
          : 'Error de conexion';
        this.scanLog.unshift({
          title: 'No encontrado',
          barcode: barcode,
          price: 0,
          quantity: 0,
          timestamp: new Date(),
          success: false
        });
        this.barcodeValue = '';
        this.isProcessing = false;
        this.focusInput();
      }
    });
  }

  /** Update warehouse when changed externally */
  updateWarehouse(bodegaId: string): void {
    this.bodegaId = bodegaId;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
