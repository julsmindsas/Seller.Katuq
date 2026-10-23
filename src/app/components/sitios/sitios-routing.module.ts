import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SitiosListaComponent } from "./lista/sitios-lista.component";
import { SitioEditorComponent } from "./editor/sitio-editor.component";

const routes: Routes = [
  { path: "", component: SitiosListaComponent },
  // Ticket 1175: misma lista, solo catálogos (entrada "Catálogos" del menú).
  { path: "catalogos", component: SitiosListaComponent, data: { tipo: "catalogo" } },
  // D-546: misma lista, solo landings (entrada "Landings" de Sitio web). La ve quien ve "Mis sitios".
  { path: "landings", component: SitiosListaComponent, data: { tipo: "landing" } },
  // Ticket 1220: sin el botón flotante de Opttia, que tapaba la vista previa (el editor tiene "Con IA").
  { path: "editor/:id", component: SitioEditorComponent, data: { hideFloatingAssistant: true } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SitiosRoutingModule {}
