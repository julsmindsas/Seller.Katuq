import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FlowsService } from '../services/flows.service';
import { FlowsStateService } from '../services/flows-state.service';
import { RunStreamService } from '../services/run-stream.service';
import Swal from 'sweetalert2';
import { FlowSpec, NodeSpec, RunContext, RunStatus, RunStatusReason } from '../interfaces/flow.interface';
import {
  cuandoFue,
  duracionLegible,
  textoEstadoCorrida,
  textoMotivo,
  textoOrigenCorrida,
} from '../flows-lenguaje';

@Component({
  selector: 'app-flow-runs',
  templateUrl: './flow-runs.component.html',
  styleUrls: ['./flow-runs.component.scss'],
  providers: [RunStreamService]
})
export class FlowRunsComponent implements OnInit, OnDestroy {
  flowId = '';
  flow: FlowSpec | null = null;
  runs: RunContext[] = [];
  selectedRun: RunContext | null = null;
  loading = false;
  errorMessage = '';
  streamingRunId: string | null = null;
  streamLogs: any[] = [];
  streamStatus: string = 'idle';

  private destroy$ = new Subject<void>();
  /** tipo de paso → nombre legible del catálogo. */
  private catalogo = new Map<string, NodeSpec>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private flowsService: FlowsService,
    private state: FlowsStateService,
    private runStream: RunStreamService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.flowId = params['flowId'];
      if (this.flowId) {
        this.loadFlowMeta();
        this.loadRuns();
      }
    });
    this.flowsService.getNodeCatalog().pipe(takeUntil(this.destroy$)).subscribe((catalogo) => {
      this.catalogo = new Map((catalogo || []).map((s) => [s.type, s]));
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadFlowMeta(): void {
    this.flowsService.getById(this.flowId).subscribe({
      next: (flow) => {
        if (flow) {
          this.flow = flow;
          this.state.setSelectedFlow(flow);
        }
      }
    });
  }

  loadRuns(): void {
    this.loading = true;
    this.errorMessage = '';
    this.flowsService.getRuns(this.flowId).subscribe({
      next: (runs) => {
        this.runs = runs;
        this.loading = false;
        if (runs.length > 0) this.selectRun(runs[0]);
      },
      error: (err) => {
        this.errorMessage = 'No pudimos cargar el historial. Revisa tu internet y vuelve a intentar.';
        this.loading = false;
      }
    });
  }

  /**
   * Selecciona un run para ver detalle. Si el listado vino sin `nodeStates`
   * (la lista resumida no los trae para ahorrar bandwidth), pide el detalle
   * vía `getRun`. Si el run está en estado `running`, abre stream SSE para
   * ver actualizaciones en tiempo real; si ya terminó, cerramos cualquier
   * stream activo previo.
   */
  selectRun(run: RunContext): void {
    this.selectedRun = run;
    const hasNodeStates = run.nodeStates && Object.keys(run.nodeStates).length > 0;
    if (!hasNodeStates) {
      this.flowsService.getRun(run.runId).subscribe({
        next: (full) => {
          if (full && this.selectedRun?.runId === run.runId) {
            this.selectedRun = full;
          }
        }
      });
    }
    if (run.status === 'running') {
      this.startStream(run.runId);
    } else {
      this.runStream.close();
      this.streamingRunId = null;
    }
  }

  private startStream(runId: string): void {
    this.streamingRunId = runId;
    this.streamLogs = [];
    this.runStream.start(runId).pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event.type === 'init' || event.type === 'run_update') {
        this.selectedRun = { ...this.selectedRun!, ...event.data };
      }
      if (event.type === 'log') {
        this.streamLogs.push(event.data);
        if (this.streamLogs.length > 200) this.streamLogs.shift();
      }
      if (event.type === 'done') {
        this.streamingRunId = null;
        this.loadRuns();
      }
    });
    this.runStream.status().pipe(takeUntil(this.destroy$)).subscribe((s) => { this.streamStatus = s; });
  }

  retry(runId: string, event: Event): void {
    event.stopPropagation();
    this.flowsService.retryRun(runId).subscribe({
      next: () => this.loadRuns(),
      error: (err) => { this.errorMessage = err.message; }
    });
  }

  cancel(runId: string, event: Event): void {
    event.stopPropagation();
    Swal.fire({
      title: '¿Detener esta corrida?',
      text: 'Lo que ya alcanzó a hacer no se deshace.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, detener',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B83232',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.flowsService.cancelRun(runId).subscribe({
        next: () => this.loadRuns(),
        error: () => { this.errorMessage = 'No pudimos detener la corrida. Vuelve a intentarlo.'; }
      });
    });
  }

  goBack(): void {
    this.router.navigate(['/flows']);
  }

  goToEditor(): void {
    if (this.flow) this.router.navigate(['/flows/editor', this.flow.id]);
  }

  trackByRunId(_i: number, run: RunContext): string {
    return run.runId;
  }

  trackByNodeId(_i: number, item: { nodeId: string }): string {
    return item.nodeId;
  }

  statusClass(status: RunStatus): string {
    return `kf-runbadge kf-runbadge--${status}`;
  }

  borderColor(status: RunStatus): string {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'failed':
        return '#ef4444';
      case 'running':
        return '#3b82f6';
      case 'partial':
        return '#f59e0b';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#9ca3af';
    }
  }

  get nodeStates() {
    if (!this.selectedRun) return [];
    return Object.entries(this.selectedRun.nodeStates).map(([nodeId, state]) => ({
      nodeId,
      ...state
    }));
  }

  formatJson(obj: unknown): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  /**
   * [Observabilidad] Texto amigable del `statusReason` del run, para mostrar
   * junto al badge de status. Antes: un run 'partial' con nodos success y
   * errors[] vacío no daba pistas de qué pasó.
   */
  statusReasonLabel(reason?: RunStatusReason): string {
    return textoMotivo(reason);
  }

  // ===== Lenguaje para personas no técnicas (2026-10-07, D-350 parte C) =====
  estadoTexto(status: RunStatus | string): string { return textoEstadoCorrida(status); }
  cuando(iso?: string): string { return cuandoFue(iso); }
  duracion(ms?: number): string { return duracionLegible(ms); }
  origen(triggeredBy?: string): string { return textoOrigenCorrida(triggeredBy); }

  /** Nombre del paso como lo dice el catálogo ("Shopify · Crear pedido"), no su id interno. */
  nombrePaso(nodeId: string): string {
    const nodo = (this.flow?.graph?.nodes || []).find((n) => n.id === nodeId);
    const spec = nodo ? this.catalogo.get(nodo.type) : undefined;
    return spec?.displayName || nodo?.type || nodeId;
  }

  /** Cuántos registros salieron de un paso, si se puede saber. */
  registros(n: any): number | null {
    const main = n?.output?.main;
    if (!Array.isArray(main)) return null;
    return main.reduce((t: number, rama: any) => t + (Array.isArray(rama) ? rama.length : 0), 0);
  }
}
