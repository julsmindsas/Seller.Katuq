import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SelectorEquipoModule } from '../../../shared/components/selector-equipo/selector-equipo.module';
import { ChatDuenoComponent } from './chat-dueno/chat-dueno.component';
import { ChatCierreComponent } from './chat-cierre/chat-cierre.component';
import { ChatEtiquetasComponent } from './chat-etiquetas/chat-etiquetas.component';
import { ChatAyudaComponent } from './chat-ayuda/chat-ayuda.component';
import { ChatRapidosComponent } from './chat-rapidos/chat-rapidos.component';
import { ChatNotasComponent } from './chat-notas/chat-notas.component';
import { ChipLineaComponent } from './chip-linea/chip-linea.component';

/**
 * Piezas de presentación compartidas por los buzones (D-437), sin depender del
 * canal: la franja de dueño del chat, las notas internas (D-725), la etiqueta de la línea y, en la fase E
 * (D-728), cerrar con motivo, etiquetas del chat y respuestas rápidas con comando. WhatsApp las
 * usa ya; Meta las adopta en el cambio de unificación de buzones.
 */
@NgModule({
  imports: [CommonModule, FormsModule, SelectorEquipoModule, TranslateModule],
  declarations: [
    ChatDuenoComponent,
    ChatNotasComponent,
    ChipLineaComponent,
    ChatCierreComponent,
    ChatEtiquetasComponent,
    ChatRapidosComponent,
    ChatAyudaComponent,
  ],
  exports: [
    ChatDuenoComponent,
    ChatNotasComponent,
    ChipLineaComponent,
    ChatCierreComponent,
    ChatEtiquetasComponent,
    ChatRapidosComponent,
    ChatAyudaComponent,
  ],
})
export class InboxCoreModule {}
