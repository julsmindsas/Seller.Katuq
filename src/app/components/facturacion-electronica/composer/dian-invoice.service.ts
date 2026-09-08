import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, timeout } from 'rxjs/operators';
import { BaseService } from '../../../shared/services/base.service';
import { InvoiceConcept, InvoiceCustomer, InvoicePreview, InvoiceRequest, InvoiceSelection, ManualInvoice, InvoiceDraftSummary } from './invoice-composer.models';

@Injectable({ providedIn: 'root' })
export class DianInvoiceService extends BaseService {
  constructor(http: HttpClient) { super(http); }
  searchConcepts(term: string) {
    return this.get<{ success: boolean; data: { items: InvoiceConcept[]; historyLimit: number } }>(
      '/v1/accounting/dian/invoice-concepts?q=' + encodeURIComponent(term),
    ).pipe(timeout(15000), this.unwrap<{ items: InvoiceConcept[]; historyLimit: number }>());
  }
  saveConcept(item: Pick<InvoiceConcept, 'description' | 'reference' | 'unitPrice' | 'taxRate'>) {
    return this.post<{ success: boolean; data: InvoiceConcept }>('/v1/accounting/dian/invoice-concepts', item)
      .pipe(timeout(15000), this.unwrap<InvoiceConcept>());
  }
  private unwrap<T>() {
    return map((response: { success: boolean; data: T; message?: string }) => {
      if (!response.success || !response.data) throw new Error(response.message || 'No pudimos completar la consulta.');
      return response.data;
    });
  }
  customer(id: string, billingProfile = -1, addressIndex?: number) {
    const query = '?billingProfile=' + billingProfile + (addressIndex == null ? '' : '&addressIndex=' + addressIndex);
    return this.get<{ success: boolean; data: InvoiceCustomer }>(
      '/v1/accounting/dian/invoice-customers/' + encodeURIComponent(id) + query,
    ).pipe(timeout(45000), this.unwrap<InvoiceCustomer>());
  }
  drafts() {
    return this.get<{success: boolean; data: {items: InvoiceDraftSummary[]; limit: number}}>('/v1/accounting/dian/invoice-drafts')
      .pipe(timeout(45000), this.unwrap<{items: InvoiceDraftSummary[]; limit: number}>());
  }
  saveDraft(requestId: string, invoice: ManualInvoice, version: number) {
    return this.put<{success: boolean; data: InvoiceRequest}>('/v1/accounting/dian/invoice-drafts/' + encodeURIComponent(requestId),
      {source: 'manual', invoice, version}).pipe(timeout(45000), this.unwrap<InvoiceRequest>());
  }
  createReview(requestId: string, selection: InvoiceSelection, draftVersion?: number) {
    return this.post<{ success: boolean; data: InvoiceRequest }>(
      '/v1/accounting/dian/invoice-requests/' + encodeURIComponent(requestId),
      {...selection, ...(draftVersion == null ? {} : {draftVersion})},
    ).pipe(timeout(45000), this.unwrap<InvoiceRequest>());
  }
  submit(requestId: string, fingerprint: string) {
    return this.put<{ success: boolean; data: InvoiceRequest }>(
      '/v1/accounting/dian/invoice-requests/' + encodeURIComponent(requestId) + '/submit', { confirmed: true, fingerprint },
    ).pipe(timeout(150000), this.unwrap<InvoiceRequest>());
  }
  status(requestId: string) {
    return this.get<{ success: boolean; data: InvoiceRequest }>(
      '/v1/accounting/dian/invoice-requests/' + encodeURIComponent(requestId),
    ).pipe(timeout(45000), this.unwrap<InvoiceRequest>());
  }
  recoverDocuments(requestId: string) {
    return this.post<{success: boolean; data: InvoiceRequest}>(
      '/v1/accounting/dian/invoice-requests/' + encodeURIComponent(requestId) + '/recover-documents', {})
      .pipe(timeout(150000), this.unwrap<InvoiceRequest>());
  }

  preview(selection: InvoiceSelection) {
    return this.post<{ success: boolean; data: InvoicePreview; message?: string }>(
      '/v1/accounting/dian/invoice-preview', selection,
    ).pipe(timeout(45000), map(response => {
      if (!response.success || !response.data?.fingerprint) throw new Error(response.message || 'No pudimos preparar la vista previa.');
      return response.data;
    }));
  }
}
