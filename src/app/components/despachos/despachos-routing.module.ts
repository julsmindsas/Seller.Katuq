import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DespachosComponent } from './despachos/despachos.component';

const routes: Routes = [
  {
    path: '',
    component: DespachosComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DespachosRoutingModule { }
