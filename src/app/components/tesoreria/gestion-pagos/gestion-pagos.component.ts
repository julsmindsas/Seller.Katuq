import { Component, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';
import { Subject } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';
import { TreasuryService } from '../../../shared/services/treasury/treasury.service';
import { TreasuryMetrics } from '../../../shared/services/treasury/treasury.models';
import { VentasService } from '../../../shared/services/ventas/ventas.service';
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
import {
  filtroPedidosTesoreria,
  PRESET_POR_REVISAR,
  PRESET_SIN_PAGO,
  PRESET_RECHAZADOS,
  rangoPorDefecto,
} from '../tesoreria.constants';

/**
 * Spec 013 — Tesorería MVP. Pantalla "Gestión de Pagos" (CA-14).
 * Orquesta: 6 KPI cards server-side + p-tabView con 5 pestañas.
 * Solo renderiza la pestaña activa (*ngIf) para no lanzar 5 cargas al server.
 */
@Component({
  selector: 'app-gestion-pagos',
  templateUrl: './gestion-pagos.component.html',
  styleUrls: ['./gestion-pagos.component.scss'],
})
export class GestionPagosComponent implements OnInit, OnDestroy {
  loadingMetrics = false;
  metricsError = false;
  metrics: TreasuryMetrics | null = null;

  /** Pedidos de la lista "Sin pago" con su rango por defecto (null = cargando). */
  sinPagoCantidad: number | null = null;
  sinPagoError = false;

  activeIndex = 0;

  readonly presetPorRevisar = PRESET_POR_REVISAR;
  readonly presetSinPago = PRESET_SIN_PAGO;
  readonly presetRechazados = PRESET_RECHAZADOS;

  private destroy$ = new Subject<void>();

  constructor(private treasury: TreasuryService, private ventas: VentasService, private features: CompanyFeaturesService) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  /**
   * Los textos de ayuda de las tarjetas. PrimeNG 14 no tiene `tooltipEvent="both"`: con "hover" el
   * tooltip solo sale con el ratón, así que el foco del teclado lo abre y lo cierra a mano
   * (el texto también va en un `aria-describedby` para lectores de pantalla).
   */
  @ViewChildren(Tooltip) private ayudas!: QueryList<Tooltip>;

  ayudaFoco(evento: Event, abrir: boolean): void {
    const ayuda = this.ayudas?.find((t) => t.el.nativeElement === evento.target);
    if (!ayuda) return;
    if (abrir) ayuda.activate();
    else ayuda.deactivate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMetrics(): void {
    this.loadingMetrics = true;
    this.metricsError = false;
    this.treasury
      .getMetrics()
      .pipe(timeout(12000), takeUntil(this.destroy$))
      .subscribe({
        next: (m) => {
          this.metrics = m;
          this.loadingMetrics = false;
        },
        error: () => {
          this.metricsError = true;
          this.loadingMetrics = false;
        },
      });
    this.loadSinPago();
  }

  /**
   * Ticket 1127: la tarjeta "Sin pago" decía 414 y la lista 170, porque la
   * tarjeta contaba solo "Pendiente" de toda la historia. Ahora cuenta con la
   * misma consulta y el mismo filtro que la lista con su rango por defecto.
   */
  private loadSinPago(): void {
    const company = JSON.parse(localStorage.getItem('currentCompany') || '{}').nomComercial;
    const rango = rangoPorDefecto();
    const filtro: any = filtroPedidosTesoreria(company, PRESET_SIN_PAGO, rango.desde, rango.hasta);
    // Ticket 1461 (tarea 3.1): la lista «Sin pago» abre con «Incluir internos» apagado, así que la tarjeta cuenta
    // lo mismo: sin los clientes internos. El servidor vuelve a comprobar la bandera y sin ella ignora el campo.
    if (this.features.isEnabled('carteraInterna')) {
      filtro.excluirClientesInternos = true;
    }
    this.sinPagoCantidad = null;
    this.sinPagoError = false;
    this.ventas
      // Solo hace falta el total: sin las métricas de la lista, que son pesadas.
      .getOrdersByFilterOptimized(filtro, 1, 1, false)
      .pipe(timeout(15000), takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.sinPagoCantidad = Number(res?.pagination?.totalItems) || 0;
        },
        error: () => {
          this.sinPagoError = true;
        },
      });
  }

  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
  }

  /** Un modal/acción cambió el estado de un pago → refrescar los KPIs. */
  onDataChanged(): void {
    this.loadMetrics();
  }

  /** Desde una alerta: saltar a la cola "Por revisar". */
  goToReview(): void {
    this.activeIndex = 0;
  }
}
