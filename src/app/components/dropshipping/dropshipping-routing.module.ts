import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DropshippingComponent } from './dropshipping.component';

const routes: Routes = [
  {
    path: '',
    component: DropshippingComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard-dropshipping.module').then(m => m.DashboardDropshippingModule)
      },
      {
        path: 'proveedores',
        loadChildren: () => import('./proveedores/proveedores.module').then(m => m.ProveedoresModule)
      },
      {
        path: 'productos',
        loadChildren: () => import('./productos-dropshipping/productos-dropshipping.module').then(m => m.ProductosDropshippingModule)
      },
      {
        path: 'ordenes',
        loadChildren: () => import('./ordenes-dropshipping/ordenes-dropshipping.module').then(m => m.OrdenesDropshippingModule)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DropshippingRoutingModule { }