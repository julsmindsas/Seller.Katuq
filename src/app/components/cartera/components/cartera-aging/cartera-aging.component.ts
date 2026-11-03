import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  AgingBuckets,
  CarteraCliente,
  CarteraResponse,
} from '../../../../shared/services/cartera/cartera.models';
import { AGING_BUCKETS } from '../../cartera.constants';
import { agingDeFila, aplicarFiltros, CarteraFiltros, filtrosVacios, hayFiltrosActivos } from '../../cartera-filtros.util';

/** Un renglón de la tabla: el cliente con el aging de lo que se ve con los filtros. */
interface FilaAging {
  documento: string;
  nombre: string;
  aging: AgingBuckets;
  saldoPendiente: number;
}

/** KPI de un rango de aging (o el total). */
interface AgingKpi {
  /** Clave i18n de la etiqueta. */
  labelKey: string;
  cssClass: string;
  accentClass: string;
  monto: number;
  pct: number;
  isTotal?: boolean;
}

/** Segmento de la barra horizontal grande. */
interface AgingBarSegment {
  cssClass: string;
  /** Clave i18n de la etiqueta. */
  labelKey: string;
  monto: number;
  pct: number;
  /** Mostrar el monto dentro del segmento (se oculta si es muy angosto). */
  showText: boolean;
}

/** Totales por columna para el footer de la tabla. */
interface AgingTotals extends AgingBuckets {
  total: number;
}

/**
 * Spec 014 — CxC. Tab "Aging (Antigüedad)" (CA-10).
 * Recibe la respuesta agregada por @Input y muestra 5 KPIs por rango, una barra
 * horizontal segmentada y una tabla por cliente (ordenable) con footer de totales.
 * Todo se precalcula en ngOnChanges (OnPush) para no recomputar en cada CD.
 */
@Component({
  selector: 'app-cartera-aging',
  templateUrl: './cartera-aging.component.html',
  styleUrls: ['./cartera-aging.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraAgingComponent implements OnChanges {
  @Input() data: CarteraResponse | null = null;
  /** Ticket 1467: los mismos filtros de «Cartera por cliente» (los guarda la pantalla). */
  @Input() filtros: CarteraFiltros = filtrosVacios();
  @Output() filtrosChange = new EventEmitter<CarteraFiltros>();
  /** Pide volver a «Cartera por cliente», donde están los controles de los filtros. */
  @Output() editarFiltros = new EventEmitter<void>();

  /** Hay filtros activos (para el aviso de «sin resultados»). */
  hayFiltros = false;

  /** Umbral de ancho (%) bajo el cual el monto no cabe dentro del segmento. */
  private static readonly LABEL_MIN_PCT = 9;

  rows: FilaAging[] = [];
  kpis: AgingKpi[] = [];
  segments: AgingBarSegment[] = [];
  totals: AgingTotals = { ...CarteraAgingComponent.emptyBuckets(), total: 0 };
  totalCartera = 0;

  readonly agingBuckets = AGING_BUCKETS;

  /** Tarjeta cuya ayuda está abierta ('total' o la clase del rango): se lee con teclado y al tocar (ticket 1464). */
  ayudaAbierta: string | null = null;

  alternarAyuda(tarjeta: string): void {
    this.ayudaAbierta = this.ayudaAbierta === tarjeta ? null : tarjeta;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['filtros']) {
      this.build();
    }
  }

  private build(): void {
    // Ticket 1467: los mismos filtros y la misma función que «Cartera por cliente»; así los números cuadran.
    this.hayFiltros = hayFiltrosActivos(this.filtros);
    const vista = aplicarFiltros(this.data?.clientes, this.filtros);
    this.rows = vista.filas
      .map((fila) => ({
        documento: fila.cliente.documento,
        nombre: fila.cliente.nombre,
        aging: agingDeFila(fila, vista.recortaPedidos) as AgingBuckets,
        saldoPendiente: fila.saldo,
      }))
      .filter((r) => r.saldoPendiente > 0);

    // Sin filtros se usan los totales del servidor; con filtros, la suma de lo que se ve.
    let aging: AgingBuckets;
    let total: number;
    if (this.hayFiltros) {
      aging = this.rows.reduce<AgingBuckets>((acc, r) => {
        AGING_BUCKETS.forEach((b) => { acc[b.key] += r.aging[b.key] || 0; });
        return acc;
      }, CarteraAgingComponent.emptyBuckets());
      total = this.rows.reduce((suma, r) => suma + r.saldoPendiente, 0);
    } else {
      aging = this.data?.kpis?.aging || CarteraAgingComponent.emptyBuckets();
      total = this.data?.kpis?.carteraTotal?.monto || this.sumBuckets(aging);
    }
    this.totalCartera = total;

    // KPIs por rango + total
    this.kpis = AGING_BUCKETS.map((b) => {
      const monto = aging[b.key] || 0;
      return {
        labelKey: b.labelKey,
        cssClass: b.cssClass,
        // Mismo color que el punto, la barra y la columna del rango (cx-seg-xxx → cx-accent-xxx).
        accentClass: b.cssClass.replace('cx-seg-', 'cx-accent-'),
        monto,
        pct: total > 0 ? (monto / total) * 100 : 0,
      };
    });
    this.kpis.push({
      labelKey: 'cartera.carteraClientes.carteraTotal',
      cssClass: '',
      accentClass: 'cx-accent-purple',
      monto: total,
      pct: 100,
      isTotal: true,
    });

    // Segmentos de la barra horizontal (solo rangos con monto)
    this.segments = AGING_BUCKETS.map((b) => {
      const monto = aging[b.key] || 0;
      const pct = total > 0 ? (monto / total) * 100 : 0;
      return {
        cssClass: b.cssClass,
        labelKey: b.labelKey,
        monto,
        pct,
        showText: pct >= CarteraAgingComponent.LABEL_MIN_PCT,
      };
    }).filter((s) => s.monto > 0);

    // Totales por columna (footer)
    this.totals = this.rows.reduce<AgingTotals>(
      (acc, c) => {
        AGING_BUCKETS.forEach((b) => {
          acc[b.key] += c.aging?.[b.key] || 0;
        });
        acc.total += c.saldoPendiente || 0;
        return acc;
      },
      { ...CarteraAgingComponent.emptyBuckets(), total: 0 },
    );
  }

  private static emptyBuckets(): AgingBuckets {
    return { sin_vencer: 0, d1_15: 0, d16_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
  }

  private sumBuckets(a: AgingBuckets): number {
    return AGING_BUCKETS.reduce((suma, b) => suma + (a[b.key] || 0), 0);
  }

  /** Clase de color de texto (cx-seg-xxx → cx-c-xxx). */
  colClass(segClass: string): string {
    return segClass.replace('cx-seg-', 'cx-c-');
  }

  trackByDoc(_index: number, cliente: { documento?: string }): string {
    return cliente.documento || `row-${_index}`;
  }
}
