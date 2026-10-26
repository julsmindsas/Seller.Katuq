import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FiltroHistorialProducto } from '../../../shared/models/historial-producto.model';

/**
 * Diálogo del historial de UN producto (D-548, F1), para las cuatro pestañas de Listas de precios:
 * `tipo = 'precios'` muestra solo cambios de precio y `tipo = 'costo'` solo los de costo. Se abre con
 * `NgbModal`; el contenido es el mismo `<app-historial-producto>` de la ficha.
 */
@Component({
  selector: 'app-historial-producto-modal',
  templateUrl: './historial-producto-modal.component.html',
  styleUrls: ['./historial-producto-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialProductoModalComponent {
  /** Id del documento del producto (`producto.cd`). */
  @Input() productoId = '';
  @Input() referencia = '';
  @Input() nombre = '';
  @Input() tipo: FiltroHistorialProducto | null = null;

  constructor(public readonly modal: NgbActiveModal) {}

  get titulo(): string {
    if (this.tipo === 'costo') return 'Historial de costo';
    if (this.tipo === 'precios') return 'Historial de precios';
    return 'Historial del producto';
  }

  cerrar(): void {
    this.modal.dismiss('cerrar');
  }
}
