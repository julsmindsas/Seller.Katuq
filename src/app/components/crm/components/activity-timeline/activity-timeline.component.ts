import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CrmService } from '../../services/crm.service';
import { CrmActivity, ActivityType } from '../../models/crm.models';

@Component({
  selector: 'app-activity-timeline',
  templateUrl: './activity-timeline.component.html',
  styleUrls: ['./activity-timeline.component.scss'],
})
export class ActivityTimelineComponent implements OnDestroy {
  @Input() contactId: string = '';
  @Input() activities: CrmActivity[] = [];
  @Output() activityAdded = new EventEmitter<void>();

  activityForm: FormGroup;
  submitting = false;

  activityTypes = [
    { label: 'Nota', value: 'note', icon: 'pi pi-pencil' },
    { label: 'Llamada', value: 'call', icon: 'pi pi-phone' },
    { label: 'Email', value: 'email', icon: 'pi pi-envelope' },
    { label: 'WhatsApp', value: 'whatsapp', icon: 'pi pi-comments' },
    { label: 'Reunión', value: 'meeting', icon: 'pi pi-users' },
  ];

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private crmService: CrmService) {
    this.activityForm = this.fb.group({
      type: ['note'],
      description: ['', Validators.required],
      detail: [''],
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addActivity(): void {
    if (this.activityForm.invalid || !this.contactId) return;

    this.submitting = true;
    this.crmService.addActivity(this.contactId, this.activityForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe((activity) => {
        this.submitting = false;
        if (activity) {
          this.activities = [activity, ...this.activities];
          this.activityForm.reset({ type: 'note', description: '', detail: '' });
          this.activityAdded.emit();
        }
      });
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      note: 'pi pi-pencil', call: 'pi pi-phone', email: 'pi pi-envelope',
      whatsapp: 'pi pi-comments', meeting: 'pi pi-users',
      status_change: 'pi pi-refresh', task_created: 'pi pi-plus',
      task_completed: 'pi pi-check',
    };
    return icons[type] || 'pi pi-circle';
  }

  getActivityColor(type: string): string {
    const colors: Record<string, string> = {
      note: '#6b7280', call: '#3b82f6', email: '#8b5cf6',
      whatsapp: '#27AE60', meeting: '#D35400',
      status_change: '#00e5cc', task_created: '#f59e0b',
      task_completed: '#27AE60',
    };
    return colors[type] || '#6b7280';
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  trackByActivityId(index: number, item: CrmActivity): string {
    return item.id;
  }
}
