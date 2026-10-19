import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LiquidacionComponent } from './liquidacion/liquidacion.component';
import { MensajerosIndependientesGuard } from './mensajeros-independientes.guard';
import { SolicitudesListaComponent } from './solicitudes-lista/solicitudes-lista.component';

// Segunda barrera: la ruta ya llega protegida desde `routes.ts`, pero así el módulo nunca queda
// abierto si alguien lo enlaza desde otro sitio. Aplica igual a las dos pestañas.
const routes: Routes = [
  {
    path: '',
    component: SolicitudesListaComponent,
    canActivate: [MensajerosIndependientesGuard],
  },
  {
    // Entregas de mensajeros independientes y comisión que Katuq cobra a cada comercio.
    path: 'liquidacion',
    component: LiquidacionComponent,
    canActivate: [MensajerosIndependientesGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MensajerosIndependientesRoutingModule {}
