import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { CrearRolRoutingModule } from './crear-rol-rounting.module';
import { CrearRolComponent } from './crear-rol.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CrearRolRoutingModule
  ],
  declarations: [CrearRolComponent]
})
export class CrearRolModule { }

