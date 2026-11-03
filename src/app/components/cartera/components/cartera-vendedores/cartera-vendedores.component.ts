import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CarteraCliente } from '../../../../shared/services/cartera/cartera.models';
import { ResumenVendedor, resumenPorVendedor } from '../../cartera-vendedores.util';

/**
 * Ticket 1464 (punto 4): resumen de cartera por vendedor (cartera total, vencida, % vencido y
 * número de clientes). Sale de los clientes que ya trae la pantalla. Al elegir un vendedor, la
 * lista de abajo se filtra por él; otro clic en el mismo lo suelta.
 */
@Component({
  selector: 'app-cartera-vendedores',
  templateUrl: './cartera-vendedores.component.html',
  styleUrls: ['./cartera-vendedores.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraVendedoresComponent implements OnChanges {
  @Input() clientes: CarteraCliente[] | null = null;
  /** Vendedor que filtra hoy la lista ('' = todos). */
  @Input() seleccionado = '';
  @Output() elegir = new EventEmitter<string>();

  filas: ResumenVendedor[] = [];
  totales = { carteraTotal: 0, carteraVencida: 0, pctVencido: 0, clientes: 0 };
  ayudaAbierta = false;

  ngOnChanges(): void {
    this.filas = resumenPorVendedor(this.clientes);
    const total = this.filas.reduce((s, f) => s + f.carteraTotal, 0);
    const vencida = this.filas.reduce((s, f) => s + f.carteraVencida, 0);
    this.totales = {
      carteraTotal: total,
      carteraVencida: vencida,
      pctVencido: total > 0 ? Math.round((vencida / total) * 1000) / 10 : 0,
      clientes: this.filas.reduce((s, f) => s + f.clientes, 0),
    };
  }

  alternarAyuda(): void {
    this.ayudaAbierta = !this.ayudaAbierta;
  }

  alElegir(fila: ResumenVendedor): void {
    if (!fila.vendedor) return; // «Sin vendedor» no es un filtro de la lista
    this.elegir.emit(this.seleccionado === fila.vendedor ? '' : fila.vendedor);
  }

  trackPorVendedor(_i: number, fila: ResumenVendedor): string {
    return fila.vendedor || '__sin__';
  }
}
