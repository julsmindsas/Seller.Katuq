import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ListaFormaEntregaComponent } from '../formas-entrega/list/lista-forma-entrega/lista-forma-entrega.component';
import { FormaEntregaCreateComponent } from '../formas-entrega/forma-entrega-create/forma-entrega-create.component';
import { TipoEntregaComponent } from './tipo-entrega/tipo-entrega.component';
import { ListTipoEntregaComponent } from './tipo-entrega/list/list-tipo-entrega.component';

const routes: Routes = [
  {
    path: 'crear',
    component: FormaEntregaCreateComponent
  },
  {
    path: '',
    component: ListaFormaEntregaComponent
  },
  {
    path: 'tipoentrega',
    component: TipoEntregaComponent
  },
  {
    path: 'tipoentrega/lista',
    component: ListTipoEntregaComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormasEntregaRoutingModule { }
