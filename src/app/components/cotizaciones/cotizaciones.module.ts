import { NgModule } from "@angular/core";
import { CommonModule, registerLocaleData } from "@angular/common";
import localeEsCo from "@angular/common/locales/es-CO";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { SharedModule } from "../../shared/shared.module";
import { CatalogoSharedModule } from "../ventas/catalogo/catalogo-shared.module";
import { ClientesSharedModule } from "../ventas/clientes/clientes-shared.module";
import { CotizacionesRoutingModule } from "./cotizaciones-routing.module";
import { LinkifyModule } from "../../shared/pipes/linkify.module";
import { ImagenProductoPipe } from "../../shared/pipes/imagen-producto.pipe";
import { AngularFireStorageModule } from "@angular/fire/compat/storage";
import { NgxEchartsModule } from "ngx-echarts";

import { CotizacionesListaComponent } from "./cotizaciones-lista/cotizaciones-lista.component";
import { CotizacionEditorComponent } from "./cotizacion-editor/cotizacion-editor.component";

// Ticket c9ZCSMj4: la vista y el PDF de la cotización muestran los pesos con punto de miles (es-CO).
registerLocaleData(localeEsCo, "es-CO");

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
    // Ticket 1203: gráficas del análisis (echarts se carga solo al abrirlas).
    NgxEchartsModule.forRoot({ echarts: () => import("echarts") }),
  ],
})
export class CotizacionesModule {}
