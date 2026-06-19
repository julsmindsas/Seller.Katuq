import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService, LazyLoadEvent } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { IntegrationsService } from '../integrations.service';

@Component({
  selector: 'app-sync-logs',
  templateUrl: './sync-logs.component.html',
  styleUrls: ['./sync-logs.component.css'],
  providers: [MessageService]
})
export class SyncLogsComponent implements OnInit, OnDestroy {
  events: any[] = [];
  totalRecords = 0;
  loading = true;
  selectedEvent: any = null;
  showDetailDialog = false;
  reprocessing = false;

  // Filters
  typeFilter = '';
  statusFilter = '';
  dateRange: Date[] = [];

  // Pagination
  rows = 10;
  first = 0;

  typeOptions = [
    { label: 'Todos', value: '' },
    { label: 'Productos', value: 'product' },
    { label: 'Ordenes', value: 'order' },
    { label: 'Inventario', value: 'inventory' }
  ];

  statusOptions = [
    { label: 'Todos', value: '' },
    { label: 'Exitoso', value: 'success' },
    { label: 'Error', value: 'error' },
    { label: 'Pendiente', value: 'pending' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private integrationsService: IntegrationsService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLogs(event?: LazyLoadEvent): void {
    this.loading = true;

    if (event) {
      this.first = event.first || 0;
      this.rows = event.rows || 10;
    }

    const page = Math.floor(this.first / this.rows) + 1;

    const filters: any = {
      page,
      limit: this.rows
    };
    if (this.typeFilter) filters.type = this.typeFilter;
    if (this.statusFilter) filters.status = this.statusFilter;
    if (this.dateRange && this.dateRange.length === 2) {
      if (this.dateRange[0]) filters.dateFrom = this.dateRange[0].toISOString();
      if (this.dateRange[1]) filters.dateTo = this.dateRange[1].toISOString();
    }

    this.integrationsService.getShopifySyncLogs(filters)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loading = false; })
      )
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.events = response.data || [];
            this.totalRecords = response.total || 0;
          } else {
            this.events = [];
            this.totalRecords = 0;
          }
        },
        error: () => {
          this.events = [];
          this.totalRecords = 0;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los logs de sincronizacion'
          });
        }
      });
  }

  onFilterChange(): void {
    this.first = 0;
    this.loadLogs();
  }

  clearFilters(): void {
    this.typeFilter = '';
    this.statusFilter = '';
    this.dateRange = [];
    this.first = 0;
    this.loadLogs();
  }

  showDetail(event: any): void {
    this.selectedEvent = event;
    this.showDetailDialog = true;
  }

  reprocessEvent(event: any): void {
    this.reprocessing = true;
    const resource = event.type === 'product' ? 'products' :
                     event.type === 'order' ? 'orders' : 'inventory';

    this.integrationsService.triggerShopifySync(resource)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.reprocessing = false; })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Reprocesamiento iniciado',
            detail: 'Se inicio el reprocesamiento del evento'
          });
          this.showDetailDialog = false;
          setTimeout(() => this.loadLogs(), 2000);
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo reprocesar el evento'
          });
        }
      });
  }

  getStatusSeverity(status: string): string {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'pending': return 'warning';
      default: return 'info';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'success': return 'Exitoso';
      case 'error': return 'Error';
      case 'pending': return 'Pendiente';
      default: return status;
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'product': return 'Productos';
      case 'order': return 'Ordenes';
      case 'inventory': return 'Inventario';
      default: return type;
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'product': return 'pi pi-box';
      case 'order': return 'pi pi-shopping-cart';
      case 'inventory': return 'pi pi-database';
      default: return 'pi pi-sync';
    }
  }

  formatJson(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
}
