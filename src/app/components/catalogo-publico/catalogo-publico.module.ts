import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CatalogoPublicoRoutingModule } from "./catalogo-publico-routing.module";
import { CatalogoPublicoComponent } from "./catalogo-publico.component";

@NgModule({
  imports: [CommonModule, FormsModule, CatalogoPublicoRoutingModule],
  declarations: [CatalogoPublicoComponent],
})
export class CatalogoPublicoModule {}
