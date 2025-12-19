import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaPreciosComponent } from './lista-precios/lista-precios.component';

const routes: Routes = [
  {
    path: 'lista-precios',
    component: ListaPreciosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ListaPreciosRoutingModule { }

