import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DragDropModule } from "@angular/cdk/drag-drop";
import { SitioRenderComponent } from "./sitio-render.component";

/**
 * Módulo con el único fin de compartir el render de bloques entre la página
 * pública (`sitio-publico`) y el editor (`sitios`).
 *
 * El arrastre solo se activa en modo vista previa; en la página pública los
 * bloques quedan quietos.
 */
@NgModule({
  imports: [CommonModule, FormsModule, DragDropModule],
  declarations: [SitioRenderComponent],
  exports: [SitioRenderComponent],
})
export class SitioRenderModule {}
