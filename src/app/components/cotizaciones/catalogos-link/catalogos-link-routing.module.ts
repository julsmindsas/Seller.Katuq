import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CatalogosLinkListaComponent } from "./lista/catalogos-link-lista.component";
import { CatalogoLinkDetalleComponent } from "./detalle/catalogo-link-detalle.component";

const routes: Routes = [
  { path: "", component: CatalogosLinkListaComponent },
  // `nuevo` lo atiende el mismo detalle en modo creación.
  { path: ":id", component: CatalogoLinkDetalleComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogosLinkRoutingModule {}
