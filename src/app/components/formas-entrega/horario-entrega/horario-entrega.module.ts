import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';

import { HorarioEntregaRoutingModule } from './horario-entrega-routing.module';
import { HorarioEntregaComponent } from './horario-entrega.component';
import { ListahorariosComponent } from './listahorarios/listahorarios.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule
  ],
  declarations: [HorarioEntregaComponent,ListahorariosComponent],
  exports:[
    HorarioEntregaComponent
  ]
})
export class HorarioEntregaModule { }
