import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { CrmService } from '../../services/crm.service';
import {
  CrmTask, TASK_TYPE_OPTIONS, TASK_PRIORITY_OPTIONS,
  getPrioritySeverity,
} from '../../models/crm.models';

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
})
export class TaskListComponent implements OnInit, OnDestroy {
  @Input() contactId: string = '';
  @Input() tasks: CrmTask[] = [];
  @Output() taskCreated = new EventEmitter<void>();

  taskForm: FormGroup;
  showForm = false;
  submitting = false;
  statusFilter: string = 'pending';

  typeOptions = TASK_TYPE_OPTIONS;
  priorityOptions = TASK_PRIORITY_OPTIONS;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private crmService: CrmService,
    private messageService: MessageService,
  ) {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      type: ['follow_up'],
      priority: ['medium'],
      dueDate: [''],
      dueTime: [''],
    });
  }

  ngOnInit(): void {
    if (!this.contactId && this.tasks.length === 0) {
      this.loadAllTasks();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllTasks(): void {
    const userEmail = this.getUserEmail();
    this.crmService.getTasks({ assignedTo: userEmail, status: this.statusFilter })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.tasks = res.data;
      });
  }

  get filteredTasks(): CrmTask[] {
    if (!this.statusFilter) return this.tasks;
    return this.tasks.filter(t => t.status === this.statusFilter);
  }

  createTask(): void {
    if (this.taskForm.invalid || !this.contactId) return;

    this.submitting = true;
    const formData = { ...this.taskForm.value };

    // Format date to ISO string if it's a Date object
    if (formData.dueDate instanceof Date) {
      formData.dueDate = formData.dueDate.toISOString();
    }

    this.crmService.createTask(this.contactId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe((task) => {
        this.submitting = false;
        if (task) {
          this.tasks = [task, ...this.tasks];
          this.taskForm.reset({ type: 'follow_up', priority: 'medium' });
          this.showForm = false;
          this.messageService.add({ severity: 'success', summary: 'Tarea creada' });
          this.taskCreated.emit();
        }
      });
  }

  completeTask(task: CrmTask): void {
    this.crmService.updateTask(task.id, { status: 'completed' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((updated) => {
        if (updated) {
          const idx = this.tasks.findIndex(t => t.id === task.id);
          if (idx >= 0) this.tasks[idx] = updated;
          this.messageService.add({ severity: 'success', summary: 'Tarea completada' });
        }
      });
  }

  cancelTask(task: CrmTask): void {
    this.crmService.updateTask(task.id, { status: 'cancelled' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((updated) => {
        if (updated) {
          const idx = this.tasks.findIndex(t => t.id === task.id);
          if (idx >= 0) this.tasks[idx] = updated;
        }
      });
  }

  isOverdue(task: CrmTask): boolean {
    if (!task.dueDate || task.status !== 'pending') return false;
    return new Date(task.dueDate) < new Date();
  }

  getTypeLabel(type: string): string {
    const found = TASK_TYPE_OPTIONS.find(o => o.value === type);
    return found ? found.label : type;
  }

  getPrioritySeverity = getPrioritySeverity;

  formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackByTaskId(index: number, item: CrmTask): string {
    return item.id;
  }

  private getUserEmail(): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.email || '';
    } catch { return ''; }
  }
}
