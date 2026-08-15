import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { PromoCampanaComponent } from "./promo-campana.component";

const routes: Routes = [
  { path: ":codigo", component: PromoCampanaComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PromoCampanaRoutingModule {}
