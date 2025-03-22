import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { EmpresasRoutingModule } from './empresas-routing.module';
import { EmpresasComponent } from './empresas.component';
import { CrearEmpresaComponent } from './crearEmpresa/crear-empresa/crear-empresa.component';
import { ModulosVariablesModule } from './modulovariable/modulovariable.module';
import { TableModule } from 'primeng/table';
@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    EmpresasRoutingModule,
    ModulosVariablesModule,
    TableModule
  ],
  declarations: [EmpresasComponent]
})
export class EmpresasModule { }
