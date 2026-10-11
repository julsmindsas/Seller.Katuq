import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SitiosListaComponent } from "./lista/sitios-lista.component";
import { SitioEditorComponent } from "./editor/sitio-editor.component";

const routes: Routes = [
  { path: "", component: SitiosListaComponent },
  // Ticket 1175: misma lista, solo catálogos (entrada "Catálogos" del menú).
  { path: "catalogos", component: SitiosListaComponent, data: { tipo: "catalogo" } },
  { path: "editor/:id", component: SitioEditorComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SitiosRoutingModule {}
