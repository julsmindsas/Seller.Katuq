import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared.module';
import { CardModule } from 'primeng/card';
import { ListaOrdenesComponent } from './lista-ordenes.component';

@NgModule({
  declarations: [ListaOrdenesComponent],
  imports: [
    CommonModule,
    SharedModule,
    CardModule,
    RouterModule.forChild([{ path: '', component: ListaOrdenesComponent }])
  ]
})
export class OrdenesDropshippingModule { }