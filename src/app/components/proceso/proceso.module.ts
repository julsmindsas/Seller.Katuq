import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../app/shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { ProcesoRoutingModule } from './proceso-routing.module';
import { GenerosComponent } from './generos/generos.component';
import {TabViewModule} from 'primeng/tabview';
import { NgSelectModule } from '@ng-select/ng-select';
import { CrearGenerosComponent } from './generos/crear-generos/crear-generos.component';
import { OcasionesComponent } from './ocasiones/ocasiones.component';
import { CrearOcasionesComponent } from './ocasiones/crear-ocasiones/crear-ocasiones.component';
import { VariablesComponent } from './variables/variables.component';
import { CrearVariablesComponent } from './variables/crear-variables/crear-variables.component';
import { CanalesComponent } from './canales/canales.component';
import { CrearCanalesComponent } from './canales/crear-canales/crear-canales.component';
import { TableModule } from 'primeng/table';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  imports: [
    NgSelectModule,
    CommonModule,
    NgbModule,
    SharedModule,
    ProcesoRoutingModule,
    NgxDatatableModule,
    TabViewModule,
    TableModule
  ],
  declarations: [
    GenerosComponent, 
    CrearGenerosComponent, 
    OcasionesComponent, 
    CrearOcasionesComponent, 
    VariablesComponent, 
    CrearVariablesComponent,
    CanalesComponent,
    CrearCanalesComponent
  ]
})
export class ProcesoModule { }