import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MensajerosIndependientesGuard } from './mensajeros-independientes.guard';
import { SolicitudesListaComponent } from './solicitudes-lista/solicitudes-lista.component';

const routes: Routes = [
  {
    path: '',
    component: SolicitudesListaComponent,
    // Segunda barrera: la ruta ya llega protegida desde `routes.ts`, pero así el módulo nunca queda
    // abierto si alguien lo enlaza desde otro sitio.
    canActivate: [MensajerosIndependientesGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MensajerosIndependientesRoutingModule {}
