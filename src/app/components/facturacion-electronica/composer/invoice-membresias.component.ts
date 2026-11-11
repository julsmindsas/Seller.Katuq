import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subscription, defer } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { DianInvoiceService } from './dian-invoice.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { MembresiaPendiente, MembresiaCambios, PAYMENT_METHODS } from './invoice-composer.models';

/** D-711: «Membresías por enviar». Solo el Super Administrador la ve; el servidor lo vuelve a exigir en cada llamada. */
@Component({selector: 'app-invoice-membresias', templateUrl: './invoice-membresias.component.html', styleUrls: ['./invoice-composer.component.scss']})
export class InvoiceMembresiasComponent implements OnInit, OnDestroy {
  @Input() companyId = '';
  @Input() disabled = false;
  /** Pide abrir la revisión existente de esa solicitud (con su confirmación y su huella). */
  @Output() opened = new EventEmitter<string>();
  items: MembresiaPendiente[] = [];
  loading = false;
  saving = false;
  error = '';
  message = '';
  editing: MembresiaPendiente | null = null;
  form: {formaPago: 'contado' | 'credito'; medioPago: string; vencimiento: string; descripcion: string; observaciones: string} =
    {formaPago: 'credito', medioPago: '47', vencimiento: '', descripcion: '', observaciones: ''};
  readonly methods = PAYMENT_METHODS;
  readonly today = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  private request?: Subscription;
  constructor(private invoices: DianInvoiceService, private integrations: IntegrationsService, private translate: TranslateService) {}

  get isSuperAdmin(): boolean {
    try { return JSON.parse(localStorage.getItem('user') || 'null')?.rol === 'Super Administrador'; } catch (_) { return false; }
  }
  ngOnInit(): void { this.load(); }
  private sameCompany(): boolean { try { return !!this.companyId && this.integrations.getActiveCompanyId() === this.companyId; } catch (_) { return false; } }
  load(): void {
    if (!this.isSuperAdmin || this.loading || !this.sameCompany()) return;
    this.loading = true; this.error = '';
    this.request = defer(() => this.invoices.membresiasPendientes()).pipe(finalize(() => this.loading = false)).subscribe({
      next: data => { if (this.sameCompany()) this.items = data.items; },
      // Para quien no es de Julsmind el servidor responde 403: la sección simplemente no aparece.
      error: e => { this.items = []; if (e?.status !== 403) this.error = this.translate.instant('facturacionElectronica.membresias.errorConsulta'); },
    });
  }
  methodLabel(code: string | null): string { return this.methods.find(m => m.code === code)?.label || ''; }
  edit(item: MembresiaPendiente): void {
    this.message = ''; this.error = ''; this.editing = item;
    this.form = {
      formaPago: item.formaPago || 'credito', medioPago: item.medioPago && item.medioPago !== '10' ? item.medioPago : '47',
      vencimiento: item.vencimiento || '', descripcion: item.descripcion || '', observaciones: item.observaciones || '',
    };
  }
  cancel(): void { this.editing = null; }
  get invalidForm(): string {
    if (this.form.formaPago === 'credito' && (!this.form.vencimiento || this.form.vencimiento < this.today)) return this.translate.instant('facturacionElectronica.membresias.vencimientoNoPasado');
    if (this.form.descripcion.trim().length < 3) return this.translate.instant('facturacionElectronica.membresias.descripcionCorta');
    return '';
  }
  save(): void {
    if (!this.editing || this.saving || this.invalidForm) return;
    const changes: MembresiaCambios = {
      formaPago: this.form.formaPago,
      ...(this.form.formaPago === 'contado' ? {medioPago: this.form.medioPago} : {vencimiento: this.form.vencimiento}),
      descripcion: this.form.descripcion, observaciones: this.form.observaciones,
    };
    this.saving = true; this.error = '';
    this.request = defer(() => this.invoices.editarMembresia(this.editing!.cuentaId, changes)).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.editing = null; this.message = this.translate.instant('facturacionElectronica.membresias.guardado'); this.load(); },
      error: e => this.error = e?.error?.message || this.translate.instant('facturacionElectronica.membresias.errorGuardar'),
    });
  }
  send(item: MembresiaPendiente): void { if (!this.disabled && item.requestId && !this.saving) this.opened.emit(item.requestId); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
}
