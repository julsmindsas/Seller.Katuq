import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SuperadminCampanasComponent } from './superadmin-campanas/superadmin-campanas.component';

const routes: Routes = [
  {
    // La consola de plataforma se fusionó con "Configuración de empresa": un
    // solo sitio para administrar empresas, en vez de saltar entre dos.
    // Este redirect conserva los enlaces guardados y el redirect de login viejo.
    path: 'clientes',
    redirectTo: '/empresas',
    pathMatch: 'full'
  },
  {
    path: 'campanas', // Campañas de pauta: códigos que regalan Premium temporal
    component: SuperadminCampanasComponent,
  },
  {
    path: '',
    redirectTo: '/empresas',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SuperadminRoutingModule { }
