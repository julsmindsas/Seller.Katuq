import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdicionesComponent } from './adiciones/adiciones.component';
import { ListaComponent } from './adiciones/lista/lista.component';


const routes: Routes = [
  {
    path: 'adiciones/crear',
    component: AdicionesComponent
  },
  {
    path: 'adiciones/listar',
    component: ListaComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EcommerceRoutingModule { }
