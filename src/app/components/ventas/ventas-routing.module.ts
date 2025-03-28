import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CrearVentasComponent } from './crear-ventas/crear-ventas.component';
import { ClientesComponent } from './clientes/clientes.component'
import { ListOrdersComponent } from './list/list.component';
import { ClientesListaComponent } from './clientes/lista/clientes-lista.component';
import { CargaVentasComponent } from './carga-ventas/carga-ventas.component';
import { PosComponent } from './pos2/pos.component';

const routes: Routes = [
  {
    path: 'crear-ventas',
    component: CrearVentasComponent
  },
  {
    path: 'clientes',
    component: ClientesComponent
  },
  {
    path: 'pedidos',
    component: ListOrdersComponent
  },
  {
    path: 'clienteslista',
    component: ClientesListaComponent
  },
  {
    path: 'carga-ventas',
    component: CargaVentasComponent
  },
  {
    path: 'pos2',
    component: PosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VentasRoutingModule { }
