import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AccionPedidoId } from './acciones-pedido.catalogo';
import { textoSugerencia } from './acciones-pedido.sugerencia-texto';

/**
 * D-547 (F2, D16): el aviso «Usas Pagos a diario, ¿lo fijamos?» dentro del detalle del pedido, encima del bloque
 * ACCIONES y sin ventana. Katuq SOLO sugiere: este componente no fija nada; avisa `(fijar)` o `(ahoraNo)` y el
 * padre decide y guarda. Nada cambia en las 8 acciones sin que el usuario acepte.
 *
 * Artículo IX (excepción acotada como D-054, D-541 y D-543): Angular 14.3 no tiene signals ni `@if`; el
 * componente es OnPush y usa `*ngIf`.
 */
@Component({
  selector: 'app-order-action-suggestion',
  templateUrl: './order-action-suggestion.component.html',
  styleUrls: ['./order-action-suggestion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderActionSuggestionComponent implements OnChanges {
  /** La acción que se sugiere fijar. */
  @Input() accion: AccionPedidoId | null = null;

  /** «Fijar»: hace lo mismo que el pin del modal. */
  @Output() fijar = new EventEmitter<void>();
  /** «Ahora no»: no se vuelve a sugerir esa acción durante 30 días. */
  @Output() ahoraNo = new EventEmitter<void>();

  texto = '';

  ngOnChanges(): void {
    this.texto = this.accion ? textoSugerencia(this.accion) : '';
  }
}
