import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LeadsListComponent } from './components/leads-list/leads-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'leads',
    pathMatch: 'full'
  },
  {
    path: 'leads',
    component: LeadsListComponent,
    data: { title: 'Gestión de Leads' }
  },
  {
    path: 'leads/:id',
    component: LeadsListComponent,
    data: { title: 'Detalle del Lead' }
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KatuqFlowRoutingModule { }
