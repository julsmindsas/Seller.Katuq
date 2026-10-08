import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { FlowsService } from '../services/flows.service';
import { FlowsStateService } from '../services/flows-state.service';
import { FlowSpec, FlowStatus, NodeSpec } from '../interfaces/flow.interface';
import {
  SistemaVisible,
  cuandoArranca,
  inicialDe,
  recorrido,
  textoEstadoAutomatizacion,
} from '../flows-lenguaje';

type Filtro = 'todas' | 'active' | 'inactive' | 'draft';

/** Lo que muestra cada tarjeta, calculado una vez por cambio de datos. */
interface Tarjeta {
  flow: FlowSpec;
  de: SistemaVisible | null;
  a: SistemaVisible[];
  cuando: string;
  estado: string;
}

/**
 * Automatizaciones — tablero para personas no técnicas (rediseño 2026-10-07,
 * parte C de D-350). Misma información y mismas acciones que antes (encender,
 * apagar, historial, editar, duplicar); cambia el lenguaje y el estilo, y
 * apagar ahora pide confirmación. No muestra "última ejecución": el backend
 * no la guarda en la automatización y leerla corrida por corrida es caro.
 */
@Component({
  selector: 'app-flows-list',
  templateUrl: './flow-list.component.html',
  styleUrls: ['./flow-list.component.scss']
})
export class FlowsListComponent implements OnInit, OnDestroy {
  flows: FlowSpec[] = [];
  tarjetas: Tarjeta[] = [];
  loading = false;
  errorMessage = '';
  filtro: Filtro = 'todas';
  search = '';
  /** ids con un cambio de estado en curso, para no dejar tocar dos veces. */
  cambiando = new Set<string>();

  private catalogo = new Map<string, NodeSpec>();
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
    // Solo para reconocer qué paso arranca cada automatización; si falla, se usa el catálogo local.
    this.flowsService.getNodeCatalog().pipe(takeUntil(this.destroy$)).subscribe((catalogo) => {
      this.catalogo = new Map((catalogo || []).map((s) => [s.type, s]));
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
      error: () => {
        this.errorMessage = 'No pudimos cargar tus automatizaciones. Revisa tu internet y vuelve a intentar.';
        this.loading = false;
      }
    });
  }

  trackById(_i: number, t: Tarjeta): string {
    return t.flow.id;
  }

  contar(estado: FlowStatus): number {
    return this.flows.filter((f) => f.status === estado).length;
  }

  get hayConError(): number {
    return this.contar('error');
  }

  applyFilters(): void {
    const q = this.normalizar(this.search);
    const visibles = this.flows.filter((f) => {
      if (this.filtro !== 'todas') {
        // "Apagadas" incluye las que quedaron con error: tampoco están corriendo.
        const ok = this.filtro === 'inactive' ? f.status === 'inactive' || f.status === 'error' : f.status === this.filtro;
        if (!ok) return false;
      }
      if (!q) return true;
      return this.normalizar(`${f.name} ${f.description || ''} ${(f.tags || []).join(' ')}`).includes(q);
    });
    const peso = (s: FlowStatus) => ({ error: 0, active: 1, inactive: 2, draft: 3 } as any)[s] ?? 4;
    this.tarjetas = visibles
      .sort((x, y) => peso(x.status) - peso(y.status) || x.name.localeCompare(y.name))
      .map((flow) => {
        const r = recorrido(flow.graph, flow.triggers, this.catalogo);
        return {
          flow,
          de: r.de,
          a: r.a,
          cuando: cuandoArranca(flow, this.catalogo),
          estado: textoEstadoAutomatizacion(flow.status),
        };
      });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setFiltro(filtro: Filtro): void {
    this.filtro = filtro;
    this.applyFilters();
  }

  private normalizar(t: string): string {
    return (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
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

  /** Encender no pide confirmación; apagar sí, porque detiene algo que hoy está pasando solo. */
  toggleActive(t: Tarjeta): void {
    const flow = t.flow;
    if (this.cambiando.has(flow.id)) return;
    if (flow.status !== 'active') {
      this.cambiarEstado(flow, true);
      return;
    }
    const destino = t.a.length ? ` hacia ${t.a.map((s) => s.nombre).join(' y ')}` : '';
    Swal.fire({
      title: `¿Apagar «${flow.name}»?`,
      html: `Mientras esté apagada, Katuq deja de mover estos datos${destino}. Puedes volver a encenderla cuando quieras.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, apagar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B83232',
    }).then((r) => {
      if (r.isConfirmed) this.cambiarEstado(flow, false);
    });
  }

  private cambiarEstado(flow: FlowSpec, encender: boolean): void {
    this.cambiando.add(flow.id);
    this.errorMessage = '';
    const accion = encender ? this.flowsService.activate(flow.id) : this.flowsService.deactivate(flow.id);
    accion.subscribe({
      next: (updated) => {
        this.cambiando.delete(flow.id);
        if (updated) this.state.upsertFlow(updated);
      },
      error: (err) => {
        this.cambiando.delete(flow.id);
        const detalle = err?.error?.message ? ` (${err.error.message})` : '';
        this.errorMessage = encender
          ? `No pudimos encender «${flow.name}». Ábrela y revisa que todos sus pasos estén completos${detalle}.`
          : `No pudimos apagar «${flow.name}». Vuelve a intentarlo${detalle}.`;
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
      error: () => {
        this.errorMessage = `No pudimos duplicar «${flow.name}». Vuelve a intentarlo.`;
      }
    });
  }

  /** "Katuq y Shopify" / "Katuq, SIIGO y Shopify". */
  nombresDe(sistemas: { nombre: string }[]): string {
    const n = sistemas.map((s) => s.nombre);
    return n.length <= 1 ? n.join('') : `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}`;
  }

  inicialDe(nombre: string): string {
    return inicialDe(nombre);
  }

  /** "De Cereza a Katuq y Shopify" o "Dentro de Katuq". */
  rutaEnPalabras(t: Tarjeta): string {
    if (!t.de) return '';
    if (!t.a.length) return `Dentro de ${t.de.nombre}`;
    const nombres = t.a.map((s) => s.nombre);
    const destino = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
    return `De ${t.de.nombre} a ${destino}`;
  }
}
