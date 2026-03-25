import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService, LazyLoadEvent } from 'primeng/api';
import { Table } from 'primeng/table';
import { CrmService } from '../../services/crm.service';
import { CrmLead, CrmStats, getStageSeverity, getPrioritySeverity } from '../../models/crm.models';

@Component({
  selector: 'app-crm-list',
  templateUrl: './crm-list.component.html',
  styleUrls: ['./crm-list.component.scss'],
})
export class CrmListComponent implements OnInit, OnDestroy {
  @ViewChild('dt') table: Table;

  leads: CrmLead[] = [];
  stats: CrmStats | null = null;
  stages: string[] = [];
  entityType: string = 'client';

  loading = true;
  totalRecords = 0;
  pageSize = 20;
  first = 0;

  // Filtros
  searchTerm = '';
  selectedStage: string | null = null;
  stageOptions: { label: string; value: string }[] = [];

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private crmService: CrmService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Setup debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm = term;
        this.loadLeads(true);
      });

    // Load stages, then data — if stages fail, load data anyway
    this.crmService.getStages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.stages = result.stages;
          this.entityType = result.entityType;
          this.stageOptions = result.stages.map(s => ({ label: this.capitalize(s), value: s }));
        },
        error: () => {},
        complete: () => {},
      });

    // Always load data regardless of stages
    this.loadLeads();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Data ──────────────────────────────────────────────────

  loadLeads(resetPage = false): void {
    if (resetPage) this.first = 0;
    this.loading = true;

    const page = Math.floor(this.first / this.pageSize) + 1;
    const filters: Record<string, any> = { page, limit: this.pageSize };
    if (this.selectedStage) filters.stage = this.selectedStage;
    if (this.searchTerm) filters.search = this.searchTerm;

    this.crmService.getLeads(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.leads = res.data || [];
        this.totalRecords = res.pagination?.total || 0;
        this.loading = false;
      });
  }

  loadStats(): void {
    this.crmService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => { this.stats = stats; });
  }

  // ─── Events ────────────────────────────────────────────────

  onLazyLoad(event: LazyLoadEvent): void {
    this.first = event.first || 0;
    this.pageSize = event.rows || 20;
    this.loadLeads();
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  onStageFilter(): void {
    this.loadLeads(true);
    this.loadStats();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStage = null;
    this.loadLeads(true);
  }

  viewDetail(lead: CrmLead): void {
    this.router.navigate(['/crm/detail', lead.id]);
  }

  changeStage(lead: CrmLead, newStage: string): void {
    this.crmService.updatePipeline(lead.id, { stage: newStage })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.success) {
          this.messageService.add({ severity: 'success', summary: 'Etapa actualizada' });
          this.loadLeads();
          this.loadStats();
        }
      });
  }

  // ─── Helpers ───────────────────────────────────────────────

  getStageSeverity = getStageSeverity;
  getPrioritySeverity = getPrioritySeverity;

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getTitle(): string {
    return this.entityType === 'company' ? 'Empresas Katuq' : 'Clientes CRM';
  }

  trackById(index: number, item: CrmLead): string {
    return item.id;
  }
}
