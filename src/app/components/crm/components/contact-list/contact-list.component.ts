import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService, ConfirmationService, LazyLoadEvent } from 'primeng/api';
import * as XLSX from 'xlsx';

import { CrmService } from '../../services/crm.service';
import {
  CrmContact,
  CrmStats,
  CrmContactFilters,
  ContactStatus,
  CONTACT_STATUS_OPTIONS,
  CONTACT_SOURCE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  getStatusSeverity,
  getStatusLabel,
  getPrioritySeverity,
} from '../../models/crm.models';

@Component({
  selector: 'app-contact-list',
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss'],
})
export class ContactListComponent implements OnInit, OnDestroy {

  // ─── Data ─────────────────────────────────────────────────
  contacts: CrmContact[] = [];
  stats: CrmStats | null = null;

  // ─── UI State ─────────────────────────────────────────────
  loading = true;
  totalRecords = 0;
  currentPage = 1;
  pageSize = 20;
  first = 0;
  exportingToExcel = false;

  // ─── Filters ──────────────────────────────────────────────
  filters: CrmContactFilters = {};
  searchTerm = '';
  selectedContacts: CrmContact[] = [];
  selectedStatus: ContactStatus | null = null;
  selectedSource: string | null = null;
  selectedPriority: string | null = null;
  dateFrom: Date | null = null;
  dateTo: Date | null = null;

  // ─── Dropdown Options ─────────────────────────────────────
  statusOptions = CONTACT_STATUS_OPTIONS;
  sourceOptions = CONTACT_SOURCE_OPTIONS;
  priorityOptions = TASK_PRIORITY_OPTIONS;

  // ─── View ─────────────────────────────────────────────────
  viewMode: 'table' | 'cards' = 'table';
  isSuperAdmin = false;

  // ─── Cleanup ──────────────────────────────────────────────
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private crmService: CrmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
  ) {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.filters.search = term;
        this.loadContacts(true);
      });
  }

  // ═══════════════════════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.checkSuperAdmin();
    this.loadContacts();
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════════════════════

  loadContacts(resetPage = false): void {
    if (resetPage) {
      this.currentPage = 1;
      this.first = 0;
    }

    this.loading = true;

    const params: CrmContactFilters = {
      ...this.filters,
      page: this.currentPage,
      limit: this.pageSize,
    };

    this.crmService.getContacts(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.contacts = response.data || [];
          this.totalRecords = response.pagination?.total || 0;
          this.loading = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudieron cargar los contactos',
          });
          this.contacts = [];
          this.totalRecords = 0;
          this.loading = false;
        },
      });
  }

  loadStats(): void {
    this.crmService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.stats = data;
        },
        error: () => {
          // Stats are non-critical, fail silently
        },
      });
  }

  // ═══════════════════════════════════════════════════════════
  //  PAGINATION & SEARCH
  // ═══════════════════════════════════════════════════════════

  onLazyLoad(event: LazyLoadEvent): void {
    const newPageSize = event.rows || this.pageSize;
    const newPage = Math.floor((event.first || 0) / newPageSize) + 1;

    const sizeChanged = newPageSize !== this.pageSize;
    const pageChanged = newPage !== this.currentPage;

    if (sizeChanged || pageChanged) {
      this.pageSize = newPageSize;
      this.currentPage = sizeChanged ? 1 : newPage;
      this.first = sizeChanged ? 0 : (event.first || 0);
      this.loadContacts(false);
    }
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  // ═══════════════════════════════════════════════════════════
  //  FILTERS
  // ═══════════════════════════════════════════════════════════

  applyFilters(): void {
    if (this.selectedStatus) this.filters.status = this.selectedStatus;
    else delete this.filters.status;

    if (this.selectedSource) this.filters.source = this.selectedSource as any;
    else delete this.filters.source;

    if (this.selectedPriority) this.filters.priority = this.selectedPriority as any;
    else delete this.filters.priority;

    if (this.dateFrom) this.filters.dateFrom = this.dateFrom.toISOString();
    else delete this.filters.dateFrom;

    if (this.dateTo) this.filters.dateTo = this.dateTo.toISOString();
    else delete this.filters.dateTo;

    this.loadContacts(true);
    this.loadStats();
  }

  clearFilters(): void {
    this.filters = {};
    this.searchTerm = '';
    this.selectedStatus = null;
    this.selectedSource = null;
    this.selectedPriority = null;
    this.dateFrom = null;
    this.dateTo = null;
    this.selectedContacts = [];
    this.loadContacts(true);
    this.loadStats();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.selectedStatus ||
      this.selectedSource ||
      this.selectedPriority ||
      this.dateFrom ||
      this.dateTo
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedStatus) count++;
    if (this.selectedSource) count++;
    if (this.selectedPriority) count++;
    if (this.dateFrom) count++;
    if (this.dateTo) count++;
    return count;
  }

  // ═══════════════════════════════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════════════════════════════

  viewDetail(contact: CrmContact): void {
    this.router.navigate(['/crm/contacts', contact.id]);
  }

  onStatusChange(contact: CrmContact, newStatus: ContactStatus): void {
    this.confirmationService.confirm({
      message: `Cambiar el estado de "${contact.name}" a "${getStatusLabel(newStatus)}"?`,
      header: 'Confirmar cambio de estado',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.crmService.updateContactStatus(contact.id, newStatus)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (success) => {
              if (success) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Estado actualizado',
                  detail: `El contacto se actualizo correctamente`,
                });
                this.loadContacts();
                this.loadStats();
              } else {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo actualizar el estado',
                });
              }
            },
          });
      },
    });
  }

  deleteContact(contact: CrmContact): void {
    this.confirmationService.confirm({
      message: `Eliminar permanentemente al contacto "${contact.name}"?`,
      header: 'Confirmar eliminacion',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.crmService.deleteContact(contact.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (success) => {
              if (success) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Contacto eliminado',
                  detail: `"${contact.name}" fue eliminado`,
                });
                this.loadContacts();
                this.loadStats();
              } else {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: 'No se pudo eliminar el contacto',
                });
              }
            },
          });
      },
    });
  }

  bulkChangeStatus(status: ContactStatus): void {
    if (!this.selectedContacts.length) return;

    const ids = this.selectedContacts.map(c => c.id);

    this.confirmationService.confirm({
      message: `Cambiar el estado de ${ids.length} contacto(s) a "${getStatusLabel(status)}"?`,
      header: 'Cambio masivo de estado',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.crmService.bulkUpdateStatus(ids, status)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              this.messageService.add({
                severity: 'success',
                summary: 'Actualizado',
                detail: `${res.updated} contacto(s) actualizados`,
              });
              this.selectedContacts = [];
              this.loadContacts();
              this.loadStats();
            },
          });
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  EXPORT
  // ═══════════════════════════════════════════════════════════

  exportToExcel(): void {
    this.exportingToExcel = true;

    this.messageService.add({
      severity: 'info',
      summary: 'Exportando',
      detail: 'Generando archivo Excel...',
    });

    this.crmService.exportContacts(this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allContacts) => {
          const excelData: any[][] = [];

          excelData.push(['REPORTE CRM - CONTACTOS']);
          excelData.push([`Generado el: ${this.formatDate(new Date().toISOString())}`]);

          if (this.hasActiveFilters()) {
            const active: string[] = [];
            if (this.selectedStatus) active.push(`Estado: ${getStatusLabel(this.selectedStatus)}`);
            if (this.selectedSource) active.push(`Fuente: ${this.selectedSource}`);
            if (this.searchTerm) active.push(`Busqueda: ${this.searchTerm}`);
            excelData.push([`Filtros: ${active.join(' | ')}`]);
          }

          excelData.push([]);
          excelData.push([
            'ID', 'Nombre', 'Email', 'Telefono', 'Empresa',
            'Estado', 'Fuente', 'Prioridad', 'Asignado',
            'Valor Estimado', 'Fecha Creacion', 'Ultima Actualizacion',
          ]);

          allContacts.forEach(c => {
            excelData.push([
              c.id, c.name, c.email || '', c.phone || '', c.companyName || '',
              getStatusLabel(c.status), c.source, c.priority || '',
              c.assignedTo || '', c.estimatedValue || 0,
              this.formatDate(c.createdAt), this.formatDate(c.updatedAt),
            ]);
          });

          const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(excelData);
          ws['!cols'] = [
            { wch: 24 }, { wch: 22 }, { wch: 26 }, { wch: 16 }, { wch: 20 },
            { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 18 },
            { wch: 16 }, { wch: 20 }, { wch: 20 },
          ];

          const wb: XLSX.WorkBook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Contactos CRM');

          const ts = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
          XLSX.writeFile(wb, `crm-contactos-${ts}.xlsx`);

          this.messageService.add({
            severity: 'success',
            summary: 'Exportacion exitosa',
            detail: `Se exportaron ${allContacts.length} contactos`,
          });
          this.exportingToExcel = false;
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo exportar los datos',
          });
          this.exportingToExcel = false;
        },
      });
  }

  // ═══════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════

  getStatusSeverity(status: ContactStatus): string {
    return getStatusSeverity(status);
  }

  getStatusLabel(status: ContactStatus): string {
    return getStatusLabel(status);
  }

  getPrioritySeverity(priority: string): string {
    return getPrioritySeverity(priority as any);
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    const date = new Date(iso);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getTimeAgo(iso: string): string {
    if (!iso) return '-';

    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays < 30) return `Hace ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    return this.formatDate(iso);
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  trackByContactId(index: number, item: CrmContact): string {
    return item.id;
  }

  setViewMode(mode: 'table' | 'cards'): void {
    this.viewMode = mode;
  }

  formatCurrency(value: number | undefined): string {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // ─── Private helpers ──────────────────────────────────────

  private checkSuperAdmin(): void {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const user = JSON.parse(raw);
        this.isSuperAdmin = user?.rol === 'Super Administrador';
      }
    } catch { /* ignore parse errors */ }
  }
}
