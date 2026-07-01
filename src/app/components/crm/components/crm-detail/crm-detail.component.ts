import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CrmService } from '../../services/crm.service';
import { CorporateConfigService } from '../../../ventas/clientes/services/corporate-config.service';
import { ClientTag } from '../../../ventas/clientes/services/client-config.service';
import {
  CrmActivity, CrmTask, getStageSeverity, getPrioritySeverity,
  ACTIVITY_TYPE_OPTIONS, TASK_TYPE_OPTIONS, PRIORITY_OPTIONS,
} from '../../models/crm.models';

@Component({
  selector: 'app-crm-detail',
  templateUrl: './crm-detail.component.html',
  styleUrls: ['./crm-detail.component.scss'],
})
export class CrmDetailComponent implements OnInit, OnDestroy {
  lead: any = null;
  activities: CrmActivity[] = [];
  tasks: CrmTask[] = [];
  stages: string[] = [];
  loading = true;
  activeTab = 0;

  // Forms
  activityForm: FormGroup;
  taskForm: FormGroup;
  showTaskForm = false;

  // Editar lead
  showEditDialog = false;
  saving = false;
  editForm: FormGroup;
  clientTagsCatalog: ClientTag[] = [];
  etiquetasSeleccionadas: string[] = [];

  // Options
  activityTypes = ACTIVITY_TYPE_OPTIONS;
  taskTypes = TASK_TYPE_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;
  readonly tipoDocOptions = [
    { label: 'CC — Cédula de ciudadanía', value: 'CC' },
    { label: 'NIT', value: 'NIT' },
    { label: 'TI — Tarjeta de identidad', value: 'TI' },
    { label: 'CE — Cédula de extranjería', value: 'CE' },
    { label: 'PA — Pasaporte', value: 'PA' },
    { label: 'RC — Registro civil', value: 'RC' },
    { label: 'TE — Tarjeta de extranjería', value: 'TE' },
    { label: 'PEP — Permiso Especial de Permanencia', value: 'PEP' },
    { label: 'PPT — Permiso por Protección Temporal', value: 'PPT' },
    { label: 'DIE — Doc. identificación extranjero', value: 'DIE' },
    { label: 'NIT_EXT — NIT de otro país', value: 'NIT_EXT' },
    { label: 'NUIP', value: 'NUIP' },
  ];

  private entityId = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private crmService: CrmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private corpConfig: CorporateConfigService,
  ) {
    this.activityForm = this.fb.group({
      type: ['note'],
      description: ['', Validators.required],
      detail: [''],
    });
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      type: ['follow_up'],
      priority: ['medium'],
      dueDate: [null],
      description: [''],
    });
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      tipoDocumento: ['CC'],
      nit: [''],
      productoInteres: [''],
      etiquetas: [[]],
    });
  }

  ngOnInit(): void {
    this.entityId = this.route.snapshot.paramMap.get('id') || '';
    // Deep-link: ?tab=tasks abre directo la pestaña Tareas (índice 2)
    if (this.route.snapshot.queryParamMap.get('tab') === 'tasks') {
      this.activeTab = 2;
    }
    this.loadStages();
    this.loadLead();

    this.corpConfig.loadTags()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tags => { this.clientTagsCatalog = tags; });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Data ──────────────────────────────────────────────────

  loadStages(): void {
    this.crmService.getStages()
      .pipe(takeUntil(this.destroy$))
      .subscribe(r => { this.stages = r.stages; });
  }

  loadLead(): void {
    this.loading = true;
    this.crmService.getLead(this.entityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.loading = false;
        if (!res.success || !res.data) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo cargar el lead. Verifica que el backend esté corriendo.',
            life: 5000,
          });
          return;
        }
        this.lead = res.data;
        this.activities = res.data.activities || [];
        this.tasks = res.data.tasks || [];
      });
  }

  // ─── Pipeline ──────────────────────────────────────────────

  changeStage(newStage: string): void {
    this.crmService.updatePipeline(this.entityId, { stage: newStage })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.success) {
          if (this.lead.pipeline) this.lead.pipeline.stage = newStage;
          this.messageService.add({ severity: 'success', summary: 'Etapa actualizada' });
          this.loadActivities();
        }
      });
  }

  updateField(field: string, value: any): void {
    this.crmService.updatePipeline(this.entityId, { [field]: value })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.success) {
          this.messageService.add({ severity: 'success', summary: 'Actualizado' });
        }
      });
  }

  // ─── Editar datos del lead ─────────────────────────────────

  openEditDialog(): void {
    const e = this.lead?.entity || {};
    this.etiquetasSeleccionadas = Array.isArray(e.etiquetas) ? [...e.etiquetas] : [];
    this.editForm.reset({
      name: this.entityName,
      email: e.email || e.correo_electronico_comprador || '',
      phone: e.phone || e.numero_celular_comprador || '',
      tipoDocumento: e.tipo_documento_comprador || 'CC',
      nit: e.nit || e.documento || '',
      productoInteres: e.productoInteres || '',
      etiquetas: [...this.etiquetasSeleccionadas],
    });
    this.showEditDialog = true;
  }

  submitEdit(): void {
    if (this.editForm.invalid) return;
    this.saving = true;
    this.crmService.updateLead(this.entityId, this.editForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.saving = false;
        if (res.success) {
          this.showEditDialog = false;
          this.messageService.add({ severity: 'success', summary: 'Lead actualizado' });
          this.loadLead();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar el lead' });
        }
      });
  }

  toggleEtiqueta(nombre: string): void {
    const idx = this.etiquetasSeleccionadas.indexOf(nombre);
    if (idx >= 0) this.etiquetasSeleccionadas.splice(idx, 1);
    else this.etiquetasSeleccionadas.push(nombre);
    this.editForm.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);
  }

  tieneEtiqueta(nombre: string): boolean {
    return this.etiquetasSeleccionadas.includes(nombre);
  }

  getTagBgColor(color: string): string {
    const map: Record<string, string> = {
      violet: '#ede9fe', green: '#d1fae5', blue: '#dbeafe',
      amber: '#fef3c7', red: '#fee2e2', gray: '#f3f4f6',
    };
    return map[color] || '#f3f4f6';
  }

  getTagFgColor(color: string): string {
    const map: Record<string, string> = {
      violet: '#5b21b6', green: '#065f46', blue: '#1e40af',
      amber: '#92400e', red: '#991b1b', gray: '#374151',
    };
    return map[color] || '#374151';
  }

  getTagColorByName(tagName: string): string {
    return this.clientTagsCatalog.find(t => t.name === tagName)?.color || 'gray';
  }

  // ─── Activities ────────────────────────────────────────────

  loadActivities(): void {
    this.crmService.getActivities(this.entityId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(list => { this.activities = list; });
  }

  addActivity(): void {
    if (this.activityForm.invalid) return;
    this.crmService.addActivity(this.entityId, this.activityForm.value)
      .pipe(takeUntil(this.destroy$))
      .subscribe(activity => {
        if (activity) {
          this.activities = [activity, ...this.activities];
          this.activityForm.reset({ type: 'note', description: '', detail: '' });
          this.messageService.add({ severity: 'success', summary: 'Actividad registrada' });
        }
      });
  }

  // ─── Tasks ─────────────────────────────────────────────────

  createTask(): void {
    if (this.taskForm.invalid) return;
    const data = { ...this.taskForm.value };
    if (data.dueDate instanceof Date) data.dueDate = data.dueDate.toISOString();

    this.crmService.createTask(this.entityId, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe(task => {
        if (task) {
          this.tasks = [task, ...this.tasks];
          this.taskForm.reset({ type: 'follow_up', priority: 'medium' });
          this.showTaskForm = false;
          this.messageService.add({ severity: 'success', summary: 'Tarea creada' });
        }
      });
  }

  completeTask(task: CrmTask): void {
    this.confirmationService.confirm({
      message: `¿Marcar la tarea "${task.title}" como completada?`,
      header: 'Confirmar',
      icon: 'pi pi-question-circle',
      acceptLabel: 'Sí, completar',
      rejectLabel: 'Cancelar',
      accept: () => this.doCompleteTask(task),
    });
  }

  private doCompleteTask(task: CrmTask): void {
    this.crmService.updateTask(task.id, { status: 'completed' })
      .pipe(takeUntil(this.destroy$))
      .subscribe(updated => {
        if (updated) {
          const idx = this.tasks.findIndex(t => t.id === task.id);
          if (idx >= 0) this.tasks[idx] = updated;
          this.messageService.add({ severity: 'success', summary: 'Tarea completada' });
        }
      });
  }

  // ─── Helpers ───────────────────────────────────────────────

  get currentStage(): string {
    return this.lead?.pipeline?.stage || (this.lead?.entityType === 'company' ? 'registro' : 'nuevo');
  }

  get entityName(): string {
    const e = this.lead?.entity;
    if (!e) return '';
    return e.nomComercial || e.nombre || e.nombres_completos || 'Sin nombre';
  }

  getStageSeverity = getStageSeverity;
  getPrioritySeverity = getPrioritySeverity;

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getActivityIcon(type: string): string {
    const icons: Record<string, string> = {
      note: 'pi-pencil', call: 'pi-phone', email: 'pi-envelope',
      whatsapp: 'pi-comments', meeting: 'pi-users',
      stage_change: 'pi-refresh', task_created: 'pi-plus', task_completed: 'pi-check',
    };
    return 'pi ' + (icons[type] || 'pi-circle');
  }

  goBack(): void {
    this.router.navigate(['/crm/list']);
  }

  trackById(index: number, item: any): string {
    return item.id;
  }
}
