import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  CarteraCliente,
  CarteraResponse,
} from '../../../../shared/services/cartera/cartera.models';
import {
  AGING_BUCKETS,
  metaPago,
  PagoBadgeMeta,
  RISK_OPTIONS,
  RiskFilter,
} from '../../cartera.constants';

/** Un segmento de la mini-barra de aging de un cliente. */
interface AgingSegment {
  cssClass: string;
  pct: number;
  label: string;
  monto: number;
}

/** Entrada de la leyenda de antigüedad (los 4 rangos, con o sin monto). */
interface AgingLegendItem {
  cssClass: string;
  short: string;
  monto: number;
}

/** Etiqueta de riesgo derivada de los datos que ya trae el cliente. */
interface RiesgoMeta {
  label: string;
  cssClass: string;
}

/**
 * Spec 014 — CxC. Tab "Cartera por Cliente" (CA-09 / CA-11).
 * Recibe la respuesta agregada por @Input y filtra client-side (búsqueda,
 * riesgo, vendedor). Cada card muestra saldo, semáforo de cupo, mini-barra de
 * aging y DSO; al hacer click expande el detalle de pedidos con saldo.
 */
@Component({
  selector: 'app-cartera-clientes',
  templateUrl: './cartera-clientes.component.html',
  styleUrls: ['./cartera-clientes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraClientesComponent implements OnChanges {
  @Input() data: CarteraResponse | null = null;

  readonly riskOptions = RISK_OPTIONS;
  readonly agingBuckets = AGING_BUCKETS;

  // Filtros (client-side)
  searchTerm = '';
  riskFilter: RiskFilter = 'todos';
  vendorFilter = '';
  vendorOptions: string[] = [];

  clientes: CarteraCliente[] = [];
  filtered: CarteraCliente[] = [];

  /** Documento del cliente cuyo detalle está expandido (null = ninguno). */
  expandedDoc: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.clientes = this.data?.clientes || [];
      this.vendorOptions = this.buildVendorOptions(this.clientes);
      this.expandedDoc = null;
      this.applyFilters();
    }
  }

  private buildVendorOptions(clientes: CarteraCliente[]): string[] {
    const set = new Set<string>();
    clientes.forEach((c) => {
      const v = (c.vendedor || '').trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filtered = this.clientes.filter((c) => {
      if (term) {
        const nombre = (c.nombre || '').toLowerCase();
        const doc = (c.documento || '').toLowerCase();
        if (!nombre.includes(term) && !doc.includes(term)) return false;
      }
      switch (this.riskFilter) {
        case 'vencida':
          if (!(c.vencido > 0)) return false;
          break;
        case 'cupo80':
          if (c.cupoUsadoPct == null || c.cupoUsadoPct <= 80) return false;
          break;
        case 'excede':
          if (!c.excedeCupo) return false;
          break;
      }
      if (this.vendorFilter && (c.vendedor || '') !== this.vendorFilter) return false;
      return true;
    });
  }

  toggleExpand(cliente: CarteraCliente): void {
    this.expandedDoc = this.expandedDoc === cliente.documento ? null : cliente.documento;
  }

  isExpanded(cliente: CarteraCliente): boolean {
    return this.expandedDoc === cliente.documento;
  }

  // ── Semáforo de cupo ──────────────────────────────────────────────────────
  cupoClass(cliente: CarteraCliente): string {
    const pct = cliente.cupoUsadoPct;
    if (pct == null) return '';
    if (pct > 100) return 'is-danger';
    if (pct >= 80) return 'is-warning';
    return 'is-ok';
  }

  /** Ancho visual de la barra de cupo (clamp 0-100). */
  cupoWidth(cliente: CarteraCliente): number {
    const pct = cliente.cupoUsadoPct;
    if (pct == null) return 0;
    return Math.max(0, Math.min(100, pct));
  }

  // ── Identidad visual de la tarjeta ────────────────────────────────────────
  /** Colores de avatar (se elige uno estable a partir del documento). */
  private static readonly AVATAR_COLORS = [
    '#6C4CE0', '#2F6FE0', '#17994F', '#E0891B', '#D6455B', '#0E9BA4', '#8B5CF6',
  ];

  /** Inicial del nombre para el avatar. */
  initial(cliente: CarteraCliente): string {
    const nombre = (cliente.nombre || '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : '?';
  }

  /** Color de avatar estable por cliente (mismo documento → mismo color). */
  avatarColor(cliente: CarteraCliente): string {
    const key = cliente.documento || cliente.nombre || '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    const colors = CarteraClientesComponent.AVATAR_COLORS;
    return colors[hash % colors.length];
  }

  /**
   * Etiqueta de riesgo del cliente. NO agrega reglas nuevas: reordena en una
   * píldora lo que ya se calcula server-side (excede cupo, vencido, % de cupo).
   */
  riesgo(cliente: CarteraCliente): RiesgoMeta {
    if (cliente.excedeCupo) return { label: 'Excede cupo', cssClass: 'cx-risk-danger' };
    if ((cliente.vencido || 0) > 0) return { label: 'Vencida', cssClass: 'cx-risk-vencida' };
    if (cliente.cupoUsadoPct != null && cliente.cupoUsadoPct >= 80) {
      return { label: 'Cupo alto', cssClass: 'cx-risk-warning' };
    }
    return { label: 'Al día', cssClass: 'cx-risk-ok' };
  }

  // ── Mini-barra de aging ───────────────────────────────────────────────────
  /** Los 4 rangos con su monto, para la leyenda bajo la barra. */
  agingLegend(cliente: CarteraCliente): AgingLegendItem[] {
    return this.agingBuckets.map((b) => ({
      cssClass: b.cssClass,
      short: b.short,
      monto: cliente.aging?.[b.key] || 0,
    }));
  }

  agingSegments(cliente: CarteraCliente): AgingSegment[] {
    const total = cliente.saldoPendiente || 0;
    if (total <= 0) return [];
    return this.agingBuckets
      .map((b) => {
        const monto = cliente.aging?.[b.key] || 0;
        return { cssClass: b.cssClass, pct: (monto / total) * 100, label: b.label, monto };
      })
      .filter((s) => s.monto > 0);
  }

  // ── Detalle de pedidos ────────────────────────────────────────────────────
  metaPago(estado: string): PagoBadgeMeta {
    return metaPago(estado);
  }

  trackByDoc(_index: number, cliente: CarteraCliente): string {
    return cliente.documento || `row-${_index}`;
  }

  trackByPedido(_index: number, pedido: { orderId?: string; nroPedido?: string }): string {
    return pedido.orderId || pedido.nroPedido || `p-${_index}`;
  }
}
