import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";

import { CopMonedaPipe } from "../../../shared/pipes/cop-moneda.pipe";
import { MetaHiloDetalleComponent } from "./components/meta-hilo-detalle/meta-hilo-detalle.component";
import { MetaContactPanelComponent } from "./components/meta-contact-panel/meta-contact-panel.component";

/**
 * Piezas reutilizables de los buzones de Meta: la conversación abierta y el panel de contacto.
 *
 * Sin rutas, para que otras pantallas (la bandeja única) las importen sin arrastrar
 * `MetaInboxRoutingModule`.
 */
@NgModule({
  declarations: [MetaHiloDetalleComponent, MetaContactPanelComponent],
  imports: [CommonModule, FormsModule, TranslateModule, CopMonedaPipe],
  exports: [MetaHiloDetalleComponent, MetaContactPanelComponent],
})
export class MetaInboxPiezasModule {}
