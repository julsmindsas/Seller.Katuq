import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SelectorEquipoModule } from '../../../shared/components/selector-equipo/selector-equipo.module';
import { ChatDuenoComponent } from './chat-dueno/chat-dueno.component';
import { ChatNotasComponent } from './chat-notas/chat-notas.component';
import { ChipLineaComponent } from './chip-linea/chip-linea.component';

/**
 * Piezas de presentación compartidas por los buzones (D-437), sin depender del
 * canal: la franja de dueño del chat, las notas internas (D-725) y la etiqueta de la línea. WhatsApp las
 * usa ya; Meta las adopta en el cambio de unificación de buzones.
 */
@NgModule({
  imports: [CommonModule, FormsModule, SelectorEquipoModule, TranslateModule],
  declarations: [ChatDuenoComponent, ChatNotasComponent, ChipLineaComponent],
  exports: [ChatDuenoComponent, ChatNotasComponent, ChipLineaComponent],
})
export class InboxCoreModule {}
