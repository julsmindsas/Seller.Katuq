import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { AnaliticaComponent } from './analiticas/analiticas-form.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent
  },
  {
    path: "analiticas",
    component: AnaliticaComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }