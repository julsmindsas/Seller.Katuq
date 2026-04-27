import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, debounceTime, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { FlowsService } from '../services/flows.service';
import { FlowsStateService } from '../services/flows-state.service';
import { FlowCanvasLoaderService } from '../services/flow-canvas-loader.service';
import {
  FlowSpec,
  FlowGraph,
  FlowStatus,
  NodeSpec,
  RunContext,
  FlowTriggerBinding
} from '../interfaces/flow.interface';

interface ScheduleConfig {
  cron?: string;
  intervalMinutes?: number;
}

@Component({
  selector: 'app-flow-editor',
  templateUrl: './flow-editor.component.html',
  styleUrls: ['./flow-editor.component.scss']
})
export class FlowEditorComponent implements OnInit, OnDestroy {
  @ViewChild('canvasEl', { static: false }) canvasRef?: ElementRef<HTMLElement>;

  flow: FlowSpec | null = null;
  graph: FlowGraph = { nodes: [], edges: [] };
  catalog: NodeSpec[] = [];
  runContext: RunContext | null = null;

  loading = false;
  saving = false;
  errorMessage = '';
  webComponentReady = false;
  isNew = true;
  hasUnsaved = false;
  selectedNodeId: string | null = null;
  flowName = 'Nuevo flujo';
  flowDescription = '';
  flowStatus: FlowStatus = 'draft';

  // UI state for the new config panel & shortcuts modal
  configPanelOpen = false;
  shortcutsModalOpen = false;
  flowTags: string[] = [];
  newTagInput = '';
  scheduleDraft: ScheduleConfig = {};
  webhookUrl = '';
  triggerNodeId: string | null = null;
  triggerType: string | null = null;

  private destroy$ = new Subject<void>();
  private autosaveTrigger$ = new Subject<void>();
  private autosaveSub?: Subscription;
  private pollSub?: Subscription;
  private runStartedAt: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowsService: FlowsService,
    private state: FlowsStateService,
    private loader: FlowCanvasLoaderService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loader
      .load()
      .then(() => {
        this.webComponentReady = true;
        // Esperar a que Angular renderice el elemento via *ngIf antes de empujar props.
        setTimeout(() => this.pushPropsToCanvas(), 100);
        // Y un retry adicional por si el primer push fue antes del custom-elements upgrade.
        setTimeout(() => this.pushPropsToCanvas(), 500);
      })
      .catch((err) => {
        const msg =
          'No se pudo cargar el editor visual. Verificá que el bundle esté en assets/flow-canvas/. Detalle: ' +
          (err?.message || 'desconocido');
        this.errorMessage = msg;
        this.toastr.error(msg, 'Editor no disponible', { timeOut: 8000 });
      });

    // Catalog from backend (or fallback).
    this.flowsService
      .getNodeCatalog()
      .pipe(takeUntil(this.destroy$))
      .subscribe((catalog) => {
        this.catalog = catalog;
        this.state.setCatalog(catalog);
        this.pushPropsToCanvas();
      });

    // Load flow if route has id.
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params['id'];
      if (id) {
        this.isNew = false;
        this.loadFlow(id);
      } else {
        this.isNew = true;
        this.flow = null;
        this.graph = { nodes: [], edges: [] };
        this.flowName = 'Nuevo flujo';
        this.flowDescription = '';
        this.flowStatus = 'draft';
        this.flowTags = [];
        this.scheduleDraft = {};
        this.webhookUrl = '';
        this.triggerNodeId = null;
        this.triggerType = null;
      }
    });

    // Autosave every 2s when unsaved changes pile up.
    this.autosaveSub = this.autosaveTrigger$
      .pipe(debounceTime(2000), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.hasUnsaved && !this.isNew) {
          this.save({ silent: true });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.autosaveSub?.unsubscribe();
    this.stopRunPolling();
  }

  loadFlow(id: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.flowsService.getById(id).subscribe({
      next: (flow) => {
        if (!flow) {
          this.errorMessage = 'No encontramos ese flujo. Quizás fue eliminado.';
          this.loading = false;
          return;
        }
        this.flow = flow;
        this.graph = flow.graph || { nodes: [], edges: [] };
        this.flowName = flow.name;
        this.flowDescription = flow.description || '';
        this.flowStatus = flow.status;
        this.flowTags = Array.isArray(flow.tags) ? [...flow.tags] : [];
        this.hydrateTriggerInfo(flow);
        this.state.setSelectedFlow(flow);
        this.loading = false;
        this.pushPropsToCanvas();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Error al cargar el flujo.';
        this.loading = false;
      }
    });
  }

  /**
   * Reads the trigger binding from the loaded flow to seed the schedule and
   * webhook UI inputs.
   */
  private hydrateTriggerInfo(flow: FlowSpec): void {
    const trigger = (flow.triggers || [])[0];
    if (!trigger) {
      this.triggerNodeId = null;
      this.triggerType = null;
      this.scheduleDraft = {};
      this.webhookUrl = '';
      return;
    }
    this.triggerNodeId = trigger.nodeId;
    this.triggerType = trigger.type;
    if (trigger.type === 'cron' || trigger.type === 'polling') {
      this.scheduleDraft = {
        cron: trigger.config?.cron,
        intervalMinutes: trigger.config?.intervalMinutes
      };
    } else if (trigger.type === 'webhook') {
      const path = trigger.config?.path || `flow/${flow.id}`;
      this.webhookUrl = `${window.location.origin}/api/webhooks/${path}`;
    } else {
      this.scheduleDraft = {};
      this.webhookUrl = '';
    }
  }

  /**
   * The Web Component takes properties as JS values (not stringified attrs),
   * so we set them imperatively whenever data changes.
   *
   * Retry hasta 10 veces con 200ms gap si el canvasRef todavía no existe
   * (por timing entre Angular *ngIf, custom element upgrade y HTTP load).
   */
  private pushPropsToCanvas(retries: number = 10): void {
    const el: any = this.canvasRef?.nativeElement || document.querySelector('katuq-flow-canvas');
    if (!el) {
      if (retries > 0) {
        setTimeout(() => this.pushPropsToCanvas(retries - 1), 200);
      }
      return;
    }
    el.graph = this.graph;
    el.nodeCatalog = this.catalog;
    el.runContext = this.runContext;
    el.readOnly = false;
  }

  /** event handler from <katuq-flow-canvas (graphChange)>. */
  onGraphChange(event: Event): void {
    const detail = (event as CustomEvent<FlowGraph>).detail;
    if (!detail) return;

    // Defensa: ignorar graphChange con grafo vacío cuando el flow cargado tenía nodos.
    // Esto pasa al montar el WC: emite su initial state vacío y pisaría el flow.
    const incomingNodes = Array.isArray(detail.nodes) ? detail.nodes.length : 0;
    const currentNodes = Array.isArray(this.graph?.nodes) ? this.graph.nodes.length : 0;
    if (incomingNodes === 0 && currentNodes > 0) {
      // El WC reportó vacío pero teníamos datos. Re-empujar al WC.
      setTimeout(() => this.pushPropsToCanvas(), 50);
      return;
    }

    // Avoid storm-of-events: shallow compare.
    const before = JSON.stringify(this.graph);
    const after = JSON.stringify(detail);
    if (before === after) return;
    this.graph = detail;
    this.hasUnsaved = true;
    this.autosaveTrigger$.next();
  }

  onNodeSelected(event: Event): void {
    const detail = (event as CustomEvent<{ nodeId: string | null }>).detail;
    this.selectedNodeId = detail?.nodeId || null;
  }

  /**
   * Cross-cutting intents emitted by the WC: connection rejected, template
   * requested, shortcuts modal toggle, etc. We translate to toasts so the
   * user gets visual feedback without invading the canvas with banners.
   */
  onCanvasIntent(event: Event): void {
    const detail = (event as CustomEvent<{ intent: string; payload?: any }>).detail;
    if (!detail) return;
    const { intent, payload } = detail;
    switch (intent) {
      case 'connectionRejected':
        this.toastr.warning(payload?.reason || 'Conexión inválida.', 'Conexión rechazada', {
          timeOut: 4000
        });
        break;
      case 'connectionCreated':
        // Subtle, no toast — the visual feedback in the canvas suffices.
        break;
      case 'autoLayoutApplied':
        this.toastr.info('Nodos reorganizados.', '', { timeOut: 1800 });
        this.hasUnsaved = true;
        this.autosaveTrigger$.next();
        break;
      case 'showShortcuts':
        this.shortcutsModalOpen = true;
        break;
      case 'installTemplate':
        this.installQuickTemplate(payload?.slug);
        break;
      case 'nodeAdded':
        // Subtle UX hint — surface for first-time users only would be ideal,
        // but for now the toast is short and dismissable.
        this.toastr.success('Nodo agregado.', '', { timeOut: 1500 });
        break;
    }
  }

  /**
   * Try to install a quick-start template by slug. Falls back to a polite
   * toast if the backend doesn't ship that template id yet.
   */
  installQuickTemplate(slug?: string): void {
    if (!slug) return;
    this.flowsService.installTemplate(slug).subscribe({
      next: (saved) => {
        if (saved) {
          this.toastr.success('Plantilla instalada. Redirigiendo…', '', { timeOut: 2200 });
          setTimeout(() => this.router.navigate(['/flows/editor', saved.id]), 600);
        } else {
          this.toastr.info(
            'La plantilla todavía no está disponible. Probá arrastrar nodos desde el catálogo.',
            'Plantilla no disponible',
            { timeOut: 4500 }
          );
        }
      },
      error: () => {
        this.toastr.info(
          'No se pudo instalar la plantilla. Probá arrastrar nodos desde el catálogo.',
          'Plantilla no disponible',
          { timeOut: 4500 }
        );
      }
    });
  }

  /**
   * Dispara test-run del flow. Backend `/test-run` devuelve `{ success, run }`.
   * Si el run queda en `running`, hacemos polling cada 1.5s para refrescar
   * los estados de cada nodo en el canvas (TASK 1: real-time visualization).
   */
  onRunRequested(_event: Event): void {
    if (this.isNew || !this.flow) {
      this.toastr.warning('Guardá el flujo antes de ejecutarlo.', 'Antes de ejecutar', {
        timeOut: 3500
      });
      return;
    }
    this.errorMessage = '';
    this.stopRunPolling();
    this.runStartedAt = Date.now();
    this.toastr.info('Ejecución iniciada…', '', { timeOut: 1800 });

    // Disparo REAL del trigger (igual que el cron): triggerData vacío => el
    // engine ejecuta el handler real (polling Osmosis/Shopify con su propio
    // `limit`/diff state). El mock anterior generaba items sin `raw.*` y
    // producía siempre `partial` con identificacion.referencia=undefined.
    this.flowsService.testRun(this.flow.id, { triggerData: [] }).subscribe({
      next: (run) => {
        if (run) {
          this.runContext = run;
          this.pushPropsToCanvas();
          if (run.status === 'running') {
            this.startRunPolling(run.runId);
          } else {
            this.notifyRunFinished(run);
          }
        } else {
          this.toastr.warning(
            'El run se inició pero no pudimos leer el contexto. Revisá la página de Ejecuciones.',
            'Run iniciado',
            { timeOut: 4500 }
          );
        }
      },
      error: (err) => {
        const reason =
          err?.error?.message || err?.error?.error || 'No se pudo iniciar la ejecución.';
        this.toastr.error(reason, 'Run falló', { timeOut: 5000 });
      }
    });
  }

  /**
   * Polls /flows/runs/:runId every 1.5s until the run reaches a terminal
   * state. Updates `this.runContext` and pushes to the WC so the canvas
   * shows live progression. Stops at status !== 'running' or after 3 minutes.
   */
  private startRunPolling(runId: string): void {
    this.stopRunPolling();
    const POLL_MS = 1500;
    const MAX_MS = 3 * 60 * 1000;
    this.pollSub = interval(POLL_MS)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.flowsService.getRun(runId))
      )
      .subscribe({
        next: (run) => {
          if (!run) return;
          this.runContext = run;
          this.pushPropsToCanvas();
          const elapsed = Date.now() - this.runStartedAt;
          if (run.status !== 'running' || elapsed > MAX_MS) {
            this.stopRunPolling();
            this.notifyRunFinished(run);
          }
        },
        error: () => {
          // Continue polling silently — transient errors shouldn't kill the loop.
        }
      });
  }

  private stopRunPolling(): void {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = undefined;
    }
  }

  private notifyRunFinished(run: RunContext): void {
    const seconds = ((run.totalDurationMs ?? Date.now() - this.runStartedAt) / 1000).toFixed(1);
    if (run.status === 'success') {
      this.toastr.success(`Run completado en ${seconds}s`, 'Éxito', { timeOut: 3500 });
    } else if (run.status === 'failed') {
      const firstError = run.errors?.[0]?.message || 'Revisá el detalle del run.';
      this.toastr.error(firstError, `Run falló (${seconds}s)`, { timeOut: 6000 });
    } else if (run.status === 'partial') {
      this.toastr.warning(`Run parcial en ${seconds}s — algunos nodos fallaron.`, '', {
        timeOut: 4500
      });
    } else if (run.status === 'cancelled') {
      this.toastr.info(`Run cancelado en ${seconds}s`, '', { timeOut: 3000 });
    }
  }

  /**
   * Genera un payload mock razonable para test-run según el tipo del trigger.
   * Sin esto, el handler real del trigger (osmosis-product-changed, shopify-...)
   * se ejecuta y descarga catálogo entero o llama API externa.
   */
  private _buildMockTriggerData(): any[] {
    const triggerNode = this.flow?.graph?.nodes?.find(
      (n: any) => n.type && (
        n.type.includes('-changed') || n.type.includes('-created') ||
        n.type.includes('-event') || n.type.includes('-trigger')
      )
    );
    const triggerType = (triggerNode && triggerNode.type) || '';

    if (triggerType.includes('product')) {
      const ref = `MOCK-${Date.now()}`;
      return [{
        json: {
          identificacion: { referencia: ref, nombre: 'Producto de prueba (test-run)' },
          titulo: 'Producto de prueba',
          descripcion: 'Generado por test-run desde el editor.',
          precio: { precioUnitarioConIva: 10000, precioUnitarioIva: '19', moneda: 'COP' },
          exposicion: { activo: true, imagenes: [] },
          inventariable: false,
          company: this.flow && (this.flow as any).companyId
        }
      }];
    }
    if (triggerType.includes('order')) {
      return [{
        json: {
          nroPedido: `MOCK-ORDER-${Date.now()}`,
          consecutivo: 999999,
          cliente: { tipoDocumento: 'CC', numeroDocumento: '1234567', email: 'mock@test.com', nombres: 'Mock' },
          carrito: [],
          totales: {},
          estadoProceso: 'Pendiente',
          company: this.flow && (this.flow as any).companyId
        }
      }];
    }
    return [{ json: { _mock: true, runAt: new Date().toISOString() } }];
  }

  save(opts: { silent?: boolean } = {}): void {
    if (this.saving) return;
    this.saving = true;
    this.errorMessage = '';

    // Build triggers array, applying scheduleDraft if it changed.
    const triggers: FlowTriggerBinding[] = this.buildTriggersForSave();

    const payload: Partial<FlowSpec> = {
      name: this.flowName?.trim() || 'Sin nombre',
      description: this.flowDescription || undefined,
      graph: this.graph,
      status: this.flowStatus,
      tags: this.flowTags && this.flowTags.length ? this.flowTags : undefined,
      triggers
    };

    const action = this.isNew
      ? this.flowsService.create(payload)
      : this.flowsService.update(this.flow!.id, payload);

    action.subscribe({
      next: (saved) => {
        if (saved) {
          const isCreation = this.isNew;
          this.flow = saved;
          this.isNew = false;
          this.hasUnsaved = false;
          this.state.upsertFlow(saved);
          this.saving = false;
          if (!opts.silent) {
            this.toastr.success('Flow guardado.', '', { timeOut: 1800 });
          }
          if (isCreation) {
            // jump to the canonical url so refresh keeps the flow loaded.
            this.router.navigate(['/flows/editor', saved.id]);
          }
        } else {
          this.saving = false;
        }
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo guardar el flujo.';
        this.toastr.error(msg, 'Error al guardar', { timeOut: 5000 });
        this.saving = false;
        if (opts.silent) {
          // re-trigger so the user sees the failure and can retry manually
          this.hasUnsaved = true;
        }
      }
    });
  }

  /**
   * Compose the triggers array for save, preserving any existing trigger
   * config and overlaying the schedule UI changes for cron/polling.
   */
  private buildTriggersForSave(): FlowTriggerBinding[] {
    const existing = this.flow?.triggers || [];
    if (!existing.length) return [];
    return existing.map((t) => {
      if (this.triggerNodeId && t.nodeId === this.triggerNodeId &&
          (t.type === 'cron' || t.type === 'polling')) {
        return {
          ...t,
          config: {
            ...t.config,
            ...(this.scheduleDraft.cron ? { cron: this.scheduleDraft.cron } : {}),
            ...(this.scheduleDraft.intervalMinutes
              ? { intervalMinutes: this.scheduleDraft.intervalMinutes }
              : {})
          }
        };
      }
      return t;
    });
  }

  toggleActivate(): void {
    if (!this.flow || this.isNew) return;
    const wasActive = this.flowStatus === 'active';
    const action = wasActive
      ? this.flowsService.deactivate(this.flow.id)
      : this.flowsService.activate(this.flow.id);
    action.subscribe({
      next: (updated) => {
        if (updated) {
          this.flow = updated;
          this.flowStatus = updated.status;
          this.state.upsertFlow(updated);
          if (wasActive) {
            this.toastr.info('Flow desactivado.', '', { timeOut: 2200 });
          } else {
            this.toastr.success('Flow activado.', '', { timeOut: 2200 });
          }
        }
      },
      error: (err) => {
        this.toastr.error(
          err?.error?.message || 'No se pudo cambiar el estado.',
          'Error',
          { timeOut: 4500 }
        );
      }
    });
  }

  goBack(): void {
    if (this.hasUnsaved && !confirm('Tenés cambios sin guardar. ¿Salir igualmente?')) {
      return;
    }
    this.router.navigate(['/flows']);
  }

  goToRuns(): void {
    if (this.flow) {
      this.router.navigate(['/flows/runs', this.flow.id]);
    }
  }

  // ----- Config panel handlers -----

  toggleConfigPanel(): void {
    this.configPanelOpen = !this.configPanelOpen;
  }

  closeConfigPanel(): void {
    this.configPanelOpen = false;
  }

  addTag(): void {
    const t = (this.newTagInput || '').trim();
    if (!t) return;
    if (this.flowTags.includes(t)) {
      this.newTagInput = '';
      return;
    }
    this.flowTags = [...this.flowTags, t];
    this.newTagInput = '';
    this.hasUnsaved = true;
  }

  removeTag(tag: string): void {
    this.flowTags = this.flowTags.filter((x) => x !== tag);
    this.hasUnsaved = true;
  }

  onScheduleChange(): void {
    this.hasUnsaved = true;
  }

  copyWebhookUrl(): void {
    if (!this.webhookUrl) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.webhookUrl).then(
        () => this.toastr.success('URL copiada.', '', { timeOut: 1500 }),
        () => this.toastr.warning('No se pudo copiar al portapapeles.', '', { timeOut: 2500 })
      );
    }
  }

  closeShortcutsModal(): void {
    this.shortcutsModalOpen = false;
  }

  // ----- Keyboard shortcuts (host-level) -----

  @HostListener('window:keydown.control.s', ['$event'])
  @HostListener('window:keydown.meta.s', ['$event'])
  onSaveShortcut(e: KeyboardEvent): void {
    e.preventDefault();
    this.save();
  }

  @HostListener('window:keydown.escape', ['$event'])
  onEscape(_e: KeyboardEvent): void {
    if (this.shortcutsModalOpen) {
      this.shortcutsModalOpen = false;
    } else if (this.configPanelOpen) {
      this.configPanelOpen = false;
    }
  }
}
