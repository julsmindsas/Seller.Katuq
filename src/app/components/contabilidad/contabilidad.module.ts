import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { ContabilidadRoutingModule } from './contabilidad-routing.module';
import { ContabilidadComponent } from './contabilidad.component';

@NgModule({
  declarations: [ContabilidadComponent],
  imports: [CommonModule, FormsModule, SharedModule, ContabilidadRoutingModule],
})
export class ContabilidadModule {}
