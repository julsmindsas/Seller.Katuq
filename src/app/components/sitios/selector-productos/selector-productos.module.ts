import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AlBodyModule } from "../../../shared/directives/al-body.module";
import { SelectorProductosComponent } from "./selector-productos.component";

/**
 * El selector visual de productos, compartido por el editor de sitios y las
 * campañas de correo (D-318).
 */
@NgModule({
  imports: [CommonModule, FormsModule, AlBodyModule],
  declarations: [SelectorProductosComponent],
  exports: [SelectorProductosComponent],
})
export class SelectorProductosModule {}
