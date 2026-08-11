import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { SitioPublicoComponent } from "./sitio-publico.component";

const routes: Routes = [
  { path: ":slug", component: SitioPublicoComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SitioPublicoRoutingModule {}
