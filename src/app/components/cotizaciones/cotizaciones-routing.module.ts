import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CotizacionesListaComponent } from "./cotizaciones-lista/cotizaciones-lista.component";
import { CotizacionEditorComponent } from "./cotizacion-editor/cotizacion-editor.component";

const routes: Routes = [
  { path: "", component: CotizacionesListaComponent },
  { path: "editor", component: CotizacionEditorComponent },
  { path: "editor/:id", component: CotizacionEditorComponent },
  // D-416: catálogos por link (lo que pide el comprador llega como cotización).
  {
    path: "catalogos",
    loadChildren: () => import("./catalogos-link/catalogos-link.module").then((m) => m.CatalogosLinkModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CotizacionesRoutingModule {}
