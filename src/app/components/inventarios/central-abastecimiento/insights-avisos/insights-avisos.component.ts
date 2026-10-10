import { Component, Input } from '@angular/core';
import { FilaAviso, InventoryInsights } from '../insights.modelos';

const TIPOS: Record<FilaAviso['tipo'], string> = {
  saldo_negativo: 'Saldo negativo',
  salidas_sin_motivo: 'Salidas sin motivo',
  doble_conteo: 'Registro repetido',
  ajuste_atipico: 'Ajuste fuera de lo normal',
};

/** Avisos de anomalías (D-400). Solo informa: nada se repara desde aquí. */
@Component({
  selector: 'app-insights-avisos',
  templateUrl: './insights-avisos.component.html',
  styleUrls: ['../insights.shared.scss']
})
export class InsightsAvisosComponent {
  @Input() avisos!: InventoryInsights['avisos'];
  @Input() bodegas: Record<string, string> = {};
  @Input() frasesIA: Record<string, { explicacion: string; prioridad: 'alta' | 'media' | 'baja' }> = {};

  bodega(id: string): string {
    return this.bodegas[id] || id;
  }

  tipo(fila: FilaAviso): string {
    return TIPOS[fila.tipo] || fila.tipo;
  }

  prioridadClase(fila: FilaAviso): string {
    const p = this.frasesIA[fila.id]?.prioridad;
    return p === 'alta' ? 'is-danger' : p === 'baja' ? 'is-slate' : 'is-warning';
  }

  trackId(_: number, fila: FilaAviso): string {
    return fila.id;
  }
}
