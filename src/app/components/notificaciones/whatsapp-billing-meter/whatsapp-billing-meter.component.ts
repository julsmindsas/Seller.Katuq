import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

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
    private toastr: ToastrService
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
          this.errorMessage = 'No se pudo cargar el saldo de WhatsApp.';
          this.toastr.error(err?.error?.message || 'Error al consultar el saldo', 'Notificaciones');
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
      return 'Tu cuenta está en proceso de cierre. Recarga saldo para reactivar los envíos.';
    }
    return 'Tu saldo está por debajo del 20% del histórico. Considera recargar para evitar interrupciones.';
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
      this.toastr.warning(`La recarga mínima es $${this.minTopupAmount.toLocaleString('es-CO')}`, 'Recarga');
      return;
    }
    if (typeof WidgetCheckout === 'undefined') {
      this.toastr.error('No se pudo cargar la pasarela de pago. Recarga la página e intenta de nuevo.', 'Recarga');
      return;
    }

    this.isToppingUp = true;
    this.topupStatusMsg = 'Abriendo la pasarela de pago…';
    const channel = this.topupChannel;
    const saldoAntes = channel === 'sms'
      ? (this.smsBalance?.balanceCOP || 0)
      : (this.balance?.balanceCOP || 0);

    this.billingService.topupCheckout(channel, amount)
      .pipe(takeUntil(this.destroy$), finalize(() => this.isToppingUp = false))
      .subscribe({
        next: (co) => {
          if (!co?.success || !co.reference) {
            this.toastr.error('No se pudo iniciar la recarga.', 'Recarga');
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
            this.topupStatusMsg = 'Completa el pago en la ventana de Wompi…';
            checkout.open((result: any) => {
              const tx = result?.transaction;
              if (tx && tx.status === 'APPROVED') {
                this.topupStatusMsg = 'Pago aprobado ✓ Acreditando tu saldo…';
                this.pollBalance(channel, saldoAntes, 0);
              } else if (tx && tx.status === 'DECLINED') {
                this.topupStatusMsg = '';
                this.toastr.warning('El pago fue rechazado.', 'Recarga');
              } else {
                // Cerró sin completar o pendiente.
                this.topupStatusMsg = 'Si completaste el pago, tu saldo se acreditará en unos segundos.';
                this.pollBalance(channel, saldoAntes, 0);
              }
            });
          } catch (e) {
            this.toastr.error('No se pudo abrir la pasarela de pago.', 'Recarga');
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Error iniciando la recarga', 'Recarga');
        }
      });
  }

  /** Sondea el saldo hasta que aumente (webhook acredita async). Máx ~30s. */
  private pollBalance(channel: 'whatsapp' | 'sms', saldoAntes: number, intento: number): void {
    if (intento > 10) {
      this.topupStatusMsg = '';
      this.toastr.info('Tu recarga puede tardar unos segundos en reflejarse. Actualiza si no la ves.', 'Recarga');
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
          this.toastr.success('¡Saldo recargado! 🎉', channel === 'sms' ? 'SMS' : 'WhatsApp');
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
            this.toastr.success('Bonus de bienvenida activado', 'WhatsApp Business');
            this.loadBalance();
          } else {
            this.toastr.error(res?.message || 'No se pudo activar el bonus', 'WhatsApp Business');
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Error activando el bonus', 'WhatsApp Business');
        }
      });
  }
}
