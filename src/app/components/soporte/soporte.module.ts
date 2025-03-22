import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

import { SoporteRoutingModule } from './soporte-routing.module';
import { SoporteComponent } from './soporte.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    SoporteRoutingModule
  ],
  declarations: [SoporteComponent]
})
export class SoporteModule { }
