import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { TranslateModule } from "@ngx-translate/core";

import { MetaInboxRoutingModule } from "./meta-inbox-routing.module";
import { MetaInboxPiezasModule } from "./meta-inbox-piezas.module";
import { MetaInboxShellComponent } from "./components/meta-inbox-shell/meta-inbox-shell.component";

/**
 * Buzones de Meta (Instagram Direct y Messenger).
 *
 * Módulo lazy compartido por los dos canales. No toca ni importa nada del
 * módulo de WhatsApp, que sigue vivo en producción.
 */
@NgModule({
  declarations: [MetaInboxShellComponent],
  imports: [CommonModule, FormsModule, RouterModule, MetaInboxRoutingModule, TranslateModule, MetaInboxPiezasModule],
})
export class MetaInboxModule {}
