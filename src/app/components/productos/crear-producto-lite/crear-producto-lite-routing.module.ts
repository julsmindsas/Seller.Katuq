import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { CrearProductoLiteComponent } from "./crear-producto-lite.component";

const routes: Routes = [
  {
    path: "",
    component: CrearProductoLiteComponent,
    data: { title: "Nuevo producto", breadcrumb: "Nuevo producto" },
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrearProductoLiteRoutingModule {}
