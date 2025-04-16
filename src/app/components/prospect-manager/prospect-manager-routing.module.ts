import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProspectManagerComponent } from './prospect-manager.component';

const routes: Routes = [
  {
    path: 'lista',
    component: ProspectManagerComponent
  },
  {
    path: '',
    redirectTo: 'lista',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProspectManagerRoutingModule { } 