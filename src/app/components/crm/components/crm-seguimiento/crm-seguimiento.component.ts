import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CrmService } from '../../services/crm.service';
import { CrmLead, CrmTask, getPrioritySeverity } from '../../models/crm.models';

type OverdueTask = CrmTask & { _daysOverdue: number };

@Component({
  selector: 'app-crm-seguimiento',
  templateUrl: './crm-seguimiento.component.html',
  styleUrls: ['./crm-seguimiento.component.scss'],
})
export class CrmSeguimientoComponent implements OnInit, OnDestroy {
  loading = false;
  overdueTasks: OverdueTask[] = [];

  private leadsById: Record<string, CrmLead> = {};
  private destroy$ = new Subject<void>();

  getPrioritySeverity = getPrioritySeverity;

  constructor(private crmService: CrmService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    forkJoin({
      leads: this.crmService.getLeads({ limit: 300 }),
      tasks: this.crmService.getTasks({ status: 'pending' }),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ leads, tasks }) => {
          this.leadsById = {};
          (leads.data || []).forEach(l => { this.leadsById[l.id] = l; });

          const now = Date.now();
          this.overdueTasks = (tasks || [])
            .filter(t => t.dueDate && new Date(t.dueDate).getTime() < now)
            .map(t => ({
              ...t,
              _daysOverdue: Math.floor((now - new Date(t.dueDate as string).getTime()) / 86400000),
            }))
            .sort((a, b) => b._daysOverdue - a._daysOverdue);

          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
  }

  leadName(task: CrmTask): string {
    return this.leadsById[task.entityId]?.name || 'Lead';
  }

  goToTask(task: CrmTask): void {
    this.router.navigate(['/crm/detail', task.entityId], { queryParams: { tab: 'tasks' } });
  }

  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
