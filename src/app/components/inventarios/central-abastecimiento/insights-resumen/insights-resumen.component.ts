import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ExplicacionIA, InventoryInsights } from '../insights.modelos';

/**
 * Resumen compacto de la IA de inventarios (D-401) para otras pantallas, como el
 * inventario por catálogo: los cuatro números, lo que dice Opttia, lo más urgente y
 * cómo queda cada bodega. El detalle vive en la Central de Abastecimiento.
 */
@Component({
  selector: 'app-insights-resumen',
  templateUrl: './insights-resumen.component.html',
  styleUrls: ['../insights.shared.scss', './insights-resumen.component.scss']
})
export class InsightsResumenComponent {
  @Input() insights!: InventoryInsights;
  @Input() ia: ExplicacionIA | null = null;
  @Input() aviso: string | null = null;
  @Output() cerrar = new EventEmitter<void>();

  dinero(valor: number | null | undefined): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor || 0);
  }

  bodega(id: string): string {
    return this.insights.bodegas[id] || id;
  }

  /** Cuántos urgentes, cuánto capital parado y cuántos avisos tiene cada bodega. */
  get porBodega(): { id: string; nombre: string; urgentes: number; capital: number; avisos: number }[] {
    const mapa = new Map<string, { id: string; nombre: string; urgentes: number; capital: number; avisos: number }>();
    const fila = (id: string) => {
      if (!mapa.has(id)) mapa.set(id, { id, nombre: this.bodega(id), urgentes: 0, capital: 0, avisos: 0 });
      return mapa.get(id)!;
    };
    this.insights.comprar.filas.forEach((f) => fila(f.idBodega).urgentes++);
    this.insights.capital.filas.forEach((f) => (fila(f.idBodega).capital += f.valorCosto || 0));
    this.insights.avisos.filas.forEach((f) => fila(f.idBodega).avisos++);
    return [...mapa.values()].sort((a, b) => b.urgentes - a.urgentes || b.capital - a.capital).slice(0, 6);
  }

  frase(id: string, base: string): string {
    return this.ia?.comprar?.[id] || base;
  }
}
