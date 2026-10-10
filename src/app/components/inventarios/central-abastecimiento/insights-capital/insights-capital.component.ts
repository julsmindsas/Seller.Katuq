import { Component, Input } from '@angular/core';
import { AccionCapital, FilaCapital, InventoryInsights } from '../insights.modelos';

const ACCIONES: Record<AccionCapital, { texto: string; clase: string }> = {
  trasladar: { texto: 'Trasladar', clase: 'is-info' },
  promocionar: { texto: 'Promocionar', clase: 'is-accent' },
  liquidar: { texto: 'Liquidar', clase: 'is-warning' },
  revisar: { texto: 'Revisar', clase: 'is-slate' },
};

/** Capital parado (D-401): lo que no se vende o sobra, con la acción sugerida. */
@Component({
  selector: 'app-insights-capital',
  templateUrl: './insights-capital.component.html',
  styleUrls: ['../insights.shared.scss']
})
export class InsightsCapitalComponent {
  @Input() capital!: InventoryInsights['capital'];
  @Input() bodegas: Record<string, string> = {};
  @Input() ventanaDias = 30;
  @Input() frasesIA: Record<string, { accion: AccionCapital; motivo: string }> = {};

  bodega(id: string): string {
    return this.bodegas[id] || id;
  }

  dinero(valor: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
  }

  accion(fila: FilaCapital): { texto: string; clase: string } {
    return ACCIONES[this.frasesIA[fila.id]?.accion || fila.accionBase] || ACCIONES.revisar;
  }

  trackId(_: number, fila: FilaCapital): string {
    return fila.id;
  }
}
