import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CrmService } from '../../services/crm.service';
import { CrmLead, CrmTask, getPrioritySeverity } from '../../models/crm.models';
import { CotizacionesService } from '../../../cotizaciones/cotizaciones.service';
import { Cotizacion } from '../../../cotizaciones/modelo/cotizacion';

type OverdueTask = CrmTask & { _daysOverdue: number };
type UnreviewedTask = CrmTask & { _daysSinceReview: number };
type SeguimientoCotizacion = Cotizacion & { _diasEsperando: number };

@Component({
  selector: 'app-crm-seguimiento',
  templateUrl: './crm-seguimiento.component.html',
  styleUrls: ['./crm-seguimiento.component.scss'],
})
export class CrmSeguimientoComponent implements OnInit, OnDestroy {
  loading = false;
  overdueTasks: OverdueTask[] = [];
  unreviewedTasks: UnreviewedTask[] = [];
  cotizacionesSinAbrir: SeguimientoCotizacion[] = [];
  cotizacionesVistasSinCerrar: SeguimientoCotizacion[] = [];
  cotizacionesVencidas: SeguimientoCotizacion[] = [];

  private leadsById: Record<string, CrmLead> = {};
  private leadsByNit: Record<string, CrmLead> = {};
  private leadsByEmail: Record<string, CrmLead> = {};
  private destroy$ = new Subject<void>();

  getPrioritySeverity = getPrioritySeverity;

  constructor(
    private crmService: CrmService,
    private router: Router,
    private cotizacionesService: CotizacionesService,
  ) {}

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
      // view: 'all' — este módulo cruza cotizaciones contra CUALQUIER lead (incluye
      // Ganado/Perdido, archivados desde D-082); con el default 'active' un lead ya
      // cerrado desaparecía del cruce y sus propuestas vencidas dejaban de detectarse.
      leads: this.crmService.getLeads({ limit: 300, view: 'all' }),
      tasks: this.crmService.getTasks({ status: 'pending' }),
      // Sin filtro de "estado": el backend usa paginación real de Firestore (rápida).
      // Filtrando por estado, en cambio, escanea toda la colección en memoria.
      cotizaciones: this.cotizacionesService.list({ limit: 300 }),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ leads, tasks, cotizaciones }) => {
          this.leadsById = {};
          this.leadsByNit = {};
          this.leadsByEmail = {};
          (leads.data || []).forEach(l => {
            this.leadsById[l.id] = l;
            const nit = this.normalizarDocumento(l.nit);
            if (nit) this.leadsByNit[nit] = l;
            const email = (l.email || '').trim().toLowerCase();
            if (email) this.leadsByEmail[email] = l;
          });

          const now = Date.now();
          this.overdueTasks = (tasks || [])
            .filter(t => t.dueDate && new Date(t.dueDate).getTime() < now)
            .map(t => ({
              ...t,
              _daysOverdue: Math.floor((now - new Date(t.dueDate as string).getTime()) / 86400000),
            }))
            .sort((a, b) => b._daysOverdue - a._daysOverdue);

          const REVIEW_THRESHOLD_DAYS = 8;
          this.unreviewedTasks = (tasks || [])
            .filter(t => t.status === 'pending')
            .filter(t => !(t.dueDate && new Date(t.dueDate).getTime() < now)) // ya vencidas van solo en "Tareas vencidas"
            .map(t => ({
              ...t,
              _daysSinceReview: Math.floor((now - new Date(t.lastReviewedAt || t.createdAt).getTime()) / 86400000),
            }))
            .filter(t => t._daysSinceReview >= REVIEW_THRESHOLD_DAYS)
            .sort((a, b) => b._daysSinceReview - a._daysSinceReview);

          // Solo cotizaciones cuyo cliente coincide con un lead del CRM (documento o email).
          const relevantes = (cotizaciones.data || [])
            .filter(c => !!this.leadDeCotizacion(c))
            .map(c => ({
              ...c,
              _diasEsperando: Math.floor((now - new Date(c.fechaEmision || c.fechaCreacion || now).getTime()) / 86400000),
            }));
          this.cotizacionesSinAbrir = relevantes
            .filter(c => c.estadoCotizacion === 'enviada' && !c.vistaCliente)
            .sort((a, b) => b._diasEsperando - a._diasEsperando);
          this.cotizacionesVistasSinCerrar = relevantes
            .filter(c => c.estadoCotizacion === 'enviada' && c.vistaCliente)
            .sort((a, b) => b._diasEsperando - a._diasEsperando);
          this.cotizacionesVencidas = relevantes
            .filter(c => c.estadoCotizacion === 'vencida')
            .sort((a, b) => b._diasEsperando - a._diasEsperando);

          this.loading = false;
        },
        error: () => { this.loading = false; },
      });
  }

  /** Normaliza un documento para comparar (sin espacios/puntos/guiones). */
  private normalizarDocumento(d?: string | null): string {
    return (d || '').replace(/[\s.\-]/g, '').toLowerCase();
  }

  /** Busca el lead del CRM que coincide con el cliente de la cotización (documento o email). */
  private leadDeCotizacion(c: Cotizacion): CrmLead | null {
    const cli: any = c.cliente || {};
    const nit = this.normalizarDocumento(cli.documento);
    if (nit && this.leadsByNit[nit]) return this.leadsByNit[nit];
    const email = (cli.correo_electronico_comprador || cli.email || '').trim().toLowerCase();
    if (email && this.leadsByEmail[email]) return this.leadsByEmail[email];
    return null;
  }

  /** Lead del CRM asociado a la cotización (para mostrar/enlazar en el template). */
  leadDeCotizacionPublico(c: Cotizacion): CrmLead | null {
    return this.leadDeCotizacion(c);
  }

  leadName(task: CrmTask): string {
    return this.leadsById[task.entityId]?.name || 'Lead';
  }

  goToTask(task: CrmTask): void {
    this.router.navigate(['/crm/detail', task.entityId], { queryParams: { tab: 'tasks' } });
  }

  goToUnreviewedTask(task: UnreviewedTask): void {
    this.crmService.reviewTask(task.id).subscribe();
    this.router.navigate(['/crm/detail', task.entityId], { queryParams: { tab: 'tasks' } });
  }

  clienteNombre(c: Cotizacion): string {
    const cli: any = c.cliente || {};
    return cli.nombres_completos || cli.razonSocial || cli.nombre || 'Sin nombre';
  }

  goToCotizacion(c: Cotizacion): void {
    this.router.navigate(['/cotizaciones/editor', c.id]);
  }

  goToLead(c: Cotizacion): void {
    const lead = this.leadDeCotizacion(c);
    if (lead) this.router.navigate(['/crm/detail', lead.id]);
  }

  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatCurrency(value?: number): string {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }

  // ─── Métricas resumen (calculadas en memoria, sin llamadas extra) ──

  get valorEnRiesgo(): number {
    return [...this.cotizacionesSinAbrir, ...this.cotizacionesVistasSinCerrar, ...this.cotizacionesVencidas]
      .reduce((sum, c) => sum + (c.total || 0), 0);
  }
}
