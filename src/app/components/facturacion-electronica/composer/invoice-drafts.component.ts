import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Subscription, defer } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DianInvoiceService } from './dian-invoice.service';
import { IntegrationsService } from '../../integrations/integrations.service';
import { InvoiceDraftSummary } from './invoice-composer.models';

@Component({selector: 'app-invoice-drafts', templateUrl: './invoice-drafts.component.html', styleUrls: ['./invoice-composer.component.scss']})
export class InvoiceDraftsComponent implements OnInit, OnDestroy {
  @Input() companyId = '';
  @Input() disabled = false;
  @Output() opened = new EventEmitter<string>();
  items: InvoiceDraftSummary[] = [];
  loading = false;
  error = '';
  private request?: Subscription;
  constructor(private invoices: DianInvoiceService, private integrations: IntegrationsService) {}
  ngOnInit(): void { this.load(); }
  private sameCompany(): boolean { try { return !!this.companyId && this.integrations.getActiveCompanyId() === this.companyId; } catch (_) { return false; } }
  load(): void {
    if (this.loading || this.disabled || !this.sameCompany()) return;
    this.loading = true; this.error = '';
    this.request = defer(() => this.invoices.drafts()).pipe(finalize(() => this.loading = false)).subscribe({
      next: data => { if (this.sameCompany()) this.items = data.items; },
      error: () => this.error = 'No pudimos consultar los borradores. Inténtalo de nuevo.',
    });
  }
  open(id: string): void { if (!this.disabled && !this.loading && this.sameCompany()) this.opened.emit(id); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }
}
