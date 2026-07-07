import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DragulaService } from 'ng2-dragula';
import { CrmService } from '../../services/crm.service';
import { ClientTag } from '../../../ventas/clientes/services/client-config.service';
import { CorporateConfigService } from '../../../ventas/clientes/services/corporate-config.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { CrmLead, CrmStats, CrmStage, CrmTask, PRIORITY_OPTIONS, getStageSeverity, getPrioritySeverity } from '../../models/crm.models';

@Component({
  selector: 'app-crm-list',
  templateUrl: './crm-list.component.html',
  styleUrls: ['./crm-list.component.scss'],
})
export class CrmListComponent implements OnInit, OnDestroy {
  // Data
  leads: CrmLead[] = [];
  stats: CrmStats | null = null;
  stages: CrmStage[] = [];
  entityType = 'client';
  leadsByStage: Record<string, CrmLead[]> = {};

  // Cerrados (isWon/isLost) — archivados fuera del pipeline activo
  activeTab: 'active' | 'closed' = 'active';
  closedLeads: CrmLead[] = [];
  closedLoaded = false;
  loadingClosed = false;

  // UI
  loading = false;
  searchTerm = '';
  viewMode: 'kanban' | 'table' = 'kanban';
  selectedStage: string | null = null;
  showDashboard = true; // panel "Indicadores de gestión"

  // Tareas pendientes (diálogo desde el badge agregado)
  showTasksDialog = false;
  pendingTasks: CrmTask[] = [];
  loadingTasks = false;

  // Duplicados & eliminación
  showDuplicatesDialog = false;
  duplicateGroups: any[] = [];
  duplicateStats = { totalLeads: 0, duplicateGroups: 0, duplicateLeads: 0 };
  loadingDuplicates = false;
  selectedForDeletion: Set<string> = new Set();
  deletingLeads = false;
  showManageMenu = false;

  // Crear lead
  showCreateDialog = false;
  creating = false;
  createForm: FormGroup;

  // Etiquetas / tags
  clientTagsCatalog: ClientTag[] = [];
  etiquetasSeleccionadas: string[] = [];
  // Filtro por etiqueta (segmentación del pipeline)
  selectedTagNames: string[] = [];
  // Modal de configuración de etiquetas
  showConfigModal = false;
  editableTags: ClientTag[] = [];
  availableColors: string[] = [];
  newTagName = '';
  newTagColor = 'violet';
  // Modal de configuración de etapas (solo administradores)
  canManageStages = false;
  showStagesModal = false;
  editableStages: CrmStage[] = [];
  readonly sourceOptions = [
    { label: 'Redes sociales', value: 'social_media' },
    { label: 'Referido', value: 'referral' },
    { label: 'Búsqueda web', value: 'web' },
    { label: 'Evento / Feria', value: 'event' },
    { label: 'WhatsApp / Email', value: 'whatsapp' },
    { label: 'Visita directa', value: 'direct' },
    { label: 'Otro', value: 'other' },
  ];
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
  readonly priorityOpts = PRIORITY_OPTIONS;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  constructor(
    private crmService: CrmService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private dragulaService: DragulaService,
    private router: Router,
    private corpConfig: CorporateConfigService,
  ) {
    this.canManageStages = this.computeCanManageStages();
    this.createForm = this.fb.group({
      name:            ['', Validators.required],
      tipoDocumento:   ['CC'],
      nit:             [''],
      email:           ['', Validators.email],
      phone:           [''],
      source:          ['other'],
      priority:        ['medium'],
      estimatedValue:  [null],
      productoInteres: [''],
      etiquetas:       [[]],
    });
  }

  private computeCanManageStages(): boolean {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return false;
      const parsedUser = JSON.parse(raw);
      return parsedUser?.rol === 'Administrador' || parsedUser?.rol === 'Super Administrador';
    } catch (_) {
      return false;
    }
  }

  ngOnInit(): void {
    // Debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(term => {
        this.searchTerm = term;
        this.groupByStage();
      });

    // Setup dragula for kanban drag-and-drop
    this.setupDragula();

    // Catálogo de etiquetas PROPIO de corporativos (separado de clientes)
    this.corpConfig.loadTags()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tags => { this.clientTagsCatalog = tags; });

    // Restore cache → kanban visible de inmediato
    this.restoreFromCache();

    // Fetch en paralelo sin bloquear la vista
    forkJoin({
      stages: this.crmService.getStages(),
      leads: this.crmService.getLeads({ limit: 200 }),
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ stages, leads }) => {
          this.stages = stages.stages;
          this.entityType = stages.entityType;
          this.leads = leads.data || [];
          this.groupByStage();
          this.loading = false;
          this.saveToCache();
        },
        error: () => { this.loading = false; },
      });

    this.loadStats();
  }

  private restoreFromCache(): void {
    try {
      const cs = localStorage.getItem('crm_stages_v1');
      const cl = localStorage.getItem('crm_leads_v1');
      if (cs) {
        const s = JSON.parse(cs);
        this.stages = s.stages || [];
        this.entityType = s.entityType || 'client';
      }
      if (cl) {
        this.leads = JSON.parse(cl);
        this.groupByStage();
      }
    } catch (_) {}
  }

  private saveToCache(): void {
    try {
      localStorage.setItem('crm_stages_v1', JSON.stringify({ stages: this.stages, entityType: this.entityType }));
      localStorage.setItem('crm_leads_v1', JSON.stringify(this.leads));
    } catch (_) {}
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // No hacer dragulaService.destroy — la directiva [dragula] maneja el lifecycle
  }

  // ─── Dragula setup ─────────────────────────────────────────

  private setupDragula(): void {
    // Solo escuchar el evento drop — la directiva [dragula] crea el grupo
    this.dragulaService.dropModel('crm-kanban')
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ el, target, item }) => {
        if (!target) return;
        const newStage = target.getAttribute('data-stage');
        const leadId = item?.id || el?.getAttribute('data-lead-id');
        if (leadId && newStage) {
          this.onStageDrop(leadId, newStage);
        }
      });
  }

  // ─── Data ──────────────────────────────────────────────────

  openCreateDialog(): void {
    this.etiquetasSeleccionadas = [];
    this.createForm.reset({ source: 'other', priority: 'medium', tipoDocumento: 'CC', etiquetas: [] });
    this.showCreateDialog = true;
  }

  submitCreate(): void {
    if (this.createForm.invalid) return;
    const firstStage = this.visibleStages[0]?.key || 'nuevo';
    const formData = { ...this.createForm.value, stage: firstStage };

    // Verdadero optimistic update: tarjeta visible ANTES del HTTP call
    const tempId = 'temp-' + Date.now();
    const newLead: any = {
      id: tempId,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      nit: formData.nit || null,
      stage: firstStage,
      priority: formData.priority || 'medium',
      estimatedValue: formData.estimatedValue || 0,
      etiquetas: Array.isArray(formData.etiquetas) ? formData.etiquetas : [],
      activo: true,
      pipelineCreatedAt: new Date().toISOString(),
    };
    this.leads = [newLead, ...this.leads];
    this.groupByStage();
    this.showCreateDialog = false;
    this.creating = true;

    this.crmService.createLead(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        this.creating = false;
        if (res && res.success) {
          // Reemplazar id temporal por el id real del backend
          const realId = res.data?.entityId;
          if (realId) {
            const lead = this.leads.find(l => l.id === tempId);
            if (lead) lead.id = realId;
          }
          this.messageService.add({
            severity: 'success', summary: '¡Lead creado!',
            detail: `${formData.name} fue agregado a "${firstStage}"`,
          });
          this.loadStats();
          this.saveToCache();
        } else {
          // Rollback: quitar la tarjeta optimista
          this.leads = this.leads.filter(l => l.id !== tempId);
          this.groupByStage();
          this.showCreateDialog = true;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo crear el lead. Revisa que el backend esté corriendo.' });
        }
      });
  }

  loadLeads(): void {
    // Solo mostrar spinner si no hay datos en pantalla (e.g. primer load sin caché)
    if (this.leads.length === 0) {
      this.loading = true;
    }
    this.crmService.getLeads({ limit: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.leads = res.data || [];
          this.groupByStage();
          this.loading = false;
          this.saveToCache();
        },
        error: () => { this.loading = false; },
      });
  }

  /** Recarga silenciosa — sin loading spinner. Preserva leads locales que el backend aún no devuelva. */
  private refreshLeads(): void {
    // Delay para que Firestore propague el write antes de leer
    setTimeout(() => {
      this.crmService.getLeads({ limit: 200 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: res => {
            if (!res.data) return;
            const backendIds = new Set(res.data.map((l: any) => l.id));
            // Conservar leads locales con id temporal que el backend aún no conoce
            const localOnly = this.leads.filter(l => !backendIds.has(l.id));
            this.leads = [...localOnly, ...res.data];
            this.groupByStage();
          },
        });
    }, 1500);
  }

  loadStats(): void {
    this.crmService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => { this.stats = stats; });
  }

  setActiveTab(tab: 'active' | 'closed'): void {
    this.activeTab = tab;
    if (tab === 'closed' && !this.closedLoaded) {
      this.loadClosedLeads();
    }
  }

  loadClosedLeads(): void {
    this.loadingClosed = true;
    this.crmService.getLeads({ view: 'closed', limit: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.closedLeads = res.data || [];
          this.closedLoaded = true;
          this.loadingClosed = false;
        },
        error: () => { this.loadingClosed = false; },
      });
  }

  groupByStage(): void {
    let filtered = this.searchTerm
      ? this.leads.filter(l =>
          (l.name || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (l.email || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          (l.nit || '').includes(this.searchTerm)
        )
      : this.leads;

    // Filtro por etiquetas (segmentación): el lead debe tener TODAS las seleccionadas
    if (this.selectedTagNames.length > 0) {
      filtered = filtered.filter(l =>
        this.selectedTagNames.every(tn => (l.etiquetas || []).includes(tn))
      );
    }

    // Ordenar: más recientes primero
    const sorted = [...filtered].sort((a, b) => {
      const da = (a as any).pipelineCreatedAt || '';
      const db2 = (b as any).pipelineCreatedAt || '';
      return da < db2 ? 1 : da > db2 ? -1 : 0;
    });

    this.leadsByStage = {};
    for (const stage of this.stages) {
      this.leadsByStage[stage.key] = sorted.filter(l => l.stage === stage.key);
    }

    // Leads sin stage (o en una etapa desactivada) van a la primera etapa activa
    const firstVisible = this.visibleStages[0];
    const noStage = sorted.filter(l => !this.stages.some(s => s.key === l.stage));
    if (noStage.length > 0 && firstVisible) {
      this.leadsByStage[firstVisible.key] = [
        ...noStage,
        ...(this.leadsByStage[firstVisible.key] || []),
      ];
    }
  }

  get visibleStages(): CrmStage[] {
    return this.stages.filter(s => s.active !== false && !s.isWon && !s.isLost);
  }

  get wonStage(): CrmStage | undefined {
    return this.stages.find(s => s.isWon);
  }

  get lostStage(): CrmStage | undefined {
    return this.stages.find(s => s.isLost);
  }

  /** Cierra un lead directamente desde la card del Kanban, sin abrir el detalle. */
  quickCloseLead(lead: CrmLead, type: 'won' | 'lost', event: Event): void {
    event.stopPropagation();
    const target = type === 'won' ? this.wonStage : this.lostStage;
    if (!target) return;
    this.onStageDrop(lead.id, target.key);
  }

  // ─── Actions ───────────────────────────────────────────────

  onStageDrop(leadId: string, newStage: string): void {
    const stageConfig = this.stages.find(s => s.key === newStage);
    const closing = !!(stageConfig && (stageConfig.isWon || stageConfig.isLost));

    this.crmService.updatePipeline(leadId, { stage: newStage })
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.success) {
          const lead = this.leads.find(l => l.id === leadId);
          if (lead) lead.stage = newStage;

          if (closing && lead) {
            // Sale del pipeline activo: se archiva en "Cerrados"
            this.leads = this.leads.filter(l => l.id !== leadId);
            for (const key of Object.keys(this.leadsByStage)) {
              this.leadsByStage[key] = this.leadsByStage[key].filter(l => l.id !== leadId);
            }
            if (this.closedLoaded) {
              this.closedLeads = [{ ...lead, verifiedBuyer: res.verifiedBuyer, verifiedOrderId: res.verifiedOrderId }, ...this.closedLeads];
            }

            if (stageConfig?.isWon) {
              if (res.verifiedBuyer) {
                this.messageService.add({ severity: 'success', summary: 'Lead cerrado', detail: 'Compra verificada contra los pedidos del cliente.' });
              } else {
                this.messageService.add({ severity: 'warn', summary: 'Lead cerrado', detail: 'No se encontró un pedido asociado. Verifica manualmente.' });
              }
            } else {
              this.messageService.add({ severity: 'info', summary: 'Lead archivado como perdido' });
            }
          } else {
            this.messageService.add({ severity: 'success', summary: 'Etapa actualizada' });
          }
          this.loadStats();
        } else {
          // Revert: reload
          this.loadLeads();
        }
      });
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  viewDetail(lead: CrmLead): void {
    this.router.navigate(['/crm/detail', lead.id]);
  }

  // ─── Etiquetas (picker en el form de Nuevo lead) ───────────

  toggleEtiqueta(nombre: string): void {
    const idx = this.etiquetasSeleccionadas.indexOf(nombre);
    if (idx >= 0) this.etiquetasSeleccionadas.splice(idx, 1);
    else this.etiquetasSeleccionadas.push(nombre);
    this.createForm.controls['etiquetas'].setValue([...this.etiquetasSeleccionadas]);
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

  // ─── Configuración del catálogo de etiquetas ───────────────

  abrirConfigModal(): void {
    this.editableTags = this.corpConfig.getTags().map(t => ({ ...t }));
    this.availableColors = this.corpConfig.getColors();
    this.newTagName = '';
    this.newTagColor = 'violet';
    this.showConfigModal = true;
  }

  cerrarConfigModal(): void {
    this.showConfigModal = false;
  }

  addTag(): void {
    const name = this.newTagName.trim();
    if (name && !this.editableTags.find(t => t.name === name)) {
      this.editableTags.push({ name, color: this.newTagColor });
    }
    this.newTagName = '';
  }

  removeTag(index: number): void {
    const tag = this.editableTags[index];
    Swal.fire({
      title: `¿Eliminar etiqueta "${tag.name}"?`,
      text: 'Se quitará de todos los leads/clientes que la tengan asignada. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const container = document.querySelector('.swal2-container') as HTMLElement;
        if (container) container.style.zIndex = '99999';
      },
    }).then(result => {
      if (!result.isConfirmed) return;
      this.editableTags.splice(index, 1);
      this.corpConfig.saveTags(this.editableTags).subscribe();
      this.corpConfig.removeTag(tag.name).subscribe(() => {
        this.clientTagsCatalog = [...this.corpConfig.getTags()];
        this.selectedTagNames = this.selectedTagNames.filter(n => n !== tag.name);
        this.etiquetasSeleccionadas = this.etiquetasSeleccionadas.filter(n => n !== tag.name);
        this.leads = this.leads.map(l => ({
          ...l,
          etiquetas: Array.isArray(l.etiquetas) ? l.etiquetas.filter(e => e !== tag.name) : [],
        }));
        this.groupByStage();
      });
    });
  }

  guardarConfig(): void {
    this.addTag();
    this.corpConfig.saveTags(this.editableTags).subscribe(() => {
      this.clientTagsCatalog = [...this.corpConfig.getTags()];
      this.showConfigModal = false;
      this.messageService.add({
        severity: 'success', summary: 'Configuración guardada',
        detail: 'Etiquetas actualizadas correctamente.', life: 3000,
      });
    });
  }

  // ─── Configuración de etapas del pipeline (solo administradores) ───
  // Las etapas son predeterminadas y con nombres fijos (estándar de la industria).
  // El comercio solo puede activar/desactivar cuáles usar, no renombrarlas ni reordenarlas.

  abrirEtapasModal(): void {
    this.editableStages = this.stages.map(s => ({ ...s }));
    this.showStagesModal = true;
  }

  cerrarEtapasModal(): void {
    this.showStagesModal = false;
  }

  toggleStageActive(index: number): void {
    // El ngModel del p-inputSwitch ya actualizó stage.active al nuevo valor antes de este callback.
    const stage = this.editableStages[index];
    if (stage.active === false) {
      const count = (this.leadsByStage[stage.key] || []).length;
      if (count > 0) {
        stage.active = true; // revertir mientras se confirma
        Swal.fire({
          title: `¿Desactivar "${stage.label}"?`,
          text: `Hay ${count} lead(s) en esta etapa. Al desactivarla dejará de mostrarse en el pipeline, pero los leads conservan su información.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',
          confirmButtonText: 'Sí, desactivar',
          cancelButtonText: 'Cancelar',
          didOpen: () => {
            const container = document.querySelector('.swal2-container') as HTMLElement;
            if (container) container.style.zIndex = '99999';
          },
        }).then(result => {
          if (result.isConfirmed) stage.active = false;
        });
      }
    }
  }

  guardarEtapas(): void {
    if (!this.editableStages.some(s => s.active !== false)) {
      this.messageService.add({ severity: 'warn', summary: 'Atención', detail: 'Debe quedar al menos una etapa activa.' });
      return;
    }
    this.crmService.saveStages(this.editableStages).subscribe(success => {
      if (success) {
        this.stages = this.editableStages.map(s => ({ ...s }));
        this.groupByStage();
        this.showStagesModal = false;
        this.messageService.add({
          severity: 'success', summary: 'Configuración guardada',
          detail: 'Etapas actualizadas correctamente.', life: 3000,
        });
      } else {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar las etapas.' });
      }
    });
  }

  // ─── Filtro por etiqueta (segmentación del pipeline) ───────

  toggleTagFilter(tagName: string): void {
    const idx = this.selectedTagNames.indexOf(tagName);
    if (idx >= 0) this.selectedTagNames.splice(idx, 1);
    else this.selectedTagNames.push(tagName);
    this.groupByStage();
  }

  // ─── Tareas pendientes ─────────────────────────────────────

  /** Abre el diálogo con las tareas pendientes del pipeline (badge agregado). */
  openPendingTasks(): void {
    this.showTasksDialog = true;
    this.loadingTasks = true;
    this.crmService.getTasks({ status: 'pending' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: tasks => { this.pendingTasks = tasks || []; this.loadingTasks = false; },
        error: () => { this.pendingTasks = []; this.loadingTasks = false; },
      });
  }

  /** Nombre del lead dueño de la tarea (para mostrar en el diálogo). */
  taskLeadName(task: CrmTask): string {
    return this.leads.find(l => l.id === task.entityId)?.name || 'Lead';
  }

  /** Va al detalle del lead de la tarea, abriendo la pestaña Tareas. */
  goToTaskLead(task: CrmTask): void {
    this.showTasksDialog = false;
    this.router.navigate(['/crm/detail', task.entityId], { queryParams: { tab: 'tasks' } });
  }

  // ─── Helpers ───────────────────────────────────────────────

  getStageSeverity = getStageSeverity;
  getPrioritySeverity = getPrioritySeverity;

  capitalize(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  getStageLabel(key: string): string {
    return this.stages.find(s => s.key === key)?.label || this.capitalize(key);
  }

  getStageCount(stage: string): number {
    return (this.leadsByStage[stage] || []).length;
  }

  getTitle(): string {
    if (this.entityType === 'company') return 'Pipeline Empresas';
    if (this.entityType === 'corporate') return 'Pipeline Corporativos';
    return 'Pipeline Clientes';
  }

  trackById(index: number, item: CrmLead): string {
    return item.id;
  }

  getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      // Company stages
      registro: '#6b7280', contactado: '#3b82f6', demo: '#8b5cf6',
      trial: '#D35400', activo: '#27AE60', premium: '#7c3aed', churned: '#d12b38',
      // Client stages
      nuevo: '#6b7280', calificado: '#27AE60', propuesta: '#3b82f6',
      negociacion: '#D35400', convertido: '#7c3aed', perdido: '#d12b38',
    };
    return colors[stage] || '#6b7280';
  }

  getStageBgColor(stage: string): string {
    const colors: Record<string, string> = {
      registro: '#f1f3f5', contactado: '#eff6ff', demo: '#f5f3ff',
      trial: '#fff7ed', activo: '#f0fdf4', premium: '#faf5ff', churned: '#fef2f2',
      nuevo: '#f1f3f5', calificado: '#f0fdf4', propuesta: '#eff6ff',
      negociacion: '#fff7ed', convertido: '#faf5ff', perdido: '#fef2f2',
    };
    return colors[stage] || '#f1f3f5';
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente',
    };
    return labels[priority] || priority;
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      low: '#6b7280', medium: '#D35400', high: '#d12b38', urgent: '#d12b38',
    };
    return colors[priority] || '#6b7280';
  }

  getPriorityBgColor(priority: string): string {
    const colors: Record<string, string> = {
      low: '#f1f3f5', medium: '#fff7ed', high: '#fef2f2', urgent: '#fef2f2',
    };
    return colors[priority] || '#f1f3f5';
  }

  getStageValue(stage: string): number {
    return (this.leadsByStage[stage] || []).reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  }

  get filteredLeads(): CrmLead[] {
    let list = this.leads;
    if (this.selectedStage) {
      list = list.filter(l => l.stage === this.selectedStage);
    }
    if (this.searchTerm) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(l =>
        (l.name || '').toLowerCase().includes(t) ||
        (l.email || '').toLowerCase().includes(t) ||
        (l.nit || '').includes(t)
      );
    }
    // Filtro por etiquetas (segmentación) — aplica también a la vista tabla
    if (this.selectedTagNames.length > 0) {
      list = list.filter(l =>
        this.selectedTagNames.every(tn => (l.etiquetas || []).includes(tn))
      );
    }
    return list;
  }

  onStageFilter(): void {
    this.groupByStage();
  }

  formatCurrency(value: number): string {
    if (!value) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(value);
  }

  // ─── Export ────────────────────────────────────────────────

  exportToExcel(): void {
    const data = this.filteredLeads.map(l => ({
      'Nombre': l.name || '',
      'Email': l.email || '',
      'Teléfono': l.phone || '',
      'NIT/Doc': l.nit || '',
      'Etapa': this.getStageLabel(l.stage),
      'Prioridad': l.priority || '',
      'Asignado': l.assignedTo || '',
      'Valor Estimado': l.estimatedValue || 0,
      'Plan': l.subscriptionPlan || '',
      'Estado': l.activo ? 'Activo' : 'Inactivo',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 }, { wch: 28 }, { wch: 16 }, { wch: 14 },
      { wch: 14 }, { wch: 10 }, { wch: 22 }, { wch: 16 },
      { wch: 10 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CRM Pipeline');

    const ts = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `crm-pipeline-${ts}.xlsx`);
    this.messageService.add({ severity: 'success', summary: 'Exportado', detail: `${data.length} leads exportados` });
  }

  // ─── Import ────────────────────────────────────────────────

  onFileImport(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          this.messageService.add({ severity: 'warn', summary: 'Archivo vacío' });
          return;
        }

        // Detect column mapping from headers
        const columns = Object.keys(rows[0]);
        const mapping = this.detectColumnMapping(columns);

        let imported = 0;
        let skipped = 0;
        const total = rows.length;

        this.messageService.add({
          severity: 'info', summary: 'Importando', detail: `Procesando ${total} registros...`,
        });

        rows.forEach((row, i) => {
          const name = this.getRowValue(row, mapping.name);
          if (!name) { skipped++; return; }

          const leadData: any = {
            name,
            email: this.getRowValue(row, mapping.email) || null,
            phone: this.cleanPhone(this.getRowValue(row, mapping.phone)),
            source: this.detectSource(row, mapping),
            stage: this.mapImportStage(this.getRowValue(row, mapping.stage)),
            priority: 'medium',
            // Extra data from Facebook Ads or custom formats
            notes: this.buildImportNotes(row, mapping),
          };

          // Check if exists by email or phone
          const existing = this.leads.find(l =>
            (leadData.email && l.email?.toLowerCase() === leadData.email.toLowerCase()) ||
            (leadData.phone && l.phone === leadData.phone) ||
            (l.name?.toLowerCase() === name.toLowerCase())
          );

          if (existing) {
            // Update pipeline for existing lead
            this.crmService.updatePipeline(existing.id, {
              stage: leadData.stage !== this.stages[0]?.key ? leadData.stage : undefined,
              source: leadData.source,
            }).pipe(takeUntil(this.destroy$)).subscribe();
          } else {
            // Create new lead via import endpoint
            this.crmService.importLead(leadData)
              .pipe(takeUntil(this.destroy$)).subscribe();
          }
          imported++;
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Importación completada',
          detail: `${imported} procesados, ${skipped} sin nombre (omitidos)`,
          life: 5000,
        });

        // Reload after a delay to let backend process
        setTimeout(() => this.loadLeads(), 2000);
        setTimeout(() => this.loadStats(), 2500);
      } catch (err) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo leer el archivo' });
      }

      event.target.value = '';
    };

    reader.readAsBinaryString(file);
  }

  /**
   * Detect which columns map to which CRM fields.
   * Handles: Facebook Ads, Katuq export, generic CSV, any format.
   */
  private detectColumnMapping(columns: string[]): Record<string, string | null> {
    const find = (patterns: string[]): string | null => {
      for (const col of columns) {
        const lower = col.toLowerCase().replace(/[_\-\.]/g, ' ').trim();
        for (const p of patterns) {
          if (lower.includes(p)) return col;
        }
      }
      return null;
    };

    return {
      name: find(['nombre completo', 'nombre_completo', 'full name', 'nombre', 'name', 'empresa', 'company']),
      email: find(['correo', 'email', 'e-mail', 'mail']),
      phone: find(['teléfono', 'telefono', 'número de teléfono', 'numero de telefono', 'phone', 'celular', 'cel', 'whatsapp']),
      stage: find(['etapa', 'stage', 'lead status', 'lead_status', 'status', 'estado']),
      role: find(['rol', 'role', 'cargo', 'cuál es tu rol']),
      employees: find(['personas', 'empleados', 'employees', 'cuántas personas']),
      operating: find(['operación', 'operacion', 'operating', 'actualmente']),
      campaign: find(['campaign name', 'campaign_name', 'campaña']),
      adName: find(['ad name', 'ad_name', 'anuncio']),
      source: find(['platform', 'plataforma', 'fuente', 'source']),
    };
  }

  private getRowValue(row: any, columnName: string | null): string {
    if (!columnName) return '';
    const val = row[columnName];
    return val != null ? String(val).trim() : '';
  }

  private cleanPhone(phone: string): string | null {
    if (!phone) return null;
    // Remove everything except digits and +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Add Colombia prefix if needed
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      cleaned = '+57' + cleaned;
    }
    return cleaned || null;
  }

  private detectSource(row: any, mapping: Record<string, string | null>): string {
    const platform = this.getRowValue(row, mapping.source).toLowerCase();
    const campaign = this.getRowValue(row, mapping.campaign).toLowerCase();

    if (platform.includes('facebook') || platform.includes('instagram') || campaign) return 'social_media';
    if (platform.includes('google')) return 'web';
    return 'manual';
  }

  private buildImportNotes(row: any, mapping: Record<string, string | null>): string {
    const parts: string[] = [];
    const role = this.getRowValue(row, mapping.role);
    const employees = this.getRowValue(row, mapping.employees);
    const operating = this.getRowValue(row, mapping.operating);
    const campaign = this.getRowValue(row, mapping.campaign);
    const adName = this.getRowValue(row, mapping.adName);

    if (role) parts.push(`Rol: ${role}`);
    if (employees) parts.push(`Empleados: ${employees}`);
    if (operating) parts.push(`En operación: ${operating}`);
    if (campaign) parts.push(`Campaña: ${campaign}`);
    if (adName) parts.push(`Anuncio: ${adName}`);

    return parts.join(' | ');
  }

  private mapImportStage(value: string): string {
    const v = (value || '').toLowerCase().trim();
    const map: Record<string, string> = {
      'registro': 'registro', 'contactado': 'contactado', 'demo': 'demo',
      'trial': 'trial', 'activo': 'activo', 'premium': 'premium', 'churned': 'churned',
      'nuevo': 'nuevo', 'calificado': 'calificado', 'propuesta': 'propuesta',
      'negociacion': 'negociacion', 'negociación': 'negociacion',
      'convertido': 'convertido', 'perdido': 'perdido',
    };
    return map[v] || this.stages[0]?.key || 'nuevo';
  }

  // ─── Duplicados & Eliminación ─────────────────────────────

  openDuplicatesDialog(): void {
    this.showDuplicatesDialog = true;
    this.loadingDuplicates = true;
    this.selectedForDeletion.clear();

    this.crmService.findDuplicates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.duplicateGroups = res.groups || [];
          this.duplicateStats = {
            totalLeads: res.totalLeads || 0,
            duplicateGroups: res.duplicateGroups || 0,
            duplicateLeads: res.duplicateLeads || 0,
          };
          this.loadingDuplicates = false;
        },
        error: () => {
          this.loadingDuplicates = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los duplicados' });
        },
      });
  }

  toggleDuplicateSelection(id: string): void {
    if (this.selectedForDeletion.has(id)) {
      this.selectedForDeletion.delete(id);
    } else {
      this.selectedForDeletion.add(id);
    }
  }

  isDuplicateSelected(id: string): boolean {
    return this.selectedForDeletion.has(id);
  }

  selectAllDuplicatesInGroup(group: any): void {
    // Selecciona todos excepto el primero (se conserva uno)
    group.leads.slice(1).forEach((lead: CrmLead) => {
      this.selectedForDeletion.add(lead.id);
    });
  }

  deselectAllInGroup(group: any): void {
    group.leads.forEach((lead: CrmLead) => {
      this.selectedForDeletion.delete(lead.id);
    });
  }

  deleteSelectedDuplicates(): void {
    const ids = Array.from(this.selectedForDeletion);
    if (ids.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Selecciona leads', detail: 'Marca los leads que deseas eliminar' });
      return;
    }

    this.confirmationService.confirm({
      message: `¿Eliminar ${ids.length} lead(s) seleccionado(s)? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deletingLeads = true;
        this.crmService.bulkDeleteLeads(ids)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              this.deletingLeads = false;
              if (res.success) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Eliminados',
                  detail: `${res.deleted} lead(s) eliminado(s)${res.failed ? `, ${res.failed} fallido(s)` : ''}`,
                });
                this.selectedForDeletion.clear();
                this.showDuplicatesDialog = false;
                this.loadLeads();
                this.loadStats();
              }
            },
            error: () => {
              this.deletingLeads = false;
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron eliminar los leads' });
            },
          });
      },
    });
  }

  deleteSingleLead(lead: CrmLead, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: `¿Eliminar "${lead.name}"? Se borrarán también sus actividades y tareas.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.crmService.deleteLead(lead.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res.success) {
                this.leads = this.leads.filter(l => l.id !== lead.id);
                this.groupByStage();
                this.loadStats();
                this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: `"${lead.name}" eliminado` });
              }
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el lead' });
            },
          });
      },
    });
  }

  // Seleccionar/deseleccionar leads en tabla
  toggleTableSelection(lead: CrmLead): void {
    this.toggleDuplicateSelection(lead.id);
  }

  get selectedCount(): number {
    return this.selectedForDeletion.size;
  }

  clearSelection(): void {
    this.selectedForDeletion.clear();
  }

  deleteSelectedFromTable(): void {
    this.deleteSelectedDuplicates();
  }
}
