import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "../../shared/shared.module";
import { CatalogoSharedModule } from "../ventas/catalogo/catalogo-shared.module";
import { CotizacionesRoutingModule } from "./cotizaciones-routing.module";

import { CotizacionesListaComponent } from "./cotizaciones-lista/cotizaciones-lista.component";
import { CotizacionEditorComponent } from "./cotizacion-editor/cotizacion-editor.component";

@NgModule({
  declarations: [CotizacionesListaComponent, CotizacionEditorComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    CatalogoSharedModule,
    CotizacionesRoutingModule,
  ],
})
export class CotizacionesModule {}
