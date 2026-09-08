import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { defer, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { IntegrationsService } from '../../integrations/integrations.service';
import { DianInvoiceService } from './dian-invoice.service';
import { ManualInvoiceFormComponent } from './manual-invoice-form.component';
import { InvoicePreview, InvoiceRequest, InvoiceSelection, ManualInvoice, PAYMENT_METHODS } from './invoice-composer.models';

@Component({
  selector: 'app-invoice-composer',
  templateUrl: './invoice-composer.component.html',
  styleUrls: ['./invoice-composer.component.scss'],
})
export class InvoiceComposerComponent implements OnInit, OnDestroy {
  @Input() integration: any;
  @Output() issued = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @ViewChild(ManualInvoiceFormComponent) manualForm?: ManualInvoiceFormComponent;
  mode: 'manual' | 'order' = 'manual';
  companyId: string;
  loading = false;
  preview: InvoicePreview | null = null;
  selection: InvoiceSelection | null = null;
  record: InvoiceRequest | null = null;
  requestId = '';
  phase: 'review' | 'submit' = 'review';
  confirmed = false;
  unknown = false;
  restored = false;
  error = '';
  storageError = '';
  showDrafts = false;
  draftId = '';
  draftVersion = 0;
  draftMessage = '';
  private notified = '';
  private request?: Subscription;

  constructor(private invoices: DianInvoiceService, private integrations: IntegrationsService) {
    this.companyId = this.activeCompanyId();
  }
  ngOnInit(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (saved && /^[a-zA-Z0-9-]{16,80}$/.test(saved.requestId)) {
        this.requestId = saved.requestId; this.phase = saved.phase === 'submit' ? 'submit' : 'review';
        this.unknown = true; this.restored = true; this.refreshStatus();
      }
    } catch (_) { this.storageError = 'No pudimos recuperar el último envío del navegador. No emitas hasta revisar el historial.'; }
  }
  private activeCompanyId(): string {
    try { return this.integrations.getActiveCompanyId(); } catch (_) { return ''; }
  }
  get storageKey(): string { return 'katuq.dian.invoice-request.' + this.companyId; }
  get companyChanged(): boolean { return !this.companyId || this.companyId !== this.activeCompanyId(); }
  get pending(): boolean { return this.unknown || ['processing', 'uncertain'].includes(this.record?.status || ''); }
  get editorDisabled(): boolean { return this.loading || this.companyChanged || this.pending || this.record?.status === 'accepted' || this.restored; }
  get canEmit(): boolean {
    return !this.loading && !this.companyChanged && !this.storageError && !this.pending &&
      this.record?.status === 'ready' && this.record?.delivery?.ready !== false && this.confirmed &&
      this.integration?.enabled === true && this.integration?.config?.environment === 'produccion';
  }
  get nextNumber(): string {
    const numbering = this.integration?.config?.numbering;
    return numbering?.prefix && numbering?.current ? numbering.prefix + numbering.current : 'Se asigna al emitir';
  }
  get statusTitle(): string {
    const labels = { draft: 'Borrador guardado · Por completar', ready: 'Revisión guardada · Aún no emitida', processing: 'Envío en proceso',
      accepted: 'Factura aceptada por la DIAN', rejected: 'La DIAN rechazó la factura',
      failed: 'No se envió la factura', uncertain: 'Falta confirmar el resultado' };
    return this.unknown ? 'Consultemos el resultado antes de continuar' : labels[this.record?.status || 'ready'];
  }
  private remember(): boolean {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ requestId: this.requestId, phase: this.phase }));
      this.storageError = ''; return true;
    } catch (_) {
      this.storageError = 'El navegador no permite guardar la referencia del envío. Habilita el almacenamiento antes de emitir.';
      return false;
    }
  }
  setMode(mode: 'manual' | 'order'): void {
    if (this.editorDisabled || this.mode === mode) return;
    this.mode = mode; this.invalidate();
  }
  invalidate(): void {
    if (this.loading || this.pending || this.record?.status === 'accepted') return;
    if (this.draftId) this.draftMessage = 'Hay cambios sin guardar en este borrador.';
    this.preview = null; this.selection = null; this.record = null; this.requestId = '';
    this.confirmed = false; this.error = '';
    try { localStorage.removeItem(this.storageKey); } catch (_) {}
  }
  startNew(): void {
    if (this.loading || this.pending || this.companyChanged) return;
    this.record = null; this.restored = false; this.invalidate(); this.manualForm?.resetDraft();
    this.draftId = ''; this.draftVersion = 0; this.draftMessage = '';
  }
  get canCorrect(): boolean {
    return !this.loading && !this.pending && !this.companyChanged &&
      ['rejected', 'failed'].includes(this.record?.status || '') && !!this.record?.selection;
  }
  correctInvoice(): void {
    if (!this.canCorrect) return;
    if (/Regla:\s*90\b|procesado anteriormente/i.test(this.record?.message || '') &&
      !window.confirm('La DIAN reportó un documento procesado anteriormente. Continúa solo si verificaste el historial y corregiste la numeración o la causa del duplicado. Esto recupera los datos, NO emite. ¿Continuar?')) return;
    const original = this.record!.selection!;
    this.restored = false; this.record = null; this.unknown = false;
    this.invalidate(); this.draftId = ''; this.draftVersion = 0;
    this.mode = original.source;
    if (original.source === 'manual') {
      this.manualForm?.restoreDraft(original.invoice);
      this.draftMessage = 'Datos recuperados del intento anterior. Revisa y guarda nuevamente antes de emitir. El rechazo original permanece en el historial.';
    } else this.reviewOrder(original.orderId);
  }
  saveDraft(invoice: ManualInvoice): void {
    if (this.editorDisabled) return;
    this.invalidate(); this.showDrafts = false; this.draftMessage = '';
    try { this.draftId ||= crypto.randomUUID(); } catch (_) { this.error = 'No pudimos identificar el borrador.'; return; }
    this.loading = true;
    this.request = defer(() => this.invoices.saveDraft(this.draftId, invoice, this.draftVersion))
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: record => {
          if (this.companyChanged) return;
          this.draftVersion = record.version || 0;
          this.draftMessage = 'Borrador guardado en este comercio. Puedes cerrar la página y continuarlo desde Borradores. No se ha emitido.';
          this.manualForm?.form.markAsPristine();
        },
        error: error => { if (!this.companyChanged) this.error = error?.error?.message || 'No se confirmó el guardado. Consulta Borradores antes de guardar otra copia.'; },
      });
  }
  openDraft(id: string): void {
    if (this.loading || this.pending || this.companyChanged) return;
    if (this.manualForm?.form.dirty && !window.confirm('Abrir otro borrador reemplaza los datos sin guardar de este formulario. ¿Continuar?')) return;
    this.loading = true; this.error = '';
    this.request = defer(() => this.invoices.status(id)).pipe(finalize(() => this.loading = false)).subscribe({
      next: record => {
        if (this.companyChanged) return;
        if (record.status === 'draft' && record.selection?.source === 'manual') {
          this.restored = false; this.mode = 'manual'; this.record = null; this.preview = null;
          this.requestId = ''; this.confirmed = false; this.unknown = false;
          try { localStorage.removeItem(this.storageKey); } catch (_) {}
          this.manualForm?.restoreDraft(record.selection.invoice);
          this.draftId = id; this.draftVersion = record.version || 0;
          this.draftMessage = 'Borrador recuperado. Comprobamos nuevamente los datos del cliente antes de revisar.';
        } else {
          this.draftId = ''; this.draftVersion = 0; this.draftMessage = '';
          this.requestId = id; this.phase = record.status === 'ready' ? 'review' : 'submit';
          this.restored = true; this.remember(); this.adopt(record);
        }
        this.showDrafts = false;
      },
      error: error => { if (!this.companyChanged) this.error = this.message(error); },
    });
  }
  reviewManual(invoice: ManualInvoice): void { this.review({ source: 'manual', invoice }); }
  reviewOrder(orderId: string): void { this.review({ source: 'order', orderId }); }
  review(selection: InvoiceSelection): void {
    if (this.editorDisabled) return;
    this.preview = null; this.record = null; this.confirmed = false; this.error = '';
    this.selection = selection;
    try { this.requestId = this.mode === 'manual' && this.draftId ? this.draftId : crypto.randomUUID(); }
    catch (_) { this.error = 'Abre Katuq en un navegador actualizado con conexión HTTPS para preparar el envío.'; return; }
    this.phase = 'review';
    if (!this.remember()) return;
    this.loading = true;
    this.request = defer(() => this.invoices.createReview(this.requestId, selection, this.draftId === this.requestId ? this.draftVersion : undefined)).pipe(finalize(() => this.loading = false)).subscribe({
      next: record => this.adopt(record),
      error: error => {
        if (this.companyChanged) return;
        this.error = this.message(error);
        if (error?.status >= 400 && error?.status < 500) {
          this.requestId = ''; try { localStorage.removeItem(this.storageKey); } catch (_) {}
        } else this.unknown = true;
      },
    });
  }
  emitInvoice(): void {
    if (!this.canEmit || !this.preview) return;
    this.phase = 'submit';
    if (!this.remember()) return;
    this.loading = true; this.confirmed = false; this.error = '';
    this.request = defer(() => this.invoices.submit(this.requestId, this.preview!.fingerprint))
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: record => this.adopt(record),
        error: error => {
          if (this.companyChanged) return;
          this.error = this.message(error);
          // Sólo un rechazo explícito antes del envío permite revisar; timeout/5xx son inciertos.
          if (!(error?.status >= 400 && error?.status < 500)) this.unknown = true;
        },
      });
  }
  refreshStatus(): void {
    if (this.loading || this.companyChanged || !this.requestId) return;
    this.loading = true; this.error = '';
    this.request = defer(() => this.invoices.status(this.requestId)).pipe(finalize(() => this.loading = false)).subscribe({
      next: record => this.adopt(record),
      error: error => {
        this.error = this.message(error);
        if (error?.error?.code === 'DIAN_REQUEST_NOT_FOUND' && this.phase === 'review') {
          // Crear una revisión no envía. Una revisión perdida puede prepararse de nuevo.
          this.unknown = false; this.restored = false; this.requestId = '';
          try { localStorage.removeItem(this.storageKey); } catch (_) {}
        } else this.unknown = true;
      },
    });
  }
  recoverDocuments(): void {
    if (this.loading || this.companyChanged || this.record?.status !== 'accepted' || this.record.invoice?.artifactsAvailable) return;
    this.loading = true; this.error = '';
    this.request = defer(() => this.invoices.recoverDocuments(this.requestId)).pipe(finalize(() => this.loading = false)).subscribe({
      next: record => this.adopt(record),
      error: error => { if (!this.companyChanged) this.error = error?.error?.message || 'No se completó la recuperación. La factura sigue aceptada; no la emitas otra vez.'; },
    });
  }
  private adopt(record: InvoiceRequest): void {
    if (this.companyChanged || record.requestId !== this.requestId) return;
    this.record = record; this.preview = record.preview; this.mode = record.source;
    if (record.status !== 'draft') { this.draftId = ''; this.draftVersion = 0; this.draftMessage = ''; }
    this.unknown = false; this.confirmed = false;
    if (record.status === 'accepted' && this.notified !== record.requestId) {
      this.notified = record.requestId; this.issued.emit();
    }
  }
  private message(error: any): string {
    return error?.error?.message || (error?.name === 'TimeoutError' || error?.status === 0
      ? 'La conexión no confirmó el resultado. Usa Consultar estado; no crees otra factura para esta venta.'
      : error?.status === 404 ? 'No encontramos esta operación. Verifica que el backend esté actualizado.'
      : 'No pudimos completar la operación. Consulta el estado antes de intentar otro envío.');
  }
  paymentLabel(code: string): string { return PAYMENT_METHODS.find(item => item.code === code)?.label || code; }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
}
