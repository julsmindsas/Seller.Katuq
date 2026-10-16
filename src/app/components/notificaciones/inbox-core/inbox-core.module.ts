import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SelectorEquipoModule } from '../../../shared/components/selector-equipo/selector-equipo.module';
import { ChatDuenoComponent } from './chat-dueno/chat-dueno.component';
import { ChipLineaComponent } from './chip-linea/chip-linea.component';

/**
 * Piezas de presentación compartidas por los buzones (D-437), sin depender del
 * canal: la franja de dueño del chat y la etiqueta de la línea. WhatsApp las
 * usa ya; Meta las adopta en el cambio de unificación de buzones.
 */
@NgModule({
  imports: [CommonModule, SelectorEquipoModule],
  declarations: [ChatDuenoComponent, ChipLineaComponent],
  exports: [ChatDuenoComponent, ChipLineaComponent],
})
export class InboxCoreModule {}
