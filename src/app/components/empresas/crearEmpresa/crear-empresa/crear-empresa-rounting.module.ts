import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CrearEmpresaComponent } from './crear-empresa.component';

const routes: Routes = [
  {
    path: '',
    component: CrearEmpresaComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CrearEmpresasRoutingModule { }
