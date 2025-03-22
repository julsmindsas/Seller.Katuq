import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TiempoEntregaComponent } from '../tiempos-entrega/create/tiempo-entrega/tiempo-entrega.component';
import { ListaTiemposComponent } from '../tiempos-entrega/lista-tiempos/listatiempos.component';


const routes: Routes = [
  {
    path: 'create',
    component: TiempoEntregaComponent
  },
  {
    path:'',
    component:ListaTiemposComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TiempoEntregaRoutingModule { }
