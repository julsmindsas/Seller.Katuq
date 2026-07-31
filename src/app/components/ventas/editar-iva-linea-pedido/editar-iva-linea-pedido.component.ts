import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Pedido } from '../modelo/pedido';
import { VentasService } from '../../../shared/services/ventas/ventas.service';

/**
 * Modal para editar el IVA manual de UNA línea de un pedido ya creado.
 * OpenSpec `edit-order-line-iva` (D-135). Componente pequeño y autocontenido (SRP):
 * no recalcula totales — solo envía la intención y muestra lo que devuelve el backend
 * (motor canónico spec010), evitando duplicar el cálculo en el frontend.
 */
@Component({
  selector: 'app-editar-iva-linea-pedido',
  templateUrl: './editar-iva-linea-pedido.component.html',
  styleUrls: ['./editar-iva-linea-pedido.component.scss'],
})
export class EditarIvaLineaPedidoComponent implements OnChanges {
  @Input() pedido: Pedido | null = null;
  @Output() ivaActualizado = new EventEmitter<any>();
  @Output() cerrar = new EventEmitter<void>();

  readonly ivasPermitidos = [0, 5, 8, 19];

  lineaSeleccionadaIndex: number | null = null;
  nuevoIva: number | null = null;
  guardando = false;
  error: string | null = null;

  constructor(private ventasService: VentasService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pedido']) {
      this.lineaSeleccionadaIndex = null;
      this.nuevoIva = null;
      this.error = null;
      this.guardando = false;
    }
  }

  get lineas(): any[] {
    return this.pedido?.carrito || [];
  }

  ivaActualDeLinea(linea: any): number {
    if (linea?._ivaManualOverride !== undefined && linea?._ivaManualOverride !== null) {
      return Number(linea._ivaManualOverride);
    }
    return Number(linea?.producto?.precio?.precioUnitarioIva) || 0;
  }

  seleccionarLinea(index: number): void {
    this.lineaSeleccionadaIndex = index;
    this.nuevoIva = this.ivaActualDeLinea(this.lineas[index]);
    this.error = null;
  }

  puedeGuardar(): boolean {
    if (this.lineaSeleccionadaIndex === null || this.nuevoIva === null || this.guardando) {
      return false;
    }
    const linea = this.lineas[this.lineaSeleccionadaIndex];
    return this.nuevoIva !== this.ivaActualDeLinea(linea);
  }

  guardar(): void {
    if (!this.pedido?._id || this.lineaSeleccionadaIndex === null || this.nuevoIva === null) {
      return;
    }
    const linea = this.lineas[this.lineaSeleccionadaIndex];
    const productoCd = linea?.producto?.cd;
    if (!productoCd) {
      this.error = 'No se pudo identificar el producto de esta línea.';
      return;
    }

    this.guardando = true;
    this.error = null;

    this.ventasService
      .editarIvaLineaPedido(
        this.pedido._id,
        this.lineaSeleccionadaIndex,
        productoCd,
        this.nuevoIva,
        (this.pedido as any).date_upd || null,
      )
      .subscribe({
        next: (response) => {
          this.guardando = false;
          this.ivaActualizado.emit(response?.order || response);
        },
        error: (err) => {
          this.guardando = false;
          // Prioridad: mensaje específico del backend (err.error.error) sobre el genérico de
          // Angular (err.message, ej. "Http failure response for ...") — para 403/404/500 el
          // backend siempre trae la razón puntual (ya facturado, pedido congelado, etc.).
          this.error = err?.error?.error || err?.message || 'No se pudo actualizar el IVA de la línea.';
        },
      });
  }

  cancelar(): void {
    this.cerrar.emit();
  }
}
