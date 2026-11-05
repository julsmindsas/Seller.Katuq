import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CarteraCliente } from '../../../../shared/services/cartera/cartera.models';
import { ResumenVendedor, resumenPorVendedor } from '../../cartera-vendedores.util';
import { SIN_VENDEDOR } from '../../cartera-filtros.util';

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
  /** Vendedores que filtran hoy la lista (vacío = todos). Ticket 1467: ahora se pueden elegir varios. */
  @Input() seleccionados: string[] = [];
  @Output() elegir = new EventEmitter<string>();

  filas: ResumenVendedor[] = [];
  totales = { carteraTotal: 0, carteraVencida: 0, pctVencido: 0, clientes: 0 };
  ayudaAbierta = false;
  /**
   * Ticket 1574 (ALMARA): la sección empujaba hacia abajo el resto de Cartera. Sale contraída,
   * con un resumen (vendedores y vencida), y se abre con un clic; se recuerda en este navegador.
   * Con un vendedor elegido se muestra abierta para que el filtro activo no quede escondido.
   */
  abierta = false;
  private static readonly CLAVE_ABIERTA = 'katuq.cartera.vendedores.abierta';

  constructor() {
    try {
      this.abierta = localStorage.getItem(CarteraVendedoresComponent.CLAVE_ABIERTA) === '1';
    } catch { /* sin almacenamiento: queda contraída */ }
  }

  get mostrarTabla(): boolean {
    return this.abierta || this.seleccionados.length > 0;
  }

  alternarAbierta(): void {
    this.abierta = !this.mostrarTabla;
    try {
      localStorage.setItem(CarteraVendedoresComponent.CLAVE_ABIERTA, this.abierta ? '1' : '0');
    } catch { /* sin almacenamiento */ }
  }

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
    // Ticket 1467: «Sin vendedor» también filtra (con el valor especial SIN_VENDEDOR); el otro clic lo suelta.
    this.elegir.emit(this.valorDe(fila));
  }

  valorDe(fila: ResumenVendedor): string {
    return fila.vendedor || SIN_VENDEDOR;
  }

  estaElegido(fila: ResumenVendedor): boolean {
    return this.seleccionados.includes(this.valorDe(fila));
  }

  trackPorVendedor(_i: number, fila: ResumenVendedor): string {
    return fila.vendedor || '__sin__';
  }
}
