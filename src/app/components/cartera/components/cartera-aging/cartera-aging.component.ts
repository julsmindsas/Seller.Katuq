import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  AgingBuckets,
  CarteraCliente,
  CarteraResponse,
} from '../../../../shared/services/cartera/cartera.models';
import { AGING_BUCKETS } from '../../cartera.constants';

/** KPI de un rango de aging (o el total). */
interface AgingKpi {
  label: string;
  cssClass: string;
  accentClass: string;
  monto: number;
  pct: number;
  isTotal?: boolean;
}

/** Segmento de la barra horizontal grande. */
interface AgingBarSegment {
  cssClass: string;
  label: string;
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

  /** Umbral de ancho (%) bajo el cual el monto no cabe dentro del segmento. */
  private static readonly LABEL_MIN_PCT = 9;

  /** Acentos de KPI card por rango (border-left). */
  private static readonly ACCENTS = ['cx-accent-green', 'cx-accent-amber', 'cx-accent-orange', 'cx-accent-red'];

  rows: CarteraCliente[] = [];
  kpis: AgingKpi[] = [];
  segments: AgingBarSegment[] = [];
  totals: AgingTotals = { corriente: 0, d16_30: 0, d31_60: 0, d60: 0, total: 0 };
  totalCartera = 0;

  readonly agingBuckets = AGING_BUCKETS;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.build();
    }
  }

  private build(): void {
    const aging: AgingBuckets = this.data?.kpis?.aging || { corriente: 0, d16_30: 0, d31_60: 0, d60: 0 };
    const total = this.data?.kpis?.carteraTotal?.monto || this.sumBuckets(aging);
    this.totalCartera = total;

    this.rows = (this.data?.clientes || []).filter((c) => (c.saldoPendiente || 0) > 0);

    // KPIs por rango + total
    this.kpis = AGING_BUCKETS.map((b, i) => {
      const monto = aging[b.key] || 0;
      return {
        label: b.label,
        cssClass: b.cssClass,
        accentClass: CarteraAgingComponent.ACCENTS[i],
        monto,
        pct: total > 0 ? (monto / total) * 100 : 0,
      };
    });
    this.kpis.push({
      label: 'Total cartera',
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
        label: b.label,
        monto,
        pct,
        showText: pct >= CarteraAgingComponent.LABEL_MIN_PCT,
      };
    }).filter((s) => s.monto > 0);

    // Totales por columna (footer)
    this.totals = this.rows.reduce<AgingTotals>(
      (acc, c) => {
        acc.corriente += c.aging?.corriente || 0;
        acc.d16_30 += c.aging?.d16_30 || 0;
        acc.d31_60 += c.aging?.d31_60 || 0;
        acc.d60 += c.aging?.d60 || 0;
        acc.total += c.saldoPendiente || 0;
        return acc;
      },
      { corriente: 0, d16_30: 0, d31_60: 0, d60: 0, total: 0 },
    );
  }

  private sumBuckets(a: AgingBuckets): number {
    return (a.corriente || 0) + (a.d16_30 || 0) + (a.d31_60 || 0) + (a.d60 || 0);
  }

  trackByDoc(_index: number, cliente: CarteraCliente): string {
    return cliente.documento || `row-${_index}`;
  }
}
