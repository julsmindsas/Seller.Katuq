import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  TARIFAS_IVA, lineaDesdeItemPos, permitePrecioManual, resolverLineaPos,
  sanearDescuento, sanearPrecioManual, tieneCambios,
} from '../../../../../shared/utils/pos-linea-precio';

/**
 * D-536: precio base (si el producto lo permite), IVA y Desc. % de una línea del
 * ticket del POS. Mismos campos y reglas que el carrito de la venta asistida;
 * muta el ítem del carrito y avisa con (cambio).
 */
@Component({
  selector: 'app-pos-linea-precio',
  templateUrl: './pos-linea-precio.component.html',
  styleUrls: ['./pos-linea-precio.component.scss']
})
export class PosLineaPrecioComponent {
  @Input() item: any;
  @Output() cambio = new EventEmitter<void>();

  readonly tarifas = TARIFAS_IVA;

  get permiteManual(): boolean {
    return permitePrecioManual(lineaDesdeItemPos(this.item));
  }

  get resuelta() {
    return resolverLineaPos(lineaDesdeItemPos(this.item));
  }

  get editada(): boolean {
    return tieneCambios(lineaDesdeItemPos(this.item));
  }

  get precioBase(): any {
    if (this.item?._precioManualTemp !== undefined) return this.item._precioManualTemp;
    return this.resuelta.sinIva;
  }

  get ivaActual(): number {
    return this.resuelta.tarifa;
  }

  get descActual(): number {
    return sanearDescuento(this.item?.descuentoLinea);
  }

  onPrecioInput(value: any): void {
    this.item._precioManualTemp = value;
    const n = sanearPrecioManual(value);
    if (n !== undefined) this.item._precioManualOverride = n;
    this.cambio.emit();
  }

  onPrecioConfirm(): void {
    if (this.item._precioManualTemp === undefined) return;
    const n = sanearPrecioManual(this.item._precioManualTemp);
    if (n === undefined) delete this.item._precioManualOverride;
    else this.item._precioManualOverride = n;
    delete this.item._precioManualTemp;
    this.cambio.emit();
  }

  onIvaChange(value: any): void {
    const iva = Number(value);
    if (!(TARIFAS_IVA as readonly number[]).includes(iva)) return;
    this.item._ivaManualOverride = iva;
    this.cambio.emit();
  }

  onDescChange(value: any): void {
    const d = sanearDescuento(value);
    if (d > 0) this.item.descuentoLinea = d;
    else delete this.item.descuentoLinea;
    this.cambio.emit();
  }

  restaurar(): void {
    delete this.item._precioManualOverride;
    delete this.item._ivaManualOverride;
    delete this.item.descuentoLinea;
    delete this.item._precioManualTemp;
    this.cambio.emit();
  }
}
