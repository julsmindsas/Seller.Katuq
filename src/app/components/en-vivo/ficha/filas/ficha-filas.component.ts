import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FilaVista, PedidoAbierto } from '../ficha.modelos';

/**
 * Filas tocables de una lista de pedidos (en la ficha de una lista y en la de un mensajero). Cada fila
 * es un botón: se abre con clic, Enter o Espacio. Solo pinta lo que le dan; los textos ya vienen armados
 * (y sin cliente ni monto con "ocultar clientes y montos").
 */
@Component({
  selector: 'app-en-vivo-ficha-filas',
  templateUrl: './ficha-filas.component.html',
  styleUrls: ['./ficha-filas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFichaFilasComponent {
  @Input() filas: ReadonlyArray<FilaVista> = [];
  /** Con "Atrás" disponible al abrir una fila (lo decide quien la usa). */
  @Output() abrirPedido = new EventEmitter<PedidoAbierto>();

  alTocar(fila: FilaVista): void {
    this.abrirPedido.emit({ id: fila.id, empresa: fila.empresa });
  }

  porId(_: number, fila: FilaVista): string {
    return fila.id;
  }
}
