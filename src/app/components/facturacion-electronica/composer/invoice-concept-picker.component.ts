import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { of, Subject, Subscription } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { IntegrationsService } from '../../integrations/integrations.service';
import { DianInvoiceService } from './dian-invoice.service';
import { InvoiceConcept } from './invoice-composer.models';

@Component({
  selector: 'app-invoice-concept-picker',
  templateUrl: './invoice-concept-picker.component.html',
  styleUrls: [
    './invoice-composer.component.scss',
    './invoice-concept-picker.component.scss',
  ],
})
export class InvoiceConceptPickerComponent implements OnChanges, OnDestroy {
  @Input() item: FormGroup;
  @Input() companyId = '';
  @Input() disabled = false;
  @Input() index = 0;
  results: InvoiceConcept[] = [];
  message = '';
  loading = false;
  saving = false;
  private version = 0;
  private destroyed = false;
  private terms = new Subject<{ term: string; company: string; version: number }>();
  private subscriptions = new Subscription();
  constructor(private invoices: DianInvoiceService, private integrations: IntegrationsService) {
    this.subscriptions.add(this.terms.pipe(debounceTime(300), switchMap(request => {
      if (!this.current(request.company, request.version) || request.term.length < 2) return of(null);
      return this.invoices.searchConcepts(request.term).pipe(
        switchMap(data => of({ request, data, failed: false })),
        catchError(() => of({ request, data: { items: [] }, failed: true })),
      );
    })).subscribe(result => {
      if (!result || !this.current(result.request.company, result.request.version)) return;
      this.loading = false;
      this.results = result.data.items;
      this.message = result.failed ? 'No pudimos consultar conceptos. Puedes seguir escribiendo la factura libre.'
        : this.results.length ? '' : 'Sin coincidencias. Escribe el concepto y guárdalo para reutilizarlo.';
    }));
  }
  private current(company = this.companyId, version = this.version): boolean {
    try { return !this.destroyed && !this.disabled && company === this.companyId && version === this.version && !!company && company === this.integrations.getActiveCompanyId(); }
    catch (_) { return false; }
  }
  search(): void {
    this.results = []; this.message = ''; this.version++;
    const term = String(this.item.get('description')?.value || '').trim();
    this.loading = this.current() && term.length >= 2;
    this.terms.next({ term, company: this.companyId, version: this.version });
  }
  choose(concept: InvoiceConcept): void {
    if (!this.current() || this.saving || !this.results.includes(concept)) return;
    this.dismiss();
    this.item.patchValue({ description: concept.description, reference: concept.reference, unitPrice: concept.unitPrice, taxRate: concept.taxRate });
    this.message = 'Concepto cargado. Puedes cambiar el mes, valor e IVA para esta factura.';
  }
  dismiss(): void { this.version++; this.results = []; this.loading = false; }
  save(): void {
    if (!this.current() || this.saving) return;
    const value = this.item.getRawValue();
    if (!String(value.description || '').trim() || typeof value.unitPrice !== 'number' || !Number.isFinite(value.unitPrice) || value.unitPrice <= 0 || ![0, 5, 19].includes(value.taxRate)) {
      this.message = 'Completa descripción, valor sin IVA e IVA antes de guardar el concepto.'; return;
    }
    const company = this.companyId;
    this.saving = true; this.message = '';
    this.subscriptions.add(this.invoices.saveConcept({ description: value.description, reference: value.reference || '', unitPrice: value.unitPrice, taxRate: value.taxRate }).subscribe({
      next: () => {
        this.saving = false;
        if (this.current(company)) this.message = 'Concepto guardado para próximas facturas. No se ha emitido ninguna factura.';
      },
      error: () => {
        this.saving = false;
        if (this.current(company)) this.message = 'No pudimos confirmar el guardado. Puedes reintentar sin duplicar el mismo concepto.';
      },
    }));
  }
  ngOnChanges(): void { this.dismiss(); this.message = ''; }
  ngOnDestroy(): void { this.destroyed = true; this.subscriptions.unsubscribe(); this.terms.complete(); }
}
