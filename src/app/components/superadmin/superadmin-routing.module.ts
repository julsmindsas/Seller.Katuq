import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuperadminClientesComponent } from './superadmin-clientes/superadmin-clientes.component';
import { SuperadminCampanasComponent } from './superadmin-campanas/superadmin-campanas.component';

const routes: Routes = [
  {
    path: 'clientes', // Ruta para la gestión de clientes
    component: SuperadminClientesComponent,
    // Aquí podrías añadir guards si es necesario, ej: data: { title: 'Gestión de Clientes' }
  },
  {
    path: 'campanas', // Campañas de pauta: códigos que regalan Premium temporal
    component: SuperadminCampanasComponent,
  },
  // Puedes añadir más rutas específicas de superadmin aquí
  {
    path: '', // Ruta por defecto dentro de superadmin, redirige a clientes
    redirectTo: 'clientes',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuperadminRoutingModule { }
