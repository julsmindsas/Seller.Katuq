import { Component, Input } from '@angular/core';
import { FilaComprar, InventoryInsights } from '../insights.modelos';

/** Qué comprar ya (D-401). Solo muestra: la orden se crea en "Qué comprar". */
@Component({
  selector: 'app-insights-comprar',
  templateUrl: './insights-comprar.component.html',
  styleUrls: ['../insights.shared.scss']
})
export class InsightsComprarComponent {
  @Input() comprar!: InventoryInsights['comprar'];
  @Input() bodegas: Record<string, string> = {};
  @Input() frasesIA: Record<string, string> = {};

  bodega(id: string): string {
    return this.bodegas[id] || id;
  }

  dinero(valor: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
  }

  dias(fila: FilaComprar): string {
    if (fila.saldo <= 0) return 'Agotado';
    const d = Math.round(fila.coberturaDias || 0);
    return d === 1 ? 'Queda 1 día' : `Quedan ${d} días`;
  }

  trackId(_: number, fila: FilaComprar): string {
    return fila.id;
  }
}
