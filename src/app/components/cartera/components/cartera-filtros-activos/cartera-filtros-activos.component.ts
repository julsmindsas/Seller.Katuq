import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CarteraFiltros, ChipFiltro, describirFiltros, filtrosVacios } from '../../cartera-filtros.util';

/**
 * Ticket 1467: los filtros activos como etiquetas, cada una con su X, y el botón «Limpiar filtros».
 * Se usa igual en «Cartera por cliente» y en «Aging», que comparten los mismos filtros.
 */
@Component({
  selector: 'app-cartera-filtros-activos',
  templateUrl: './cartera-filtros-activos.component.html',
  styleUrls: ['./cartera-filtros-activos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraFiltrosActivosComponent implements OnChanges {
  @Input() filtros!: CarteraFiltros;
  @Output() filtrosChange = new EventEmitter<CarteraFiltros>();

  etiquetas: ChipFiltro[] = [];

  ngOnChanges(): void {
    this.etiquetas = this.filtros ? describirFiltros(this.filtros) : [];
  }

  quitar(etiqueta: ChipFiltro): void {
    this.filtrosChange.emit(etiqueta.quitar(this.filtros));
  }

  /** Limpia todos los filtros; el orden elegido se conserva (no es un filtro). */
  limpiar(): void {
    this.filtrosChange.emit(filtrosVacios(this.filtros.orden));
  }

  trackPorId(_i: number, e: ChipFiltro): string {
    return e.id;
  }
}
