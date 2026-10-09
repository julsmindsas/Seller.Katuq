import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CeldaFicha, ContenidoMensajero, PedidoAbierto } from '../ficha.modelos';

/**
 * Cuerpo de la ficha de un mensajero o una transportadora: su estado, la última salida, lo que
 * entregó hoy y los pedidos que lleva ahora (tocables). Solo pinta un `ContenidoMensajero` ya armado
 * con la foto: no pide nada. Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-ficha-mensajero',
  templateUrl: './ficha-mensajero.component.html',
  styleUrls: ['./ficha-mensajero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFichaMensajeroComponent {
  @Input() contenido!: ContenidoMensajero;
  @Output() abrirPedido = new EventEmitter<PedidoAbierto>();

  porEtiqueta(_: number, celda: CeldaFicha): string {
    return celda.etiqueta;
  }
}
