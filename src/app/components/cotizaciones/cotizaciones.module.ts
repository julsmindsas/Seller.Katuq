import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "../../shared/shared.module";
import { CatalogoSharedModule } from "../ventas/catalogo/catalogo-shared.module";
import { ClientesSharedModule } from "../ventas/clientes/clientes-shared.module";
import { CotizacionesRoutingModule } from "./cotizaciones-routing.module";
import { LinkifyModule } from "../../shared/pipes/linkify.module";
import { ImagenProductoPipe } from "../../shared/pipes/imagen-producto.pipe";
import { AngularFireStorageModule } from "@angular/fire/compat/storage";

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
    ClientesSharedModule,
    CotizacionesRoutingModule,
    LinkifyModule,
    ImagenProductoPipe,
    AngularFireStorageModule, // ticket 1081: subir el PDF de condiciones
  ],
})
export class CotizacionesModule {}
