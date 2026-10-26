import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AccionPedidoId } from './acciones-pedido.catalogo';
import { BloqueVista, TarjetaBloque, construirBloque } from './acciones-pedido.bloque';
import { EstadoAcciones } from './acciones-pedido.estado';
import { AccionResaltada } from './acciones-pedido.resaltada';
import { TarjetaVista } from './order-options-modal.vista';

/**
 * D-547 (F2, D14): el bloque ACCIONES de 8 del detalle del pedido (4 del rol y 4 del usuario), detrás de la
 * bandera `orderPinnedActions`. Solo PINTA y AVISA: el padre (`ListOrdersComponent`) le pasa las 8 acciones
 * ya resueltas, los estados de D3 calculados con sus reglas de hoy y el resaltado de D17, y ejecuta cada
 * acción con `ejecutarAccionPedido`. No llama a ningún servicio ni escribe nada.
 *
 * Fijar nunca da acceso: una acción que no aplica o que el usuario no puede usar sale deshabilitada con su
 * motivo y no emite nada.
 *
 * Artículo IX (excepción acotada como D-054, D-541 y D-543): Angular 14.3 no tiene signals ni `@if`; el
 * componente es OnPush y usa `*ngIf` / `*ngFor`.
 */
@Component({
  selector: 'app-order-pinned-actions',
  templateUrl: './order-pinned-actions.component.html',
  styleUrls: ['./order-pinned-actions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderPinnedActionsComponent implements OnChanges {
  /** Las 8 acciones, en orden: primero las del rol y después las personales (`ochoAcciones`). */
  @Input() acciones: AccionPedidoId[] = [];
  /** Estados de las acciones (`estadoAcciones`), ya calculados por el padre con los métodos de hoy. */
  @Input() estados: EstadoAcciones | null = null;
  /** El pedido abierto (solo se lee `revisadoParaProduccion`). */
  @Input() pedido: any = null;
  /** Acción resaltada según el estado del pedido (D17). Solo pinta una etiqueta: no mueve nada. */
  @Input() resaltada: AccionResaltada | null = null;

  /** El usuario escogió una acción habilitada. */
  @Output() accion = new EventEmitter<AccionPedidoId>();
  /** «Restablecer acciones»: el padre confirma y guarda. */
  @Output() restablecer = new EventEmitter<void>();

  vista: BloqueVista | null = null;
  descuentoAbierto = false;

  ngOnChanges(): void {
    if (!this.estados) { this.vista = null; return; }
    this.vista = construirBloque(this.acciones, this.estados, !!this.pedido?.revisadoParaProduccion, this.resaltada);
    if (!this.vista.descuentoConMenu) this.descuentoAbierto = false;
  }

  tocar(t: TarjetaBloque): void {
    if (!t.habilitada) return;
    if (t.id === 'discount' && this.vista?.descuentoConMenu) {
      this.descuentoAbierto = !this.descuentoAbierto;
      return;
    }
    this.accion.emit(t.id);
  }

  /** Una opción del menú de Descuento o una acción de factura electrónica. */
  elegir(t: TarjetaVista): void {
    if (!t.habilitada) return;
    this.descuentoAbierto = false;
    this.accion.emit(t.id);
  }

  trackTarjeta = (_: number, t: TarjetaVista) => t.id;
}
