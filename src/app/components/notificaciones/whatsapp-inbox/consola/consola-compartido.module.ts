import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SelectorNumeroComponent } from './componentes/selector-numero/selector-numero.component';
import { VistaPreviaWhatsappComponent } from './componentes/vista-previa-whatsapp/vista-previa-whatsapp.component';

/**
 * Piezas que comparten las secciones de la consola de WhatsApp (D-707): el selector del número activo
 * y la vista previa estilo burbuja. Cada sección lazy importa este módulo en vez de repetirlas.
 */
@NgModule({
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  declarations: [SelectorNumeroComponent, VistaPreviaWhatsappComponent],
  exports: [CommonModule, FormsModule, RouterModule, TranslateModule, SelectorNumeroComponent, VistaPreviaWhatsappComponent],
})
export class ConsolaCompartidoModule {}
