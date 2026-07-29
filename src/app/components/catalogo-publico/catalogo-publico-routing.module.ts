import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CatalogoPublicoComponent } from "./catalogo-publico.component";

const routes: Routes = [
  { path: ":token", component: CatalogoPublicoComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogoPublicoRoutingModule {}
