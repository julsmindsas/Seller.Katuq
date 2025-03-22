import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EmpresasComponent } from './empresas.component';
import { ModuloVariableComponent } from './modulovariable/modulovariable.component';

const routes: Routes = [
  {
    path: '',
    component: EmpresasComponent
  },
  {
    path: 'modulovariable',
    loadChildren: () => import('./modulovariable/modulovariable.module').then(m => m.ModulosVariablesModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EmpresasRoutingModule { }
