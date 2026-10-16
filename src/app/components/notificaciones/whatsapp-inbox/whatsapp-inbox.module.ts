import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { SharedModule } from "../../../shared/shared.module";
import { InboxCoreModule } from "../inbox-core/inbox-core.module";
import { WhatsappInboxRoutingModule } from "./whatsapp-inbox-routing.module";

import { WhatsappInboxShellComponent } from "./components/whatsapp-inbox-shell/whatsapp-inbox-shell.component";
import { WhatsappThreadListComponent } from "./components/whatsapp-thread-list/whatsapp-thread-list.component";
import { WhatsappPedidosListComponent } from "./components/whatsapp-pedidos-list/whatsapp-pedidos-list.component";
import { WhatsappThreadDetailComponent } from "./components/whatsapp-thread-detail/whatsapp-thread-detail.component";
import { WhatsappContactPanelComponent } from "./components/whatsapp-contact-panel/whatsapp-contact-panel.component";
import { WhatsappNewConversationDialogComponent } from "./components/new-conversation-dialog/new-conversation-dialog.component";

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
 * El servicio va en `providedIn: "root"` y NO en `providers` de este módulo:
 * provisto aquí recibía el HttpClient del módulo lazy (SharedModule importa
 * HttpClientModule), que no pasa por HttpInterceptor2, y el buzón daba 401.
 */
@NgModule({
  declarations: [
    WhatsappInboxShellComponent,
    WhatsappThreadListComponent,
    WhatsappPedidosListComponent,
    WhatsappThreadDetailComponent,
    WhatsappContactPanelComponent,
    WhatsappNewConversationDialogComponent,
    PhoneMaskPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    InboxCoreModule,
    WhatsappInboxRoutingModule,
  ],
  exports: [PhoneMaskPipe],
})
export class WhatsappInboxModule {}
