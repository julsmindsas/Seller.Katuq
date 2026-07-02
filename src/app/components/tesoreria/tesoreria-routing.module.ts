import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GestionPagosComponent } from './gestion-pagos/gestion-pagos.component';

const routes: Routes = [
  {
    path: '',
    component: GestionPagosComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TesoreriaRoutingModule {}
