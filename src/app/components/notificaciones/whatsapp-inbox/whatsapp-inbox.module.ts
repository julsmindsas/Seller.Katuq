import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { SharedModule } from "../../../shared/shared.module";
import { WhatsappInboxRoutingModule } from "./whatsapp-inbox-routing.module";
import { WhatsappInboxService } from "./whatsapp-inbox.service";

import { WhatsappInboxShellComponent } from "./components/whatsapp-inbox-shell/whatsapp-inbox-shell.component";
import { WhatsappThreadListComponent } from "./components/whatsapp-thread-list/whatsapp-thread-list.component";
import { WhatsappThreadDetailComponent } from "./components/whatsapp-thread-detail/whatsapp-thread-detail.component";
import { WhatsappContactPanelComponent } from "./components/whatsapp-contact-panel/whatsapp-contact-panel.component";

import { PhoneMaskPipe } from "./pipes/phone-mask.pipe";

/**
 * Módulo lazy WhatsApp Inbox (spec 009).
 *
 * Estructura:
 *   - Shell (3 columnas)
 *   - ThreadList (izquierda) ── selecciona hilo
 *   - ThreadDetail (centro) ── stream de mensajes
 *   - ContactPanel (derecha) ── perfil + lead + pedidos + rating
 *
 * El servicio se provee aquí (no `providedIn: "root"`) para que el módulo
 * sea autocontenido y el bundle no se cargue hasta entrar a la ruta.
 */
@NgModule({
  declarations: [
    WhatsappInboxShellComponent,
    WhatsappThreadListComponent,
    WhatsappThreadDetailComponent,
    WhatsappContactPanelComponent,
    PhoneMaskPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    WhatsappInboxRoutingModule,
  ],
  providers: [WhatsappInboxService],
  exports: [PhoneMaskPipe],
})
export class WhatsappInboxModule {}
