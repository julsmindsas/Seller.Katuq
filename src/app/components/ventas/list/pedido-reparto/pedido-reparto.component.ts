import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Una parte de un pedido repartido por bodega (`splitOrder.parts`, D-361). */
interface ParteReparto {
  nroPedido: string;
  idBodega?: string;
  warehouseName?: string;
  provider?: string;
  pendiente?: boolean;
}

const PROVEEDORES: Record<string, string> = {
  osmosis: 'Cereza',
  fullpi: 'Fullpi',
  own: 'Bodega propia',
};

/**
 * Pedido de tienda repartido en un pedido por bodega (D-361, ticket 1120).
 * Solo presentación: lee `pedido.splitOrder` y avisa cuál parte quiere abrir.
 *   - `chip`: "1 de 3" junto al número, con las demás partes en el tooltip.
 *   - `tarjeta`: el pedido de la tienda y sus partes, cada una con su bodega.
 */
@Component({
  selector: 'app-pedido-reparto',
  templateUrl: './pedido-reparto.component.html',
  styleUrls: ['./pedido-reparto.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoRepartoComponent {
  @Input() pedido: any;
  @Input() modo: 'chip' | 'tarjeta' = 'chip';
  /** Número del pedido de otra parte que el usuario quiere ver. */
  @Output() abrir = new EventEmitter<string>();

  get reparto(): any {
    const s = this.pedido?.splitOrder;
    return s && Number(s.totalParts) > 1 ? s : null;
  }

  get partes(): ParteReparto[] {
    const s = this.reparto;
    if (!s) return [];
    const partes: ParteReparto[] = Array.isArray(s.parts) && s.parts.length
      ? s.parts
      : (s.siblings || []).map((nroPedido: string) => ({ nroPedido }));
    const pendientes: ParteReparto[] = (s.pendingParts || []).map((p: any) => ({
      nroPedido: '',
      idBodega: p.idBodega,
      warehouseName: p.warehouseName,
      pendiente: true,
    }));
    return [...partes, ...pendientes];
  }

  /** "Shopify #1174", "WooCommerce #88" o "la tienda". */
  get origen(): string {
    const integ = this.pedido?.integrations || this.pedido?.integraciones || {};
    const ref = this.reparto?.originalReference || this.pedido?.nroPedidoReferencia || '';
    const tienda = integ.shopify ? 'Shopify' : integ.woocommerce ? 'WooCommerce' : 'la tienda';
    return ref ? `${tienda} ${ref}` : tienda;
  }

  get tooltip(): string {
    const otras = this.partes
      .filter((p) => !p.pendiente && p.nroPedido !== this.pedido?.nroPedido)
      .map((p) => `${p.nroPedido}${p.warehouseName ? ` (${p.warehouseName})` : ''}`);
    const base = `Pedido de ${this.origen} repartido por bodega`;
    return otras.length ? `${base}. Las otras partes: ${otras.join(', ')}` : base;
  }

  proveedor(provider?: string): string {
    return provider ? (PROVEEDORES[provider] || provider) : '';
  }

  esEste(parte: ParteReparto): boolean {
    return !!parte.nroPedido && parte.nroPedido === this.pedido?.nroPedido;
  }

  abrirParte(parte: ParteReparto, event: Event): void {
    event.stopPropagation();
    if (parte.pendiente || this.esEste(parte)) return;
    this.abrir.emit(parte.nroPedido);
  }

  trackByParte(_: number, parte: ParteReparto): string {
    return parte.nroPedido || `pendiente-${parte.idBodega}`;
  }
}
