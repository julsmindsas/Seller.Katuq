import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CotizacionPublicaComponent } from "./cotizacion-publica.component";

const routes: Routes = [
  { path: ":token", component: CotizacionPublicaComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CotizacionPublicaRoutingModule {}
