import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SitioPublicoRoutingModule } from "./sitio-publico-routing.module";
import { SitioPublicoComponent } from "./sitio-publico.component";
import { SitioRenderModule } from "../sitio-render/sitio-render.module";

@NgModule({
  imports: [CommonModule, FormsModule, SitioPublicoRoutingModule, SitioRenderModule],
  declarations: [SitioPublicoComponent],
})
export class SitioPublicoModule {}
