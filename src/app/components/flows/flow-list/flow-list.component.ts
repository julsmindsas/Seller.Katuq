import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FlowsService } from '../services/flows.service';
import { FlowsStateService } from '../services/flows-state.service';
import { FlowSpec, FlowStatus } from '../interfaces/flow.interface';

interface StatusFilterOption {
  value: 'all' | FlowStatus;
  label: string;
}

@Component({
  selector: 'app-flows-list',
  templateUrl: './flow-list.component.html',
  styleUrls: ['./flow-list.component.scss']
})
export class FlowsListComponent implements OnInit, OnDestroy {
  flows: FlowSpec[] = [];
  filteredFlows: FlowSpec[] = [];
  loading = false;
  errorMessage = '';
  statusFilter: 'all' | FlowStatus = 'all';
  search = '';

  readonly statusOptions: StatusFilterOption[] = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'draft', label: 'Borrador' },
    { value: 'error', label: 'Con error' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private flowsService: FlowsService,
    private state: FlowsStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refresh();
    this.state.flows$.pipe(takeUntil(this.destroy$)).subscribe((flows) => {
      this.flows = flows;
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loading = true;
    this.errorMessage = '';
    this.flowsService.list().subscribe({
      next: (flows) => {
        this.state.setFlows(flows);
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo cargar la lista de flows.';
        this.loading = false;
      }
    });
  }

  trackById(_i: number, flow: FlowSpec): string {
    return flow.id;
  }

  applyFilters(): void {
    const q = this.search.trim().toLowerCase();
    this.filteredFlows = this.flows.filter((f) => {
      if (this.statusFilter !== 'all' && f.status !== this.statusFilter) return false;
      if (!q) return true;
      const hay = `${f.name} ${f.description || ''} ${(f.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setStatusFilter(value: 'all' | FlowStatus): void {
    this.statusFilter = value;
    this.applyFilters();
  }

  goToEditor(flow?: FlowSpec): void {
    if (flow) {
      this.router.navigate(['/flows/editor', flow.id]);
    } else {
      this.router.navigate(['/flows/editor']);
    }
  }

  goToRuns(flow: FlowSpec): void {
    this.router.navigate(['/flows/runs', flow.id]);
  }

  goToTemplates(): void {
    this.router.navigate(['/flows/templates']);
  }

  toggleActive(flow: FlowSpec): void {
    const action = flow.status === 'active' ? this.flowsService.deactivate(flow.id) : this.flowsService.activate(flow.id);
    action.subscribe({
      next: (updated) => {
        if (updated) this.state.upsertFlow(updated);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo cambiar el estado del flow.';
      }
    });
  }

  duplicate(flow: FlowSpec): void {
    this.flowsService.duplicate(flow.id).subscribe({
      next: (created) => {
        if (created) {
          this.state.upsertFlow(created);
          this.applyFilters();
        }
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo duplicar el flow.';
      }
    });
  }

  statusBadgeClass(status: FlowStatus): string {
    return `kf-badge kf-badge--${status}`;
  }

  statusLabel(status: FlowStatus): string {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'error':
        return 'Con error';
      case 'draft':
        return 'Borrador';
      default:
        return status;
    }
  }

  borderColor(status: FlowStatus): string {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'inactive':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  }
}
