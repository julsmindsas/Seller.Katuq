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

  // ── Mini-barra de aging ───────────────────────────────────────────────────
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
