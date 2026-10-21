import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DomiciliosComponent } from './domicilios.component';

// La ruta ya llega protegida con `AuthGuard` desde `routes.ts`. Las cuatro pestañas viven dentro de
// `DomiciliosComponent`; se puede abrir una directo con `?pestana=nuevo|archivo|lista|integracion`.
const routes: Routes = [{ path: '', component: DomiciliosComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DomiciliosRoutingModule {}
