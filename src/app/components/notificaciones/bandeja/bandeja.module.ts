import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";

import { SelectorEquipoModule } from "../../../shared/components/selector-equipo/selector-equipo.module";
import { InboxCoreModule } from "../inbox-core/inbox-core.module";
import { MetaInboxPiezasModule } from "../meta-inbox/meta-inbox-piezas.module";
import { WhatsappInboxPiezasModule } from "../whatsapp-inbox/whatsapp-inbox-piezas.module";
import { BandejaRoutingModule } from "./bandeja-routing.module";
import { BandejaShellComponent } from "./components/bandeja-shell/bandeja-shell.component";
import { BandejaListaComponent } from "./components/bandeja-lista/bandeja-lista.component";
import { BandejaEquipoComponent } from "./components/bandeja-equipo/bandeja-equipo.component";
import { BandejaColaEditorComponent } from "./components/bandeja-cola-editor/bandeja-cola-editor.component";
import { BandejaMotivosComponent } from "./components/bandeja-motivos/bandeja-motivos.component";
import { BandejaEtiquetasComponent } from "./components/bandeja-etiquetas/bandeja-etiquetas.component";
import { BandejaRapidosComponent } from "./components/bandeja-rapidos/bandeja-rapidos.component";

/**
 * Bandeja única (conv-bandeja-unica): todos los canales en una sola lista. Módulo lazy y pequeño: reutiliza
 * el detalle y la ficha de cada buzón (sus módulos de piezas) y no declara ninguno propio.
 *
 * Los servicios que usa (`BandejaService` y los de cada buzón) van en `providedIn: "root"`, no aquí: así
 * pasan por el interceptor de la sesión.
 */
@NgModule({
  declarations: [
    BandejaShellComponent,
    BandejaListaComponent,
    BandejaEquipoComponent,
    BandejaColaEditorComponent,
    BandejaMotivosComponent,
    BandejaEtiquetasComponent,
    BandejaRapidosComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    InboxCoreModule,
    SelectorEquipoModule,
    WhatsappInboxPiezasModule,
    MetaInboxPiezasModule,
    BandejaRoutingModule,
  ],
})
export class BandejaModule {}
