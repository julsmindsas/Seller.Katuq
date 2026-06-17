import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CotizacionesListaComponent } from "./cotizaciones-lista/cotizaciones-lista.component";
import { CotizacionEditorComponent } from "./cotizacion-editor/cotizacion-editor.component";

const routes: Routes = [
  { path: "", component: CotizacionesListaComponent },
  { path: "editor", component: CotizacionEditorComponent },
  { path: "editor/:id", component: CotizacionEditorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CotizacionesRoutingModule {}
