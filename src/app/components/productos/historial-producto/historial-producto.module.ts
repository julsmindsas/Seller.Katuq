import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistorialProductoComponent } from './historial-producto.component';
import { HistorialProductoEventoComponent } from './historial-producto-evento.component';
import { HistorialProductoModalComponent } from './historial-producto-modal.component';

/**
 * Historial del producto (D-548, F1). Un solo módulo para que la ficha (`CrearProductosModule`) y
 * Listas de precios (`ListaPreciosModule`) compartan los mismos componentes sin declararlos dos veces.
 * Excepción acotada del Artículo IX, como D-054 y D-541: Angular 14 trabaja con NgModule.
 */
@NgModule({
  imports: [CommonModule],
  declarations: [HistorialProductoComponent, HistorialProductoEventoComponent, HistorialProductoModalComponent],
  exports: [HistorialProductoComponent, HistorialProductoEventoComponent, HistorialProductoModalComponent],
})
export class HistorialProductoModule {}
