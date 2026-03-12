import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import { PosV2CartService } from '../../services/pos-v2-cart.service';
import { PosV2ApiService } from '../../services/pos-v2-api.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FacturaTirillaComponent } from '../../../components/pos/factura-tirilla/factura-tirilla.component';
import { CrearClienteModalComponent } from '../../../components/ventas/clientes/crear-cliente-modal/crear-cliente-modal.component';
import { ScannerModeComponent } from '../scanner-mode/scanner-mode.component';
import { PosV2Terminal, PosV2CashRegister, PosV2PaymentInfo } from '../../models/pos-v2.models';
import {
  IntegrationsService,
  Integration,
  IntegrationCategory,
} from '../../../components/integrations/integrations.service';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

declare var WidgetCheckout: any;

export type PosMode = 'scanner' | 'catalog';

@Component({
  selector: 'app-pos-v2-pos-shell',
  templateUrl: './pos-shell.component.html',
  styleUrls: ['./pos-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosShellComponent implements OnInit, OnDestroy {

  @ViewChild('scannerInput') scannerInput: ScannerModeComponent;

  isReady$: Observable<boolean>;
  currentTerminal$: Observable<PosV2Terminal | null>;
  cashRegister$: Observable<PosV2CashRegister | null>;
  itemCount$: Observable<number>;

  activeMode: PosMode = 'scanner';
  showTerminalSelector = false;
  showCashRegister = false;
  cashRegisterMode: 'opening' | 'closing' = 'opening';
  showCartBottomSheet = false;
  showPaymentSelector = false;
  showPaymentDialog = false;
  selectedPaymentMethod: 'cash' | 'card' | 'ewallet' | 'transfer' = 'cash';
  selectedCustomPaymentName = '';
  cartTotal = 0;
  isProcessingPayment = false;
  customPaymentMethods: any[] = [];

  // Payment gateways
  paymentIntegrations: Integration[] = [];
  isProcessingGatewayPayment = false;

  // Customer
  selectedCustomer: any = null;
  customerSuggestions: any[] = [];
  isSearchingCustomer = false;

  private destroy$ = new Subject<void>();

  constructor(
    private terminalService: PosV2TerminalService,
    private cartService: PosV2CartService,
    private apiService: PosV2ApiService,
    private maestroService: MaestroService,
    private integrationsService: IntegrationsService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.isReady$ = this.terminalService.isReady$;
    this.currentTerminal$ = this.terminalService.currentTerminal$;
    this.cashRegister$ = this.terminalService.cashRegister$;
    this.itemCount$ = this.cartService.itemCount$;

    this.terminalService.currentTerminal$
      .pipe(takeUntil(this.destroy$))
      .subscribe(terminal => {
        if (!terminal) {
          this.showTerminalSelector = true;
          this.showCashRegister = false;
        } else {
          this.showTerminalSelector = false;
        }
        this.cdr.markForCheck();
      });

    this.terminalService.cashRegister$
      .pipe(takeUntil(this.destroy$))
      .subscribe(register => {
        const terminal = this.terminalService.getTerminalSnapshot();
        if (terminal && (!register || register.status !== 'open')) {
          this.cashRegisterMode = 'opening';
          this.showCashRegister = true;
        } else {
          this.showCashRegister = false;
        }
        this.cdr.markForCheck();
      });

    this.loadCustomPaymentMethods();
    this.loadPaymentIntegrations();
  }

  private loadCustomPaymentMethods(): void {
    this.maestroService.consultarFormaPagoPOS()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (formas: any) => {
          if (Array.isArray(formas)) {
            this.customPaymentMethods = formas;
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.customPaymentMethods = [];
        }
      });
  }

  private loadPaymentIntegrations(): void {
    this.integrationsService
      .getIntegrationsByCategory(IntegrationCategory.PAYMENT)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (integrations) => {
          this.paymentIntegrations = (integrations || []).filter(i => i.enabled);
          this.cdr.markForCheck();
        },
        error: () => {
          this.paymentIntegrations = [];
        },
      });
  }

  selectGatewayPayment(integration: Integration): void {
    if (this.isProcessingGatewayPayment) return;

    this.cartTotal = this.cartService.getTotal();
    if (this.cartTotal <= 0) return;

    this.isProcessingGatewayPayment = true;
    this.showPaymentSelector = false;
    this.cdr.markForCheck();

    const terminal = this.terminalService.getTerminalSnapshot();
    const cashRegister = this.terminalService.getCashRegisterSnapshot();
    const cartItems = this.cartService.getSnapshot();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const asesor = {
      name: user.name || '',
      nombre: user.name || '',
      email: user.email || '',
      nit: user.nit || '',
    };

    const orderPayload = {
      carrito: cartItems,
      cliente: this.selectedCustomer || { documento: '0000000000', nombres_completos: 'Consumidor Final' },
      terminalId: terminal?.id || terminal?.['_id'] || '',
      cashRegisterId: cashRegister?.id || cashRegister?.['_id'] || '',
      paymentMethod: integration.name || integration.provider || 'Pago online',
      paymentDetails: {
        method: 'gateway',
        amount: this.cartTotal,
        change: 0,
        reference: '',
      },
      asesor,
      useOnlinePayment: true,
    };

    this.apiService.createOrder(orderPayload as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const order = res?.order || res;

          if (!order?.pagoInformation?.integridad) {
            this.isProcessingGatewayPayment = false;
            this.cdr.markForCheck();
            Swal.fire({
              title: 'Error',
              text: 'No se pudo preparar el pago online. La orden fue creada como pendiente.',
              icon: 'warning',
              confirmButtonColor: '#7c3aed',
            }).then(() => this.openReceipt(order));
            return;
          }

          const publicKey =
            integration.config?.publicKey ||
            integration.credentials?.publicKey ||
            environment.wompi.public_key;

          const customer = this.selectedCustomer || {};

          try {
            const checkout = new WidgetCheckout({
              currency: 'COP',
              amountInCents: Math.round(this.cartTotal * 100),
              reference: order.nroPedido,
              publicKey,
              signature: { integrity: order.pagoInformation.integridad },
              customerData: {
                fullName: customer.nombres_completos || 'Consumidor Final',
                email: customer.correo_electronico_comprador || '',
                phoneNumber: customer.numero_celular_comprador || '',
                phoneNumberPrefix: '57',
              },
            });

            checkout.open((result: any) => {
              this.isProcessingGatewayPayment = false;
              this.cdr.markForCheck();

              const txStatus = result?.transaction?.status;
              if (txStatus === 'APPROVED') {
                this.openReceipt(order);
              } else {
                Swal.fire({
                  title: 'Pago no completado',
                  text: `Estado: ${txStatus || 'Desconocido'}. La orden ${order.nroPedido} queda pendiente.`,
                  icon: 'warning',
                  confirmButtonColor: '#7c3aed',
                }).then(() => this.newSale());
              }
            });
          } catch (widgetErr) {
            console.error('Error opening payment widget:', widgetErr);
            this.isProcessingGatewayPayment = false;
            this.cdr.markForCheck();
            Swal.fire({
              title: 'Error',
              text: 'No se pudo abrir el widget de pago. Verifique su conexión.',
              icon: 'error',
              confirmButtonColor: '#7c3aed',
            }).then(() => this.openReceipt(order));
          }
        },
        error: (err) => {
          console.error('Error creating POS order for gateway payment:', err);
          this.isProcessingGatewayPayment = false;
          this.cdr.markForCheck();
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear la orden. Intente nuevamente.',
            icon: 'error',
            confirmButtonColor: '#7c3aed',
          });
        },
      });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      if (event.key === 'F2') {
        event.preventDefault();
        this.focusScanner();
      }
      return;
    }

    switch (event.key) {
      case 'F1':
        event.preventDefault();
        this.toggleMode();
        break;
      case 'F2':
        event.preventDefault();
        this.focusScanner();
        break;
      case 'F4':
        event.preventDefault();
        this.openPayment();
        break;
      case 'F8':
        event.preventDefault();
        this.newSale();
        break;
      case 'F9':
        event.preventDefault();
        this.goToReports();
        break;
    }
  }

  toggleMode(): void {
    this.activeMode = this.activeMode === 'scanner' ? 'catalog' : 'scanner';
    this.cdr.markForCheck();
  }

  focusScanner(): void {
    this.activeMode = 'scanner';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.scannerInput?.focusInput();
    });
  }

  openPayment(): void {
    this.cartTotal = this.cartService.getTotal();
    if (this.cartTotal <= 0) return;
    this.showPaymentSelector = true;
    this.showCartBottomSheet = false;
    this.cdr.markForCheck();
  }

  closePaymentSelector(): void {
    this.showPaymentSelector = false;
    this.cdr.markForCheck();
  }

  searchCustomer(event: { query: string }): void {
    const term = event.query?.trim();
    if (!term || term.length < 2) {
      this.customerSuggestions = [];
      return;
    }
    this.isSearchingCustomer = true;
    this.cdr.markForCheck();
    this.maestroService.searchClients(term, 10).subscribe({
      next: (results: any) => {
        this.customerSuggestions = Array.isArray(results) ? results : [];
        this.isSearchingCustomer = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.customerSuggestions = [];
        this.isSearchingCustomer = false;
        this.cdr.markForCheck();
      }
    });
  }

  onCustomerSelect(event: any): void {
    this.selectedCustomer = event;
    this.cdr.markForCheck();
  }

  clearCustomer(): void {
    this.selectedCustomer = null;
    this.customerSuggestions = [];
    this.cdr.markForCheck();
  }

  openCreateCustomerModal(documentoPrellenado?: string): void {
    const modalRef = this.modalService.open(CrearClienteModalComponent, {
      centered: true,
      size: 'xl',
      modalDialogClass: 'create-customers custom-input',
    });

    if (documentoPrellenado) {
      modalRef.componentInstance.documentoPrellenado = documentoPrellenado;
    }

    modalRef.result.then(
      (result) => {
        if (result?.cliente) {
          this.selectedCustomer = result.cliente;
          this.cdr.markForCheck();
          Swal.fire({
            title: 'Cliente asociado',
            text: `${result.cliente.nombres_completos || ''} ${result.cliente.apellidos_completos || ''}`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        }
      },
      () => {},
    );
  }

  editCustomer(): void {
    if (!this.selectedCustomer) return;

    const modalRef = this.modalService.open(CrearClienteModalComponent, {
      centered: true,
      size: 'xl',
      modalDialogClass: 'create-customers custom-input',
    });

    modalRef.componentInstance.clienteData = this.selectedCustomer;
    modalRef.componentInstance.isEdit = true;

    modalRef.result.then(
      (result) => {
        if (result?.cliente) {
          this.selectedCustomer = result.cliente;
          this.cdr.markForCheck();
          Swal.fire({
            title: 'Cliente actualizado',
            text: 'Los datos del cliente han sido actualizados',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        }
      },
      () => {},
    );
  }

  setConsumidorFinal(): void {
    this.selectedCustomer = {
      documento: '0000000000',
      nombres_completos: 'Consumidor Final',
      correo_electronico_comprador: '',
      numero_celular_comprador: ''
    };
    this.cdr.markForCheck();
  }

  getCustomerDisplayName(customer: any): string {
    if (!customer) return '';
    const name = customer.nombres_completos || '';
    const doc = customer.documento || '';
    return doc ? `${name} (${doc})` : name;
  }

  selectPaymentMethod(method: 'cash' | 'card' | 'ewallet' | 'transfer'): void {
    this.selectedPaymentMethod = method;
    this.selectedCustomPaymentName = '';
    this.showPaymentSelector = false;
    this.showPaymentDialog = true;
    this.cdr.markForCheck();
  }

  selectCustomPaymentMethod(metodo: any): void {
    this.selectedCustomPaymentName = metodo.nombre || metodo.name || '';
    this.selectedPaymentMethod = 'card';
    this.showPaymentSelector = false;
    this.showPaymentDialog = true;
    this.cdr.markForCheck();
  }

  closePayment(): void {
    this.showPaymentDialog = false;
    this.cdr.markForCheck();
  }

  onPaymentConfirmed(paymentInfo: PosV2PaymentInfo): void {
    if (this.isProcessingPayment) return;
    this.isProcessingPayment = true;
    this.cdr.markForCheck();

    const terminal = this.terminalService.getTerminalSnapshot();
    const cashRegister = this.terminalService.getCashRegisterSnapshot();
    const cartItems = this.cartService.getSnapshot();

    const methodLabels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      ewallet: 'Nequi/Daviplata',
      transfer: 'Transferencia',
    };

    const paymentLabel = this.selectedCustomPaymentName
      || methodLabels[paymentInfo.method]
      || paymentInfo.method;

    // Obtener asesor (usuario logueado) igual que el POS viejo (UserLite: name, email, nit)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const asesor = {
      name: user.name || '',
      nombre: user.name || '',
      email: user.email || '',
      nit: user.nit || '',
    };

    const orderPayload = {
      carrito: cartItems,
      cliente: this.selectedCustomer || { documento: '0000000000', nombres_completos: 'Consumidor Final' },
      terminalId: terminal?.id || terminal?.['_id'] || '',
      cashRegisterId: cashRegister?.id || cashRegister?.['_id'] || '',
      paymentMethod: paymentLabel,
      paymentDetails: {
        method: paymentInfo.method,
        amount: paymentInfo.amount,
        change: paymentInfo.change || 0,
        reference: paymentInfo.reference || '',
      },
      tipAmount: paymentInfo.tipAmount || 0,
      asesor,
    };

    this.apiService.createOrder(orderPayload as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.showPaymentDialog = false;
          this.isProcessingPayment = false;
          this.cdr.markForCheck();

          const createdOrder = res?.order || res;
          this.openReceipt(createdOrder);
        },
        error: (err) => {
          console.error('Error creating POS order:', err);
          this.isProcessingPayment = false;
          this.showPaymentDialog = false;
          this.cdr.markForCheck();
          this.newSale();
        }
      });
  }

  private openReceipt(order: any): void {
    const modalRef = this.modalService.open(FacturaTirillaComponent, {
      size: 'xl',
      fullscreen: true,
    });
    modalRef.componentInstance.pedido = order;

    modalRef.result.then(
      () => this.newSale(),
      () => this.newSale(),
    );
  }

  newSale(): void {
    this.cartService.clear();
    this.selectedCustomer = null;
    this.customerSuggestions = [];
    this.activeMode = 'scanner';
    this.showPaymentSelector = false;
    this.showPaymentDialog = false;
    this.showCartBottomSheet = false;
    this.cdr.markForCheck();
    setTimeout(() => this.focusScanner());
  }

  onTerminalSelected(): void {
    this.showTerminalSelector = false;
    const register = this.terminalService.getCashRegisterSnapshot();
    if (!register || register.status !== 'open') {
      this.showCashRegister = true;
    }
    this.cdr.markForCheck();
  }

  onCashRegisterOpened(): void {
    this.showCashRegister = false;
    this.cdr.markForCheck();
    setTimeout(() => this.focusScanner());
  }

  toggleCartBottomSheet(): void {
    this.showCartBottomSheet = !this.showCartBottomSheet;
    this.cdr.markForCheck();
  }

  onCloseShift(): void {
    this.cashRegisterMode = 'closing';
    this.showCashRegister = true;
    this.cdr.markForCheck();
  }

  onShiftClosed(): void {
    this.showCashRegister = false;
    this.cdr.markForCheck();
    this.router.navigate(['/pos-v2/report']);
  }

  goToReports(): void {
    this.router.navigate(['/pos-v2/report']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
