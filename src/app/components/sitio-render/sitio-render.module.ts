import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SitioRenderComponent } from "./sitio-render.component";

/**
 * Módulo con el único fin de compartir el render de bloques entre la página
 * pública (`sitio-publico`) y el editor (`sitios`).
 */
@NgModule({
  imports: [CommonModule, FormsModule],
  declarations: [SitioRenderComponent],
  exports: [SitioRenderComponent],
})
export class SitioRenderModule {}
