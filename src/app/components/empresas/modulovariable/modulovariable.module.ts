import { NgModule } from '@angular/core';

import { CentrotrabajosComponent } from './produccion/centrotrabajos/centrotrabajos.component';
import { ModuloVariableRoutingModule } from './modulovariable-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonModule } from '@angular/common';
import { ModuloVariableComponent } from './modulovariable.component';
import { ProcesosComponent } from './produccion/procesos/procesos.component';
import { OrganizationChartModule } from 'primeng/organizationchart';
import {PickListModule} from 'primeng/picklist';
@NgModule({
    imports: [
        ModuloVariableRoutingModule,
        OrganizationChartModule,
        CommonModule,
        PickListModule,
        SharedModule],
    exports: [
        CentrotrabajosComponent,
        ModuloVariableComponent],
    declarations: [
        CentrotrabajosComponent,
        ModuloVariableComponent,
        ProcesosComponent
    ],
    providers: [],
})
export class ModulosVariablesModule { }
