import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CrearPOSVentasComponent } from './pos-crear-ventas/pos-crear-ventas.component';
import { POSListOrdersComponent } from './pos-list/list.component';

const routes: Routes = [
  {
    path: 'ventas',
    component: CrearPOSVentasComponent
  },
  {
    path: 'list-ventas',
    component: POSListOrdersComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class POSRoutingModule { }
