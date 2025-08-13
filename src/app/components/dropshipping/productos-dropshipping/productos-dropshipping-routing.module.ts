import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogoDropshippingComponent } from './catalogo-dropshipping/catalogo-dropshipping.component';
import { ImportarProductosComponent } from './importar-productos/importar-productos.component';

const routes: Routes = [
  {
    path: '',
    component: CatalogoDropshippingComponent
  },
  {
    path: 'importar',
    component: ImportarProductosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductosDropshippingRoutingModule { }