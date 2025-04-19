import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';

import { FormasEntregaRoutingModule } from './formas-entrega-routing.module';
import { FormasEntregaComponent } from './formas-entrega.component';
import { ListaFormaEntregaComponent } from '../formas-entrega/list/lista-forma-entrega/lista-forma-entrega.component'
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ReactiveFormsModule } from '@angular/forms';
import { FormaEntregaCreateComponent } from './forma-entrega-create/forma-entrega-create.component';
import { HorarioEntregaModule } from '../formas-entrega/horario-entrega/horario-entrega.module';
import { NgSelectModule } from '@ng-select/ng-select';
import { ListTipoEntregaComponent } from '../formas-entrega/tipo-entrega/list/list-tipo-entrega.component';
import { TableModule } from 'primeng/table';
import { TipoEntregaComponent } from './tipo-entrega/tipo-entrega.component';

@NgModule({
  imports: [
    ReactiveFormsModule,
    CommonModule,
    SharedModule,
    FormasEntregaRoutingModule,
    NgxDatatableModule,
    HorarioEntregaModule,
    NgSelectModule,
    TableModule,
  ],
  declarations: [FormasEntregaComponent,
    ListTipoEntregaComponent, ListaFormaEntregaComponent, FormaEntregaCreateComponent,TipoEntregaComponent]
})
export class FormasEntregaModule { }
