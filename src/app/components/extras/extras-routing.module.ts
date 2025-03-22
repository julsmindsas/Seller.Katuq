import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { FormasPagoComponent } from './formas-pago/formas-pago.component';
import { CrearFormasPagoComponent } from './formas-pago/crear-formas-pago/crear-formas-pago.component';
import { ZonasCobroComponent } from './zonas-cobro/zonas-cobro.component';
import { CrearZonasCobroComponent } from './zonas-cobro/crear-zonas-cobro/crear-zonas-cobro.component';
import { POSFormasPagoComponent } from './pos/formas-pago/formas-pago.component';
import { POSCrearFormasPagoComponent } from './pos/formas-pago/crear-formas-pago/crear-formas-pago.component';

const routes: Routes = [
  {
    path: 'formasPago',
    component: FormasPagoComponent
  },
  {
    path: 'formasPago/crearFormasPago',
    component: CrearFormasPagoComponent
  },
  {
    path: 'pos/formasPago',
    component: POSFormasPagoComponent
  },
  {
    path: 'pos/formasPago/crearFormasPago',
    component: POSCrearFormasPagoComponent
  },
  {
    path: 'zonasCobro',
    component: ZonasCobroComponent
  },
  {
    path: 'zonasCobro/crearZonasCobro',
    component: CrearZonasCobroComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExtrasRoutingModule { }
