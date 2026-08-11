import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SitiosRoutingModule } from "./sitios-routing.module";
import { SitiosListaComponent } from "./lista/sitios-lista.component";
import { SitioEditorComponent } from "./editor/sitio-editor.component";
import { SelectorProductosComponent } from "./selector-productos/selector-productos.component";
import { SitioRenderModule } from "../sitio-render/sitio-render.module";

/**
 * Editor de landings y tiendas. La vista previa reusa `SitioRenderModule`, el
 * mismo render de la página pública.
 */
@NgModule({
  imports: [CommonModule, FormsModule, SitiosRoutingModule, SitioRenderModule],
  declarations: [SitiosListaComponent, SitioEditorComponent, SelectorProductosComponent],
})
export class SitiosModule {}
