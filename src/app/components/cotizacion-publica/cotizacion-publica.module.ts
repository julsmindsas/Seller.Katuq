import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CotizacionPublicaRoutingModule } from "./cotizacion-publica-routing.module";
import { CotizacionPublicaComponent } from "./cotizacion-publica.component";

@NgModule({
  imports: [CommonModule, FormsModule, CotizacionPublicaRoutingModule],
  declarations: [CotizacionPublicaComponent],
})
export class CotizacionPublicaModule {}
