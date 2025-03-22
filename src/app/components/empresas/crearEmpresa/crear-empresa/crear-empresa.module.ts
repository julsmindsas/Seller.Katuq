import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CrearEmpresasRoutingModule } from './crear-empresa-rounting.module';
import { CrearEmpresaComponent } from './crear-empresa.component';
import {TabViewModule} from 'primeng/tabview';
import { NgSelectModule } from '@ng-select/ng-select';

@NgModule({
  imports: [
    NgSelectModule,
    CommonModule,
    SharedModule,
    CrearEmpresasRoutingModule,
    NgxDatatableModule,
    TabViewModule
  ],
  declarations: [CrearEmpresaComponent]
})
export class CrearEmpresasModule { }
