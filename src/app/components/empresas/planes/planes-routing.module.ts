import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlanesListComponent } from './planes-list/planes-list.component';
import { PlanFormComponent } from './plan-form/plan-form.component';

const routes: Routes = [
  { path: '', component: PlanesListComponent },
  { path: 'crear', component: PlanFormComponent },
  { path: 'editar/:id', component: PlanFormComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PlanesRoutingModule {} 