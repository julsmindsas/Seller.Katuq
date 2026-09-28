import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { SitiosRoutingModule } from "./sitios-routing.module";
import { SitiosListaComponent } from "./lista/sitios-lista.component";
import { SitioEditorComponent } from "./editor/sitio-editor.component";
import { SelectorProductosModule } from "./selector-productos/selector-productos.module";
import { MarcaComponent } from "./marca/marca.component";
import { MetricasComponent } from "./metricas/metricas.component";
import { SitioRenderModule } from "../sitio-render/sitio-render.module";
import { AlBodyModule } from "../../shared/directives/al-body.module";

/**
 * Editor de landings y tiendas. La vista previa reusa `SitioRenderModule`, el
 * mismo render de la página pública.
 *
 * `appAlBody` y el selector de productos viven en módulos pequeños propios
 * (no en SharedModule, para no arrastrar todo el chrome): las campañas de
 * correo de Marketing también los usan (D-318).
 */
@NgModule({
  imports: [CommonModule, FormsModule, DragDropModule, SitiosRoutingModule, SitioRenderModule, SelectorProductosModule, AlBodyModule],
  declarations: [
    SitiosListaComponent,
    SitioEditorComponent,
    MarcaComponent,
    MetricasComponent,
  ],
})
export class SitiosModule {}
