import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CrmListComponent } from './components/crm-list/crm-list.component';
import { CrmDetailComponent } from './components/crm-detail/crm-detail.component';
import { CrmSeguimientoComponent } from './components/crm-seguimiento/crm-seguimiento.component';
import { SatisfaccionComponent } from './components/satisfaccion/satisfaccion.component';

const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: CrmListComponent },
  { path: 'tasks', component: CrmSeguimientoComponent },
  { path: 'detail/:id', component: CrmDetailComponent },
  // D-483: NPS y comentarios (standalone). El backend la limita a la familia Administrador.
  { path: 'satisfaccion', component: SatisfaccionComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrmRoutingModule {}
