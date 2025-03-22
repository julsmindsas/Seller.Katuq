import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RolComponent } from './rol.component';
import { RolesComponent } from './roles/roles.component';

const routes: Routes = [
  {
    path: 'rol',
    component: RolComponent
  },
  {
    path: 'crearRol',
    component: RolesComponent
  },
  {
    path: 'personas',
    component: RolesComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RolRoutingModule { }
