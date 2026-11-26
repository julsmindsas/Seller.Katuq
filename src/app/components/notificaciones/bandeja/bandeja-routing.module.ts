import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { BandejaShellComponent } from "./components/bandeja-shell/bandeja-shell.component";

/**
 * Ruta de la bandeja única. El AuthGuard y el de la bandera `bandejaUnica` los aplica la ruta padre en
 * `src/app/shared/routes/routes.ts`; no se duplican aquí.
 */
const routes: Routes = [{ path: "", component: BandejaShellComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BandejaRoutingModule {}
