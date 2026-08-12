import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SitiosRoutingModule } from "./sitios-routing.module";
import { SitiosListaComponent } from "./lista/sitios-lista.component";
import { SitioEditorComponent } from "./editor/sitio-editor.component";
import { SelectorProductosComponent } from "./selector-productos/selector-productos.component";
import { SitioRenderModule } from "../sitio-render/sitio-render.module";
import { AlBodyDirective } from "../../shared/directives/al-body.directive";

/**
 * Editor de landings y tiendas. La vista previa reusa `SitioRenderModule`, el
 * mismo render de la página pública.
 *
 * `AlBodyDirective` se declara aquí y no en SharedModule para no arrastrar todo
 * el chrome (header, sidebar, NgbModule) a un módulo que no lo necesita. Si
 * otro módulo la necesita, se promueve.
 */
@NgModule({
  imports: [CommonModule, FormsModule, SitiosRoutingModule, SitioRenderModule],
  declarations: [
    SitiosListaComponent,
    SitioEditorComponent,
    SelectorProductosComponent,
    AlBodyDirective,
  ],
})
export class SitiosModule {}
