import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MaestrosComponent } from './maestros.component';

const routes: Routes = [
  {
    path: '',
    component: MaestrosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MaestrosRoutingModule { }
