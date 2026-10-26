import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { defer, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { IntegrationsService } from '../../integrations/integrations.service';
import { DianInvoiceService } from './dian-invoice.service';
import { ManualInvoiceFormComponent } from './manual-invoice-form.component';
import { InvoicePreview, InvoiceRequest, InvoiceSelection, ManualInvoice, PAYMENT_METHODS, MAX_INVOICE_OBSERVATIONS_LENGTH, invoiceTotals } from './invoice-composer.models';

import { TranslateService } from '@ngx-translate/core';
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

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
  observations = '';
  readonly maxObservationsLength = MAX_INVOICE_OBSERVATIONS_LENGTH;
  private observationsDirty = false;
  private checkingStoredRequest = false;
  private startNewAfterRecovery = false;
  private notified = '';
  private request?: Subscription;

  constructor(private invoices: DianInvoiceService, private integrations: IntegrationsService, private translate: TranslateService) {
    this.companyId = this.activeCompanyId();
  }
  ngOnInit(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey) || 'null');
      if (saved && /^[a-zA-Z0-9-]{16,80}$/.test(saved.requestId)) {
        this.requestId = saved.requestId; this.phase = saved.phase === 'submit' ? 'submit' : 'review';
        this.unknown = true; this.restored = true; this.checkingStoredRequest = true; this.refreshStatus();
      }
    } catch (_) { this.storageError = this.translate.instant('facturacionElectronica.composer.noPudimosRecuperarElUltimo'); }
  }
  private activeCompanyId(): string {
    try { return this.integrations.getActiveCompanyId(); } catch (_) { return ''; }
  }
  get storageKey(): string { return 'katuq.dian.invoice-request.' + this.companyId; }
  get companyChanged(): boolean { return !this.companyId || this.companyId !== this.activeCompanyId(); }
  get pending(): boolean { return this.unknown || ['processing', 'uncertain'].includes(this.record?.status || ''); }
  get editorDisabled(): boolean { return this.loading || this.companyChanged || this.pending || this.record?.status === 'accepted' || this.restored; }
  get canEmit(): boolean {
    return !this.loading && !this.companyChanged && !this.storageError && !this.observationsError && !this.pending &&
      this.record?.status === 'ready' && this.record?.delivery?.ready !== false && this.confirmed &&
      this.integration?.enabled === true && this.integration?.config?.environment === 'produccion';
  }
  get nextNumber(): string {
    const numbering = this.integration?.config?.numbering;
    return numbering?.prefix && numbering?.current ? numbering.prefix + numbering.current : this.translate.instant('facturacionElectronica.composer.seAsignaAlEmitir');
  }
  get statusTitle(): string {
    const labels = { draft: this.translate.instant('facturacionElectronica.composer.borradorGuardadoPorCompletar'), ready: this.translate.instant('facturacionElectronica.composer.revisionGuardadaAunNoEmitida'), processing: this.translate.instant('facturacionElectronica.composer.envioEnProceso'),
      accepted: this.translate.instant('facturacionElectronica.composer.facturaAceptadaPorLaDian'), rejected: this.translate.instant('facturacionElectronica.composer.laDianRechazoLaFactura'),
      failed: this.translate.instant('facturacionElectronica.composer.noSeEnvioLaFactura'), uncertain: this.translate.instant('facturacionElectronica.composer.faltaConfirmarElResultado') };
    return this.unknown ? this.translate.instant('facturacionElectronica.composer.consultemosElResultadoAntesDe') : labels[this.record?.status || 'ready'];
  }
  private remember(): boolean {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ requestId: this.requestId, phase: this.phase }));
      this.storageError = ''; return true;
    } catch (_) {
      this.storageError = this.translate.instant('facturacionElectronica.composer.elNavegadorNoPermiteGuardar');
      return false;
    }
  }
  setMode(mode: 'manual' | 'order'): void {
    if (this.editorDisabled || this.mode === mode) return;
    this.mode = mode; this.invalidate();
  }
  get observationsError(): string {
    if (this.observations.length > this.maxObservationsLength) return this.translate.instant('facturacionElectronica.composer.lasObservacionesAdmitenHasta1000');
    if (/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/u.test(this.observations)) {
      return this.translate.instant('facturacionElectronica.composer.lasObservacionesContienenCaracteresNo');
    }
    return '';
  }
  changeObservations(value: string): void {
    if (this.editorDisabled) return;
    this.observations = value.replace(/\r\n?/g, '\n');
    this.observationsDirty = true;
    this.invalidate();
  }
  invalidate(): void {
    if (this.loading || this.pending || this.record?.status === 'accepted') return;
    if (this.draftId) this.draftMessage = this.translate.instant('facturacionElectronica.composer.hayCambiosSinGuardarEn');
    this.preview = null; this.selection = null; this.record = null; this.requestId = '';
    this.confirmed = false; this.error = '';
    try { localStorage.removeItem(this.storageKey); } catch (_) {}
  }
  requestNewInvoice(): void {
    if (this.companyChanged) return;
    // El clic explícito puede llegar mientras ngOnInit consulta la referencia
    // anterior. Esperar su resultado sin destruir el componente ni repetir envíos.
    if (this.checkingStoredRequest && this.loading) {
      this.startNewAfterRecovery = true;
      return;
    }
    if (this.loading || this.pending) {
      this.error ||= this.translate.instant('facturacionElectronica.composer.primeroDebemosConfirmarLaOperacion');
      return;
    }
    this.startNew();
  }
  startNew(): void {
    if (this.loading || this.pending || this.companyChanged) return;
    if (!this.record && (this.manualForm?.form.dirty || this.observationsDirty)) {
      this.confirm(this.translate.instant('facturacionElectronica.composer.empezarUnaFacturaNueva'), this.translate.instant('facturacionElectronica.composer.tienesDatosSinGuardarLos'), this.translate.instant('facturacionElectronica.composer.siEmpezarOtra'))
        .then(ok => { if (ok) this.resetComposer(); });
      return;
    }
    this.resetComposer();
  }
  private confirm(title: string, text: string, confirmButtonText: string): Promise<boolean> {
    return Swal.fire({ icon: 'question', title, text, showCancelButton: true, confirmButtonText, cancelButtonText: this.translate.instant('comun.cancelar'), confirmButtonColor: '#6c4ce0' })
      .then(result => result.isConfirmed);
  }
  private resetComposer(): void {
    if (this.loading || this.pending || this.companyChanged) return;
    this.record = null; this.restored = false; this.invalidate(); this.manualForm?.resetDraft();
    this.mode = 'manual'; this.phase = 'review'; this.unknown = false; this.showDrafts = false;
    this.draftId = ''; this.draftVersion = 0; this.draftMessage = '';
    this.observations = ''; this.observationsDirty = false;
  }
  get canCorrect(): boolean {
    return !this.loading && !this.pending && !this.companyChanged &&
      ['rejected', 'failed'].includes(this.record?.status || '') && !!this.record?.selection;
  }
  correctInvoice(): void {
    if (!this.canCorrect) return;
    if (/Regla:\s*90\b|procesado anteriormente/i.test(this.record?.message || '')) {
      this.confirm(this.translate.instant('facturacionElectronica.composer.documentoProcesadoAnteriormente'),
        this.translate.instant('facturacionElectronica.composer.laDianReportoUnDocumento'),
        this.translate.instant('facturacionElectronica.composer.continuar')).then(ok => { if (ok && this.canCorrect) this.restoreForCorrection(); });
      return;
    }
    this.restoreForCorrection();
  }
  private restoreForCorrection(): void {
    const original = this.record!.selection!;
    this.restored = false; this.record = null; this.unknown = false;
    this.invalidate(); this.draftId = ''; this.draftVersion = 0;
    this.mode = original.source;
    this.observations = original.observations || ''; this.observationsDirty = false;
    if (original.source === 'manual') {
      this.manualForm?.restoreDraft(original.invoice);
      this.draftMessage = this.translate.instant('facturacionElectronica.composer.datosRecuperadosDelIntentoAnterior');
    } else this.reviewOrder(original.orderId);
  }
  saveDraft(invoice: ManualInvoice): void {
    if (this.editorDisabled) return;
    if (this.observationsError) { this.error = this.observationsError; return; }
    this.invalidate(); this.showDrafts = false; this.draftMessage = '';
    try { this.draftId ||= crypto.randomUUID(); } catch (_) { this.error = this.translate.instant('facturacionElectronica.composer.noPudimosIdentificarElBorrador'); return; }
    this.loading = true;
    this.request = defer(() => this.invoices.saveDraft(this.draftId, invoice, this.draftVersion, this.observations.trim()))
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: record => {
          if (this.companyChanged) return;
          this.draftVersion = record.version || 0;
          if (this.observations.trim() !== (record.selection?.observations || '')) {
            this.error = this.translate.instant('facturacionElectronica.composer.elServidorNoConfirmoLas');
            return;
          }
          this.draftMessage = this.translate.instant('facturacionElectronica.composer.borradorGuardadoEnEsteComercio');
          this.manualForm?.form.markAsPristine();
          this.observationsDirty = false;
        },
        error: error => { if (!this.companyChanged) this.error = error?.error?.message || this.translate.instant('facturacionElectronica.composer.noSeConfirmoElGuardado'); },
      });
  }
  openDraft(id: string): void {
    if (this.loading || this.pending || this.companyChanged) return;
    if (this.manualForm?.form.dirty || this.observationsDirty) {
      this.confirm(this.translate.instant('facturacionElectronica.composer.abrirEsteBorrador'), this.translate.instant('facturacionElectronica.composer.abrirOtroBorradorReemplazaLos'), this.translate.instant('facturacionElectronica.composer.siAbrir'))
        .then(ok => { if (ok) this.loadDraft(id); });
      return;
    }
    this.loadDraft(id);
  }
  private loadDraft(id: string): void {
    if (this.loading || this.pending || this.companyChanged) return;
    this.loading = true; this.error = '';
    this.request = defer(() => this.invoices.status(id)).pipe(finalize(() => this.loading = false)).subscribe({
      next: record => {
        if (this.companyChanged) return;
        if (record.status === 'draft' && record.selection?.source === 'manual') {
          this.restored = false; this.mode = 'manual'; this.record = null; this.preview = null;
          this.requestId = ''; this.confirmed = false; this.unknown = false;
          try { localStorage.removeItem(this.storageKey); } catch (_) {}
          this.manualForm?.restoreDraft(record.selection.invoice);
          this.observations = record.selection.observations || ''; this.observationsDirty = false;
          this.draftId = id; this.draftVersion = record.version || 0;
          this.draftMessage = this.translate.instant('facturacionElectronica.composer.borradorRecuperadoComprobamosNuevamenteLos');
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
    if (this.observationsError) { this.error = this.observationsError; return; }
    const observations = this.observations.trim();
    selection = { ...selection, ...(observations ? { observations } : {}) };
    this.preview = null; this.record = null; this.confirmed = false; this.error = '';
    this.selection = selection;
    try { this.requestId = this.mode === 'manual' && this.draftId ? this.draftId : crypto.randomUUID(); }
    catch (_) { this.error = this.translate.instant('facturacionElectronica.composer.abreKatuqEnUnNavegador'); return; }
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
    this.request = defer(() => this.invoices.status(this.requestId)).pipe(finalize(() => {
      this.loading = false;
      this.checkingStoredRequest = false;
      if (this.startNewAfterRecovery) {
        this.startNewAfterRecovery = false;
        this.requestNewInvoice();
      }
    })).subscribe({
      next: record => this.adopt(record),
      error: error => {
        if (this.companyChanged) return;
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
      error: error => { if (!this.companyChanged) this.error = error?.error?.message || this.translate.instant('facturacionElectronica.composer.noSeCompletoLaRecuperacion'); },
    });
  }
  private adopt(record: InvoiceRequest): void {
    if (this.companyChanged || record.requestId !== this.requestId) return;
    if (record.status === 'ready' && this.selection &&
      (record.preview?.observations || '') !== (this.selection.observations || '')) {
      this.error = this.translate.instant('facturacionElectronica.composer.lasObservacionesDelResumenNo');
      this.record = null; this.preview = null; this.confirmed = false;
      return;
    }
    this.record = record; this.preview = record.preview; this.mode = record.source;
    this.observations = record.preview?.observations || record.selection?.observations || '';
    this.observationsDirty = false;
    if (record.status !== 'draft') { this.draftId = ''; this.draftVersion = 0; this.draftMessage = ''; }
    this.unknown = false; this.confirmed = false;
    if (record.status === 'accepted' && this.notified !== record.requestId) {
      this.notified = record.requestId; this.issued.emit();
    }
  }
  private message(error: any): string {
    return error?.error?.message || (error?.name === 'TimeoutError' || error?.status === 0
      ? this.translate.instant('facturacionElectronica.composer.laConexionNoConfirmoEl')
      : error?.status === 404 ? this.translate.instant('facturacionElectronica.composer.noEncontramosEstaOperacionVerifica')
      : this.translate.instant('facturacionElectronica.composer.noPudimosCompletarLaOperacion'));
  }
  // ===== Resumen en vivo y lista de pendientes (panel lateral) =====
  get liveTotals() {
    const items = this.manualForm?.items.getRawValue() || [];
    return invoiceTotals(items);
  }
  get liveItemCount(): number { return this.manualForm?.items.length || 0; }
  get customerDone(): boolean { return !!this.manualForm?.form.get('customerId')?.value; }
  get itemsDone(): boolean {
    const items = this.manualForm?.items;
    if (!items || !items.length) return false;
    return items.controls.every(item => item.valid) && this.liveTotals.total > 0;
  }
  get paymentDone(): boolean { return !!this.manualForm?.form.get('payment')?.valid; }
  get readyToReview(): boolean {
    return this.mode === 'manual' ? this.customerDone && this.itemsDone && this.paymentDone && !this.observationsError : false;
  }
  get checks(): { ok: boolean; label: string }[] {
    return [
      { ok: this.customerDone, label: this.customerDone ? this.translate.instant('facturacionElectronica.composer.clienteConDatosFiscalesCompletos') : this.translate.instant('facturacionElectronica.composer.eligeUnClienteRegistrado') },
      { ok: this.itemsDone, label: this.itemsDone ? this.translate.instant('facturacionElectronica.composer.conceptosConNombreYValor') : this.translate.instant('facturacionElectronica.composer.agregaAlMenosUnConcepto') },
      { ok: this.paymentDone, label: this.paymentDone ? this.translate.instant('facturacionElectronica.composer.formaYMedioDePago') : this.translate.instant('facturacionElectronica.composer.eligeElMedioDePago') },
    ];
  }
  reviewFromSummary(): void { if (!this.editorDisabled) this.manualForm?.reviewInvoice(); }
  saveDraftFromSummary(): void { if (!this.editorDisabled) this.manualForm?.storeDraft(); }
  get observationTemplates(): { label: string; text: string }[] {
    const now = new Date();
    return [
      { label: this.translate.instant('facturacionElectronica.composer.periodoDelServicio'), text: `Servicio correspondiente a ${MONTHS[now.getMonth()]} de ${now.getFullYear()}.` },
      { label: this.translate.instant('facturacionElectronica.composer.instruccionesDePago'), text: 'Indicar el número de factura al realizar el pago.' },
      { label: this.translate.instant('facturacionElectronica.composer.graciasPorTuCompra'), text: 'Gracias por tu compra. Cualquier inquietud sobre esta factura escríbenos.' },
    ];
  }
  applyTemplate(text: string): void {
    if (this.editorDisabled) return;
    const next = (this.observations.trim() ? this.observations.trim() + ' ' : '') + text;
    this.changeObservations(next.slice(0, this.maxObservationsLength));
  }
  paymentLabel(code: string): string { return PAYMENT_METHODS.find(item => item.code === code)?.label || code; }
  ngOnDestroy(): void {
    this.startNewAfterRecovery = false;
    this.request?.unsubscribe();
  }
}
