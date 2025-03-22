import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../app/shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { TabViewModule } from 'primeng/tabview';
import { NgSelectModule } from '@ng-select/ng-select';
import { ExtrasRoutingModule } from '../extras/extras-routing.module';
import { FormasPagoComponent } from './formas-pago/formas-pago.component';
import { CrearFormasPagoComponent } from './formas-pago/crear-formas-pago/crear-formas-pago.component';
import { ZonasCobroComponent } from './zonas-cobro/zonas-cobro.component';
import { CrearZonasCobroComponent } from './zonas-cobro/crear-zonas-cobro/crear-zonas-cobro.component';
import { TableModule } from 'primeng/table';
import { POSCrearFormasPagoComponent } from './pos/formas-pago/crear-formas-pago/crear-formas-pago.component'
import { POSFormasPagoComponent } from './pos/formas-pago/formas-pago.component'


@NgModule({
  imports: [
    ExtrasRoutingModule,
    NgSelectModule,
    TabViewModule,
    NgxDatatableModule,
    TableModule,
    SharedModule,
    CommonModule
  ],
  declarations: [
    FormasPagoComponent,
    POSCrearFormasPagoComponent,
    POSFormasPagoComponent,
    CrearFormasPagoComponent,
    ZonasCobroComponent,
    CrearZonasCobroComponent
  ]
})
export class ExtrasModule { }