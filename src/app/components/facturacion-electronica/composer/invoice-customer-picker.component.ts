import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { defer, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { DianInvoiceService } from './dian-invoice.service';
import { InvoiceCustomer } from './invoice-composer.models';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { CrearClienteModalComponent } from '../../ventas/clientes/crear-cliente-modal/crear-cliente-modal.component';

@Component({
  selector: 'app-invoice-customer-picker',
  templateUrl: './invoice-customer-picker.component.html',
  styleUrls: ['./invoice-composer.component.scss'],
})
export class InvoiceCustomerPickerComponent implements OnDestroy {
  @Input() companyId = '';
  @Input() disabled = false;
  @Output() selected = new EventEmitter<{ customerId: string; billingProfile: number; addressIndex?: number } | null>();
  search = '';
  results: any[] = [];
  customer: InvoiceCustomer | null = null;
  billingProfile = -1;
  addressIndex: number | undefined;
  loading = false;
  searched = false;
  error = '';
  creating = false;
  private createModal?: NgbModalRef;
  private destroyed = false;
  private request?: Subscription;
  constructor(private maestro: MaestroService, private invoices: DianInvoiceService, private integrations: IntegrationsService, private modal: NgbModal) {}
  private sameCompany(): boolean {
    try { return !!this.companyId && this.companyId === this.integrations.getActiveCompanyId(); } catch (_) { return false; }
  }
  createCustomer(): void {
    if (this.disabled || this.loading || this.creating || !this.sameCompany()) return;
    const companyId = this.companyId;
    const ref = this.modal.open(CrearClienteModalComponent, { size: 'lg', centered: true, backdrop: 'static' });
    this.createModal = ref;
    this.creating = true;
    ref.componentInstance.title = 'Crear cliente para la factura';
    ref.componentInstance.emailLabel = 'Correo de facturación';
    ref.componentInstance.emailHint = 'Correo donde el cliente recibirá sus facturas. Se guardará en su ficha de cliente.';
    ref.componentInstance.canPersist = () => !this.destroyed && !this.disabled && companyId === this.companyId && this.sameCompany();
    ref.result.then(result => {
      if (this.destroyed || this.disabled || companyId !== this.companyId || !this.sameCompany()) return;
      if (!['created', 'existing_found'].includes(result?.action) || !result?.cliente) return;
      const client = result.cliente;
      const id = String(client.cd || client.id || '');
      // Only the persisted, freshly read fiscal record can enable invoice review.
      if (id) this.choose(client);
      else {
        this.search = String(client.documento || '');
        this.find();
      }
    }, () => {}).finally(() => {
      this.creating = false;
      this.createModal = undefined;
    });
  }
  find(): void {
    if (this.disabled || !this.sameCompany()) return;
    this.request?.unsubscribe(); this.error = ''; this.results = []; this.searched = true;
    if (this.search.trim().length < 2) { this.error = 'Escribe al menos dos caracteres del nombre o documento.'; return; }
    this.loading = true;
    this.request = defer(() => this.maestro.searchClients(this.search.trim(), 10)).pipe(finalize(() => this.loading = false)).subscribe({
      next: (results: any) => { if (this.sameCompany()) this.results = Array.isArray(results) ? results : []; },
      error: () => { this.error = 'No pudimos buscar los clientes. Inténtalo de nuevo.'; },
    });
  }
  choose(result: any): void {
    if (this.disabled || !this.sameCompany()) return;
    this.billingProfile = -1; this.addressIndex = undefined;
    this.refresh(String(result.cd || result.id || ''));
  }
  refresh(id = this.customer?.id || '', restoringDraft = false): void {
    // Restoring a saved draft is read-only and occurs while its parent is loading.
    if ((this.disabled && !restoringDraft) || !this.sameCompany() || !id) return;
    this.request?.unsubscribe(); this.selected.emit(null); this.loading = true; this.error = '';
    this.request = defer(() => this.invoices.customer(id, this.billingProfile, this.addressIndex))
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: customer => {
          if (!this.sameCompany()) return;
          this.customer = customer; this.results = []; this.searched = false;
          if (!this.missingFields.length) this.selected.emit({
            customerId: customer.id, billingProfile: this.billingProfile,
            ...(this.addressIndex == null ? {} : { addressIndex: this.addressIndex }),
          });
        },
        error: error => { this.error = error?.error?.message || 'No pudimos consultar la ficha actual del cliente.'; },
      });
  }
  get missingFields(): string[] {
    if (!this.customer) return [];
    const f = this.customer.fiscal;
    const missing: string[] = [];
    if (!['NIT', 'CC'].includes(f.documentType)) missing.push('tipo de documento (NIT o cédula)');
    if (!/^\d{5,15}$/.test(f.documentNumber || '')) missing.push('documento');
    if (!f.name) missing.push('nombre o razón social');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email || '')) missing.push('correo de facturación válido');
    return missing;
  }
  reset(): void {
    this.request?.unsubscribe(); this.customer = null; this.results = []; this.search = '';
    this.error = ''; this.searched = false; this.billingProfile = -1; this.addressIndex = undefined;
    this.selected.emit(null);
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    this.request?.unsubscribe();
    this.createModal?.dismiss();
  }
}
