import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import Swal from 'sweetalert2';
import { CrmService } from '../../services/crm.service';
import { CompanyFeaturesService } from '../../../../shared/services/company-features.service';
import { AgendaService } from '../../../agenda/agenda.service';
import { Cita, ConfigAgenda, ServicioAgenda } from '../../../agenda/agenda.models';
import { CorporateConfigService } from '../../../ventas/clientes/services/corporate-config.service';
import { ClientTag } from '../../../ventas/clientes/services/client-config.service';
import {
  CrmActivity, CrmTask, CrmStage, CrmEquipo, getStageSeverity, getPrioritySeverity,
  ACTIVITY_TYPE_OPTIONS, TASK_TYPE_OPTIONS, PRIORITY_OPTIONS,
} from '../../models/crm.models';

import { TranslateService } from '@ngx-translate/core';
import { OpcionesI18n } from '../../../../shared/utils/i18n-opciones';
@Component({
  selector: 'app-crm-detail',
  templateUrl: './crm-detail.component.html',
  styleUrls: ['./crm-detail.component.scss'],
})
export class CrmDetailComponent implements OnInit, OnDestroy {
  lead: any = null;
  activities: CrmActivity[] = [];
  tasks: CrmTask[] = [];
  stages: CrmStage[] = [];
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

  /** Ticket 1064: comerciales para asignar el lead y sus tareas. */
  equipo: CrmEquipo | null = null;
  opcionesComercial: { label: string; value: string | null }[] = [];

  // Options
  activityTypes = new OpcionesI18n(this.translate, ACTIVITY_TYPE_OPTIONS);
  taskTypes = new OpcionesI18n(this.translate, TASK_TYPE_OPTIONS);
  priorityOptions = new OpcionesI18n(this.translate, PRIORITY_OPTIONS);
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

  // D-491: "Agendar" desde la ficha, con la Agenda encendida.
  agendaConfig: ConfigAgenda | null = null;
  agendaServicios: ServicioAgenda[] = [];
  agendarAbierto = false;
  clienteAgenda: { name: string; phone?: string; email?: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private crmService: CrmService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private corpConfig: CorporateConfigService,
    private features: CompanyFeaturesService,
    private agenda: AgendaService,
    private translate: TranslateService,
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
      assignedTo: [null], // ticket 1064
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
    this.crmService.getEquipo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(eq => {
        this.equipo = eq;
        this.opcionesComercial = [
          { label: this.translate.instant('crm.detalle.sinAsignar'), value: null },
          ...eq.comerciales.map(c => ({ label: c.nombre, value: c.email })),
        ];
      });

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
            summary: this.translate.instant('comun.error'),
            detail: this.translate.instant('crm.detalle.noSePudoCargarEl2'),
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

  changeStage(newStage: string, forceClose: boolean = false, forceReason: string = '', lostReason: string = ''): void {
    const stageConfig = this.stages.find(s => s.key === newStage);

    // Etapa perdida: pedir el motivo antes de archivar (control + reactivación).
    if (stageConfig?.isLost && !lostReason) {
      this.promptLostReason(newStage);
      return;
    }

    const payload: Record<string, any> = { stage: newStage };
    if (forceClose) {
      payload.forceClose = true;
      payload.forceReason = forceReason;
    }
    if (lostReason) {
      payload.lostReason = lostReason;
    }

    this.crmService.updatePipeline(this.entityId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.blocked && res.reason === 'not_verified') {
          this.promptForceClose(newStage);
          return;
        }

        if (res.success) {
          if (this.lead.pipeline) {
            this.lead.pipeline.stage = newStage;
            if (stageConfig?.isWon) {
              this.lead.pipeline.verifiedBuyer = res.verifiedBuyer;
              this.lead.pipeline.verifiedOrderId = res.verifiedOrderId;
              this.lead.pipeline.verifiedAt = res.verifiedAt;
              this.lead.pipeline.forcedClose = res.forcedClose;
              this.lead.pipeline.forcedReason = res.forcedReason;
            }
          }

          if (stageConfig?.isWon) {
            if (res.verifiedBuyer) {
              this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.leadCerrado'), detail: this.translate.instant('crm.detalle.compraVerificadaContraLosPedidos') });
            } else if (res.forcedClose) {
              this.messageService.add({ severity: 'warn', summary: this.translate.instant('crm.detalle.leadCerradoForzado'), detail: this.translate.instant('crm.detalle.cierreConfirmadoManualmenteSinPedido') });
            } else {
              this.messageService.add({ severity: 'warn', summary: this.translate.instant('crm.detalle.leadCerrado'), detail: this.translate.instant('crm.detalle.noSeEncontroUnPedido') });
            }
          } else if (stageConfig?.isLost) {
            if (this.lead.pipeline) { this.lead.pipeline.lostReason = res.lostReason ?? lostReason; }
            this.messageService.add({ severity: 'info', summary: this.translate.instant('crm.detalle.leadArchivadoComoPerdido') });
          } else {
            this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.etapaActualizada') });
          }
          this.loadActivities();
        }
      });
  }

  /** Lead sin compra verificada: ofrece forzar el cierre dejando constancia de la razón. */
  private promptForceClose(newStage: string): void {
    Swal.fire({
      icon: 'warning',
      title: this.translate.instant('crm.detalle.noSeEncontroUnaCompra'),
      text: this.translate.instant('crm.detalle.noHayUnPedidoAsociado'),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('crm.detalle.forzarCierreDeTodasFormas'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#d97706',
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: this.translate.instant('crm.detalle.motivoDelCierreForzado'),
        input: 'text',
        inputPlaceholder: this.translate.instant('crm.detalle.ejPagoEnEfectivoFactura'),
        inputValidator: (value) => (!value ? this.translate.instant('crm.detalle.debesIndicarUnMotivoParaForzar') : undefined),
        showCancelButton: true,
        confirmButtonText: this.translate.instant('crm.detalle.confirmarCierre'),
        cancelButtonText: this.translate.instant('comun.cancelar'),
      }).then(reasonResult => {
        if (!reasonResult.isConfirmed || !reasonResult.value) return;
        this.changeStage(newStage, true, reasonResult.value);
      });
    });
  }

  /** Etapa perdida: pide el motivo de la pérdida antes de archivar el lead. */
  private promptLostReason(newStage: string): void {
    Swal.fire({
      icon: 'question',
      title: this.translate.instant('crm.detalle.motivoDeLaPerdida'),
      input: 'text',
      inputPlaceholder: this.translate.instant('crm.detalle.ejPrecioSeFueCon'),
      inputValidator: (value) => (!value ? this.translate.instant('crm.detalle.indicaPorQueSePerdio') : undefined),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('crm.detalle.marcarComoPerdido'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (!result.isConfirmed || !result.value) return;
      this.changeStage(newStage, false, '', result.value);
    });
  }

  /** Ticket 1064: nombre del comercial (o su correo si no está en el equipo). */
  nombreComercial(email?: string | null): string {
    if (!email) return this.translate.instant('crm.detalle.sinAsignar');
    const c = this.equipo?.comerciales.find(x => x.email === String(email).trim().toLowerCase());
    return c ? c.nombre : email;
  }

  /** Ticket 1064: el administrador cambia el comercial del lead. */
  cambiarComercial(email: string | null): void {
    if (!this.lead) return;
    this.lead.pipeline = { ...(this.lead.pipeline || {}), assignedTo: email };
    this.lead.duenoEfectivo = email;
    this.updateField('assignedTo', email);
  }

  /** Ticket 1064: el comercial del lead; si nadie lo decidió, quien lo creó (lo calcula el servidor). */
  get duenoDelLead(): string | null {
    const e = this.lead?.duenoEfectivo !== undefined ? this.lead.duenoEfectivo : this.lead?.pipeline?.assignedTo;
    return e ? String(e).trim().toLowerCase() : null;
  }

  /** Ticket 1064: se ve y se puede escoger el responsable de la tarea. */
  get puedeEscogerResponsable(): boolean {
    return !!this.equipo?.puedeAsignar && this.opcionesComercial.length > 1;
  }

  /**
   * Ticket 1064: al abrir "Nueva tarea", si se puede escoger, queda marcado el
   * comercial del lead (si sigue en el equipo) o quien la crea. Si no se ve el
   * selector, no se llena nada por dentro: la tarea queda de quien la crea.
   */
  toggleTaskForm(): void {
    this.showTaskForm = !this.showTaskForm;
    if (!this.showTaskForm || this.taskForm.value.assignedTo) return;
    if (!this.puedeEscogerResponsable) {
      this.taskForm.patchValue({ assignedTo: null });
      return;
    }
    const enEquipo = (e: string | null) => !!e && this.opcionesComercial.some(o => o.value === e);
    const delLead = this.duenoDelLead;
    const yo = this.equipo?.yo || null;
    this.taskForm.patchValue({ assignedTo: enEquipo(delLead) ? delLead : (enEquipo(yo) ? yo : null) });
  }

  updateField(field: string, value: any): void {
    this.crmService.updatePipeline(this.entityId, { [field]: value })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.success) {
          this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.actualizado') });
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
          this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.leadActualizado') });
          this.loadLead();
        } else {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.detalle.noSePudoActualizarEl') });
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
          this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.actividadRegistrada') });
        } else {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('crm.detalle.noSeGuardoLaActividad'), detail: this.translate.instant('crm.detalle.intentaDeNuevoSiEl') });
        }
      });
  }

  // ─── Tasks ─────────────────────────────────────────────────

  createTask(): void {
    if (this.taskForm.invalid) return;
    const data = { ...this.taskForm.value };
    if (data.dueDate instanceof Date) data.dueDate = data.dueDate.toISOString();
    if (!data.assignedTo || !this.puedeEscogerResponsable) delete data.assignedTo; // queda de quien la crea

    this.crmService.createTask(this.entityId, data)
      .pipe(takeUntil(this.destroy$))
      .subscribe(task => {
        if (task) {
          this.tasks = [task, ...this.tasks];
          this.taskForm.reset({ type: 'follow_up', priority: 'medium', assignedTo: null });
          this.showTaskForm = false;
          this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.tareaCreada') });
        } else {
          // Revisión 1064: antes un rechazo del servidor (p. ej. responsable fuera del equipo) no decía nada.
          this.messageService.add({ severity: 'error', summary: this.translate.instant('crm.detalle.noSeCreoLaTarea'), detail: this.translate.instant('crm.detalle.revisaElResponsableEIntenta') });
        }
      });
  }

  completeTask(task: CrmTask): void {
    this.confirmationService.confirm({
      message: this.translate.instant('crm.detalle.marcarLaTareaComoCompletada', { title: task.title }),
      header: this.translate.instant('comun.confirmar'),
      icon: 'pi pi-question-circle',
      acceptLabel: this.translate.instant('crm.detalle.siCompletar'),
      rejectLabel: this.translate.instant('comun.cancelar'),
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
          this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.tareaCompletada') });
        }
      });
  }

  // ─── Helpers ───────────────────────────────────────────────

  get currentStage(): string {
    return this.lead?.pipeline?.stage || (this.lead?.entityType === 'company' ? 'registro' : 'nuevo');
  }

  get visibleStages(): CrmStage[] {
    return this.stages.filter(s => s.active !== false);
  }

  // ── D-491: Agendar una cita para este cliente ──────────────────────────────

  get agendaActiva(): boolean {
    return this.features.isEnabled('serviceAgenda');
  }

  private clienteParaAgenda(): { name: string; phone?: string; email?: string } {
    const e = this.lead?.entity || {};
    return {
      name: this.entityName,
      phone: e.phone || e.celular || e.telefono || e.numero_celular_comprador || '',
      email: e.email || e.correo_electronico_comprador || '',
    };
  }

  abrirAgendar(): void {
    this.clienteAgenda = this.clienteParaAgenda();
    if (this.agendaConfig) {
      this.agendarAbierto = true;
      return;
    }
    this.agenda.config().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ config, configurada }) => {
        if (!configurada) {
          this.messageService.add({ severity: 'info', summary: this.translate.instant('crm.detalle.agenda'), detail: this.translate.instant('crm.detalle.primeroConfiguraElHorarioDe') });
          return;
        }
        this.agendaConfig = config;
        this.agenda.servicios().pipe(takeUntil(this.destroy$)).subscribe({
          next: (s) => { this.agendaServicios = s; this.agendarAbierto = true; },
          error: () => { this.agendarAbierto = true; },
        });
      },
      error: (e) => {
        this.messageService.add({ severity: 'error', summary: this.translate.instant('crm.detalle.agenda'), detail: e?.error?.message || this.translate.instant('crm.detalle.noPudimosAbrirLaAgenda') });
      },
    });
  }

  alAgendar(c: Cita): void {
    this.agendarAbierto = false;
    this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.detalle.citaAgendada'), detail: `${c.date} · ${c.startTime || c.window || ''}` });
  }

  get entityName(): string {
    const e = this.lead?.entity;
    if (!e) return '';
    return e.nomComercial || e.nombre || e.nombres_completos || this.translate.instant('crm.detalle.sinNombre');
  }

  getStageSeverity = getStageSeverity;
  getPrioritySeverity = getPrioritySeverity;

  getStageLabel(key: string): string {
    return this.stages.find(s => s.key === key)?.label || this.capitalize(key);
  }

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
