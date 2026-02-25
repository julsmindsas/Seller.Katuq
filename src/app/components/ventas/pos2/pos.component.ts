import {
  Component,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';

import { ProductComponent } from './widgets/product/product.component';
import { ScannerModeComponent } from './widgets/scanner-mode/scanner-mode.component';
import { WarehouseSelectorComponent } from './widgets/warehouse-selector/warehouse-selector';
import { CashClosingComponent } from './widgets/cash-closing/cash-closing.component';
import { CashClosingHistoryComponent } from './widgets/cash-closing-history/cash-closing-history.component';
import { CartService } from '../../../shared/services/cart.service';
import { PosCheckoutService } from '../../../shared/services/ventas/pos-checkout.service';
import { PosFeedbackService } from '../../../shared/services/pos-feedback.service';

@Component({
  selector: 'app-pos',
  templateUrl: './pos.component.html',
  styleUrls: ['./pos.component.scss']
})
export class PosComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(ProductComponent) productComponent: ProductComponent;
  @ViewChild(ScannerModeComponent) scannerComponent: ScannerModeComponent;
  @ViewChild(WarehouseSelectorComponent) warehouseSelectorComponent: WarehouseSelectorComponent;

  // Mode toggle: 'scanner' or 'catalog'
  activeMode: 'scanner' | 'catalog' = 'catalog';

  // Mobile cart bottom sheet
  showMobileCart = false;

  // Observables for template
  posItemCount$ = this.cartService.posItemCount$;
  posSubTotalFormatted$ = this.cartService.posSubTotalFormatted$;

  private subscriptions: Subscription[] = [];

  constructor(
    private modal: NgbModal,
    public cartService: CartService,
    private checkoutService: PosCheckoutService,
    private feedback: PosFeedbackService
  ) {}

  ngOnInit(): void {
    // Restore mode from localStorage
    const savedMode = localStorage.getItem('posMode');
    if (savedMode === 'scanner' || savedMode === 'catalog') {
      this.activeMode = savedMode;
    }

    // Sync company data for receipts
    const currentCompanyStr = localStorage.getItem('currentCompany');
    if (currentCompanyStr) {
      sessionStorage.setItem('currentCompany', currentCompanyStr);
    }

    this.limpiarDatos();
  }

  ngAfterViewInit(): void {
    const initialBodega = JSON.parse(localStorage.getItem('warehousePOS')!);
    const initialBodegaId = initialBodega?.idBodega;

    if (this.productComponent && initialBodegaId) {
      this.productComponent.obtenerProductos(initialBodegaId);
    }

    if (this.scannerComponent && initialBodegaId) {
      this.scannerComponent.updateWarehouse(initialBodegaId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  // --- Keyboard Shortcuts ---
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Don't capture if a modal is open
    if (document.querySelector('.modal.show') || document.querySelector('.swal2-container')) {
      return;
    }

    switch (event.key) {
      case 'F2':
        event.preventDefault();
        this.checkoutService.openPaymentFlow('Efectivo');
        break;
      case 'F4':
        event.preventDefault();
        this.toggleMode();
        break;
      case 'F5':
        event.preventDefault();
        this.nuevaVenta();
        this.feedback.playDoubleBeep();
        break;
      case 'F8':
        event.preventDefault();
        this.focusSearch();
        break;
      case 'Escape':
        if (this.showMobileCart) {
          this.showMobileCart = false;
        } else {
          this.focusSearch();
        }
        break;
    }
  }

  // --- Mode Toggle ---
  toggleMode(): void {
    this.activeMode = this.activeMode === 'scanner' ? 'catalog' : 'scanner';
    localStorage.setItem('posMode', this.activeMode);

    // Focus appropriate input after toggle
    setTimeout(() => {
      if (this.activeMode === 'scanner' && this.scannerComponent) {
        this.scannerComponent.focusInput();
      }
    }, 100);
  }

  setMode(mode: 'scanner' | 'catalog'): void {
    this.activeMode = mode;
    localStorage.setItem('posMode', this.activeMode);
  }

  // --- Mobile Cart ---
  toggleMobileCart(): void {
    this.showMobileCart = !this.showMobileCart;
  }

  closeMobileCart(): void {
    this.showMobileCart = false;
  }

  // --- Warehouse ---
  onWarehouseChanged(): void {
    const bodegaSeleccionada = JSON.parse(localStorage.getItem('warehousePOS')!);
    const bodegaId = bodegaSeleccionada?.idBodega;

    if (this.productComponent) {
      this.productComponent.obtenerProductos(bodegaId);
    }
    if (this.scannerComponent) {
      this.scannerComponent.updateWarehouse(bodegaId);
    }
  }

  // --- Actions ---
  private limpiarDatos(): void {
    this.cartService.clearCart();
    this.checkoutService.clearCustomer();
    localStorage.removeItem('selectedCustomerPOS');
    localStorage.removeItem('tempOrderData');
  }

  nuevaVenta(): void {
    this.limpiarDatos();
    this.showMobileCart = false;
  }

  private focusSearch(): void {
    if (this.activeMode === 'scanner' && this.scannerComponent) {
      this.scannerComponent.focusInput();
    } else if (this.productComponent?.searchInput?.nativeElement) {
      this.productComponent.searchInput.nativeElement.focus();
    }
  }

  // --- Cash Closing ---
  openCashClosingModal(): void {
    this.modal.open(CashClosingComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
  }

  openCashClosingHistoryModal(): void {
    this.modal.open(CashClosingHistoryComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });
  }
}
