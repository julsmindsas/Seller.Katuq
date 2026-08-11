import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";

import { MetaInboxRoutingModule } from "./meta-inbox-routing.module";
import { MetaInboxShellComponent } from "./components/meta-inbox-shell/meta-inbox-shell.component";
import { MetaContactPanelComponent } from "./components/meta-contact-panel/meta-contact-panel.component";

/**
 * Buzones de Meta (Instagram Direct y Messenger).
 *
 * Módulo lazy compartido por los dos canales. No toca ni importa nada del
 * módulo de WhatsApp, que sigue vivo en producción.
 */
@NgModule({
  declarations: [MetaInboxShellComponent, MetaContactPanelComponent],
  imports: [CommonModule, FormsModule, RouterModule, MetaInboxRoutingModule],
})
export class MetaInboxModule {}
