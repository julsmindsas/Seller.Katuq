import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { SuperadminClientesComponent } from './superadmin-clientes/superadmin-clientes.component';
import { SuperadminRoutingModule } from './superadmin-routing.module';

@NgModule({
  declarations: [
    SuperadminClientesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SuperadminRoutingModule
  ],
  exports: [
    SuperadminClientesComponent
  ]
})
export class SuperadminModule { }
