import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ListaProveedoresComponent } from './lista-proveedores/lista-proveedores.component';
import { CrearProveedorComponent } from './crear-proveedor/crear-proveedor.component';
import { DetalleProveedorComponent } from './detalle-proveedor/detalle-proveedor.component';

const routes: Routes = [
  {
    path: '',
    component: ListaProveedoresComponent
  },
  {
    path: 'crear',
    component: CrearProveedorComponent
  },
  {
    path: 'editar/:id',
    component: CrearProveedorComponent
  },
  {
    path: 'detalle/:id',
    component: DetalleProveedorComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProveedoresRoutingModule { }