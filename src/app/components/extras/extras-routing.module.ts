import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ZonasCobroComponent } from './zonas-cobro/zonas-cobro.component';
import { CrearZonasCobroComponent } from './zonas-cobro/crear-zonas-cobro/crear-zonas-cobro.component';
import { MetodosPagoComponent } from './metodos-pago/metodos-pago.component';

const routes: Routes = [
  // Pantalla única de métodos de pago (Spec 012). Reemplaza las dos pantallas viejas.
  {
    path: 'metodos-pago',
    component: MetodosPagoComponent
  },
  // Redirecciones de las pantallas anteriores (e-commerce y POS) → pantalla única.
  { path: 'formasPago', redirectTo: 'metodos-pago', pathMatch: 'full' },
  { path: 'formasPago/crearFormasPago', redirectTo: 'metodos-pago', pathMatch: 'full' },
  { path: 'pos/formasPago', redirectTo: 'metodos-pago', pathMatch: 'full' },
  { path: 'pos/formasPago/crearFormasPago', redirectTo: 'metodos-pago', pathMatch: 'full' },
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
