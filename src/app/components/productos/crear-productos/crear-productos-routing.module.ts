import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CrearProductosComponent } from './crear-productos.component';

const routes: Routes = [
  {
    path: '',
    component: CrearProductosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CrearProductosRoutingModule { }
