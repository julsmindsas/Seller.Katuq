import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CrmListComponent } from './components/crm-list/crm-list.component';
import { CrmDetailComponent } from './components/crm-detail/crm-detail.component';
import { CrmSeguimientoComponent } from './components/crm-seguimiento/crm-seguimiento.component';

const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  { path: 'list', component: CrmListComponent },
  { path: 'tasks', component: CrmSeguimientoComponent },
  { path: 'detail/:id', component: CrmDetailComponent },
  // D-490: "Satisfacción de clientes" pasó a ser la pestaña Resultados del módulo NPS.
  { path: 'satisfaccion', redirectTo: '/nps/resultados', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CrmRoutingModule {}
