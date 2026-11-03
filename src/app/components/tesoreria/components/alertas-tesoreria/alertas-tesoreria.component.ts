import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { AlertGroup } from '../../../../shared/services/treasury/treasury.models';

import { TranslateService } from '@ngx-translate/core';
/** Chips de pedidos afectados que se muestran antes de colapsar en "+N más". */
const MAX_PEDIDOS_VISIBLES = 12;
/** El servidor resuelve hasta 500 alertas por llamada. */
const LOTE_RESOLVER = 500;

/**
 * Spec 013 — Tesorería MVP. Tab "Alertas" (T-19, CA-11/12).
 * Lista alertas de duplicado (referencia / archivo). "Ir a revisar" lleva a la
 * cola de revisión; "Resolver" marca la alerta como gestionada.
 */
@Component({
  selector: 'app-alertas-tesoreria',
  templateUrl: './alertas-tesoreria.component.html',
  styleUrls: ['./alertas-tesoreria.component.scss'],
})
export class AlertasTesoreriaComponent implements OnChanges, OnDestroy {
  @Input() active = false;

  /** Refrescar KPIs del padre tras resolver una alerta. */
  @Output() changed = new EventEmitter<void>();
  /** Saltar a la pestaña "Por revisar". */
  @Output() goToReview = new EventEmitter<void>();

  /** Alertas agrupadas por referencia (ticket 1451). */
  grupos: AlertGroup[] = [];
  /** Conteo REAL de alertas del filtro: el mismo número de la tarjeta (ticket 1450). */
  totalAlertas = 0;
  totalGrupos = 0;
  /** El servidor leyó solo una parte de las alertas (tope de seguridad): el agrupado puede estar incompleto. */
  truncado = false;
  page = 1;
  readonly pageSize = 15;
  loading = false;
  soloActivas = true;
  resolviendo: string | null = null;

  private loadedOnce = false;
  private destroy$ = new Subject<void>();

  constructor(
    private treasury: TreasuryService,
    private toastr: ToastrService,
    private translate: TranslateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active'] && this.active && !this.loadedOnce) {
      this.loadedOnce = true;
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalGrupos / this.pageSize));
  }

  load(): void {
    this.loading = true;
    this.treasury
      .getAlertGroups(this.soloActivas ? false : undefined, this.page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const grupos = res?.grupos || [];
          const totalGrupos = res?.pagination?.totalItems || 0;
          // Al resolver el único grupo de la última página, esa página queda vacía: se vuelve a la
          // última que sí tiene grupos (o a la 1 si ya no queda ninguno) en vez de dejar sin paginador.
          if (grupos.length === 0 && this.page > 1) {
            this.page = Math.max(1, Math.min(this.page - 1, Math.ceil(totalGrupos / this.pageSize)));
            this.load();
            return;
          }
          this.grupos = grupos;
          this.totalAlertas = res?.total || 0;
          this.totalGrupos = totalGrupos;
          this.truncado = res?.truncado === true;
          this.loading = false;
        },
        error: () => {
          this.grupos = [];
          this.totalAlertas = 0;
          this.totalGrupos = 0;
          this.truncado = false;
          this.loading = false;
        },
      });
  }

  toggleFiltro(): void {
    this.soloActivas = !this.soloActivas;
    this.page = 1;
    this.load();
  }

  irAPagina(delta: number): void {
    const nueva = this.page + delta;
    if (nueva < 1 || nueva > this.totalPaginas) return;
    this.page = nueva;
    this.load();
  }

  tipoLabel(grupo: AlertGroup): string {
    // Ticket 1452: pago de más que el ajuste al peso no tocó.
    if (grupo?.alertType === 'sobrepago') return this.translate.instant('tesoreria.alertasTesoreria.tipoSobrepago');
    return grupo?.alertType === 'duplicate_file'
      ? this.translate.instant('tesoreria.alertasTesoreria.tipoArchivoRepetido')
      : this.translate.instant('tesoreria.alertasTesoreria.tipoComprobanteRepetido');
  }

  /** Explicación en palabras sencillas de por qué salió el aviso. */
  explicacion(grupo: AlertGroup): string {
    if (grupo?.alertType === 'sobrepago') return grupo.mensaje || this.translate.instant('tesoreria.alertasTesoreria.textoSobrepago');
    const clave = grupo?.alertType === 'duplicate_file'
      ? 'tesoreria.alertasTesoreria.textoArchivoRepetido'
      : grupo?.generica
        ? 'tesoreria.alertasTesoreria.textoReferenciaRelleno'
        : 'tesoreria.alertasTesoreria.textoComprobanteRepetido';
    return this.translate.instant(clave, { referencia: grupo?.referencia || '', pedidos: grupo?.totalPedidos || 0 });
  }

  /** Primeros pedidos afectados (número DAD-xxxxx) que se muestran como chips. */
  pedidosVisibles(grupo: AlertGroup): string[] {
    return (grupo?.pedidos || [])
      .slice(0, MAX_PEDIDOS_VISIBLES)
      .map((p) => p.nroPedido || this.translate.instant('tesoreria.alertasTesoreria.pedidoSinNumero'));
  }

  /** Cuántos pedidos afectados quedan fuera de los chips visibles. */
  pedidosRestantes(grupo: AlertGroup): number {
    return Math.max(0, (grupo?.totalPedidos || 0) - MAX_PEDIDOS_VISIBLES);
  }

  irARevisar(): void {
    this.goToReview.emit();
  }

  resolver(grupo: AlertGroup): void {
    if (!grupo?.alertIds?.length) return;
    Swal.fire({
      icon: 'question',
      title: this.translate.instant('tesoreria.alertasTesoreria.marcarComoResuelta'),
      text: this.translate.instant('tesoreria.alertasTesoreria.confirmaResolverGrupo', { alertas: grupo.cantidadAlertas }),
      showCancelButton: true,
      confirmButtonText: this.translate.instant('tesoreria.alertasTesoreria.resolver'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
      confirmButtonColor: '#5F3FE0',
      cancelButtonColor: '#8f8bab',
    }).then((result) => {
      if (!result.isConfirmed) return;
      const lotes: string[][] = [];
      for (let i = 0; i < grupo.alertIds.length; i += LOTE_RESOLVER) {
        lotes.push(grupo.alertIds.slice(i, i + LOTE_RESOLVER));
      }
      this.resolviendo = grupo.key;
      forkJoin(lotes.map((ids) => this.treasury.resolveAlerts(ids)))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.resolviendo = null;
            this.toastr.success(this.translate.instant('tesoreria.alertasTesoreria.alertaResuelta'));
            this.load();
            this.changed.emit();
          },
          error: () => {
            this.resolviendo = null;
            Swal.fire({ icon: 'error', title: this.translate.instant('tesoreria.alertasTesoreria.noSePudoResolver'), text: this.translate.instant('tesoreria.alertasTesoreria.intentaloDeNuevo') });
          },
        });
    });
  }

  trackByGrupo(_index: number, grupo: AlertGroup): string {
    return grupo?.key || `grupo-${_index}`;
  }
}
