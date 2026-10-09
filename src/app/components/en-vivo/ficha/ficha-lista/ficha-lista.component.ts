import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CeldaFicha, ContenidoLista, PedidoAbierto } from '../ficha.modelos';

/**
 * Cuerpo de la ficha de una lista: los pedidos de una cifra, etapa, ciudad o canal, del más nuevo al
 * más viejo, con lo que suman y su ticket promedio. Tocar una fila avisa por `abrirPedido` (la ficha
 * del pedido se abre con "Atrás" para volver aquí). Solo pinta un `ContenidoLista` ya armado.
 */
@Component({
  selector: 'app-en-vivo-ficha-lista',
  templateUrl: './ficha-lista.component.html',
  styleUrls: ['./ficha-lista.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFichaListaComponent {
  @Input() contenido!: ContenidoLista;
  @Output() abrirPedido = new EventEmitter<PedidoAbierto>();

  porEtiqueta(_: number, celda: CeldaFicha): string {
    return celda.etiqueta;
  }
}
