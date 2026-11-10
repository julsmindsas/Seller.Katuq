import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { SelectorEquipoModule } from '../selector-equipo/selector-equipo.module';
import { AsistenteConectarComponent } from './asistente-conectar.component';

/**
 * Asistente de tres pasos para conectar un número de WhatsApp directo con Meta (D-707). Lo usan la
 * consola de WhatsApp (Comunicaciones) y Integraciones.
 */
@NgModule({
  imports: [CommonModule, FormsModule, TranslateModule, SelectorEquipoModule],
  declarations: [AsistenteConectarComponent],
  exports: [AsistenteConectarComponent],
})
export class AsistenteConectarModule {}
