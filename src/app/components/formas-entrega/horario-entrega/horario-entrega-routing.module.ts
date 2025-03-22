import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { HorarioEntregaComponent } from './horario-entrega.component';
import { ListahorariosComponent } from '../horario-entrega/listahorarios/listahorarios.component';

const routes: Routes = [
  {
    path: 'crear',
    component: HorarioEntregaComponent
  },{
    path:'',
    component:ListahorariosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HorarioEntregaRoutingModule { }
