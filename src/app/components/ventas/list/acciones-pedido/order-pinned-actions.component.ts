import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { AccionPedidoId, accionPorId } from './acciones-pedido.catalogo';
import { BloqueVista, OpcionesPanelV2, TarjetaBloque, construirBloque } from './acciones-pedido.bloque';
import { EstadoAcciones } from './acciones-pedido.estado';
import { etiquetaPin } from './acciones-pedido.pines';
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
 * D-635 (ticket 1472): con la bandera `panelAccionesV2` el bloque es de NUEVE (4 del rol y 5 personales), en tres
 * columnas, con «Frecuente», el estado de la tarjeta y el pin en cada una. El pin solo AVISA (`fijar`): el padre
 * decide y guarda con el mismo camino del modal.
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

  /** D-635: `true` con la bandera `panelAccionesV2` encendida: panel de nueve, tres columnas, pin y «Frecuente». */
  @Input() panelV2 = false;
  /** D-635: personales que entraron por uso (no por pin); llevan «Frecuente» mientras no estén fijadas. */
  @Input() frecuentes: AccionPedidoId[] = [];
  /** D-635: las acciones del rol (pin con candado, no se sueltan). */
  @Input() delRol: AccionPedidoId[] = [];
  /** D-635: lo que el usuario fijó. */
  @Input() pines: AccionPedidoId[] = [];

  /** El usuario escogió una acción habilitada. */
  @Output() accion = new EventEmitter<AccionPedidoId>();
  /** «Restablecer acciones»: el padre confirma y guarda. */
  @Output() restablecer = new EventEmitter<void>();
  /** D-635: el usuario tocó el pin de una tarjeta. `fijar: true` pide fijarla y `false` soltarla; el padre decide y guarda. */
  @Output() fijar = new EventEmitter<{ id: AccionPedidoId; fijar: boolean }>();

  vista: BloqueVista | null = null;
  descuentoAbierto = false;

  ngOnChanges(): void {
    if (!this.estados) { this.vista = null; return; }
    const v2: OpcionesPanelV2 | undefined = this.panelV2
      ? { pedido: this.pedido, frecuentes: this.frecuentes || [], delRol: this.delRol || [], pines: this.pines || [] }
      : undefined;
    this.vista = construirBloque(this.acciones, this.estados, !!this.pedido?.revisadoParaProduccion, this.resaltada, v2);
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

  /** D-635: el pin de una tarjeta. Una del rol no se suelta. Fijar no da acceso: también sirve en una deshabilitada. */
  alPin(t: TarjetaBloque): void {
    if (!this.panelV2 || !t.pin || t.pin === 'rol') return;
    this.fijar.emit({ id: t.id, fijar: t.pin === 'libre' });
  }

  /** D-635: nombre accesible y `title` del pin. */
  etiquetaDelPin(t: TarjetaBloque): string {
    return t.pin ? etiquetaPin(t.pin, true) : '';
  }

  /** Una opción del menú de Descuento o una acción de factura electrónica. */
  elegir(t: TarjetaVista): void {
    if (!t.habilitada) return;
    this.descuentoAbierto = false;
    this.accion.emit(t.id);
  }

  trackTarjeta = (_: number, t: TarjetaVista) => t.id;

  /** Ticket 1585: grupo de color de la tarjeta (el mismo de su columna en el modal). Solo presentación. */
  grupoDe = (t: { id: AccionPedidoId }): string | null => accionPorId(t.id)?.columna ?? null;
}
