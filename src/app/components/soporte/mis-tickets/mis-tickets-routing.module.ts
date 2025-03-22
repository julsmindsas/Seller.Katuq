import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MisTicketsComponent } from './mis-tickets.component';


const routes: Routes = [
  {
    path: '',
    component: MisTicketsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MisTicketsRoutingModule { }
