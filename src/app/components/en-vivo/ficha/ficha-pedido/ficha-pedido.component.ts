import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AccionFicha, CeldaFicha, ContenidoPedido, LineaProducto, PasoRecorrido } from '../ficha.modelos';

/**
 * Cuerpo de la ficha de un pedido: cliente corto y ciudad, etapa, monto, canal, pago, hora de llegada,
 * mensajero o transportadora, recorrido de hoy (cumplidas con su hora, la actual resaltada y las que
 * faltan), productos con cantidad y valor, y las acciones. Solo pinta un `ContenidoPedido` ya armado;
 * las acciones se avisan por `accion` y ninguna escribe nada.
 */
@Component({
  selector: 'app-en-vivo-ficha-pedido',
  templateUrl: './ficha-pedido.component.html',
  styleUrls: ['./ficha-pedido.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFichaPedidoComponent {
  @Input() contenido!: ContenidoPedido;
  @Output() accion = new EventEmitter<AccionFicha>();

  alTocar(accion: AccionFicha): void {
    this.accion.emit(accion);
  }

  porEtiqueta(_: number, celda: CeldaFicha): string {
    return celda.etiqueta;
  }

  porPaso(_: number, paso: PasoRecorrido): string {
    return paso.id;
  }

  porPosicion(indice: number, _: LineaProducto): number {
    return indice;
  }

  porAccion(_: number, accion: AccionFicha): string {
    return accion.tipo;
  }
}
