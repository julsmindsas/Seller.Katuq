import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";

import { InboxCoreModule } from "../inbox-core/inbox-core.module";
import { CopMonedaPipe } from "../../../shared/pipes/cop-moneda.pipe";
import { MetaHiloDetalleComponent } from "./components/meta-hilo-detalle/meta-hilo-detalle.component";
import { MetaContactPanelComponent } from "./components/meta-contact-panel/meta-contact-panel.component";
import { MetaAdjuntoVistaComponent } from "./adjuntos/meta-adjunto-vista/meta-adjunto-vista.component";
import { MetaAdjuntarComponent } from "./adjuntos/meta-adjuntar/meta-adjuntar.component";

/**
 * Piezas reutilizables de los buzones de Meta: la conversación abierta y el panel de contacto.
 *
 * Sin rutas, para que otras pantallas (la bandeja única) las importen sin arrastrar
 * `MetaInboxRoutingModule`. Los archivos del chat de Instagram y Facebook (ver y adjuntar, solo con la bandeja
 * única) van aquí porque los usa la conversación.
 */
@NgModule({
  declarations: [MetaHiloDetalleComponent, MetaContactPanelComponent, MetaAdjuntoVistaComponent, MetaAdjuntarComponent],
  imports: [CommonModule, FormsModule, TranslateModule, CopMonedaPipe, InboxCoreModule],
  exports: [MetaHiloDetalleComponent, MetaContactPanelComponent],
})
export class MetaInboxPiezasModule {}
