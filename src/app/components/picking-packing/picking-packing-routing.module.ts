import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PickingListComponent } from './picking-list/picking-list.component';
import { PickingDetailComponent } from './picking-detail/picking-detail.component';
import { PackingListComponent } from './packing-list/packing-list.component';
import { PackingDetailComponent } from './packing-detail/packing-detail.component';
import { PickingAlistamientoGuard } from './picking-alistamiento.guard';

const routes: Routes = [
  {
    // El alistamiento nace apagado: todas las rutas del módulo (picking y packing) piden la
    // bandera `pickingAlistamiento` de la empresa. Ver picking-alistamiento.guard.ts.
    path: '',
    canActivate: [PickingAlistamientoGuard],
    children: [
      {
        path: 'picking',
        children: [
          { path: '', component: PickingListComponent },
          { path: 'nuevo', component: PickingDetailComponent },
          { path: 'orden/:id', component: PickingDetailComponent },
          { path: ':id', component: PickingDetailComponent }
        ]
      },
      {
        path: 'packing',
        children: [
          { path: '', component: PackingListComponent },
          { path: 'nuevo', component: PackingDetailComponent },
          { path: 'orden/:id', component: PackingDetailComponent },
          { path: ':id', component: PackingDetailComponent }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PickingPackingRoutingModule { } 