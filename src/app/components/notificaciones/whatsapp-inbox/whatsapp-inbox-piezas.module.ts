import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { SharedModule } from "../../../shared/shared.module";
import { InboxCoreModule } from "../inbox-core/inbox-core.module";

import { WhatsappThreadDetailComponent } from "./components/whatsapp-thread-detail/whatsapp-thread-detail.component";
import { WhatsappContactPanelComponent } from "./components/whatsapp-contact-panel/whatsapp-contact-panel.component";
import { PhoneMaskPipe } from "./pipes/phone-mask.pipe";

/**
 * Piezas del buzón de WhatsApp que otras pantallas pueden reutilizar sin traer
 * el buzón entero (ni sus rutas): el detalle del chat, el panel de contacto y
 * el pipe que enmascara teléfonos. `WhatsappInboxModule` las importa y la
 * bandeja única (conv-bandeja-unica) las importa igual.
 */
@NgModule({
  declarations: [WhatsappThreadDetailComponent, WhatsappContactPanelComponent, PhoneMaskPipe],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SharedModule, InboxCoreModule],
  exports: [WhatsappThreadDetailComponent, WhatsappContactPanelComponent, PhoneMaskPipe],
})
export class WhatsappInboxPiezasModule {}
