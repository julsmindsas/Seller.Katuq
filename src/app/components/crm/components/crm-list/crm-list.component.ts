import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin, Observable } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DragulaService } from 'ng2-dragula';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CrmService } from '../../services/crm.service';
import { LeadToSalesService } from '../../services/lead-to-sales.service';
import { LeadFormModalComponent } from '../lead-form-modal/lead-form-modal.component';
import { ClientTag } from '../../../ventas/clientes/services/client-config.service';
import { CorporateConfigService } from '../../../ventas/clientes/services/corporate-config.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { CrmLead, CrmStats, CrmStage, CrmTask, CrmEquipo, PRIORITY_OPTIONS, getStageSeverity, getPrioritySeverity } from '../../models/crm.models';
import { resolverNombreApellido } from '../../../../shared/utils/nombre-apellido.util';

import { TranslateService } from '@ngx-translate/core';
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

  // Tareas pendientes (diálogo desde el badge agregado, reutilizado para citas/vencidas)
  showTasksDialog = false;
  tasksDialogTitle = '';
  pendingTasks: CrmTask[] = [];
  loadingTasks = false;
  myTasksCount = 0;

  // Conversión por vendedor (assignedTo) — se calcula sobre leads ya cargados, sin nuevos endpoints
  showConversionDialog = false;
  loadingConversion = false;
  conversionRows: { assignedTo: string; total: number; won: number; lost: number; rate: number }[] = [];

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
  /** Ticket 1064: equipo comercial y filtro por comercial ('' todos, '__sin__' sin asignar). */
  equipo: CrmEquipo | null = null;
  /** Estado de los interruptores de "Comerciales" (enlazado en ambos sentidos). */
  configEquipo = { crmSoloPropios: false, crmRecordatoriosCorreo: false };
  selectedComercial = '';
  showEquipoModal = false;
  guardandoEquipo = false;
  // Modal de configuración de etiquetas
  showConfigModal = false;
  editableTags: ClientTag[] = [];
  availableColors: string[] = [];
  newTagName = '';
  newTagColor = 'violet';
  // Modal de configuración de etapas (solo administradores)
  canManageStages = false;
  /** Ve las tareas de todo el equipo (administrador, gerente, supervisor…). Ver computeVeEquipo. */
  veEquipo = false;
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
    private ngbModal: NgbModal,
    private leadToSales: LeadToSalesService,
    private translate: TranslateService,
  ) {
    this.canManageStages = this.computeCanManageStages();
    this.veEquipo = this.computeVeEquipo();
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

  /**
   * Administradores y quienes dirigen al equipo (gerente, supervisor, director, jefe,
   * coordinador, líder). Mismo criterio que el backend (`crmAcceso.esRolComercial`): estos
   * roles nunca quedan restringidos a sus propios leads, así que ven las tareas de todos.
   */
  private computeVeEquipo(): boolean {
    if (this.canManageStages) return true;
    try {
      const rol = String(JSON.parse(localStorage.getItem('user') || '{}')?.rol || '')
        .toLowerCase();
      return /administrador|director|gerente|jefe|coordinador|supervisor|lider|líder/.test(rol);
    } catch (_) {
      return false;
    }
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

    // Ticket 1064: comerciales para asignar y si este usuario solo ve sus leads.
    this.crmService.getEquipo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(eq => { this.equipo = eq; this.configEquipo = { ...eq.config }; });
  }

  /** Ticket 1064: la caché del pipeline es por usuario (un comercial no ve la de otro). */
  private claveCache(base: string): string {
    const email = this.getCurrentUserEmail();
    return email ? `${base}:${email}` : base;
  }

  /** Ticket 1064: nombre del comercial, o su correo si ya no está en el equipo. */
  nombreComercial(email?: string | null): string {
    if (!email) return this.translate.instant('crm.lista.sinAsignar');
    const e = String(email).trim().toLowerCase();
    const c = this.equipo?.comerciales.find(x => x.email === e);
    return c ? c.nombre : e.split('@')[0];
  }

  /** Ticket 1064: hay a quién asignar (administrador y equipo cargado). */
  get puedeAsignarComercial(): boolean {
    return !!(this.equipo?.puedeAsignar && this.equipo.comerciales.length);
  }

  /** Ticket 1064: el comercial del lead; si nadie lo decidió, quien lo creó. */
  duenoEfectivo(l: CrmLead): string | null {
    const e = l.assignedTo || (l.sinDueno ? l.creadoPor : null);
    return e ? String(e).trim().toLowerCase() : null;
  }

  private pasaFiltroComercial(l: CrmLead): boolean {
    if (!this.selectedComercial) return true;
    const asignado = this.duenoEfectivo(l) || '';
    return this.selectedComercial === '__sin__' ? !asignado : asignado === this.selectedComercial;
  }

  /** Ticket 1064: interruptores del equipo comercial (solo administradores). */
  guardarConfigEquipo(campo: 'crmSoloPropios' | 'crmRecordatoriosCorreo', valor: boolean): void {
    if (!this.equipo) return;
    this.guardandoEquipo = true;
    this.crmService.saveConfig({ [campo]: valor }).subscribe(ok => {
      this.guardandoEquipo = false;
      if (ok) {
        this.equipo = { ...this.equipo!, config: { ...this.equipo!.config, [campo]: valor } };
        this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.lista.guardado'), life: 2500 });
      } else {
        // Revisión 1064: el interruptor vuelve a lo que de verdad quedó guardado.
        this.configEquipo = { ...this.configEquipo, [campo]: !valor };
        this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.lista.noSePudoGuardar') });
      }
    });
  }

  private restoreFromCache(): void {
    try {
      const cs = localStorage.getItem('crm_stages_v1');
      const cl = localStorage.getItem(this.claveCache('crm_leads_v1'));
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
      localStorage.setItem(this.claveCache('crm_leads_v1'), JSON.stringify(this.leads));
      localStorage.removeItem('crm_leads_v1'); // caché vieja, compartida entre usuarios
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
    // Fuente única: mismo modal que usa el listado de Clientes Corporativos.
    const ref = this.ngbModal.open(LeadFormModalComponent, { size: 'lg', centered: true });
    ref.componentInstance.isEdit = false;
    ref.componentInstance.title = 'crm.lista.nuevoLead';
    ref.componentInstance.tagsCatalog = this.clientTagsCatalog;
    if (this.puedeAsignarComercial) {
      ref.componentInstance.comerciales = this.equipo!.comerciales;
      ref.componentInstance.comercialPorDefecto = this.equipo!.yo;
    }
    ref.result.then((value) => { if (value) this.submitCreate(value); }).catch(() => {});
  }

  submitCreate(value: any): void {
    const firstStage = this.visibleStages[0]?.key || 'nuevo';
    const formData = { ...value, stage: firstStage };

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
      assignedTo: formData.assignedTo === null ? null : (formData.assignedTo || this.equipo?.yo || null),
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
            severity: 'success', summary: this.translate.instant('crm.lista.leadCreado'),
            detail: this.translate.instant('crm.lista.fueAgregadoA', { name: formData.name, firstStage }),
          });
          this.loadStats();
          this.saveToCache();
        } else {
          // Rollback: quitar la tarjeta optimista
          this.leads = this.leads.filter(l => l.id !== tempId);
          this.groupByStage();
          if (res?.code === 'EXISTE_OTRO_COMERCIAL') {
            Swal.fire({
              icon: 'warning',
              title: this.translate.instant('crm.lista.esteClienteYaExiste'),
              text: this.translate.instant('crm.lista.clienteYaAtendidoPorOtro', { name: formData.name || this.translate.instant('crm.lista.esteCliente') }),
              confirmButtonText: this.translate.instant('comun.entendido'),
            });
          } else {
            this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: res?.error || this.translate.instant('crm.lista.noSePudoCrearEl') });
          }
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
    this.loadMyTasksCount();
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
    if (this.selectedComercial) filtered = filtered.filter(l => this.pasaFiltroComercial(l)); // ticket 1064

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

  /**
   * Convierte el lead en cliente normal y abre la venta asistida con sus datos
   * (D-111). NO mueve la etapa: hacer clic aquí no garantiza la venta — el
   * usuario puede abandonar el asistente. Cuando el pedido exista de verdad,
   * "Ganado" quedará verificado solo (markVerifiedBuyer cruza el documento
   * contra `orders`), sin pedir cierre forzado.
   */
  crearPedidoDesdeLead(lead: CrmLead, event: Event): void {
    event.stopPropagation();
    this.leadToSales.iniciarPedido(lead);
  }

  /**
   * Abre una cotización con los datos del lead (D-111). A diferencia de Pedido,
   * NO lo vuelve cliente: cotizar no es vender. La cotización guarda una copia
   * del cliente, no un vínculo, así que no necesita que exista en `clients`.
   */
  cotizarDesdeLead(lead: CrmLead, event: Event): void {
    event.stopPropagation();
    this.leadToSales.iniciarCotizacion(lead);
  }

  // ─── Actions ───────────────────────────────────────────────

  onStageDrop(leadId: string, newStage: string, forceClose: boolean = false, forceReason: string = '', lostReason: string = ''): void {
    const stageConfig = this.stages.find(s => s.key === newStage);
    const closing = !!(stageConfig && (stageConfig.isWon || stageConfig.isLost));

    // Etapa perdida: pedir el motivo antes de archivar (control + reactivación).
    if (stageConfig?.isLost && !lostReason) {
      this.promptLostReason(leadId, newStage);
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

    this.crmService.updatePipeline(leadId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.blocked && res.reason === 'not_verified') {
          this.promptForceClose(leadId, newStage);
          return;
        }

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
              this.closedLeads = [{
                ...lead,
                verifiedBuyer: res.verifiedBuyer,
                verifiedOrderId: res.verifiedOrderId,
                forcedClose: res.forcedClose,
                forcedReason: res.forcedReason,
                lostReason: res.lostReason ?? lostReason,
              }, ...this.closedLeads];
            }

            if (stageConfig?.isWon) {
              if (res.verifiedBuyer) {
                this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.lista.leadCerrado'), detail: this.translate.instant('crm.lista.compraVerificadaContraLosPedidos') });
              } else if (res.forcedClose) {
                this.messageService.add({ severity: 'warn', summary: this.translate.instant('crm.lista.leadCerradoForzado'), detail: this.translate.instant('crm.lista.cierreConfirmadoManualmenteSinPedido') });
              } else {
                this.messageService.add({ severity: 'warn', summary: this.translate.instant('crm.lista.leadCerrado'), detail: this.translate.instant('crm.lista.noSeEncontroUnPedido') });
              }
            } else {
              this.messageService.add({ severity: 'info', summary: this.translate.instant('crm.lista.leadArchivadoComoPerdido') });
            }
          } else {
            this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.lista.etapaActualizada') });
          }
          this.loadStats();
        } else {
          // Revert: reload
          this.loadLeads();
        }
      });
  }

  /** Lead sin compra verificada: ofrece forzar el cierre dejando constancia de la razón. */
  private promptForceClose(leadId: string, newStage: string): void {
    Swal.fire({
      icon: 'warning',
      title: this.translate.instant('crm.lista.noSeEncontroUnaCompra'),
      text: this.translate.instant('crm.lista.noHayUnPedidoAsociado'),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('crm.lista.forzarCierreDeTodasFormas'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#d97706',
    }).then(result => {
      if (!result.isConfirmed) return;

      Swal.fire({
        title: this.translate.instant('crm.lista.motivoDelCierreForzado'),
        input: 'text',
        inputPlaceholder: this.translate.instant('crm.lista.ejPagoEnEfectivoFactura'),
        inputValidator: (value) => (!value ? this.translate.instant('crm.lista.debesIndicarUnMotivoParaForzar') : undefined),
        showCancelButton: true,
        confirmButtonText: this.translate.instant('crm.lista.confirmarCierre'),
        cancelButtonText: this.translate.instant('comun.cancelar'),
      }).then(reasonResult => {
        if (!reasonResult.isConfirmed || !reasonResult.value) return;
        this.onStageDrop(leadId, newStage, true, reasonResult.value);
      });
    });
  }

  /** Etapa perdida: pide el motivo de la pérdida antes de archivar el lead. */
  private promptLostReason(leadId: string, newStage: string): void {
    Swal.fire({
      icon: 'question',
      title: this.translate.instant('crm.lista.motivoDeLaPerdida'),
      input: 'text',
      inputPlaceholder: this.translate.instant('crm.lista.ejPrecioSeFueCon'),
      inputValidator: (value) => (!value ? this.translate.instant('crm.lista.indicaPorQueSePerdio') : undefined),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('crm.lista.marcarComoPerdido2'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#dc2626',
    }).then(result => {
      if (!result.isConfirmed || !result.value) {
        // Canceló: revertir el movimiento visual del tablero.
        this.loadLeads();
        return;
      }
      this.onStageDrop(leadId, newStage, false, '', result.value);
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
      title: this.translate.instant('crm.lista.eliminarEtiqueta', { name: tag.name }),
      text: this.translate.instant('crm.lista.seQuitaraDeTodosLos'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: this.translate.instant('crm.lista.siEliminar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
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
        severity: 'success', summary: this.translate.instant('crm.lista.configuracionGuardada'),
        detail: this.translate.instant('crm.lista.etiquetasActualizadasCorrectamente'), life: 3000,
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
          title: this.translate.instant('crm.lista.desactivar', { label: stage.label }),
          text: this.translate.instant('crm.lista.hayLeadSEnEsta', { count }),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc2626',
          cancelButtonColor: '#6b7280',
          confirmButtonText: this.translate.instant('crm.lista.siDesactivar'),
          cancelButtonText: this.translate.instant('comun.cancelar'),
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
      this.messageService.add({ severity: 'warn', summary: this.translate.instant('crm.lista.atencion'), detail: this.translate.instant('crm.lista.debeQuedarAlMenosUna') });
      return;
    }
    this.crmService.saveStages(this.editableStages).subscribe(success => {
      if (success) {
        this.stages = this.editableStages.map(s => ({ ...s }));
        this.groupByStage();
        this.showStagesModal = false;
        this.messageService.add({
          severity: 'success', summary: this.translate.instant('crm.lista.configuracionGuardada'),
          detail: this.translate.instant('crm.lista.etapasActualizadasCorrectamente'), life: 3000,
        });
      } else {
        this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.lista.noSePudieronGuardarLas') });
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
    this.tasksDialogTitle = this.translate.instant('crm.lista.tareasPendientesEnTotal');
    this.loadPendingTasksDialog();
  }

  /** Abre el diálogo con solo las tareas tipo 'Reunión' de los próximos 7 días (sin vencer). */
  openWeekMeetings(): void {
    this.tasksDialogTitle = this.translate.instant('crm.lista.reunionesProximos7Dias');
    const now = Date.now();
    const in7d = now + 7 * 86400000;
    this.loadPendingTasksDialog(t => {
      if (t.type !== 'meeting' || !t.dueDate) return false;
      const ms = new Date(t.dueDate).getTime();
      return !isNaN(ms) && ms >= now && ms <= in7d;
    });
  }

  /** Abre el diálogo con solo las tareas vencidas (cualquier tipo, dueDate < ahora). */
  openOverdueTasks(): void {
    this.tasksDialogTitle = this.translate.instant('crm.lista.tareasVencidas');
    const now = Date.now();
    this.loadPendingTasksDialog(t => {
      if (!t.dueDate) return false;
      const ms = new Date(t.dueDate).getTime();
      return !isNaN(ms) && ms < now;
    });
  }

  /**
   * Título de la card de tareas próximas. El administrador ve las de todo el equipo; el
   * vendedor, solo las suyas. Antes el administrador veía "Mis tareas" junto a cards que son
   * de todo el equipo, y no se entendía de quién era cada número.
   */
  get tasksCardLabel(): string {
    return this.translate.instant(this.veEquipo ? 'crm.lista.tareasDelEquipo' : 'crm.lista.misTareas');
  }

  /**
   * Abre el diálogo con las tareas para HOY o los próximos 7 días (del equipo o mías, según el rol).
   * No incluye vencidas a propósito: esas ya tienen su propia card ("Tareas vencidas"), que
   * lista TODAS las asignaciones. Evita mostrar el mismo pendiente vencido en dos diálogos distintos.
   */
  openMyTasksToday(): void {
    this.tasksDialogTitle = this.translate.instant('crm.lista.tareasHoyYProximos7Dias', { card: this.tasksCardLabel });
    this.loadPendingTasksDialog(t => this.isMyTaskInWindow(t));
  }

  /**
   * Con vencimiento entre hoy y +7 días (o sin fecha), excluye vencidas (van en "Tareas vencidas").
   * El vendedor solo cuenta las asignadas a él; el administrador, las de todos.
   */
  private isMyTaskInWindow(t: CrmTask): boolean {
    if (!this.veEquipo) {
      const email = this.getCurrentUserEmail();
      if (!email || (t.assignedTo || '').toLowerCase() !== email) return false;
    }
    if (!t.dueDate) return true;
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const in7d = Date.now() + 7 * 86400000;
    const ms = new Date(t.dueDate).getTime();
    return !isNaN(ms) && ms >= startOfToday && ms <= in7d;
  }

  /** Cuenta las tareas pendientes dentro de la ventana, para el número de la card ("Mis tareas" o "Tareas del equipo"). */
  private loadMyTasksCount(): void {
    this.crmService.getTasks({ status: 'pending' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: tasks => { this.myTasksCount = (tasks || []).filter(t => this.isMyTaskInWindow(t)).length; },
        error: () => { this.myTasksCount = 0; },
      });
  }

  private getCurrentUserEmail(): string | null {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const parsedUser = JSON.parse(raw);
      return parsedUser?.email ? String(parsedUser.email).toLowerCase() : null;
    } catch (_) {
      return null;
    }
  }

  /** Etiqueta de urgencia (Vencida/Hoy/Próximos 7 días/Sin fecha) para agrupar tareas en el diálogo. */
  taskGroupLabel(task: CrmTask): { label: string; bg: string; color: string } {
    if (!task.dueDate) return { label: this.translate.instant('crm.lista.sinFecha'), bg: '#f1f3f5', color: '#6b7280' };
    const ms = new Date(task.dueDate).getTime();
    if (isNaN(ms)) return { label: this.translate.instant('crm.lista.sinFecha'), bg: '#f1f3f5', color: '#6b7280' };
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const endOfToday = new Date().setHours(23, 59, 59, 999);
    if (ms < startOfToday) return { label: this.translate.instant('crm.lista.vencida'), bg: '#fef2f2', color: '#d12b38' };
    if (ms <= endOfToday) return { label: this.translate.instant('crm.lista.hoy'), bg: '#fff7ed', color: '#D35400' };
    if (ms <= now + 7 * 86400000) return { label: this.translate.instant('crm.lista.proximos7Dias'), bg: '#ede9fe', color: '#7c3aed' };
    return { label: this.translate.instant('crm.lista.proximamente'), bg: '#f1f3f5', color: '#6b7280' };
  }

  private static readonly PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  /** Ordena por prioridad (urgente→baja) y, dentro de la misma prioridad, por fecha de vencimiento más próxima. Sin fecha va al final. */
  private sortTasksByPriorityAndDueDate(tasks: CrmTask[]): CrmTask[] {
    return [...tasks].sort((a, b) => {
      const rankA = CrmListComponent.PRIORITY_RANK[a.priority] ?? 4;
      const rankB = CrmListComponent.PRIORITY_RANK[b.priority] ?? 4;
      if (rankA !== rankB) return rankA - rankB;
      const msA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const msB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return msA - msB;
    });
  }

  private loadPendingTasksDialog(filterFn?: (task: CrmTask) => boolean): void {
    this.showTasksDialog = true;
    this.loadingTasks = true;
    this.crmService.getTasks({ status: 'pending' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: tasks => {
          const filtered = filterFn ? (tasks || []).filter(filterFn) : (tasks || []);
          this.pendingTasks = this.sortTasksByPriorityAndDueDate(filtered);
          this.loadingTasks = false;
        },
        error: () => { this.pendingTasks = []; this.loadingTasks = false; },
      });
  }

  /** Nombre del lead dueño de la tarea (para mostrar en el diálogo). */
  taskLeadName(task: CrmTask): string {
    return this.leads.find(l => l.id === task.entityId)?.name || this.translate.instant('crm.lista.lead');
  }

  /** Va al detalle del lead de la tarea, abriendo la pestaña Tareas. */
  goToTaskLead(task: CrmTask): void {
    this.showTasksDialog = false;
    this.router.navigate(['/crm/detail', task.entityId], { queryParams: { tab: 'tasks' } });
  }

  // ─── Conversión por vendedor ────────────────────────────────

  /**
   * Abre el diálogo de conversión por vendedor. Reutiliza `leads` (pipeline activo, ya cargado)
   * y `closedLeads` (ganados/perdidos): si `closedLeads` aún no se cargó (el usuario nunca abrió
   * la pestaña "Cerrados"), se dispara la MISMA petición que usa esa pestaña — no es un endpoint
   * nuevo. Así el costo extra solo ocurre si el vendedor pide esta métrica.
   */
  openConversionByAgent(): void {
    this.showConversionDialog = true;
    if (this.closedLoaded) {
      this.computeConversionByAgent();
      return;
    }
    this.loadingConversion = true;
    this.crmService.getLeads({ view: 'closed', limit: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.closedLeads = res.data || [];
          this.closedLoaded = true;
          this.computeConversionByAgent();
        },
        error: () => { this.loadingConversion = false; },
      });
  }

  private computeConversionByAgent(): void {
    const wonKey = this.stages.find(s => s.isWon)?.key;
    const lostKey = this.stages.find(s => s.isLost)?.key;
    const map = new Map<string, { total: number; won: number; lost: number }>();

    for (const lead of [...this.leads, ...this.closedLeads]) {
      const agent = this.duenoEfectivo(lead) || 'Sin asignar';
      if (!map.has(agent)) map.set(agent, { total: 0, won: 0, lost: 0 });
      const row = map.get(agent);
      row.total++;
      if (wonKey && lead.stage === wonKey && (lead.verifiedBuyer || lead.forcedClose)) row.won++;
      if (lostKey && lead.stage === lostKey) row.lost++;
    }

    let rows = Array.from(map.entries())
      .map(([assignedTo, r]) => ({
        assignedTo,
        total: r.total,
        won: r.won,
        lost: r.lost,
        rate: r.total > 0 ? Math.round((r.won / r.total) * 100) : 0,
      }))
      .sort((a, b) => b.rate - a.rate || b.total - a.total);

    // Solo admin/super admin ve el ranking completo — un vendedor ve únicamente su propia fila
    // para no exponer el desempeño de sus compañeros (fuente de conflicto interno).
    if (!this.canManageStages) {
      const email = this.getCurrentUserEmail();
      rows = rows.filter(r => r.assignedTo.toLowerCase() === email);
    }

    this.conversionRows = rows;
    this.loadingConversion = false;
  }

  /** Título de la card/diálogo de conversión: ranking completo para admin, solo la propia tasa para vendedor. */
  get conversionCardLabel(): string {
    return this.translate.instant(this.canManageStages ? 'crm.lista.conversionPorVendedor' : 'crm.lista.miConversion');
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
    if (this.entityType === 'company') return this.translate.instant('crm.lista.pipelineEmpresas');
    if (this.entityType === 'corporate') return this.translate.instant('crm.lista.pipelineCorporativos');
    return this.translate.instant('crm.lista.pipelineClientes');
  }

  trackById(index: number, item: CrmLead): string {
    return item.id;
  }

  getStageColor(stage: string): string {
    const colors: Record<string, string> = {
      // Company stages
      registro: '#6b7280', contactado: '#1E6FD9', demo: '#8b5cf6',
      trial: '#D35400', activo: '#27AE60', premium: '#7c3aed', churned: '#d12b38',
      // Client stages
      nuevo: '#6b7280', calificado: '#27AE60', propuesta: '#1E6FD9',
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
      low: 'crm.opciones.prioridad.low', medium: 'crm.opciones.prioridad.medium',
      high: 'crm.opciones.prioridad.high', urgent: 'crm.opciones.prioridad.urgent',
    };
    return labels[priority] ? this.translate.instant(labels[priority]) : priority;
  }

  /** Puntaje del CRM de empresas (D-485): 60 o más es alto, 30 a 59 medio y menos de 30 bajo. */
  nivelPuntaje(score: number | null | undefined): 'alto' | 'medio' | 'bajo' {
    const s = Number(score) || 0;
    return s >= 60 ? 'alto' : s >= 30 ? 'medio' : 'bajo';
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

  /** Días desde el último contacto registrado (lastContactedAt); null si nunca se ha contactado. */
  getDaysSinceContact(lead: CrmLead): number | null {
    if (!lead.lastContactedAt) return null;
    const ms = new Date(lead.lastContactedAt).getTime();
    if (isNaN(ms)) return null;
    return Math.floor((Date.now() - ms) / 86400000);
  }

  /** Badge de "hace cuánto no se contacta" para la kanban card. null si nunca se ha contactado. */
  getContactBadge(lead: CrmLead): { label: string; bg: string; color: string } | null {
    const days = this.getDaysSinceContact(lead);
    if (days === null) return null;
    const label = days <= 0 ? this.translate.instant('crm.lista.contactadoHoy') : days === 1 ? this.translate.instant('crm.lista.hace1Dia') : this.translate.instant('crm.lista.haceDias', { days });
    if (days >= 30) return { label, bg: '#fef2f2', color: '#d12b38' };
    if (days >= 14) return { label, bg: '#fff7ed', color: '#D35400' };
    return { label, bg: '#f1f3f5', color: '#6b7280' };
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
    if (this.selectedComercial) list = list.filter(l => this.pasaFiltroComercial(l)); // ticket 1064
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
      'Asignado': this.duenoEfectivo(l) || '',
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
    this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.lista.exportado'), detail: this.translate.instant('crm.lista.leadsExportados', { length: data.length }) });
  }

  // ─── Plantilla de importación ─────────────────────────────

  /**
   * Columnas de la plantilla de importación de leads. SOLO las que el
   * detector (`detectColumnMapping`) lee y guarda como campos del lead —
   * así lo que el usuario descarga encaja 1-a-1 con lo que se importa.
   */
  private readonly CRM_TEMPLATE_COLUMNS: { header: string; examples: [string, string] }[] = [
    // Dos filas de ejemplo: por el pipeline entran tanto personas naturales
    // (la mayoría de `corporate_clients` son CC) como razones sociales.
    { header: 'Nombre', examples: ['Juan Carlos', 'Comercializadora El Progreso S.A.S'] }, // ÚNICO obligatorio
    { header: 'Apellidos', examples: ['Pérez García', ''] },            // vacío si es empresa
    { header: 'NIT/Documento', examples: ['1012345678', '900123456-7'] },
    { header: 'Tipo Documento', examples: ['CC', 'NIT'] },              // decide si se parte el nombre
    { header: 'Email', examples: ['juan.perez@correo.com', 'contacto@elprogreso.com'] },
    { header: 'Teléfono', examples: ['3001234567', '3009876543'] },     // contacto + dedup (+57 auto)
    { header: 'Etapa', examples: ['contactado', 'propuesta'] },         // ubica en el pipeline
    { header: 'Fuente', examples: ['Facebook', 'referido'] },           // social_media / web / manual
  ];

  downloadCrmTemplate(): void {
    const headers = this.CRM_TEMPLATE_COLUMNS.map(c => c.header);
    const ws = XLSX.utils.aoa_to_sheet([
      headers,
      this.CRM_TEMPLATE_COLUMNS.map(c => c.examples[0]),
      this.CRM_TEMPLATE_COLUMNS.map(c => c.examples[1]),
    ]);
    ws['!cols'] = headers.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Leads');
    XLSX.writeFile(wb, 'plantilla-leads-crm.xlsx');

    this.messageService.add({
      severity: 'success',
      summary: this.translate.instant('crm.lista.plantillaDescargada'),
      detail: this.translate.instant('crm.lista.soloNombreEsObligatorioTrae'),
      life: 6000,
    });
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
          this.messageService.add({ severity: 'warn', summary: this.translate.instant('crm.lista.archivoVacio') });
          return;
        }

        // Detect column mapping from headers
        const columns = Object.keys(rows[0]);
        const mapping = this.detectColumnMapping(columns);

        let skipped = 0;
        const total = rows.length;

        this.messageService.add({
          severity: 'info', summary: this.translate.instant('crm.lista.importando'), detail: this.translate.instant('crm.lista.procesandoRegistros', { total }),
        });

        // Cada fila válida genera una operación HTTP. Con forkJoin esperamos a
        // TODAS y contamos éxitos/fallos según la respuesta real del backend
        // ({ success: false } en error) — no a ciegas como antes.
        const ops: Observable<any>[] = [];

        rows.forEach((row) => {
          const nombreRaw = this.getRowValue(row, mapping.name);
          if (!nombreRaw) { skipped++; return; }

          // Persona natural sin columna "Apellidos": se parte el nombre completo.
          // Con tipo NIT no se toca (razón social). Ver nombre-apellido.util.
          const tipoDocumento = this.getRowValue(row, mapping.tipoDocumento);
          const { nombres: name, apellidos } = resolverNombreApellido(
            nombreRaw,
            this.getRowValue(row, mapping.apellidos),
            tipoDocumento,
          );

          const leadData: any = {
            name,
            apellidos: apellidos || null,
            tipoDocumento: tipoDocumento || null,
            nit: this.getRowValue(row, mapping.nit) || null,
            email: this.getRowValue(row, mapping.email) || null,
            phone: this.cleanPhone(this.getRowValue(row, mapping.phone)),
            source: this.detectSource(row, mapping),
            stage: this.mapImportStage(this.getRowValue(row, mapping.stage)),
            priority: 'medium',
          };

          // Check if exists by email or phone. El nombre se compara COMPLETO:
          // tras el split `name` es solo el nombre de pila, y los leads legacy
          // guardan el nombre entero en `name` → compararlos crearía duplicados.
          const fullName = [name, apellidos].filter(Boolean).join(' ').toLowerCase();
          const existing = this.leads.find(l =>
            (leadData.email && l.email?.toLowerCase() === leadData.email.toLowerCase()) ||
            (leadData.phone && l.phone === leadData.phone) ||
            (l.name?.toLowerCase() === fullName)
          );

          if (existing) {
            // Update pipeline for existing lead
            ops.push(this.crmService.updatePipeline(existing.id, {
              stage: leadData.stage !== this.stages[0]?.key ? leadData.stage : undefined,
              source: leadData.source,
            }));
          } else {
            // Create new lead via import endpoint
            ops.push(this.crmService.importLead(leadData));
          }
        });

        if (ops.length === 0) {
          this.messageService.add({
            severity: 'warn',
            summary: this.translate.instant('crm.lista.nadaParaImportar'),
            detail: this.translate.instant('crm.lista.importacionSinProcesados', { skipped }),
            life: 6000,
          });
          event.target.value = '';
          return;
        }

        // Esperar TODAS las operaciones y reportar el conteo real.
        forkJoin(ops).pipe(takeUntil(this.destroy$)).subscribe(results => {
          const ok = results.filter(r => r && r.success !== false).length;
          const failed = results.length - ok;

          this.messageService.add({
            severity: failed === 0 ? 'success' : (ok === 0 ? 'error' : 'warn'),
            summary: failed === 0 ? this.translate.instant('crm.lista.importacionCompletada') : this.translate.instant('crm.lista.importacionConErrores'),
            detail: this.translate.instant('crm.lista.importados', { ok })
              + (failed ? this.translate.instant('crm.lista.fallidos', { failed }) : '')
              + (skipped ? this.translate.instant('crm.lista.sinNombreOmitidos', { skipped }) : ''),
            life: 6000,
          });

          // Reload after backend processes
          setTimeout(() => this.loadLeads(), 1500);
          setTimeout(() => this.loadStats(), 2000);
        });
      } catch (err) {
        this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.lista.noSePudoLeerEl') });
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
    // `except` evita que una columna ya asignada se robe otro campo: "Tipo
    // Documento" contiene la palabra "documento", así que sin esto podría
    // quedar mapeada como el NIT si el usuario reordena las columnas.
    const find = (patterns: string[], except: (string | null)[] = []): string | null => {
      for (const col of columns) {
        if (except.includes(col)) continue;
        const lower = col.toLowerCase().replace(/[_\-\.]/g, ' ').trim();
        for (const p of patterns) {
          if (lower.includes(p)) return col;
        }
      }
      return null;
    };

    const tipoDocumento = find(['tipo documento', 'tipo de documento', 'tipo doc', 'tipo_documento']);
    const apellidos = find(['apellidos', 'apellido', 'last name', 'surname']);

    return {
      name: find(['nombre completo', 'nombre_completo', 'full name', 'nombre', 'name', 'empresa', 'company'], [apellidos]),
      apellidos,
      tipoDocumento,
      nit: find(['nit', 'documento', 'cedula', 'cédula', 'identificacion', 'identificación', 'tax id', 'rut'], [tipoDocumento]),
      email: find(['correo', 'email', 'e-mail', 'mail']),
      phone: find(['teléfono', 'telefono', 'número de teléfono', 'numero de telefono', 'phone', 'celular', 'cel', 'whatsapp']),
      // OJO: nada de 'estado'/'status' genéricos. El export de Corporativos trae
      // una columna "Estado" (Activo/Bloqueado) que se colaba como etapa y
      // aterrizaba el lead en un stage inexistente del pipeline de clientes.
      stage: find(['etapa', 'stage', 'lead status', 'lead_status']),
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
          this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.lista.noSePudieronCargarLos') });
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
      this.messageService.add({ severity: 'warn', summary: this.translate.instant('crm.lista.seleccionaLeads'), detail: this.translate.instant('crm.lista.marcaLosLeadsQueDeseas') });
      return;
    }

    this.confirmationService.confirm({
      message: this.translate.instant('crm.lista.eliminarLeadsSeleccionados', { count: ids.length }),
      header: this.translate.instant('crm.lista.confirmarEliminacion'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('comun.eliminar'),
      rejectLabel: this.translate.instant('comun.cancelar'),
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
                  summary: this.translate.instant('crm.lista.eliminados'),
                  detail: this.translate.instant(res.failed ? 'crm.lista.leadsEliminadosConFallidos' : 'crm.lista.leadsEliminados', { deleted: res.deleted, failed: res.failed }),
                });
                this.selectedForDeletion.clear();
                this.showDuplicatesDialog = false;
                this.loadLeads();
                this.loadStats();
              }
            },
            error: () => {
              this.deletingLeads = false;
              this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.lista.noSePudieronEliminarLos') });
            },
          });
      },
    });
  }

  deleteSingleLead(lead: CrmLead, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      message: this.translate.instant('crm.lista.eliminarLeadYSusActividades', { name: lead.name }),
      header: this.translate.instant('crm.lista.confirmarEliminacion'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('comun.eliminar'),
      rejectLabel: this.translate.instant('comun.cancelar'),
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
                this.messageService.add({ severity: 'success', summary: this.translate.instant('crm.lista.eliminado'), detail: this.translate.instant('crm.lista.eliminado2', { name: lead.name }) });
              }
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.lista.noSePudoEliminarEl') });
            },
          });
      },
    });
  }

  /**
   * Bloquea/desbloquea el lead (soft-block, conserva historial en el CRM).
   * Pide confirmación y persiste vía `estado` (corporate/client) o `activo`
   * (company) — el backend resuelve cuál según el entityType del contexto.
   */
  toggleBloqueoLead(lead: CrmLead, event?: Event): void {
    event?.stopPropagation();
    const bloquear = lead.activo !== false;
    Swal.fire({
      icon: bloquear ? 'warning' : 'question',
      title: this.translate.instant(bloquear ? 'crm.lista.bloquearLeadPregunta' : 'crm.lista.desbloquearLeadPregunta', { name: lead.name }),
      text: bloquear
        ? this.translate.instant('crm.lista.seMarcaraComoBloqueadoPero')
        : this.translate.instant('crm.lista.volveraAEstarActivo'),
      showCancelButton: true,
      confirmButtonColor: bloquear ? '#d97706' : '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: bloquear ? this.translate.instant('crm.lista.siBloquear') : this.translate.instant('crm.lista.siDesbloquear'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
    }).then(result => {
      if (!result.isConfirmed) return;
      this.crmService.setLeadActive(lead.id, !bloquear)
        .pipe(takeUntil(this.destroy$))
        .subscribe((res) => {
          if (res && res.success) {
            lead.activo = !bloquear;
            this.messageService.add({
              severity: 'success',
              summary: bloquear ? this.translate.instant('crm.lista.bloqueado2') : this.translate.instant('crm.lista.desbloqueado'),
              detail: this.translate.instant(bloquear ? 'crm.lista.leadBloqueado' : 'crm.lista.leadReactivado', { name: lead.name }),
            });
          } else {
            this.messageService.add({ severity: 'error', summary: this.translate.instant('comun.error'), detail: this.translate.instant('crm.lista.noSePudoCambiarEl') });
          }
        });
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
