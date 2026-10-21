import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

import {
  NotifSmsBalance,
  WhatsappBalance,
  WhatsappBillingService
} from '../../../shared/services/notifications/whatsapp-billing.service';

/** Widget de Wompi cargado globalmente en index.html (checkout.wompi.co/widget.js). */
declare var WidgetCheckout: any;

@Component({
  selector: 'app-whatsapp-billing-meter',
  templateUrl: './whatsapp-billing-meter.component.html',
  styleUrls: ['./whatsapp-billing-meter.component.scss']
})
export class WhatsappBillingMeterComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  /** Estado de carga del saldo WhatsApp. */
  public isLoading = true;
  public errorMessage: string | null = null;
  public balance: WhatsappBalance | null = null;

  /** [D-106] Saldo SMS (separado). */
  public smsBalance: NotifSmsBalance | null = null;
  public isLoadingSms = true;

  /** Modal de recarga. */
  public showTopupModal = false;
  public topupChannel: 'whatsapp' | 'sms' = 'whatsapp';
  public topupAmount: number | null = 50000;
  public isToppingUp = false;
  /** Mensaje de estado post-checkout ("procesando tu pago…"). */
  public topupStatusMsg = '';
  public isClaimingBonus = false;
  public readonly minTopupAmount = 50000;

  constructor(
    private billingService: WhatsappBillingService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    this.loadBalance();
    this.loadSmsBalance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public loadBalance(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.billingService.getBalance()
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoading = false))
      .subscribe({
        next: (data) => { this.balance = data; },
        error: (err) => {
          this.errorMessage = this.translate.instant('notificaciones.billing.loadError');
          this.toastr.error(err?.error?.message || this.translate.instant('notificaciones.billing.balanceError'), this.translate.instant('notificaciones.page.title'));
        }
      });
  }

  public loadSmsBalance(): void {
    this.isLoadingSms = true;
    this.billingService.getSmsBalance()
      .pipe(takeUntil(this.destroy$), finalize(() => this.isLoadingSms = false))
      .subscribe({
        next: (data) => { this.smsBalance = data; },
        error: () => { this.smsBalance = null; }
      });
  }

  public get equivalentMessages(): number {
    if (!this.balance) return 0;
    const price = this.balance.priceCOP || 0;
    if (price <= 0) return 0;
    return Math.floor((this.balance.balanceCOP || 0) / price);
  }

  public get smsEquivalentMessages(): number {
    if (!this.smsBalance) return 0;
    const price = this.smsBalance.priceCOP || 0;
    if (price <= 0) return 0;
    return Math.floor((this.smsBalance.balanceCOP || 0) / price);
  }

  public get showLowBalanceBanner(): boolean {
    if (!this.balance) return false;
    if (this.balance.accountStatus === 'closing') return true;
    const max = this.balance.historicalMaxBalanceCOP || 0;
    if (max <= 0) return false;
    return (this.balance.balanceCOP || 0) < (max * 0.2);
  }

  public get lowBalanceMessage(): string {
    if (!this.balance) return '';
    if (this.balance.accountStatus === 'closing') {
      return 'notificaciones.billing.accountClosing';
    }
    return 'notificaciones.billing.lowBalance';
  }

  // --- Recarga con Wompi ---------------------------------------------------

  public openTopupModal(channel: 'whatsapp' | 'sms'): void {
    this.topupChannel = channel;
    this.topupAmount = this.minTopupAmount;
    this.topupStatusMsg = '';
    this.showTopupModal = true;
  }

  public closeTopupModal(): void {
    if (this.isToppingUp) return;
    this.showTopupModal = false;
  }

  /**
   * [D-106] Recarga REAL: pide al backend la firma de integridad Wompi, abre el
   * WidgetCheckout de la plataforma (Julsmind cobra) y, al cerrar, sondea el
   * saldo — que el webhook acredita de forma asíncrona tras confirmar el pago.
   */
  public confirmTopup(): void {
    if (this.isToppingUp) return;
    const amount = Number(this.topupAmount);
    if (!amount || isNaN(amount) || amount < this.minTopupAmount) {
      this.toastr.warning(this.translate.instant('notificaciones.billing.minTopup', { amount: this.minTopupAmount.toLocaleString('es-CO') }), this.translate.instant('notificaciones.billing.toastTitle'));
      return;
    }
    if (typeof WidgetCheckout === 'undefined') {
      this.toastr.error(this.translate.instant('notificaciones.billing.gatewayLoadError'), this.translate.instant('notificaciones.billing.toastTitle'));
      return;
    }

    this.isToppingUp = true;
    this.topupStatusMsg = this.translate.instant('notificaciones.billing.openingGateway');
    const channel = this.topupChannel;
    const saldoAntes = channel === 'sms'
      ? (this.smsBalance?.balanceCOP || 0)
      : (this.balance?.balanceCOP || 0);

    this.billingService.topupCheckout(channel, amount)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isToppingUp = false))
      .subscribe({
        next: (co) => {
          if (!co?.success || !co.reference) {
            this.toastr.error(this.translate.instant('notificaciones.billing.startError'), this.translate.instant('notificaciones.billing.toastTitle'));
            return;
          }
          try {
            const checkout = new WidgetCheckout({
              currency: co.currency || 'COP',
              amountInCents: co.amountInCents,
              reference: co.reference,
              publicKey: co.publicKey,
              signature: { integrity: co.integrity },
            });
            this.topupStatusMsg = this.translate.instant('notificaciones.billing.completeInWompi');
            checkout.open((result: any) => {
              const tx = result?.transaction;
              if (tx && tx.status === 'APPROVED') {
                this.topupStatusMsg = this.translate.instant('notificaciones.billing.paymentApproved');
                this.pollBalance(channel, saldoAntes, 0);
              } else if (tx && tx.status === 'DECLINED') {
                this.topupStatusMsg = '';
                this.toastr.warning(this.translate.instant('notificaciones.billing.paymentDeclined'), this.translate.instant('notificaciones.billing.toastTitle'));
              } else {
                // Cerró sin completar o pendiente.
                this.topupStatusMsg = this.translate.instant('notificaciones.billing.paymentPending');
                this.pollBalance(channel, saldoAntes, 0);
              }
            });
          } catch (e) {
            this.toastr.error(this.translate.instant('notificaciones.billing.gatewayOpenError'), this.translate.instant('notificaciones.billing.toastTitle'));
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || this.translate.instant('notificaciones.billing.topupError'), this.translate.instant('notificaciones.billing.toastTitle'));
        }
      });
  }

  /** Sondea el saldo hasta que aumente (webhook acredita async). Máx ~30s. */
  private pollBalance(channel: 'whatsapp' | 'sms', saldoAntes: number, intento: number): void {
    if (intento > 10) {
      this.topupStatusMsg = '';
      this.toastr.info(this.translate.instant('notificaciones.billing.topupDelay'), this.translate.instant('notificaciones.billing.toastTitle'));
      return;
    }
    const check$: Observable<any> = channel === 'sms'
      ? this.billingService.getSmsBalance()
      : this.billingService.getBalance();
    check$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (data: any) => {
        const nuevo = Number(data?.balanceCOP || 0);
        if (nuevo > saldoAntes) {
          if (channel === 'sms') this.smsBalance = data; else this.balance = data;
          this.topupStatusMsg = '';
          this.showTopupModal = false;
          this.toastr.success(this.translate.instant('notificaciones.billing.toppedUp'), channel === 'sms' ? 'SMS' : 'WhatsApp'); // i18n-ignorar: nombre del canal
        } else {
          setTimeout(() => this.pollBalance(channel, saldoAntes, intento + 1), 3000);
        }
      },
      error: () => setTimeout(() => this.pollBalance(channel, saldoAntes, intento + 1), 3000),
    });
  }

  public claimWelcomeBonus(): void {
    if (this.isClaimingBonus) return;
    this.isClaimingBonus = true;
    this.billingService.requestWelcomeBonus()
      .pipe(takeUntil(this.destroy$), finalize(() => this.isClaimingBonus = false))
      .subscribe({
        next: (res) => {
          if (res?.success) {
            this.toastr.success(this.translate.instant('notificaciones.billing.bonusActivated'), this.translate.instant('notificaciones.billing.whatsappBusiness'));
            this.loadBalance();
          } else {
            this.toastr.error(res?.message || this.translate.instant('notificaciones.billing.bonusError'), this.translate.instant('notificaciones.billing.whatsappBusiness'));
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || this.translate.instant('notificaciones.billing.bonusRequestError'), this.translate.instant('notificaciones.billing.whatsappBusiness'));
        }
      });
  }
}
