import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CrearRolComponent } from './crear-rol.component';

const routes: Routes = [
  {
    path: '',
    component: CrearRolComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CrearRolRoutingModule { }
