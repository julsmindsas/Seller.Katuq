import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaPreciosComponent } from './lista-precios/lista-precios.component';
import { ListaPreciosCostosComponent } from './lista-precios-costos/lista-precios-costos.component';

const routes: Routes = [
  {
    path: 'lista-precios',
    component: ListaPreciosComponent
  },
  {
    path: 'costos',
    component: ListaPreciosCostosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ListaPreciosRoutingModule { }

