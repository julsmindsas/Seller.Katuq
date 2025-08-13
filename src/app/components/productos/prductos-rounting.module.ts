import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ProductosComponent } from './productos.component';

const routes: Routes = [
  {
    path: '',
    component: ProductosComponent
  },
  {
    path: 'dropshipping-config/:id',
    loadChildren: () => import('./productos-dropshipping-config/productos-dropshipping-config.module').then(m => m.ProductosDropshippingConfigModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductosRoutingModule { }
