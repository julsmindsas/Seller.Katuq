import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import {
  WhatsappBalance,
  WhatsappBillingService
} from '../../../shared/services/notifications/whatsapp-billing.service';

@Component({
  selector: 'app-whatsapp-billing-meter',
  templateUrl: './whatsapp-billing-meter.component.html',
  styleUrls: ['./whatsapp-billing-meter.component.scss']
})
export class WhatsappBillingMeterComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  /** Estado de carga del saldo principal. */
  public isLoading = true;
  /** Error al cargar saldo. */
  public errorMessage: string | null = null;
  /** Saldo + KPIs. */
  public balance: WhatsappBalance | null = null;

  /** Modal de recarga visible. */
  public showTopupModal = false;
  /** Monto en COP para recargar. */
  public topupAmount: number | null = 50000;
  /** Notas opcionales. */
  public topupNotes = '';
  /** Estado de envío de la recarga. */
  public isToppingUp = false;
  /** Estado de envío del bonus de bienvenida. */
  public isClaimingBonus = false;
  /** Monto mínimo para primera recarga. */
  public readonly minTopupAmount = 50000;

  constructor(
    private billingService: WhatsappBillingService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadBalance();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Carga el saldo y KPIs. */
  public loadBalance(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.billingService.getBalance()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (data) => {
          this.balance = data;
        },
        error: (err) => {
          this.errorMessage = 'No se pudo cargar el saldo de WhatsApp.';
          this.toastr.error(err?.error?.message || 'Error al consultar el saldo', 'WhatsApp Business');
        }
      });
  }

  /** Mensajes equivalentes al saldo actual. */
  public get equivalentMessages(): number {
    if (!this.balance) return 0;
    const price = this.balance.priceCOP || 0;
    if (price <= 0) return 0;
    return Math.floor((this.balance.balanceCOP || 0) / price);
  }

  /** Indica si mostrar banner de saldo bajo. */
  public get showLowBalanceBanner(): boolean {
    if (!this.balance) return false;
    if (this.balance.accountStatus === 'closing') return true;
    const max = this.balance.historicalMaxBalanceCOP || 0;
    if (max <= 0) return false;
    return (this.balance.balanceCOP || 0) < (max * 0.2);
  }

  /** Texto del banner de saldo bajo. */
  public get lowBalanceMessage(): string {
    if (!this.balance) return '';
    if (this.balance.accountStatus === 'closing') {
      return 'Tu cuenta está en proceso de cierre. Recarga saldo para reactivar los envíos.';
    }
    return 'Tu saldo está por debajo del 20% del histórico. Considera recargar para evitar interrupciones.';
  }

  /** Abre el modal de recarga. */
  public openTopupModal(): void {
    this.topupAmount = this.minTopupAmount;
    this.topupNotes = '';
    this.showTopupModal = true;
  }

  /** Cierra el modal de recarga. */
  public closeTopupModal(): void {
    if (this.isToppingUp) return;
    this.showTopupModal = false;
  }

  /** Confirma la recarga. */
  public confirmTopup(): void {
    if (this.isToppingUp) return;
    const amount = Number(this.topupAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      this.toastr.warning('Ingresa un monto válido', 'Recarga');
      return;
    }
    this.isToppingUp = true;
    this.billingService.topup({ amountCOP: amount, notes: this.topupNotes || undefined })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isToppingUp = false)
      )
      .subscribe({
        next: (res) => {
          if (res?.success) {
            this.toastr.success('Saldo recargado correctamente', 'WhatsApp Business');
            this.showTopupModal = false;
            this.loadBalance();
          } else {
            this.toastr.error(res?.message || 'No se pudo procesar la recarga', 'WhatsApp Business');
          }
        },
        error: (err) => {
          this.toastr.error(err?.error?.message || 'Error procesando la recarga', 'WhatsApp Business');
        }
      });
  }

  /** Reclama el bonus de bienvenida. */
  public claimWelcomeBonus(): void {
    if (this.isClaimingBonus) return;
    this.isClaimingBonus = true;
    this.billingService.requestWelcomeBonus()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isClaimingBonus = false)
      )
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
