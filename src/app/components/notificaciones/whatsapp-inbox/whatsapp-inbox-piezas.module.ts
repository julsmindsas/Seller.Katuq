import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { SharedModule } from "../../../shared/shared.module";
import { InboxCoreModule } from "../inbox-core/inbox-core.module";

import { WhatsappThreadDetailComponent } from "./components/whatsapp-thread-detail/whatsapp-thread-detail.component";
import { WhatsappContactPanelComponent } from "./components/whatsapp-contact-panel/whatsapp-contact-panel.component";
import { PhoneMaskPipe } from "./pipes/phone-mask.pipe";
import { WaAdjuntoVistaComponent } from "./adjuntos/wa-adjunto-vista/wa-adjunto-vista.component";
import { WaAdjuntarComponent } from "./adjuntos/wa-adjuntar/wa-adjuntar.component";

/**
 * Piezas del buzón de WhatsApp que otras pantallas pueden reutilizar sin traer
 * el buzón entero (ni sus rutas): el detalle del chat, el panel de contacto y
 * el pipe que enmascara teléfonos. `WhatsappInboxModule` las importa y la
 * bandeja única (conv-bandeja-unica) las importa igual. Los archivos del chat (ver y adjuntar, solo con la
 * bandeja única) van aquí porque los usa el detalle.
 */
@NgModule({
  declarations: [
    WhatsappThreadDetailComponent,
    WhatsappContactPanelComponent,
    PhoneMaskPipe,
    WaAdjuntoVistaComponent,
    WaAdjuntarComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedModule, InboxCoreModule],
  exports: [WhatsappThreadDetailComponent, WhatsappContactPanelComponent, PhoneMaskPipe],
})
export class WhatsappInboxPiezasModule {}
