import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { SharedModule } from 'src/app/shared/shared.module';

import { TiempoEntregaComponent } from './create/tiempo-entrega/tiempo-entrega.component';
import { TiempoEntregaRoutingModule } from './tiempoentrega-routing.module';
import { ListaTiemposComponent } from '../tiempos-entrega/lista-tiempos/listatiempos.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TableModule } from 'primeng/table';
@NgModule({
    imports: [TiempoEntregaRoutingModule,
        CommonModule,
        SharedModule,
        NgxDatatableModule,
        NgSelectModule,
        TableModule
    ],
    exports: [],
    declarations: [TiempoEntregaComponent,ListaTiemposComponent],
    providers: [],
})
export class TiempoEntregaModule { }
