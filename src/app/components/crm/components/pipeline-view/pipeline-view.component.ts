import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CrmService } from '../../services/crm.service';
import {
  CrmContact, CrmStats, ContactStatus,
  CONTACT_STATUS_OPTIONS, getStatusSeverity, getStatusLabel,
} from '../../models/crm.models';

@Component({
  selector: 'app-pipeline-view',
  templateUrl: './pipeline-view.component.html',
  styleUrls: ['./pipeline-view.component.scss'],
})
export class PipelineViewComponent implements OnInit, OnDestroy {
  stats: CrmStats | null = null;
  contactsByStage: Record<string, CrmContact[]> = {};
  loading = true;
  activeStageIndex = 0;

  stages = CONTACT_STATUS_OPTIONS.filter(o => o.value !== 'lost');

  private destroy$ = new Subject<void>();

  constructor(private crmService: CrmService, private router: Router) {}

  ngOnInit(): void {
    this.loadPipeline();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPipeline(): void {
    this.loading = true;

    // Load stats
    this.crmService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe((stats) => { this.stats = stats; });

    // Load contacts for each stage
    for (const stage of this.stages) {
      this.crmService.getContacts({ status: stage.value, limit: 50 })
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          this.contactsByStage[stage.value] = res.data;
          this.loading = false;
        });
    }
  }

  getStageCount(status: string): number {
    return this.stats?.byStatus?.[status as ContactStatus] || 0;
  }

  getStageValue(status: string): number {
    const contacts = this.contactsByStage[status] || [];
    return contacts.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  }

  viewContact(contact: CrmContact): void {
    this.router.navigate(['/crm/contacts', contact.id]);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  getStatusSeverity = getStatusSeverity;
  getStatusLabel = getStatusLabel;

  trackByContactId(index: number, item: CrmContact): string {
    return item.id;
  }
}
